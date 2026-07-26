import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'SecureMart – Premium Multi-Vendor Marketplace', template: '%s | SecureMart' },
  description: 'SecureMart is a premium cybersecurity training multi-vendor marketplace.',
  keywords: ['securemart', 'cybersecurity', 'soc dashboard', 'e-commerce'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0a0f] text-gray-100 antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a2e', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.1)' } }} />
      </body>
    </html>
  );
}
