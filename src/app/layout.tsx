import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider as GlobalAuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "ระบบจองเข้าเยี่ยมชม อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา",
  description: "ระบบจองคิวเข้าเยี่ยมชมและศึกษาดูงาน ท้องฟ้าจำลอง 4K อุทยานวิทยาศาสตร์และดาราศาสตร์ องค์การบริหารส่วนจังหวัดพะเยา",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (event) => {
                if (event.filename && (event.filename.indexOf('chrome-extension') > -1 || event.filename.indexOf('moz-extension') > -1)) {
                  event.stopImmediatePropagation();
                }
              }, true);
              window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.stack && (event.reason.stack.indexOf('chrome-extension') > -1 || event.reason.stack.indexOf('moz-extension') > -1)) {
                  event.stopImmediatePropagation();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <GlobalAuthProvider>
          {children}
        </GlobalAuthProvider>
      </body>
    </html>
  );
}
