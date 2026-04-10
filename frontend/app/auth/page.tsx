'use client';
import { ThemeToggleButton } from '@/components/providers/theme-provider';
import { useState } from 'react';

import LoginForm from '@/components/login-form';
import RegisterForm from '@/components/register-form';
import Portal from '@/components/portal';

export default function Page() {
  const [role, setRole] = useState<'teacher' | 'parent' | 'student' | ''>('');
  const [mode, setMode] = useState<'chooser' | 'login' | 'register'>('chooser');

  return (
    <>
      {/* Theme toggle button */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggleButton />
      </div>
      <section className="h-dvh w-full flex flex-col items-center justify-evenly">
        <div>
          <h1 className="text-5xl ">
            <span className="text-indigo-700 dark:text-orange-600">l</span>u
            <span className="text-indigo-700 dark:text-orange-600">m</span>ine
            <span className="text-indigo-700 dark:text-orange-600">s</span>cence
          </h1>
        </div>
        {mode === 'login' && (
          <div>
            <h2 className="text-lg">Sign in to your account as</h2>
          </div>
        )}
        <button
          onClick={() => setMode('register')}
          className={
            mode === 'register' || role !== ''
              ? `hidden`
              : `border-2 bg-blue-400 text-lg p-2 rounded-lg`
          }
        >
          Register
        </button>
        {mode === 'chooser' && (
          <Portal role={role} setRole={setRole} setMode={setMode} />
        )}
        {mode === 'login' && <LoginForm role={role} />}
        {mode === 'register' && <RegisterForm role={role} />}
      </section>
    </>
  );
}
