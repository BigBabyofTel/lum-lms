'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ThemeToggleButton } from '@/components/providers/theme-provider';
import { useActionState, useState } from 'react';
import { FormState } from '@/lib/types';
import { submitForm } from '@/lib/actions';

export default function Page() {
  //useState to check the type of login
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<
    FormState | null,
    FormData
  >(submitForm, null);

  const [loginObj, setLoginObj] = useState<{ email: string; password: string }>(
    {
      email: '',
      password: '',
    }
  );

  const [flags, setFlags] = useState<{
    isTeacher: boolean;
    isStudent: boolean;
    isParent: boolean;
  }>({
    isTeacher: false,
    isStudent: false,
    isParent: false,
  });

  function handleLoginOption(role: keyof typeof flags) {
    switch (role) {
      case 'isTeacher':
        setFlags({
          isTeacher: !flags.isTeacher,
          isStudent: false,
          isParent: false,
        });
        break;
      case 'isStudent':
        setFlags({
          isTeacher: false,
          isStudent: !flags.isStudent,
          isParent: false,
        });
        break;
      case 'isParent':
        setFlags({
          isTeacher: false,
          isStudent: false,
          isParent: !flags.isParent,
        });
        break;
    }
  }

  console.log(loginObj);

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
        <div>
          <h2 className="text-lg">Sign in to your account as</h2>
        </div>
        <div className="w-full flex flex-row items-center justify-around">
          <div
            role="button"
            onClick={() => {
              handleLoginOption('isTeacher');
            }}
            className="ww-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100"
          >
            <span className="mt-5">Staff</span>
            <Image
              src="/teacher.webp"
              width={100}
              height={100}
              alt="an icon representing teachers"
            />
          </div>
          <div
            className="w-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100"
            role="button"
            onClick={() => {
              handleLoginOption('isParent');
              //router.push('/dashboard');
            }}
          >
            <span className="mt-5">Parent</span>
            <Image
              src="/parent.webp"
              width={70}
              height={70}
              style={{ height: 'auto', width: 'auto' }}
              loading="eager"
              alt="icon representing parents"
            />
          </div>
          <div
            className="w-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100"
            role="button"
            onClick={() => {
              handleLoginOption('isStudent');
            }}
          >
            <span className="mt-5">Student</span>
            <Image
              src="/student.webp"
              width={100}
              height={100}
              alt="an icon representing students"
            />
          </div>
        </div>
        {flags.isTeacher && (
          <form
            action={formAction}
            className="w-screen space-y-4 p-2 flex flex-col items-center justify-center"
          >
            <div className="p-2 w-full">
              <input
                name="email"
                placeholder="email"
                value={loginObj.email}
                onChange={(e) =>
                  setLoginObj({
                    email: e.target.value,
                    password: loginObj.password,
                  })
                }
                className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
              />
            </div>
            <div className="p-2 w-full">
              <input
                name="password"
                placeholder="password"
                type="password"
                value={loginObj.password}
                onChange={(e) =>
                  setLoginObj({
                    email: loginObj.email,
                    password: e.target.value,
                  })
                }
                className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
              />
            </div>
            <button
              disabled={isPending}
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              login
            </button>
          </form>
        )}
        {flags.isParent && <>Hello parent log in</>}
        {flags.isStudent && <>Hello student log in</>}
      </section>
    </>
  );
}

/*
use this
need to make routes for teacher, student, parent
onClick={() => router.push(`/auth/${role}`)}
*
*
* */
