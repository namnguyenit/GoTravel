import React, { useEffect } from "react";

export const RegisterPage: React.FC = () => {
  useEffect(() => {
    const isProd = typeof window !== "undefined" && window.location.hostname.includes("nonnet123.io.vn");
    const authOrigin = isProd ? "https://auth.nonnet123.io.vn" : "http://localhost:3335";
    const redirectUri = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
    window.location.href = `${authOrigin}?mode=register&redirect_uri=${redirectUri}`;
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
      <p className="text-gray-600 font-medium">Đang chuyển hướng đến Cổng đăng ký GoTravel ID...</p>
    </div>
  );
};
