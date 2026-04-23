'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { FormState } from '@/lib/types';
import { handleLogin } from '@/lib/actions';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  role: string;
}

export default function LoginForm(props: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [state, formAction, isPending] = useActionState<
    FormState | null,
    FormData
  >(handleLogin, null);

  useEffect(() => {
    if (state?.access_token && state?.user) {
      useUserStore
        .getState()
        .setUser({ ...state.user, access_token: state.access_token });
      router.push('/dashboard');
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="w-screen space-y-4 p-2 flex flex-col items-center justify-center"
    >
      <div className="p-2 w-full">
        <input
          name="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
        />
        {state?.fieldErrors?.email && (
          <p className="text-red-500 text-sm">{state.fieldErrors.email}</p>
        )}
      </div>
      <div className="p-2 w-full">
        <input
          name="password"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
        />
      </div>
      {state?.fieldErrors?.password && (
        <p className="text-red-500 text-sm">{state.fieldErrors.password}</p>
      )}
      <div>
        <input name="role" id="role" type="hidden" value={props.role} />
      </div>
      <button
        disabled={isPending}
        type="submit"
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
      >
        login
      </button>
    </form>
  );
}
