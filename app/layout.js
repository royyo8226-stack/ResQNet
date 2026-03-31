import { ThemeProvider } from "@/components/ThemeProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AppToaster from "@/components/AppToaster";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const displayFont = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata = {
  title: "ResQNet",
  description: "Real-time emergency resource finder for blood, oxygen, medical support, and urgent care connections.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SiteHeader />
          <main className="appMain">{children}</main>
          <SiteFooter />
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
