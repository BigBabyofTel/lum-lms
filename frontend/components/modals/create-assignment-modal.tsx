'use client';

import { FormEvent, useState } from 'react';
import { Send, X } from 'lucide-react';
import { createAssignment } from '@/lib/api-client';
import type { Assignment } from '@/lib/types';

interface CreateAssignmentModalProps {
  classId: string;
  onAssignmentCreated: (assignment: Assignment) => void;
  onClose: () => void;
}

export default function CreateAssignmentModal({
  classId,
  onAssignmentCreated,
  onClose,
}: CreateAssignmentModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('An assignment title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const assignment = await createAssignment(classId, {
        type: 'assignment',
        title: trimmedTitle,
        details: details.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onAssignmentCreated(assignment);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not create assignment.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-md dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add assignment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="assignment-title"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Title
            </label>
            <input
              id="assignment-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Assignment title"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="assignment-details"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Instructions <span className="font-normal">(optional)</span>
            </label>
            <textarea
              id="assignment-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Add instructions..."
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="assignment-due-date"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Due date <span className="font-normal">(optional)</span>
            </label>
            <input
              id="assignment-due-date"
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900"
            >
              <Send size={16} />
              {isSubmitting ? 'Adding...' : 'Add assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
