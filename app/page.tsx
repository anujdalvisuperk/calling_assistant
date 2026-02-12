'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg('Login Failed: ' + error.message);
      setLoading(false);
    } else {
      checkUserAndRedirect();
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMsg('Signup Failed: ' + error.message);
    } else {
      setMsg('Account created! Clicking "Sign In" automatically...');
      // Auto-login after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!loginError) checkUserAndRedirect();
    }
    setLoading(false);
  };

  const checkUserAndRedirect = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userEmail = user?.email?.toLowerCase() || '';

    if (userEmail === 'anuj.dalvi@superk.in') {
      router.push('/admin');
    } else {
      router.push('/calls');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded shadow-lg border">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">
          Telecaller Login
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold"
          >
            Create Account
          </button>
        </form>

        {msg && (
          <p className="mt-4 text-red-500 text-center text-sm font-semibold">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
