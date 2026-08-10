'use client';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/lib/actions';
import { FormState } from '@/lib/types';

interface CreateStudentModalProps {
  onClose: () => void;
  onStudentCreated: () => Promise<void>;
}

export default function CreateStudentModal({
  onClose,
  onStudentCreated,
}: CreateStudentModalProps) {
  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [state, setState] = useState<FormState | null>(null);
  const [isPending, setIsPending] = useState(false);

  const onCreate = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState(null);
    setIsPending(true);

    const promise = enrollStudent(null, new FormData(event.currentTarget)).then(
      async (result) => {
        setState(result);

        if (result.error || result.fieldErrors) {
          throw new Error(
            result.error ?? 'Please correct the highlighted fields.'
          );
        }

        await onStudentCreated();
        return result;
      }
    );

    toast.promise(promise, {
      loading: 'Adding student...',
      success: (result: FormState) => result.success ?? 'Student added!',
      error: (error: unknown) =>
        error instanceof Error ? error.message : 'Failed to add student.',
    });

    try {
      await promise;
      onClose();
    } catch {
      // The toast and inline form errors communicate the failure.
    } finally {
      setIsPending(false);
    }
  };

  return (
    /* Backdrop — click outside the card to close */
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Modal card — stop propagation so clicks inside don't close */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add student
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={onCreate}
          className="w-full space-y-4 p-2 flex flex-col items-center justify-center"
        >
          <div className="p-2 w-full">
            <input
              name="email"
              placeholder="Email"
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
              name="first_name"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
            />
            {state?.fieldErrors?.first_name && (
              <p className="text-red-500 text-sm">
                {state.fieldErrors.first_name}
              </p>
            )}
          </div>
          <div className="p-2 w-full">
            <input
              name="last_name"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
            />
            {state?.fieldErrors?.last_name && (
              <p className="text-red-500 text-sm">
                {state.fieldErrors.last_name}
              </p>
            )}
          </div>
          <div className="p-2 w-full">
            <input
              name="grade"
              placeholder="Grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
            />
            {state?.fieldErrors?.grade && (
              <p className="text-red-500 text-sm">{state.fieldErrors.grade}</p>
            )}
          </div>
          <div className="p-2 w-full">
            <input
              name="password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
            />
            {state?.fieldErrors?.password && (
              <p className="text-red-500 text-sm">
                {state.fieldErrors.password}
              </p>
            )}
          </div>
          <div className="p-2 w-full">
            <input
              name="confirmPassword"
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
            />
            {state?.fieldErrors?.confirmPassword && (
              <p className="text-red-500 text-sm">
                {state.fieldErrors.confirmPassword}
              </p>
            )}
          </div>
          <div className="flex items-center flex-col w-full">
            <input type="hidden" name="role" value="student" />

            {state?.fieldErrors?.role && (
              <p className="text-red-500 text-sm">{state.fieldErrors.role}</p>
            )}
          </div>
          <button
            disabled={isPending}
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Add Student
          </button>
        </form>
      </div>
    </div>
  );
}
