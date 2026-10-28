import { ReactNode, Suspense } from "react";

import MainLayoutClient from "@/features/app/components/MainLayoutClient";
import { ClientLocationProvider } from "@/shared/context/ClientLocationContext";
import { CartProvider } from "@/shared/context/CartContext";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ClientLocationProvider>
    <CartProvider>
      <Suspense fallback={null}>
        <MainLayoutClient>{children}</MainLayoutClient>
      </Suspense>
    </CartProvider>
    </ClientLocationProvider>
  );
}
