import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Морской бой",
  description: "Production-ready Battleship app with advanced AI and cloud persistence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}