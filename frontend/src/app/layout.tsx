import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MentorSpace — 1-on-1 Mentorship Platform",
  description:
    "Real-time collaborative mentorship with code editor, video call, and chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
