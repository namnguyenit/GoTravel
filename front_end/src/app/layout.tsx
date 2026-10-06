import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppProvider } from "../features/app/providers/app.provider";
import { AuthModalProvider } from "@/shared/context/AuthModalContext";
import AuthModal from "@/shared/components/AuthModal";
import { I18nProvider } from "@/shared/i18n/I18nProvider";
import LanguageToggle from "@/shared/components/LanguageToggle";

export const metadata: Metadata = {
  title: "GoTravel",
  description: "Tìm và đặt nơi lưu trú, trải nghiệm và dịch vụ trên GoTravel.",
  icons: {
    apple: "/brand/gotravel-icon-180.png",
    icon: [{ url: "/brand/gotravel-icon.svg", type: "image/svg+xml" }, { url: "/brand/gotravel-icon-32.png", sizes: "32x32", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppProvider>
      <AuthModalProvider>
        <html lang="vi">
          <body className="">
            <I18nProvider>
              {children}
              <AuthModal />
              <LanguageToggle variant="floating" />
            </I18nProvider>
          </body>
        </html>
      </AuthModalProvider>
    </AppProvider>
  );
}
