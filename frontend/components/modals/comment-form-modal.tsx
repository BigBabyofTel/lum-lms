'use client';

import { useActionState, useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import type { FormState, Post } from '@/lib/types';
import { createClassPost } from '@/lib/api-client';

interface CommentFormModalProps {
  classId: string;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
}

export default function CommentFormModal({
  classId,
  onClose,
  onPostCreated,
}: CommentFormModalProps) {
  const [content, setContent] = useState('');
  const canSubmit = Boolean(classId && content.trim());

  const submitPostAction = async (
    _state: FormState | null,
    formData: FormData
  ): Promise<FormState> => {
    const postContent = formData.get('content');

    if (typeof postContent !== 'string') {
      return { error: 'Missing post content.' };
    }

    const trimmedContent = postContent.trim();
    if (!trimmedContent) {
      return { error: 'Post content is required.' };
    }

    try {
      const post = await createClassPost(classId, trimmedContent);
      onPostCreated(post);
      return { success: 'Post created.' };
    } catch (submitError) {
      return {
        error:
          submitError instanceof Error
            ? submitError.message
            : 'Could not create post',
      };
    }
  };

  const [state, formAction, isPending] = useActionState<
    FormState | null,
    FormData
  >(submitPostAction, null);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-md mx-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Post
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <textarea
              id="post-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Add class post..."
              rows={4}
              className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900 transition-colors"
            >
              <Send size={16} />
              {isPending ? 'Creating...' : 'Create post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
