'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginContent() {
  const router = useRouter();
  const { signIn, user, loading: authLoading, error: authError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-warm-brown border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 bg-cream-50">
        <div className="w-full max-w-md mx-auto">
          {/* Logo & Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-warm-brown/70 transition-colors duration-200 hover:text-warm-brown mb-8"
          >
            <i aria-hidden="true" className="ri-arrow-left-line text-base" />
            <span>Back to homepage</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-playfair font-bold text-warm-brown">
              Welcome Back
            </h1>
            <p className="mt-2 text-gray-600">
              Admin & Partner Portal
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error Message */}
            {(error || authError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error || authError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                Email address
              </label>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base shadow-sm focus:border-warm-brown focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base shadow-sm focus:border-warm-brown focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-gray-600">
                <input
                  checked={rememberMe}
                  className="h-4 w-4 rounded border-gray-300 text-warm-brown focus:ring-gold"
                  onChange={(e) => setRememberMe(e.target.checked)}
                  type="checkbox"
                />
                <span>Remember me</span>
              </label>
              <a
                className="font-medium text-warm-brown hover:text-amber-900 transition-colors"
                href="mailto:care@dadaboraai.com?subject=Password%20Reset"
              >
                Forgot password?
              </a>
            </div>

            <button
              className="w-full rounded-xl bg-warm-brown px-4 py-3.5 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-amber-900 focus-visible:outline-warm-brown disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Support */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Need help? Contact{' '}
            <a href="mailto:care@dadaboraai.com" className="text-warm-brown hover:underline">
              care@dadaboraai.com
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:flex-1 relative bg-gradient-to-br from-warm-brown to-amber-900">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center">
            <div className="relative w-64 h-64 mx-auto mb-8">
              <Image
                src="/dada bora.PNG"
                alt="Dada Bora AI"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
            <h2 className="text-3xl font-playfair font-bold text-white mb-3">
              Dada Bora AI
            </h2>
            <p className="text-white/80 text-lg max-w-xs mx-auto">
              The big sister you wish you had, powered by AI, guided by love.
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div
          aria-hidden="true"
          className="absolute top-10 right-10 h-32 w-32 rounded-full bg-gold/20 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-20 left-10 h-40 w-40 rounded-full bg-blush/20 blur-2xl"
        />
      </div>
    </main>
  );
}
