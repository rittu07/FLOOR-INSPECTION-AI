import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { InspectionProvider } from '@/context/InspectionContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'FLOOR INSPECTION AI - Computer Vision & Inspection Dashboard',
  description: 'AI-Powered Floor Inspection, Image Mosaicking and Crack Detection System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950`}>
        <InspectionProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </InspectionProvider>
      </body>
    </html>
  );
}
