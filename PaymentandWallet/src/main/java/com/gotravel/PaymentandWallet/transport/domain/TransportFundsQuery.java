package com.gotravel.PaymentandWallet.transport.domain;
import java.time.LocalDate;import java.util.Map;import java.util.UUID;
public interface TransportFundsQuery { Map<String,Object> report(UUID ownerUserId,LocalDate from,LocalDate to); }
