package com.Gostay.BookingandInventory.service;

import com.Gostay.BookingandInventory.entity.*;
import com.Gostay.BookingandInventory.enums.*;
import com.Gostay.BookingandInventory.repository.*;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import javax.sql.DataSource;
import java.lang.reflect.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Uses a private in-memory DB and real Hibernate transactions. No application DB. */
@SpringJUnitConfig(InventoryConcurrencyTest.Config.class)
class InventoryConcurrencyTest {
    @Configuration
    @EnableJpaRepositories(basePackageClasses=InventoryLockRepository.class)
    static class Config {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:gostay_audit;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=DATE", "sa", "");
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource ds) {
            var emf = new LocalContainerEntityManagerFactoryBean();
            emf.setDataSource(ds);
            emf.setPackagesToScan("com.Gostay.BookingandInventory.entity");
            emf.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            emf.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop", "hibernate.dialect", "org.hibernate.dialect.H2Dialect"));
            return emf;
        }
        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory emf) { return new JpaTransactionManager(emf); }
    }
    @Autowired InventoryLockRepository locks;
    @Autowired InventoryCalendarRepository calendars;
    @Autowired InventoryConfigRepository configs;
    @Autowired PlatformTransactionManager txManager;

    @Test void confirmAndCancelMustNotBothCommitOnTheSameLockedSnapshot() throws Exception { runRace("confirm"); }
    @Test void twoCancelsMustRestoreInventoryOnlyOnce() throws Exception { runRace("cancel"); }

    private void runRace(String delayedAction) throws Exception {
        var tx = new TransactionTemplate(txManager);
        UUID order = UUID.randomUUID();
        UUID[] ids = tx.execute(status -> {
            var calendar = calendars.saveAndFlush(InventoryCalendar.builder().listingId(UUID.randomUUID())
                    .date(LocalDate.now().plusDays(1)).timeSlot("ALL_DAY").availableQuantity(9)
                    .status(InventoryCalendarStatus.AVAILABLE).build());
            var lock = locks.saveAndFlush(InventoryLock.builder().inventoryCalendar(calendar).orderId(order)
                    .lockedQuantity(1).lockStatus(InventoryLockStatus.LOCKED)
                    .expiresAt(LocalDateTime.now().plusMinutes(15)).build());
            return new UUID[]{calendar.getId(),lock.getId()};
        });
        var confirmHasRead = new CountDownLatch(1);
        var cancelHasCommitted = new CountDownLatch(1);
        InventoryLockRepository delayedRead = (InventoryLockRepository) Proxy.newProxyInstance(
                InventoryLockRepository.class.getClassLoader(), new Class<?>[]{InventoryLockRepository.class},
                (proxy, method, args) -> {
                    Object result;
                    try { result = method.invoke(locks,args); }
                    catch (InvocationTargetException ex) { throw ex.getCause(); }
                    if (method.getName().equals("findByOrderId")) {
                        confirmHasRead.countDown();
                        if (!cancelHasCommitted.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("cancel timed out");
                    }
                    return result;
                });
        var confirmService = new InventoryInternalService(configs,calendars,delayedRead);
        var cancelService = new InventoryInternalService(configs,calendars,locks);
        ExecutorService pool=Executors.newFixedThreadPool(2);
        try {
            Future<?> confirm = pool.submit(() -> tx.executeWithoutResult(status -> {
                if (delayedAction.equals("confirm")) confirmService.confirmLock(order);
                else confirmService.cancelLock(order);
            }));
            assertTrue(confirmHasRead.await(10,TimeUnit.SECONDS));
            Future<?> cancel = pool.submit(() -> {
                try { tx.executeWithoutResult(status -> cancelService.cancelLock(order)); }
                finally { cancelHasCommitted.countDown(); }
            });
            cancel.get(15,TimeUnit.SECONDS);
            var conflict = assertThrows(ExecutionException.class, () -> confirm.get(15,TimeUnit.SECONDS));
            assertInstanceOf(org.springframework.dao.OptimisticLockingFailureException.class, conflict.getCause());
            Object[] observed=tx.execute(status -> new Object[]{locks.findById(ids[1]).orElseThrow().getLockStatus(),calendars.findById(ids[0]).orElseThrow().getAvailableQuantity()});
            System.out.println("RACE_FIXED stale_"+delayedAction+"_rejected=true final_status="+observed[0]+" available="+observed[1]);
            assertEquals(InventoryLockStatus.RELEASED, observed[0]);
            assertEquals(10, observed[1]);
        } finally { pool.shutdownNow(); }
    }

    @Test void laterInvalidLockRollsBackEarlierInventoryMutation() {
        var tx=new TransactionTemplate(txManager);UUID order=UUID.randomUUID();
        UUID[] ids=tx.execute(status -> {
            var calendar=calendars.saveAndFlush(InventoryCalendar.builder().listingId(UUID.randomUUID())
                    .date(LocalDate.now().plusDays(1)).timeSlot("ALL_DAY").availableQuantity(8)
                    .status(InventoryCalendarStatus.AVAILABLE).build());
            var first=locks.saveAndFlush(InventoryLock.builder().inventoryCalendar(calendar).orderId(order).lockedQuantity(1)
                    .lockStatus(InventoryLockStatus.LOCKED).expiresAt(LocalDateTime.now().plusMinutes(15)).build());
            locks.saveAndFlush(InventoryLock.builder().inventoryCalendar(calendar).orderId(order).lockedQuantity(1)
                    .lockStatus(InventoryLockStatus.CONFIRMED).expiresAt(LocalDateTime.now().plusMinutes(15)).build());
            return new UUID[]{calendar.getId(),first.getId()};
        });
        InventoryLockRepository ordered=(InventoryLockRepository)Proxy.newProxyInstance(
                InventoryLockRepository.class.getClassLoader(),new Class<?>[]{InventoryLockRepository.class},
                (proxy,method,args) -> {
                    Object value;
                    try {value=method.invoke(locks,args);} catch(InvocationTargetException e){throw e.getCause();}
                    if(method.getName().equals("findByOrderId")) {
                        @SuppressWarnings("unchecked") var list=new ArrayList<>((List<InventoryLock>)value);
                        list.sort(Comparator.comparingInt(l->l.getLockStatus()==InventoryLockStatus.LOCKED?0:1));
                        return list;
                    }
                    return value;
                });
        var service=new InventoryInternalService(configs,calendars,ordered);
        assertThrows(com.Gostay.BookingandInventory.exeption.AppException.class,
                ()->tx.executeWithoutResult(status->service.cancelLock(order)));
        tx.executeWithoutResult(status->{
            assertEquals(8,calendars.findById(ids[0]).orElseThrow().getAvailableQuantity());
            assertEquals(InventoryLockStatus.LOCKED,locks.findById(ids[1]).orElseThrow().getLockStatus());
        });
    }
}
