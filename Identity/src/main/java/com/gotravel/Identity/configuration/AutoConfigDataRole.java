package com.gotravel.Identity.configuration;

import com.gotravel.Identity.entity.Role;
import com.gotravel.Identity.repository.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@FieldDefaults(level = AccessLevel.PRIVATE , makeFinal = true)
@RequiredArgsConstructor
public class AutoConfigDataRole {
    RoleRepository roleRepository;

    @Bean(name = "AutoConfigDataRole")
    ApplicationRunner applicationRunner(){
        return arg -> {
            if(!roleRepository.existsById("USER")){
                Role role = Role.builder()
                        .name(com.gotravel.Identity.enums.Role.USER.name())
                        .build();
                roleRepository.save(role);
            }
            if(!roleRepository.existsById("ADMIN")){
                Role role = Role.builder()
                        .name(com.gotravel.Identity.enums.Role.ADMIN.name())
                        .build();
                roleRepository.save(role);
            }
            if(!roleRepository.existsById("HOST")){
                Role role = Role.builder()
                        .name(com.gotravel.Identity.enums.Role.HOST.name())
                        .build();
                roleRepository.save(role);
            }
            if(!roleRepository.existsById("ENTERPRISE")){
                Role role = Role.builder()
                        .name(com.gotravel.Identity.enums.Role.ENTERPRISE.name())
                        .build();
                roleRepository.save(role);
            }
            if(!roleRepository.existsById("TICKET_VENDOR")){
                Role role = Role.builder()
                        .name(com.gotravel.Identity.enums.Role.TICKET_VENDOR.name())
                        .build();
                roleRepository.save(role);
            }
            log.info("server was create some role");
        };
    }
}
