import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
public class PasswordCostProbe {
  public static void main(String[] args) {
    String raw = "non-production-benchmark-password";
    ThreadMXBean bean = ManagementFactory.getThreadMXBean();
    BCryptPasswordEncoder warm = new BCryptPasswordEncoder(10);
    String warmHash = warm.encode(raw);
    for (int i = 0; i < 12; i++) warm.matches(raw, warmHash);
    System.out.println("{\"java\":\""+System.getProperty("java.version")+"\",\"library\":\"spring-security-crypto-7.0.4\",\"warmupMatches\":12}");
    for (int cost : new int[] {15,13,12,11}) {
      BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(cost);
      String hash = encoder.encode(raw);
      for (int i = 0; i < 3; i++) {
        long t = System.nanoTime(), cpu = bean.getCurrentThreadCpuTime();
        boolean ok = encoder.matches(raw, hash);
        long cpuDelta = bean.getCurrentThreadCpuTime() - cpu;
        double wall = (System.nanoTime()-t)/1e6;
        System.out.printf(java.util.Locale.ROOT,"{\"cost\":%d,\"sample\":%d,\"verified\":%s,\"wallMs\":%.2f,\"threadCpuMs\":%.2f}%n",cost,i+1,ok,wall,cpuDelta/1e6);
      }
    }
    // Constructor strength controls new hashes; matching honors the existing stored hash.
    BCryptPasswordEncoder old = new BCryptPasswordEncoder(15);
    String oldHash = old.encode(raw);
    long t=System.nanoTime();
    boolean ok=new BCryptPasswordEncoder(12).matches(raw,oldHash);
    System.out.printf(java.util.Locale.ROOT,"{\"newEncoderCost\":12,\"storedCost\":15,\"verified\":%s,\"wallMs\":%.2f}%n",ok,(System.nanoTime()-t)/1e6);
  }
}
