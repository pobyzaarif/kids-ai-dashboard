import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: "Kids AI Console",
  description:
    "Console for your kids' AI voice companion — devices, roles, memories and features.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
