'use client';

import { MoreVertical, UserCircle2, Users } from 'lucide-react';
import type { Post, PostComment } from '@/lib/types';

interface CommentCardProps {
  post: Post;
}

function formatStreamDate(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getAuthorName(item: Post | PostComment) {
  return (
    item.author ||
    `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() ||
    'Unknown user'
  );
}

function getInitials(item: Post | PostComment) {
  const avatar = 'avatar' in item ? item.avatar : undefined;

  return (
    avatar ||
    `${item.first_name?.[0] ?? ''}${item.last_name?.[0] ?? ''}`.toUpperCase() ||
    getAuthorName(item)[0]?.toUpperCase() ||
    'U'
  );
}

function getCreatedAt(item: Post | PostComment) {
  return item.createdAt ?? item.created_at;
}

export default function CommentCard({ post }: CommentCardProps) {
  const comments = Array.isArray(post.comments) ? post.comments : [];

  return (
    <div>
      {/* Post Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <UserCircle2
              size={24}
              className="text-gray-500 dark:text-gray-400"
            />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {getAuthorName(post)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatStreamDate(getCreatedAt(post))}
            </p>
          </div>
        </div>
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="More options"
        >
          <MoreVertical
            size={20}
            className="text-gray-600 dark:text-gray-400"
          />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        <p className="text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>
      </div>

      {/* Comments Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        {comments.length > 0 ? (
          <>
            <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
              <Users size={16} />
              {comments.length} class comment
              {comments.length !== 1 ? 's' : ''}
            </button>
            <div className="mt-3 space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(comment)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {getAuthorName(comment)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatStreamDate(getCreatedAt(comment))}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users size={16} />
            <span>No class comments yet.</span>
          </div>
        )}
      </div>
    </div>
  );
}
