import type { Metadata } from 'next';
// @ts-ignore: side-effect CSS import declaration missing
import './globals.css';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Task & Project Manager',
  description: 'Enterprise Task & Project Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
