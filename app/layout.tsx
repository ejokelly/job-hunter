import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { AuthProvider as FrontendAuthProvider } from "@/app/providers/auth-provider";
import { UIProvider } from "@/app/providers/ui-state-provider";
import { DeviceProvider } from "@/app/providers/device-provider";
import { AuthProvider } from "@/app/lib/auth/providers";
import { PostHogProvider } from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "resume love - Intelligent Resume Parser & Generator",
  description: "Upload your resume and extract information using advanced technology. Create tailored resumes and cover letters that match job descriptions perfectly.",
  keywords: "resume parser, resume generator, smart resume, resume extraction, job application",
  authors: [{ name: "EJ O'Kelly" }],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "resume love - Intelligent Resume Parser & Generator",
    description: "Upload your resume and extract information using advanced technology",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <AuthProvider>
            <ThemeProvider>
              <DeviceProvider>
                <FrontendAuthProvider>
                  <UIProvider>
                    {children}
                  </UIProvider>
                </FrontendAuthProvider>
              </DeviceProvider>
            </ThemeProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
