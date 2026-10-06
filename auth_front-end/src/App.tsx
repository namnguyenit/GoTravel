import React, { useState, useEffect, useRef } from "react";
import "./auth-theme.css";
import { safeRedirect } from "./platform-domains";
import {
  AuthService,
  clearAuthCookie,
} from "./services/auth.service";
import {
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type AuthView = "login" | "register" | "forgot-password" | "reset-password";

export default function App() {
  // Query parameters: redirect_uri, mode, action
  const [redirectUri, setRedirectUri] = useState<string>("");

  // Views: 'login' | 'register' | 'forgot-password' | 'reset-password'
  const [view, setView] = useState<AuthView>("login");
  const [isLeaving, setIsLeaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionTo = (nextView: AuthView) => {
    if (nextView === view && !isLeaving) return;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);

    const order: Record<AuthView, number> = {
      login: 0,
      register: 1,
      "forgot-password": 1,
      "reset-password": 2,
    };
    setDirection(order[nextView] >= order[view] ? "forward" : "back");

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setIsLeaving(false);
      setView(nextView);
      return;
    }

    setIsLeaving(true);
    transitionTimer.current = setTimeout(() => {
      setView(nextView);
      setIsLeaving(false);
      transitionTimer.current = null;
    }, 220);
  };

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
  }, []);

  // Loading & error/success messages
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Login form states
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form states
  const [regUsername, setRegUsername] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhoneNumber, setRegPhoneNumber] = useState("");
  const [regDateOfBirth, setRegDateOfBirth] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Forgot/Reset password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check URL parameters and active SSO session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = safeRedirect(params.get("redirect_uri") || params.get("continue"), window.location.origin);
    const action = params.get("action") || "";
    const mode = params.get("mode") || "";

    if (mode === "register") {
      setView("register");
    }

    setRedirectUri(target);

    // Handle logout action
    if (action === "logout" || window.location.pathname === "/logout") {
      void clearAuthCookie()
        .then(() => setSuccess("Bạn đã đăng xuất khỏi GoID."))
        .catch(() => setError("Không thể đăng xuất lúc này. Vui lòng thử lại."));
      return;
    }

    // NẾU NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP: Tự động chuyển hướng ngay về GoTravel / redirect_uri
    void AuthService.getMe().then((profile) => {
      if (profile) {
        window.location.replace(target);
      }
    });
  }, []);

  // Completion handoff to redirect_uri or GoStay
  const handleAuthSuccess = () => {
    const destination = redirectUri || safeRedirect(null, window.location.origin);
    setSuccess("Xác thực thành công. Đang chuyển hướng...");
    setTimeout(() => {
      window.location.replace(destination);
    }, 400);
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await AuthService.login({
        username: loginUsername.trim(),
        password: loginPassword,
      });
      handleAuthSuccess();
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      const errorMessages: Record<string, string> = {
        USER_NOT_FOUND: "Tài khoản không tồn tại. Vui lòng kiểm tra lại tên đăng nhập.",
        UNAUTHENTICATED: "Mật khẩu không chính xác. Vui lòng thử lại.",
        BANNED_USER: "Tài khoản của bạn đã bị khóa.",
        DELETE_USER: "Tài khoản này đã bị xóa.",
      };
      const msg =
        (authError.code && errorMessages[authError.code]) ||
        authError.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (regUsername.trim().length < 3) {
      setError("Tên đăng nhập phải từ 3 ký tự trở lên.");
      return;
    }

    if (regPassword.length < 8) {
      setError("Mật khẩu phải từ 8 ký tự trở lên.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Mật khẩu và Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      await AuthService.register({
        username: regUsername.trim(),
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhoneNumber.trim(),
        dateOfBirth: regDateOfBirth,
        password: regPassword,
        role: "USER",
      });

      // Auto login after registration
      await AuthService.login({
        username: regUsername.trim(),
        password: regPassword,
      });

      handleAuthSuccess();
    } catch (err: unknown) {
      const authError = err as { message?: string };
      setError(authError.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!forgotEmail.trim()) {
      setError("Vui lòng nhập email tài khoản.");
      return;
    }

    setLoading(true);
    try {
      await AuthService.forgotPassword(forgotEmail.trim());
      setResetEmail(forgotEmail.trim());
      transitionTo("reset-password");
      setSuccess("Nếu email tồn tại, mã xác thực đã được gửi. Vui lòng kiểm tra hộp thư.");
    } catch (err: unknown) {
      const authError = err as { message?: string };
      setError(authError.message || "Không thể gửi yêu cầu đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (resetPassword.length < 8) {
      setError("Mật khẩu mới phải từ 8 ký tự trở lên.");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        newPassword: resetPassword,
      });
      setLoginUsername(resetEmail.trim());
      setLoginPassword("");
      transitionTo("login");
      setSuccess("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
    } catch (err: unknown) {
      const authError = err as { message?: string };
      setError(authError.message || "Mã xác thực không hợp lệ hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const title =
    view === "login"
      ? "Đăng nhập"
      : view === "register"
      ? "Tạo tài khoản"
      : view === "forgot-password"
      ? "Quên mật khẩu"
      : "Đặt lại mật khẩu";

  const description =
    view === "login"
      ? "Truy cập GoTravel và GoTicket với GoID."
      : view === "register"
      ? "Điền thông tin để tạo tài khoản GoID."
      : view === "forgot-password"
      ? "Nhập email tài khoản để nhận mã xác thực đặt lại mật khẩu."
      : "Nhập mã xác thực trong email và tạo mật khẩu mới.";

  return (
    <div className="sso-page-container">
      <div className="auth-shell">
        <aside className="auth-story" aria-label="GoID">
          <div className="story-glow story-glow-one" aria-hidden="true" />
          <div className="story-glow story-glow-two" aria-hidden="true" />
          <div className="identity-brand"><img src="/brand/goid-symbol-white.svg" width="42" height="42" alt="" /><span className="brand-wordmark">go<span className="brand-suffix">id</span><i>.</i></span></div>
          <div className="identity-scene" aria-hidden="true">
            <div className="scene-orbit orbit-one" />
            <div className="scene-orbit orbit-two" />
            <div className="scene-dot scene-dot-one" />
            <div className="scene-dot scene-dot-two" />
            <div className="scene-core"><img src="/brand/goid-symbol-white.svg" width="104" height="104" alt="" /><span className="brand-wordmark">go<span className="brand-suffix">id</span><i>.</i></span></div>
            <div className="scene-product scene-travel"><img src="/brand/gotravel-symbol.svg" width="35" height="35" alt="" /><span className="brand-wordmark">go<span className="brand-suffix">travel</span><i>.</i></span></div>
            <div className="scene-product scene-ticket"><img src="/brand/goticket-symbol.svg" width="35" height="35" alt="" /><span className="brand-wordmark">go<span className="brand-suffix">ticket</span><i>.</i></span></div>
          </div>
        <div className="story-copy"><h2>Một tài khoản. Mọi hành trình.</h2><p>GoTravel · GoTicket</p></div>
          <div className="story-bottom"><span className="story-line" /> GoID</div>
        </aside>
        <main className="gostay-auth-card">
          <div className="card-header-bar">
          <div className="mobile-brand"><img src="/brand/goid-symbol.svg" width="40" height="40" alt="" /><span className="brand-wordmark">go<span className="brand-suffix">id</span><i>.</i></span></div>
          <button
            type="button"
            className="header-back-btn"
            onClick={() => {
              const backUrl = redirectUri || safeRedirect(null, window.location.origin);
              window.location.href = backUrl;
            }}
            aria-label="Quay lại dịch vụ trước đó"
            title="Quay lại"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`card-content-body${isLeaving ? " is-leaving" : ""}`} data-direction={direction} key={view} inert={isLeaving}>
          <h1 className="auth-main-title">{title}</h1>
          <p className="auth-sub-desc">{description}</p>

          {/* Status Alert Messages */}
          {error && (
            <div className="msg-alert danger" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="msg-alert success" role="status">
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{success}</div>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === "login" && (
            <form onSubmit={handleLogin}>
              <div className="floating-input-group">
                <input
                  id="login_username"
                  type="text"
                  autoComplete="username"
                  className="floating-input"
                  placeholder=" "
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  autoFocus
                />
                <label htmlFor="login_username" className="floating-label">
                  Tên đăng nhập
                </label>
              </div>

              <div className="floating-input-group">
                <input
                  id="login_password"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="floating-input has-icon-right"
                  placeholder=" "
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <label htmlFor="login_password" className="floating-label">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  className="input-eye-button"
                  aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="form-extra-actions">
                <button
                  type="button"
                  className="text-action-link"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    transitionTo("forgot-password");
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button type="submit" disabled={loading} className="gostay-submit-btn">
                {loading ? (
                  <>
                    <div className="spinner-dot"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <><span>Đăng nhập</span><ArrowRight size={18} /></>
                )}
              </button>

              <div className="switch-view-footer">
                <span>Chưa có tài khoản?</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    transitionTo("register");
                  }}
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {view === "register" && (
            <form onSubmit={handleRegister}>
              <div className="form-row-grid">
                <div className="floating-input-group">
                  <input
                    id="reg_username"
                  autoComplete="username"
                    type="text"
                    className="floating-input"
                    placeholder=" "
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    autoFocus
                  />
                  <label htmlFor="reg_username" className="floating-label">
                    Tên đăng nhập
                  </label>
                </div>

                <div className="floating-input-group">
                  <input
                    id="reg_fullName"
                  autoComplete="name"
                    type="text"
                    className="floating-input"
                    placeholder=" "
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                  />
                  <label htmlFor="reg_fullName" className="floating-label">
                    Họ và Tên
                  </label>
                </div>
              </div>

              <div className="floating-input-group">
                <input
                  id="reg_email"
                  autoComplete="email"
                  type="email"
                  className="floating-input"
                  placeholder=" "
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
                <label htmlFor="reg_email" className="floating-label">
                  Email
                </label>
              </div>

              <div className="form-row-grid">
                <div className="floating-input-group">
                  <input
                    id="reg_phoneNumber"
                  autoComplete="tel"
                    type="tel"
                    className="floating-input"
                    placeholder=" "
                    value={regPhoneNumber}
                    onChange={(e) => setRegPhoneNumber(e.target.value)}
                    required
                  />
                  <label htmlFor="reg_phoneNumber" className="floating-label">
                    Số điện thoại
                  </label>
                </div>

                <div className="floating-input-group">
                  <input
                    id="reg_dateOfBirth"
                  autoComplete="bday"
                    type="date"
                    className="floating-input"
                    placeholder=" "
                    value={regDateOfBirth}
                    onChange={(e) => setRegDateOfBirth(e.target.value)}
                    required
                  />
                  <label htmlFor="reg_dateOfBirth" className="floating-label">
                    Ngày sinh
                  </label>
                </div>
              </div>

              <div className="floating-input-group">
                <input
                  id="reg_password"
                  type={showRegPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="floating-input has-icon-right"
                  placeholder=" "
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <label htmlFor="reg_password" className="floating-label">
                  Mật khẩu (tối thiểu 8 ký tự)
                </label>
                <button
                  type="button"
                  className="input-eye-button"
                  aria-label={showRegPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowRegPassword(!showRegPassword)}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="floating-input-group">
                <input
                  id="reg_confirm_password"
                  type={showRegConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="floating-input has-icon-right"
                  placeholder=" "
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                />
                <label htmlFor="reg_confirm_password" className="floating-label">
                  Xác nhận mật khẩu
                </label>
                <button
                  type="button"
                  className="input-eye-button"
                  aria-label={showRegConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                >
                  {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button type="submit" disabled={loading} className="gostay-submit-btn">
                {loading ? (
                  <>
                    <div className="spinner-dot"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <><span>Tạo tài khoản</span><ArrowRight size={18} /></>
                )}
              </button>

              <div className="switch-view-footer">
                <span>Đã có tài khoản?</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    transitionTo("login");
                  }}
                >
                  Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword}>
              <div className="floating-input-group">
                <input
                  id="forgot_email"
                  autoComplete="email"
                  type="email"
                  className="floating-input"
                  placeholder=" "
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
                <label htmlFor="forgot_email" className="floating-label">
                  Email tài khoản
                </label>
              </div>

              <button type="submit" disabled={loading} className="gostay-submit-btn" style={{ marginTop: 8 }}>
                {loading ? (
                  <>
                    <div className="spinner-dot"></div>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <><span>Gửi mã xác thực</span><ArrowRight size={18} /></>
                )}
              </button>

              <div className="switch-view-footer">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    transitionTo("login");
                  }}
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* VIEW: RESET PASSWORD */}
          {view === "reset-password" && (
            <form onSubmit={handleResetPassword}>
              <div className="floating-input-group">
                <input
                  id="reset_email"
                  autoComplete="email"
                  type="email"
                  className="floating-input"
                  placeholder=" "
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
                <label htmlFor="reset_email" className="floating-label">
                  Email tài khoản
                </label>
              </div>

              <div className="floating-input-group">
                <input
                  id="reset_otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  type="text"
                  className="floating-input"
                  placeholder=" "
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  required
                  autoFocus
                />
                <label htmlFor="reset_otp" className="floating-label">
                  Mã xác thực OTP
                </label>
              </div>

              <div className="floating-input-group">
                <input
                  id="reset_password"
                  type={showResetPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="floating-input has-icon-right"
                  placeholder=" "
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
                <label htmlFor="reset_password" className="floating-label">
                  Mật khẩu mới
                </label>
                <button
                  type="button"
                  className="input-eye-button"
                  aria-label={showResetPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                  onClick={() => setShowResetPassword(!showResetPassword)}
                >
                  {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="floating-input-group">
                <input
                  id="reset_confirm_password"
                  type={showResetPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="floating-input"
                  placeholder=" "
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                />
                <label htmlFor="reset_confirm_password" className="floating-label">
                  Xác nhận mật khẩu mới
                </label>
              </div>

              <button type="submit" disabled={loading} className="gostay-submit-btn" style={{ marginTop: 8 }}>
                {loading ? (
                  <>
                    <div className="spinner-dot"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <><span>Đặt lại mật khẩu</span><ArrowRight size={18} /></>
                )}
              </button>

              <div className="switch-view-footer">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    transitionTo("forgot-password");
                  }}
                >
                  Gửi lại mã
                </button>
                {" · "}
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    transitionTo("login");
                  }}
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}
        </div>
        </main>
      </div>

      <div className="sso-page-footer">
        <span>© 2026 GoID</span><span>GoTravel · GoTicket</span>
      </div>
    </div>
  );
}
