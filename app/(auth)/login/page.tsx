import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in — FHTC Sentinel' };

/** Login lives outside the app shell: centered card on the quiet page pattern. */
export default function LoginPage() {
  return (
    <main className="dotted-pattern flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <LoginForm showDemo={process.env.NODE_ENV !== 'production'} />
      </div>
    </main>
  );
}
