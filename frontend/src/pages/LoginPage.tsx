import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { ShaderDotCanvas } from '../components/ui/ShaderDotCanvas';
import { Toast } from '../components/ui/Toast';
import {
  Bot,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// Zod Schemas for strictly typed validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address (e.g. agent@custome-x.internal)'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long'),
});

const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters long')
    .max(100, 'Name is too long'),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long'),
});

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Field-level error messages
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
  }>({});

  // Global Toast error banner for API / network failures
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Real-time validation helper
  const validateForm = () => {
    setFieldErrors({});
    if (isLoginView) {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const errors: { email?: string; password?: string } = {};
        for (const issue of result.error.issues) {
          if (issue.path[0] === 'email' && !errors.email) {
            errors.email = issue.message;
          } else if (issue.path[0] === 'password' && !errors.password) {
            errors.password = issue.message;
          }
        }
        setFieldErrors(errors);
        return false;
      }
    } else {
      const result = registerSchema.safeParse({ fullName, email, password });
      if (!result.success) {
        const errors: { fullName?: string; email?: string; password?: string } = {};
        for (const issue of result.error.issues) {
          if (issue.path[0] === 'fullName' && !errors.fullName) {
            errors.fullName = issue.message;
          } else if (issue.path[0] === 'email' && !errors.email) {
            errors.email = issue.message;
          } else if (issue.path[0] === 'password' && !errors.password) {
            errors.password = issue.message;
          }
        }
        setFieldErrors(errors);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    // 1. Zod client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginView) {
        await login({ email, password });
        navigate(from, { replace: true });
      } else {
        // Register agent under default demo organization
        const defaultOrgId = '11111111-1111-1111-1111-111111111111';
        await register({
          email,
          password,
          full_name: fullName,
          role: 'agent',
          organization_id: defaultOrgId,
        });
        setApiSuccess('Registration successful! Redirecting to command center...');
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 800);
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as {
          response?: {
            status?: number;
            data?: {
              error?: { code?: string; message?: string };
              detail?: string | Array<{ msg?: string }>;
            };
          };
        };

        const errorData = axiosError.response?.data;
        const statusCode = axiosError.response?.status;

        if (statusCode === 401 || errorData?.error?.code === 'INVALID_CREDENTIALS') {
          setApiError('Invalid credentials. Please verify your email and password.');
        } else if (statusCode === 409 || errorData?.error?.code === 'DUPLICATE_RESOURCE') {
          setApiError('An account with this email already exists. Please sign in instead.');
        } else if (typeof errorData?.error?.message === 'string') {
          setApiError(errorData.error.message);
        } else if (typeof errorData?.detail === 'string') {
          setApiError(errorData.detail);
        } else if (Array.isArray(errorData?.detail) && errorData.detail[0]?.msg) {
          setApiError(errorData.detail[0].msg);
        } else {
          setApiError('Authentication failed. Please verify your details or try again later.');
        }
      } else {
        setApiError('Network disconnect: Unable to reach Custome-X support backend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('agent@custome-x.internal');
    setPassword('SecurePassword123!');
    if (!isLoginView) {
      setFullName('Alex Johnson');
    }
    setFieldErrors({});
    setApiError(null);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white px-4 py-8">
      {/* Dynamic Procedural Dot Matrix Background */}
      <ShaderDotCanvas />

      {/* Radial Vignette */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(2, 6, 23, 0.5) 0%, rgba(2, 6, 23, 0.95) 100%)',
        }}
      />

      {/* Global Toast Notification System */}
      {apiError && (
        <Toast type="error" message={apiError} onClose={() => setApiError(null)} />
      )}
      {apiSuccess && (
        <Toast type="success" message={apiSuccess} onClose={() => setApiSuccess(null)} />
      )}

      {/* Centered Frosted Glass Modal Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl transition-all">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            {isLoginView ? 'Sign in to Custome-X' : 'Register Support Agent'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isLoginView
              ? 'Autonomous agentic customer support command center'
              : 'Create internal agent credentials for your organization'}
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="mt-6 flex rounded-lg bg-slate-800/70 p-1 border border-slate-700/50">
          <button
            type="button"
            onClick={() => {
              setIsLoginView(true);
              setFieldErrors({});
              setApiError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              isLoginView
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agent Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginView(false);
              setFieldErrors({});
              setApiError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              !isLoginView
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form with Zod Validation */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Full Name Field (Signup only) */}
          {!isLoginView && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-medium text-slate-300"
              >
                Full Name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  className={`block w-full rounded-lg border bg-slate-800/90 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors min-h-[42px] ${
                    fieldErrors.fullName
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.fullName}</span>
                </p>
              )}
            </div>
          )}

          {/* Email Address Field */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-300">
              Email Address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@custome-x.internal"
                className={`block w-full rounded-lg border bg-slate-800/90 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors min-h-[42px] ${
                  fieldErrors.email
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-300"
            >
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLoginView ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLoginView ? '••••••••••••' : 'Min 8 characters'}
                className={`block w-full rounded-lg border bg-slate-800/90 pl-9 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors min-h-[42px] ${
                  fieldErrors.password
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>{isLoginView ? 'Verifying Credentials...' : 'Registering Support Agent...'}</span>
              </>
            ) : (
              <>
                <span>{isLoginView ? 'Continue to Dashboard' : 'Complete Registration'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick-Fill Pill */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-mono transition-colors cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Fill Demo Agent Credentials</span>
          </button>
        </div>

        {/* Security & Organization Notice */}
        <p className="mt-5 text-center text-xs text-slate-500">
          Custome-X Autonomous Support Architecture
          <br />
          Enterprise Supabase Auth &amp; Multi-Tenant RLS
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
