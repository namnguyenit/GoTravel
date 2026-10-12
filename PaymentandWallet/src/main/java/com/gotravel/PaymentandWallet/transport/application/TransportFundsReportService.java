package com.gotravel.PaymentandWallet.transport.application;
import com.gotravel.PaymentandWallet.transport.domain.TransportFundsQuery;
import lombok.RequiredArgsConstructor;import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;import java.util.Map;import java.util.UUID;
@Service @RequiredArgsConstructor
public class TransportFundsReportService {
 private final TransportFundsQuery query;
 public Map<String,Object> report(UUID ownerUserId,LocalDate from,LocalDate to){
  if(from==null||to==null||to.isBefore(from)||java.time.temporal.ChronoUnit.DAYS.between(from,to)>365)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  return query.report(ownerUserId,from,to);
 }
}
