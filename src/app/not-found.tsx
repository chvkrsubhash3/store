import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-center p-4">
      <div className="w-12 h-12 bg-brand-red rounded-2xl flex items-center justify-center mb-4">
        <Shield className="w-6 h-6 text-white" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-gray-400 text-sm mb-6">Page Not Found. The resource you requested does not exist.</p>
      <Link href="/" className="btn-primary text-sm px-6 py-3">Return Home</Link>
    </div>
  );
}
