package com.gotravel.PaymentandWallet.transport.refund;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gotravel.PaymentandWallet.configuration.SepayConfig;
import com.gotravel.PaymentandWallet.configuration.VnpayConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Contract checks: a provider's accepted request is not proof that the customer received money. */
class ProviderRefundGatewayTest {
 private final ObjectMapper json=new ObjectMapper();
 private HttpClient http;
 private ProviderRefundGateway gateway;
 private VnpayConfig config;
 private JdbcTemplate jdbc;
 private Map<String,Object> leg;
 private Map<String,String> original;
 private static final String SECRET="test-merchant-secret-do-not-use";
 @BeforeEach void setup()throws Exception {
  config=new VnpayConfig();config.setHashSecret(SECRET);config.setTmnCode("DEMOTEST");config.setEnabled(true);
  jdbc=mock(JdbcTemplate.class);gateway=new ProviderRefundGateway(config,new SepayConfig(),jdbc,json);
  http=mock(HttpClient.class);ReflectionTestUtils.setField(gateway,"http",http);
  original=new LinkedHashMap<>();
  original.put("vnp_TmnCode","DEMOTEST");original.put("vnp_TxnRef","original-payment-ref");original.put("vnp_Amount","20000000");
  original.put("vnp_Version","2.1.0");original.put("vnp_TransactionDate","20261025120000");original.put("vnp_IpAddr","127.0.0.1");
  leg=new HashMap<>();leg.put("provider","VNPAY");leg.put("request_id","abc123");leg.put("request_json",json.writeValueAsString(original));leg.put("amount",new BigDecimal("200000"));
 }
 private Map<String,String> response(String status,String amount)throws Exception {
  var data=new LinkedHashMap<String,String>();
  data.put("vnp_ResponseId","refund-response");data.put("vnp_Command","refund");data.put("vnp_ResponseCode","00");data.put("vnp_Message","Success");data.put("vnp_TmnCode","DEMOTEST");data.put("vnp_TxnRef","original-payment-ref");data.put("vnp_Amount",amount);data.put("vnp_BankCode","NCB");data.put("vnp_PayDate","20261026130000");data.put("vnp_TransactionNo","90001");data.put("vnp_TransactionType","02");data.put("vnp_TransactionStatus",status);data.put("vnp_OrderInfo","GoTicket refund");
  String raw=String.join("|","refund-response","refund","00","Success","DEMOTEST","original-payment-ref",amount,"NCB","20261026130000","90001","02",status,"GoTicket refund");
  Mac mac=Mac.getInstance("HmacSHA512");mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA512"));data.put("vnp_SecureHash",HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8))));
  return data;
 }
 @SuppressWarnings("unchecked") private void returnResponse(Map<String,String> data)throws Exception {
  HttpResponse<String> response=mock(HttpResponse.class);when(response.statusCode()).thenReturn(200);when(response.body()).thenReturn(json.writeValueAsString(data));
  when(http.send(any(HttpRequest.class),any(HttpResponse.BodyHandler.class))).thenReturn(response);
 }
 @Test void pendingBankResponseDoesNotCompleteRefund()throws Exception {returnResponse(response("05","20000000"));assertEquals("PENDING",gateway.execute(leg,Map.of(),true).state());}
 @Test void signedWrongAmountCannotCompleteRefund()throws Exception {returnResponse(response("00","10000000"));assertEquals("PENDING",gateway.execute(leg,Map.of(),true).state());}
 @Test void forgedSuccessCannotCompleteRefund()throws Exception {var r=response("00","20000000");r.put("vnp_SecureHash","0".repeat(128));returnResponse(r);assertEquals("PENDING",gateway.execute(leg,Map.of(),true).state());}
 @Test void verifiedTerminalRefundCompletesWithProviderReference()throws Exception {returnResponse(response("00","20000000"));var result=gateway.execute(leg,Map.of(),true);assertEquals("SUCCEEDED",result.state());assertEquals("90001",result.reference());}
 @Test void ambiguousTimeoutNeverResubmitsVnpayRefund() {assertEquals("PENDING",gateway.execute(leg,Map.of(),false).state());verifyNoInteractions(http);}
 @Test void unsignedDuplicateQueryIsPendingRateLimitNotSignatureFailure()throws Exception {
  leg.put("provider_ref","90001");returnResponse(Map.of("vnp_ResponseCode","94","vnp_Message","Request is duplicated"));
  var result=gateway.execute(leg,Map.of(),false);
  assertEquals("PENDING",result.state());assertTrue(result.message().contains("94"));assertFalse(result.message().contains("Chữ ký"));
  assertFalse(json.readTree(result.response()).get("_signatureVerified").asBoolean());
 }
 @Test void signedQueryWithAbsentOptionalPromotionsUsesTheirEmptyChecksumPositions()throws Exception {
  leg.put("provider_ref","90001");var data=response("05","20000000");data.put("vnp_Command","querydr");data.put("vnp_TransactionType","03");
  String raw=String.join("|","refund-response","querydr","00","Success","DEMOTEST","original-payment-ref","20000000","NCB","20261026130000","90001","03","05","GoTicket refund","","");
  Mac mac=Mac.getInstance("HmacSHA512");mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA512"));data.put("vnp_SecureHash",HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8))));
  returnResponse(data);var result=gateway.execute(leg,Map.of(),false);
  assertEquals("PENDING",result.state());assertEquals("90001",result.reference());assertTrue(result.message().contains("05"));
  assertTrue(json.readTree(result.response()).get("_signatureVerified").asBoolean());
 }
 @Test void unsignedSuccessCanNeverCompleteRefund()throws Exception {
  var data=response("00","20000000");data.remove("vnp_SecureHash");returnResponse(data);
  assertEquals("PENDING",gateway.execute(leg,Map.of(),true).state());
 }
 private Map<String,Object> simulationPayment(String originalUrl){
  var id=UUID.randomUUID();config.setSandboxRefundSimulationEnabled(true);
  when(jdbc.queryForList(startsWith("select payment_url,tmn_code"),eq(id))).thenReturn(List.of(Map.of("payment_url",originalUrl,"tmn_code","DEMOTEST")));
  return Map.of("id",id,"provider","VNPAY","status","COMPLETED");
 }
 @Test void simulationRequiresExplicitServerFlag(){
  var payment=simulationPayment("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=test");config.setSandboxRefundSimulationEnabled(false);
  assertFalse(gateway.sandboxSimulationAllowed(payment));
 }
 @Test void completedOriginalSandboxPaymentCanBeSimulated(){
  assertTrue(gateway.sandboxSimulationAllowed(simulationPayment("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=test")));
 }
 @Test void changingCurrentConfigCannotMakeHistoricalProductionPaymentSimulatable(){
  assertFalse(gateway.sandboxSimulationAllowed(simulationPayment("https://pay.vnpay.vn/paymentv2/vpcpay.html?vnp_TxnRef=live")));
 }
 @Test void productionRuntimeDisablesSimulationEvenForHistoricalSandboxPayment(){
  var payment=simulationPayment("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=test");config.setPaymentUrl("https://pay.vnpay.vn/paymentv2/vpcpay.html");
  assertFalse(gateway.sandboxSimulationAllowed(payment));
 }

}
