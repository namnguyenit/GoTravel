"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { platformUrls } from "@/shared/platform-domains";

type AuthView = "login" | "register" | "forgot-password" | "reset-password";

interface AuthModalContextProps {
  isOpen: boolean;
  view: AuthView;
  openModal: (view?: AuthView) => void;
  closeModal: () => void;
  setView: (view: AuthView) => void;
}

const AuthModalContext = createContext<AuthModalContextProps | undefined>(undefined);

const getSSOUrl = (view: AuthView = "login") => {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const authOrigin = platformUrls(typeof window !== "undefined" ? window.location.hostname : "localhost").sso;
  const params = new URLSearchParams();
  if (currentUrl) params.set("redirect_uri", currentUrl);
  if (view === "register") params.set("mode", "register");
  return `${authOrigin}?${params.toString()}`;
};

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");

  // Real-time Single Logout (SLO) / Login sync across tabs via BroadcastChannel
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("gotravel_sso_channel");
      channel.onmessage = (event) => {
        if (event.data?.type === "SSO_LOGOUT" || event.data?.type === "SSO_LOGIN") {
          window.location.reload();
        }
      };
      return () => {
        channel.close();
      };
    }
  }, []);

  const openModal = (initialView: AuthView = "login") => {
    // Chuyển hướng sang Cổng Đăng Nhập Tập Trung (Unified SSO Auth App)
    if (typeof window !== "undefined") {
      window.location.href = getSSOUrl(initialView);
      return;
    }
    setView(initialView);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, view, openModal, closeModal, setView }}>
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};
