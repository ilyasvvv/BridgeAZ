import type { Metadata } from "next";
import { League_Spartan } from "next/font/google";
import "./globals.css";

const spartan = League_Spartan({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-spartan",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "bizim circle — Azerbaijanis abroad, united in one circle",
  description:
    "A social platform for Azerbaijanis living abroad. Join circles, find your people, share opportunities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spartan.variable}>
      <body className="font-sans bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
