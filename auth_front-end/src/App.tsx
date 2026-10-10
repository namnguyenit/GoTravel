import React, { useState, useEffect, useRef } from "react";
import "./auth-theme.css";
import hoiAnImage from "./assets/hoi-an-rain.jpg";
import ninhBinhImage from "./assets/ninh-binh-river.jpg";
import phuQuocImage from "./assets/phu-quoc-beach.jpg";
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

const scenes = [phuQuocImage, ninhBinhImage, hoiAnImage] as const;
const SCENE_DURATION_MS = 8500;

export default function App() {
  // Query parameters: redirect_uri, mode, action
  const [redirectUri, setRedirectUri] = useState<string>("");

  // Views: 'login' | 'register' | 'forgot-password' | 'reset-password'
  const [view, setView] = useState<AuthView>("login");
  const [isLeaving, setIsLeaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [previousScene, setPreviousScene] = useState<number | null>(null);
  const [scenePaused, setScenePaused] = useState(false);

  const selectScene = (index: number) => {
    if (index === activeScene) return;
    setPreviousScene(activeScene);
    setActiveScene(index);
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactScreen = window.matchMedia("(max-width: 700px)");
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      const shouldPause = document.hidden || reducedMotion.matches || (compactScreen.matches && view !== "login");
      setScenePaused(shouldPause);
      if (!shouldPause) {
        timer = window.setTimeout(() => selectScene((activeScene + 1) % scenes.length), SCENE_DURATION_MS);
      }
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    reducedMotion.addEventListener("change", schedule);
    compactScreen.addEventListener("change", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
      reducedMotion.removeEventListener("change", schedule);
      compactScreen.removeEventListener("change", schedule);
    };
  }, [activeScene, view]);

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

  // Completion handoff to redirect_uri or GoTravel
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
      ? "Đăng nhập một lần để tiếp tục cùng GoTravel và GoCar."
    : view === "register"
      ? "Một tài khoản cho những chuyến đi và điểm dừng chân của bạn."
      : view === "forgot-password"
      ? "Nhập email tài khoản để nhận mã xác thực đặt lại mật khẩu."
      : "Nhập mã xác thực trong email và tạo mật khẩu mới.";

  return (
    <div className="sso-page-container" data-view={view}>
      <div className="auth-shell">
        <aside className={`auth-story${scenePaused ? " is-paused" : ""}`} aria-label="Hình ảnh hành trình GoTravel và GoCar">
          <div className="story-photos" aria-hidden="true">
            {scenes.map((image, index) => (
              <div
                key={image}
                className={`story-frame${index === activeScene ? " is-active" : index === previousScene ? " is-previous" : ""}`}
              >
                <img className="story-photo" src={image} alt="" loading="eager" />
              </div>
            ))}
          </div>
          <div className="story-shade" aria-hidden="true" />
          <img className="story-brand" src="/brand/goid-lockup-white.svg" width="164" height="64" alt="GoID" />
        </aside>
        <main className="gostay-auth-card">
          <div className="card-header-bar">
          <div className="mobile-brand"><img src="/brand/goid-lockup-black.svg" width="104" height="36" alt="GoID" /></div>
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
        <span>© 2026 GoID</span><span>GoTravel · GoCar</span>
      </div>
    </div>
  );
}
