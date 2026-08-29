import { useState, type FormEvent } from 'react';
import { Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

type Step = 'welcome' | 'auth';

export function AuthPage() {
  const { login, register } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const transition = 'transition-all duration-300 ease-out';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(usernameOrEmail, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-app">
      {/* Ambient glow behind content */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <div className="h-[500px] w-[500px] rounded-full bg-accent/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* ── Welcome Step ── */}
        {step === 'welcome' && (
          <div
            className={`flex flex-col items-center gap-8 text-center ${transition} animate-fade-in-up`}
          >
            {/* Logo with glow */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-elev-2">
                <Music2 className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Branding */}
            <div className="space-y-2">
              <h1 className="text-[32px] font-semibold tracking-tight text-ink-1">
                Flowbyte
              </h1>
              <p className="text-[15px] leading-relaxed text-ink-2">
                Your music. Your library. Everywhere.
              </p>
            </div>

            {/* CTA */}
            <div className="w-full space-y-3">
              <Button
                size="lg"
                className="w-full text-[15px]"
                onClick={() => setStep('auth')}
              >
                Get Started
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-ink-3 transition-colors duration-150 hover:text-ink-1"
                onClick={() => {
                  setMode('login');
                  setStep('auth');
                }}
              >
                Already have an account?{' '}
                <span className="text-accent hover:underline">Sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Auth Step ── */}
        {step === 'auth' && (
          <Card
            className={`border-line-strong/50 ${transition} animate-fade-in-up`}
          >
            <CardHeader className="items-center gap-3 text-center">
              {/* Compact logo */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-elev-1">
                  <Music2 className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {mode === 'register' ? 'Create your account' : 'Welcome back'}
                </CardTitle>
                <p className="text-sm text-ink-3">
                  {mode === 'register'
                    ? 'Start building your personal library'
                    : 'Sign in to access your library'}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-3">
                {mode === 'register' && (
                  <>
                    <Input
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </>
                )}
                {mode === 'login' && (
                  <Input
                    placeholder="Username or email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                )}
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy
                    ? 'Please wait…'
                    : mode === 'register'
                      ? 'Create account'
                      : 'Sign in'}
                </Button>
              </form>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-ink-3">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                className="mt-4 w-full text-center text-sm text-ink-3 transition-colors duration-150 hover:text-ink-1"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setUsernameOrEmail('');
                  setUsername('');
                  setEmail('');
                  setPassword('');
                }}
              >
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <span className="text-accent hover:underline">Create one</span>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <span className="text-accent hover:underline">Sign in</span>
                  </>
                )}
              </button>

              {mode === 'register' && (
                <button
                  type="button"
                  className="mt-2 w-full text-center text-xs text-ink-3/60 transition-colors duration-150 hover:text-ink-3"
                  onClick={() => {
                    setMode('login');
                    setUsernameOrEmail('');
                    setUsername('');
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Back to welcome
                </button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
