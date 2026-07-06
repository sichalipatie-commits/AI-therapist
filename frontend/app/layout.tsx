import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindEase — Emotional Therapist AI",
  description:
    "A compassionate AI-powered emotional therapist that listens, understands, and responds with empathy.",
  keywords: ["therapy", "mental health", "AI", "emotion", "chatbot"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ height: "100%", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
