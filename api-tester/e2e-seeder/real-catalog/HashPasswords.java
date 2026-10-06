import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.bcrypt.BCrypt;

/** Pipe private seed passwords through stdin; never use process arguments. */
public class HashPasswords {
    public static void main(String[] args) throws Exception {
        BufferedReader input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String password;
        while ((password = input.readLine()) != null) {
            String encoded = BCrypt.hashpw(password, BCrypt.gensalt(12));
            if (!BCrypt.checkpw(password, encoded)) throw new IllegalStateException("BCrypt verification failed");
            System.out.println(encoded);
        }
    }
}
