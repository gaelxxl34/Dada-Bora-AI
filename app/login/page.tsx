import type { Metadata } from 'next';
import LoginContent from './LoginContent';

export const metadata: Metadata = {
  title: 'Admin & Partner Login | Dada Bora AI',
  description:
    'Secure access for Dada Bora AI admins and partners. Sign in to manage your dashboard and resources.',
};

export default function LoginPage() {
  return <LoginContent />;
}
