import React, { useState, useEffect } from "react";
import {
  AuthService,
  getAuthToken,
  isTokenValid,
  clearAuthCookie,
} from "./services/auth.service";
import {
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function App() {
  // Query parameters: redirect_uri, mode, action
  const [redirectUri, setRedirectUri] = useState<string>("");

  // Views: 'login' | 'register' | 'forgot-password' | 'reset-password'
  const [view, setView] = useState<"login" | "register" | "forgot-password" | "reset-password">("login");

  // Loading & error/success messages
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Login form states
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
    const target = params.get("redirect_uri") || params.get("continue") || "";
    const action = params.get("action") || "";
    const mode = params.get("mode") || "";

    if (mode === "register") {
      setView("register");
    }

    if (target) {
      setRedirectUri(target);
    } else {
      const defaultHost = window.location.hostname.includes("nonnet123.io.vn")
        ? "https://gostay.nonnet123.io.vn"
        : "http://localhost:3000";
      setRedirectUri(defaultHost);
    }

    // Handle logout action
    if (action === "logout" || window.location.pathname === "/logout") {
      clearAuthCookie();
      setSuccess("Bạn đã đăng xuất an toàn khỏi toàn bộ hệ thống GoTravel.");
      return;
    }

    // NẾU NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP: Tự động chuyển hướng ngay về GoTravel / redirect_uri
    const token = getAuthToken();
    if (token && isTokenValid(token)) {
      const destination = target || (window.location.hostname.includes("nonnet123.io.vn")
        ? "https://gostay.nonnet123.io.vn"
        : "http://localhost:3000");
      window.location.replace(destination);
    }
  }, []);

  // Completion handoff to redirect_uri or GoStay
  const handleAuthSuccess = () => {
    const destination = redirectUri || (window.location.hostname.includes("nonnet123.io.vn")
      ? "https://gostay.nonnet123.io.vn"
      : "http://localhost:3000");
    setSuccess("Xác thực thành công! Đang chuyển hướng...");
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
      setView("reset-password");
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
      setView("login");
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
      ? "Chào mừng bạn trở lại"
      : view === "register"
      ? "Tạo tài khoản mới"
      : view === "forgot-password"
      ? "Quên mật khẩu"
      : "Đặt lại mật khẩu";

  const description =
    view === "login"
      ? "Vui lòng điền thông tin để đăng nhập vào tài khoản của bạn."
      : view === "register"
      ? "Mọi tiện ích du lịch chỉ cách bạn vài thao tác đơn giản."
      : view === "forgot-password"
      ? "Nhập email tài khoản để nhận mã xác thực đặt lại mật khẩu."
      : "Nhập mã xác thực trong email và tạo mật khẩu mới.";

  return (
    <div className="sso-page-container">
      <div className="gostay-auth-card">
        {/* Header Bar - Clean matching GoStay modal */}
        <div className="card-header-bar">
          <button
            type="button"
            className="header-back-btn"
            onClick={() => {
              const backUrl = redirectUri || (window.location.hostname.includes("nonnet123.io.vn")
                ? "https://gostay.nonnet123.io.vn"
                : "http://localhost:3000");
              window.location.href = backUrl;
            }}
            title="Quay lại"
          >
            <X size={18} />
          </button>
          <h2 className="header-modal-title">Đăng nhập hoặc đăng ký</h2>
          <div style={{ width: 32 }}></div>
        </div>

        {/* Content Body */}
        <div className="card-content-body">
          <h3 className="auth-main-title">{title}</h3>
          <p className="auth-sub-desc">{description}</p>

          {/* Status Alert Messages */}
          {error && (
            <div className="msg-alert danger">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="msg-alert success">
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
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="form-extra-actions">
                <label className="remember-me-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Duy trì đăng nhập (30 ngày)</span>
                </label>

                <button
                  type="button"
                  className="text-action-link"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView("forgot-password");
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
                  <span>Tiếp tục</span>
                )}
              </button>

              <div className="or-divider">
                <div className="or-divider-line"></div>
                <span className="or-divider-text">hoặc</span>
                <div className="or-divider-line"></div>
              </div>

              <div className="social-buttons-container">
                <button type="button" className="social-auth-btn">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </button>

                <button type="button" className="social-auth-btn">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Tiếp tục với Facebook</span>
                </button>
              </div>

              <div className="switch-view-footer">
                <span>Chưa có tài khoản?</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView("register");
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
                  onClick={() => setShowRegPassword(!showRegPassword)}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="floating-input-group">
                <input
                  id="reg_confirm_password"
                  type={showRegConfirmPassword ? "text" : "password"}
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
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                >
                  {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <p style={{ fontSize: 11, color: "#717171", margin: "8px 0 14px 0", lineHeight: 1.4 }}>
                Bằng cách chọn Đăng ký tài khoản, tôi đồng ý với các{" "}
                <span style={{ fontWeight: 600, color: "#222", textDecoration: "underline" }}>
                  Điều khoản
                </span>{" "}
                của GoTravel.
              </p>

              <button type="submit" disabled={loading} className="gostay-submit-btn">
                {loading ? (
                  <>
                    <div className="spinner-dot"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Đăng ký tài khoản</span>
                )}
              </button>

              <div className="switch-view-footer">
                <span>Đã có tài khoản?</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView("login");
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
                  <span>Gửi mã xác thực</span>
                )}
              </button>

              <div className="switch-view-footer">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView("login");
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
                  onClick={() => setShowResetPassword(!showResetPassword)}
                >
                  {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="floating-input-group">
                <input
                  id="reset_confirm_password"
                  type={showResetPassword ? "text" : "password"}
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
                  <span>Đặt lại mật khẩu</span>
                )}
              </button>

              <div className="switch-view-footer">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView("forgot-password");
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
                    setView("login");
                  }}
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="sso-page-footer">
        <span>© 2026 GoTravel Ecosystem</span>
      </div>
    </div>
  );
}
