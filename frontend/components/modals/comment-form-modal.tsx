'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Send, Users, X } from 'lucide-react';
import type { Post } from '@/lib/types';

interface CommentFormModalProps {
  posts: Post[];
  onClose: () => void;
  onSubmit: (postId: string, content: string) => Promise<void>;
}

function getPostOptionLabel(post: Post) {
  const trimmedContent = post.content.trim();

  if (!trimmedContent) {
    return 'Untitled post';
  }

  return trimmedContent.length > 80
    ? `${trimmedContent.slice(0, 80)}...`
    : trimmedContent;
}

export default function CommentFormModal({
  posts,
  onClose,
  onSubmit,
}: CommentFormModalProps) {
  const [selectedPostId, setSelectedPostId] = useState(posts[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = Boolean(selectedPostId && content.trim() && !isSubmitting);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId),
    [posts, selectedPostId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!selectedPostId || !trimmedContent) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(selectedPostId, trimmedContent);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not add comment'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedPost && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getPostOptionLabel(selectedPost)}
            </p>
          )}

          <div className="space-y-1">
            <textarea
              id="comment"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Add class post..."
              rows={4}
              className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

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
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900 transition-colors"
            >
              <Send size={16} />
              {isSubmitting ? 'Adding...' : 'Add comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
