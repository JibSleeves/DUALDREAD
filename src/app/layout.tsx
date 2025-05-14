import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// GeistSans and GeistMono from 'geist/font' are already configured
// with CSS variables. We just use their .variable property.

export const metadata: Metadata = {
  title: 'Dual Dread',
  description: 'A cooperative horror text adventure game.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Creepster&display=swap" rel="stylesheet" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-background text-foreground`}>
        <div className="relative min-h-screen">
          {children}
          <div className="flicker-overlay"></div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
