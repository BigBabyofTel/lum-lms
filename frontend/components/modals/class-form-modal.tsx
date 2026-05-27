'use client';
import React, { useActionState, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createClassForm } from '@/lib/actions';
import { FormState } from '@/lib/types';
import { useUserStore } from '@/store/useUserStore';
import { useClassStore } from '@/store/useClassesStore';

interface ClassFormModalProps {
  onClose: () => void;
}

export default function ClassFormModal({ onClose }: ClassFormModalProps) {
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<number | ''>('');
  const fetchClasses = useClassStore((state) => state.fetchClasses);
  const clearClasses = useClassStore((state) => state.clearClasses);

  const [state, formAction, isPending] = useActionState<
    FormState | null,
    FormData
  >(createClassForm, null);

  useEffect(() => {
    if (state?.success) {
      clearClasses();
      void fetchClasses();
      onClose();
    }
  }, [state?.success, clearClasses, fetchClasses, onClose]);

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
            Create class
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
        <form action={formAction} className="space-y-4">
          {/* Subject field */}
          <div className="space-y-1">
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Subject
            </label>
            <input
              name="subject"
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       placeholder-gray-400 dark:placeholder-gray-500
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                                       transition-colors"
            />
          </div>

          {/* Grade field */}
          <div className="space-y-1">
            <label
              htmlFor="grade"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Grade
            </label>
            <input
              name="grade"
              id="grade"
              type="number"
              min={1}
              value={grade}
              onChange={(e) =>
                setGrade(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="e.g. 2"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       placeholder-gray-400 dark:placeholder-gray-500
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                                       transition-colors"
            />
          </div>
          <input
            type="hidden"
            name="access_token"
            value={useUserStore((state) => state.access_token) ?? ''}
          />
          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300
                                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isPending}
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white
                                       bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Create
            </button>
          </div>
          {/*  Make a spinner to use isPending  */}
          {isPending ? 'Submitting...' : 'Send Message'}
          {state?.fieldErrors?.subject && (
            <p className="text-red-500 text-sm">{state.fieldErrors.subject}</p>
          )}
          {state?.error && <p className="text-red-500">{state.error}</p>}
          {state?.success && <p className="text-green-500">{state.success}</p>}
        </form>
      </div>
    </div>
  );
}
