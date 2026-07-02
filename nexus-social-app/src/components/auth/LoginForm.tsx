'use client';

import { useActionState, useState } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  type AuthActionState,
} from '@/actions/auth';

const initialState: AuthActionState = {};

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo = '/' }: LoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmail,
    initialState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  const state =
    mode === 'signin' ? signInState : mode === 'signup' ? signUpState : resetState;
  const action =
    mode === 'signin' ? signInAction : mode === 'signup' ? signUpAction : resetAction;
  const pending =
    mode === 'signin' ? signInPending : mode === 'signup' ? signUpPending : resetPending;

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
        {mode === 'signin'
          ? 'Sign in to Nexus Social'
          : mode === 'signup'
            ? 'Create your account'
            : 'Reset your password'}
      </h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        {mode === 'reset'
          ? 'Enter your email and we will send a reset link'
          : 'AI-native social media management'}
      </p>

      {mode !== 'reset' && (
        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signin'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign up
          </button>
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        {mode !== 'reset' && <input type="hidden" name="redirect" value={redirectTo} />}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        )}

        {mode === 'signin' && (
          <button
            type="button"
            onClick={() => setMode('reset')}
            className="self-start text-sm text-indigo-600 hover:text-indigo-500"
          >
            Forgot password?
          </button>
        )}

        {state.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        )}

        {state.message && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? 'Please wait…'
            : mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : 'Send reset link'}
        </button>
      </form>

      {mode === 'reset' && (
        <button
          type="button"
          onClick={() => setMode('signin')}
          className="mt-4 w-full text-center text-sm text-gray-600 hover:text-gray-900"
        >
          Back to sign in
        </button>
      )}
    </div>
  );
}
