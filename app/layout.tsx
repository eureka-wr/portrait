import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./portrait.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "CATV 职业肖像工作室：人工接单、AI 辅助生成、人工审核与私有交付的职业肖像生产系统。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: {
      default: "CATV Portrait Studio",
      template: "%s · CATV Portrait Studio",
    },
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: "CATV Portrait Studio",
      title: "不用变成别人，也能看起来更职业。",
      description,
      images: [{ url: socialImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "不用变成别人，也能看起来更职业。",
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
