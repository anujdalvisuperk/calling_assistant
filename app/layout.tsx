import './globals.css';

export const metadata = {
  title: 'Telecaller App',
  description: 'Built with Next.js and Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-slate-900">{children}</body>
    </html>
  );
}
