package com.gotravel.PaymentandWallet.transport.refund;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gotravel.PaymentandWallet.configuration.SepayConfig;
import com.gotravel.PaymentandWallet.configuration.VnpayConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Provider acceptance is not a successful refund. Only verified terminal success releases liability. */
@Component @RequiredArgsConstructor
public class ProviderRefundGateway {
    private final VnpayConfig vnpay;
    private final SepayConfig sepay;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    public record Reply(String state,String reference,String message,String response) {}
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private String value(Map<String,?> m,String key) { return m.get(key)==null?"":String.valueOf(m.get(key)); }
    public String environment(String provider) {
        if(provider.contains(" + "))return "MIXED";
        if("MOCK".equals(provider))return "MOCK";
        if("VNPAY".equals(provider))return URI.create(vnpay.getPaymentUrl()).getHost().equals("sandbox.vnpayment.vn")?"SANDBOX":"PRODUCTION";
        return "PRODUCTION";
    }
    public boolean sandboxSimulationAllowed(Map<String,Object> payment) {
        if(!vnpay.isSandboxRefundSimulationEnabled()||!vnpay.isEnabled()||!"VNPAY".equals(payment.get("provider"))
                ||!"COMPLETED".equals(payment.get("status"))||!"SANDBOX".equals(environment("VNPAY")))return false;
        var attempts=jdbc.queryForList("select payment_url,tmn_code from vnpay_payment_attempts where payment_request_id=? and status='SUCCEEDED' and response_code='00' and transaction_status='00'",payment.get("id"));
        if(attempts.size()!=1||!vnpay.getTmnCode().equals(attempts.get(0).get("tmn_code")))return false;
        // The recorded URL proves the original payment's environment. Changing the
        // current config to sandbox must never make a historical live charge eligible.
        try{var uri=URI.create(value(attempts.get(0),"payment_url"));return "https".equals(uri.getScheme())
            &&"sandbox.vnpayment.vn".equals(uri.getHost())&&uri.getUserInfo()==null&&uri.getPort()==-1
            &&"/paymentv2/vpcpay.html".equals(uri.getPath());}catch(Exception e){return false;}
    }
    private String vnpayApiUrl() {
        boolean sandbox=URI.create(vnpay.getPaymentUrl()).getHost().equals("sandbox.vnpayment.vn");
        String configured=vnpay.getRefundApiUrl();
        if(configured==null||configured.isBlank()) {
            if(sandbox)return "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
            throw new IllegalStateException("Production refund endpoint must come from the merchant contract");
        }
        URI uri=URI.create(configured);
        if(!"https".equals(uri.getScheme())||uri.getUserInfo()!=null||uri.getRawQuery()!=null||uri.getFragment()!=null||uri.getPort()!=-1||!"/merchant_webapi/api/transaction".equals(uri.getPath())||
            (sandbox?!"sandbox.vnpayment.vn".equals(uri.getHost()):!Set.of("pay.vnpay.vn","merchant.vnpay.vn").contains(uri.getHost())))throw new IllegalStateException("Invalid merchant refund endpoint");
        return configured;
    }
    public String unavailable(Map<String,Object> payment) {
        String provider=value(payment,"provider");
        if("MOCK".equals(provider))return null;
        if("VNPAY".equals(provider)) {
            if(!vnpay.isEnabled()||!vnpay.isRefundEnabled())return "VNPAY chưa được bật quyền gọi hoàn tiền trên hệ thống.";
            try{vnpayApiUrl();}catch(Exception e){return "Cần cấu hình URL API hoàn VNPAY production đúng hợp đồng merchant; không dùng suy đoán từ URL thanh toán.";}
            var rows=jdbc.queryForList("select tmn_code,transaction_no from vnpay_payment_attempts where payment_request_id=? and status='SUCCEEDED'",payment.get("id"));
            if(rows.size()!=1||!vnpay.getTmnCode().equals(rows.get(0).get("tmn_code"))||rows.get(0).get("transaction_no")==null)return "Thiếu giao dịch VNPAY gốc đã xác thực hoặc khác merchant; cần đối soát.";
            return null;
        }
        if(provider.isEmpty()||"SEPAY".equals(provider)) {
            if(!sepay.isRefundEnabled()||sepay.getApiToken()==null||sepay.getApiToken().isBlank()||!sepay.getRefundBankAccountId().matches("[0-9a-fA-F-]{36}"))return "SePay chưa cấu hình hoàn tiền API v2. Cần VietinBank doanh nghiệp được mở quyền, API token và UUID tài khoản ngân hàng.";
            var rows=jdbc.queryForList("select sepay_id from payment_transactions where payment_request_id=? and sepay_id is not null",payment.get("id"));
            if(rows.size()!=1)return "Chưa xác định được duy nhất giao dịch thu SePay gốc; cần đối soát trước khi hoàn.";
            return null;
        }
        return "Phương thức thanh toán này chưa hỗ trợ hoàn tự động; dùng quy trình đối soát/chứng từ.";
    }
    public Map<String,String> request(Map<String,Object> leg,Map<String,Object> payment) {
        if(!"VNPAY".equals(leg.get("provider")))return Map.of();
        var original=jdbc.queryForMap("select * from vnpay_payment_attempts where payment_request_id=? and status='SUCCEEDED'",payment.get("id"));
        var m=new LinkedHashMap<String,String>();
        m.put("vnp_RequestId",value(leg,"request_id"));m.put("vnp_Version","2.1.0");m.put("vnp_Command","refund");m.put("vnp_TmnCode",vnpay.getTmnCode());
        m.put("vnp_TransactionType",((BigDecimal)leg.get("amount")).compareTo((BigDecimal)payment.get("amount"))==0?"02":"03");
        m.put("vnp_TxnRef",value(original,"txn_ref"));m.put("vnp_Amount",((BigDecimal)leg.get("amount")).movePointRight(2).toBigIntegerExact().toString());
        m.put("vnp_TransactionNo",value(original,"transaction_no"));
        m.put("vnp_TransactionDate",DATE.format(((java.sql.Timestamp)original.get("created_at")).toLocalDateTime()));
        m.put("vnp_CreateBy","GoPayAdmin");m.put("vnp_CreateDate",DATE.format(LocalDateTime.now(VN)));m.put("vnp_IpAddr",vnpay.getRefundIpAddress());m.put("vnp_OrderInfo","GoTicket refund "+value(leg,"request_id"));
        m.put("vnp_SecureHash",hmac(join(m,"vnp_RequestId,vnp_Version,vnp_Command,vnp_TmnCode,vnp_TransactionType,vnp_TxnRef,vnp_Amount,vnp_TransactionNo,vnp_TransactionDate,vnp_CreateBy,vnp_CreateDate,vnp_IpAddr,vnp_OrderInfo"),vnpay.getHashSecret()));return m;
    }
    public Reply execute(Map<String,Object> leg,Map<String,Object> payment,boolean first) {
        String provider=value(leg,"provider");
        if("MOCK".equals(provider))return new Reply("SUCCEEDED","MOCK-"+leg.get("request_id"),"Đã hoàn mô phỏng, không chuyển tiền ngân hàng.","{\"mock\":true}");
        try {return "VNPAY".equals(provider)?vnpay(leg,first):sepay(leg,payment,first);}
        catch(InterruptedException e){Thread.currentThread().interrupt();return new Reply("PENDING",null,"Kết nối bị gián đoạn; đang đối soát, không gửi lệnh hoàn mới.",null);}
        catch(Exception e){return new Reply("PENDING",null,"Chưa xác minh được kết quả từ cổng thanh toán; tiếp tục đối soát cùng yêu cầu.",null);}
    }
    @SuppressWarnings("unchecked")
    private Map<String,Object> post(String url,Map<String,?> body,String token,String key)throws Exception {
        var b=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(10)).header("Content-Type","application/json").header("Accept","application/json");
        if(token!=null)b.header("Authorization","Bearer "+token);if(key!=null)b.header("X-Idempotency-Key",key);
        var r=http.send(b.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        if(r.body().length()>64000)throw new IllegalStateException("Provider response too large");
        var map=json.readValue(r.body(),Map.class);map.put("_http",r.statusCode());return map;
    }
    @SuppressWarnings("unchecked")
    private Reply sepay(Map<String,Object> leg,Map<String,Object> payment,boolean first)throws Exception {
        Map<String,Object> response;
        if(leg.get("provider_ref")==null) {
            var transaction=jdbc.queryForMap("select sepay_id from payment_transactions where payment_request_id=? and sepay_id is not null",payment.get("id"));
            response=post("https://userapi.sepay.vn/v2/transactions/"+transaction.get("sepay_id")+"/refund",Map.of("refund_amount",((BigDecimal)leg.get("amount")).toBigIntegerExact()),sepay.getApiToken(),value(leg,"request_id"));
        }else {
            String id=value(leg,"provider_ref");if(!id.matches("[A-Za-z0-9-]{1,100}"))throw new IllegalStateException();
            var request=HttpRequest.newBuilder(URI.create("https://userapi.sepay.vn/v2/bank-accounts/"+sepay.getRefundBankAccountId()+"/refunds/"+id)).timeout(Duration.ofSeconds(10)).header("Authorization","Bearer "+sepay.getApiToken()).GET().build();
            var r=http.send(request,HttpResponse.BodyHandlers.ofString());if(r.body().length()>64000)throw new IllegalStateException();response=json.readValue(r.body(),Map.class);response.put("_http",r.statusCode());
        }
        String raw=json.writeValueAsString(response);
        var data=response.get("data") instanceof Map?(Map<String,Object>)response.get("data"):Map.<String,Object>of();
        String state=value(data,"status"),ref=value(data,"refund_id");
        if(!data.isEmpty()) {
            String transaction=String.valueOf(jdbc.queryForObject("select sepay_id from payment_transactions where payment_request_id=? and sepay_id is not null",Long.class,payment.get("id")));
            if(!"VND".equals(value(data,"currency"))||new BigDecimal(value(data,"amount")).compareTo((BigDecimal)leg.get("amount"))!=0||!transaction.equals(value(data,"transaction_id"))||ref.isBlank())return new Reply("PENDING",null,"Phản hồi SePay chưa khớp giao dịch và số tiền; cần đối soát.",raw);
            if("succeeded".equals(state))return new Reply("SUCCEEDED",ref,"SePay xác nhận hoàn tiền thành công.",raw);
            if(List.of("failed","rejected").contains(state))return new Reply("FAILED",ref,"SePay từ chối hoặc hoàn thất bại; chưa ghi nhận đã hoàn.",raw);
            return new Reply("PENDING",ref,"SePay đã nhận yêu cầu, đang chờ ngân hàng xác nhận.",raw);
        }
        String code=value(response,"error_code");
        if(List.of("unsupported_bank","not_available","not_refundable","no_original_transaction","validation_error","refund_declined","refund_rejected").contains(code))return new Reply("FAILED",null,"SePay chưa thực hiện hoàn: "+code,raw);
        return new Reply("PENDING",null,"SePay chưa có kết quả chắc chắn; đang đối soát với cùng khóa chống trùng.",raw);
    }
    @SuppressWarnings("unchecked")
    private Reply vnpay(Map<String,Object> leg,boolean first)throws Exception {
        Map<String,String> original=json.readValue(value(leg,"request_json"),Map.class),request=new LinkedHashMap<>(original);
        String command="refund";
        if(!first) {
            if(leg.get("provider_ref")==null)return new Reply("PENDING",null,"VNPAY chưa trả mã hoàn. Cần đối soát merchant; không tự gửi lại lệnh có thể đã chi tiền.",null);
            command="querydr";request=new LinkedHashMap<>();
            for(String field:List.of("vnp_Version","vnp_TmnCode","vnp_TxnRef","vnp_TransactionDate","vnp_IpAddr"))request.put(field,original.get(field));
            request.put("vnp_RequestId",UUID.randomUUID().toString().replace("-",""));request.put("vnp_Command",command);request.put("vnp_TransactionNo",value(leg,"provider_ref"));request.put("vnp_CreateDate",DATE.format(LocalDateTime.now(VN)));request.put("vnp_OrderInfo","GoTicket refund status "+value(leg,"request_id"));
            request.put("vnp_SecureHash",hmac(join(request,"vnp_RequestId,vnp_Version,vnp_Command,vnp_TmnCode,vnp_TxnRef,vnp_TransactionDate,vnp_CreateDate,vnp_IpAddr,vnp_OrderInfo"),vnpay.getHashSecret()));
        }
        var response=post(vnpayApiUrl(),request,null,null);
        String fields="vnp_ResponseId,vnp_Command,vnp_ResponseCode,vnp_Message,vnp_TmnCode,vnp_TxnRef,vnp_Amount,vnp_BankCode,vnp_PayDate,vnp_TransactionNo,vnp_TransactionType,vnp_TransactionStatus,vnp_OrderInfo";
        if("querydr".equals(command))fields+=",vnp_PromotionCode,vnp_PromotionAmount";
        String signature=value(response,"vnp_SecureHash"),expected=hmac(join(response,fields),vnpay.getHashSecret());
        boolean verified=signature.matches("(?i)[0-9a-f]{128}")&&MessageDigest.isEqual(HexFormat.of().parseHex(signature),HexFormat.of().parseHex(expected));
        response.put("_requestCommand",command);response.put("_signatureVerified",verified);
        String raw=json.writeValueAsString(response);
        String code=value(response,"vnp_ResponseCode"),state=value(response,"vnp_TransactionStatus"),ref=value(response,"vnp_TransactionNo");
        String lookup=" Mã GD gốc: "+original.getOrDefault("vnp_TransactionNo",original.get("vnp_TxnRef"))+
            (leg.get("provider_ref")==null?".":". Mã hoàn: "+leg.get("provider_ref")+".");
        if(!verified){
            // The gateway also emits short, unsigned error envelopes. They explain an error,
            // but can never prove that money was returned or that retrying a debit is safe.
            if(signature.isBlank()&&"94".equals(code))return new Reply("PENDING",null,
                ("querydr".equals(command)?"VNPAY đang giới hạn truy vấn lặp (94). Hệ thống sẽ tra cứu lại sau vài phút; chưa có xác nhận hoàn thành.":"VNPAY báo đã có yêu cầu hoàn đang xử lý (94); đang đối soát cùng hồ sơ, không tạo lệnh chi mới.")+lookup,raw);
            if(signature.isBlank()&&!code.isBlank()&&!"00".equals(code))return new Reply("PENDING",null,"VNPAY trả mã lỗi "+code+" không kèm chữ ký xác nhận. Cần kiểm tra kết quả trước khi xử lý tiếp."+lookup,raw);
            return new Reply("PENDING",null,"Chữ ký phản hồi VNPAY chưa hợp lệ; không xác nhận hoàn."+lookup,raw);
        }
        if(!List.of("00","94").contains(code))return new Reply(List.of("02","03","91","95","97").contains(code)?"FAILED":"PENDING",null,"VNPAY trả mã "+code+"; chưa ghi nhận hoàn thành.",raw);
        if(!original.get("vnp_TmnCode").equals(value(response,"vnp_TmnCode"))||!original.get("vnp_TxnRef").equals(value(response,"vnp_TxnRef"))||!original.get("vnp_Amount").equals(value(response,"vnp_Amount"))||!List.of("02","03").contains(value(response,"vnp_TransactionType"))||!ref.matches("[0-9]{1,20}")||(!first&&!ref.equals(value(leg,"provider_ref"))))return new Reply("PENDING",null,"Phản hồi VNPAY chưa khớp lệnh hoàn, số tiền hoặc giao dịch; cần đối soát.",raw);
        if("00".equals(code)&&"00".equals(state))return new Reply("SUCCEEDED",ref,"VNPAY xác nhận hoàn tiền thành công.",raw);
        if(List.of("02","09").contains(state))return new Reply("FAILED",ref,"VNPAY xác nhận hoàn không thành công.",raw);
        return new Reply("PENDING",ref,"VNPAY đang xử lý hoàn (trạng thái "+state+"); chờ kết quả cuối từ ngân hàng. Mã GD gốc: "+original.get("vnp_TransactionNo")+". Mã hoàn: "+ref+".",raw);
    }
    public static String join(Map<String,?> values,String fields) {return Arrays.stream(fields.split(",")).map(k->values.get(k)==null?"":String.valueOf(values.get(k))).collect(java.util.stream.Collectors.joining("|"));}
    public static String hmac(String data,String secret) {
        try{Mac mac=Mac.getInstance("HmacSHA512");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA512"));return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));}
        catch(Exception e){throw new IllegalStateException("Unable to sign refund",e);}
    }
}
