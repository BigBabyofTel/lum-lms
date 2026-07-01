'use client';

import { MoreVertical, Send, UserCircle2, Users } from 'lucide-react';
import { useState } from 'react';
import OptionsModal from '@/components/modals/options-modal';
import type { Post, PostComment } from '@/lib/types';

interface CommentCardProps {
  post: Post;
  commentValue: string;
  onCommentChange: (postId: string, value: string) => void;
  onCommentSubmit: (postId: string) => void;
  onEditPost: (postId: string, content: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onEditComment: (
    postId: string,
    commentId: string,
    content: string
  ) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
}

function normalizeDateValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const nullableDate = value as { Time?: unknown; Valid?: unknown };

    if (nullableDate.Valid === false) {
      return null;
    }

    if (typeof nullableDate.Time === 'string') {
      return nullableDate.Time;
    }
  }

  return null;
}

function formatStreamDate(value: unknown) {
  const dateValue = normalizeDateValue(value);

  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
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

function getUpdatedAt(item: Post | PostComment) {
  return item.updatedAt ?? item.updated_at;
}

function hasBeenUpdated(item: Post | PostComment) {
  const createdAt = normalizeDateValue(getCreatedAt(item));
  const updatedAt = normalizeDateValue(getUpdatedAt(item));

  if (!updatedAt) {
    return false;
  }

  if (!createdAt) {
    return true;
  }

  const createdTime = new Date(createdAt).getTime();
  const updatedTime = new Date(updatedAt).getTime();

  if (!Number.isNaN(createdTime) && !Number.isNaN(updatedTime)) {
    return updatedTime > createdTime;
  }

  return updatedAt !== createdAt;
}

export default function CommentCard({
  post,
  commentValue,
  onCommentChange,
  onCommentSubmit,
  onEditPost,
  onDeletePost,
  onEditComment,
  onDeleteComment,
}: CommentCardProps) {
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [selectedComment, setSelectedComment] = useState<PostComment | null>(
    null
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState('');
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );
  const [commentEditError, setCommentEditError] = useState('');
  const [commentOptionsError, setCommentOptionsError] = useState('');

  const handleStartEdit = () => {
    setEditedContent(post.content);
    setEditError('');
    setIsEditing(true);
    setIsOptionsOpen(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(post.content);
    setEditError('');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const nextContent = editedContent.trim();

    if (!nextContent || nextContent === post.content) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      await onEditPost(post.id, nextContent);
      setIsEditing(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Could not update post'
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    setDeleteError('');

    try {
      await onDeletePost(post.id);
      setIsOptionsOpen(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Could not delete post'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCommentOptions = (comment: PostComment) => {
    setSelectedComment(comment);
    setCommentOptionsError('');
  };

  const handleStartCommentEdit = () => {
    if (!selectedComment) {
      return;
    }

    setEditingCommentId(selectedComment.id);
    setEditedCommentContent(selectedComment.content);
    setCommentEditError('');
    setSelectedComment(null);
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditedCommentContent('');
    setCommentEditError('');
  };

  const handleSaveCommentEdit = async (comment: PostComment) => {
    const nextContent = editedCommentContent.trim();

    if (!nextContent || nextContent === comment.content) {
      handleCancelCommentEdit();
      return;
    }

    setSavingCommentId(comment.id);
    setCommentEditError('');

    try {
      await onEditComment(post.id, comment.id, nextContent);
      handleCancelCommentEdit();
    } catch (error) {
      setCommentEditError(
        error instanceof Error ? error.message : 'Could not update comment'
      );
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async () => {
    if (!selectedComment) {
      return;
    }

    setDeletingCommentId(selectedComment.id);
    setCommentOptionsError('');

    try {
      await onDeleteComment(post.id, selectedComment.id);
      setSelectedComment(null);
    } catch (error) {
      setCommentOptionsError(
        error instanceof Error ? error.message : 'Could not delete comment'
      );
    } finally {
      setDeletingCommentId(null);
    }
  };

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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatStreamDate(getCreatedAt(post))}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOptionsOpen(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="More options"
        >
          <MoreVertical
            size={20}
            className="text-gray-600 dark:text-gray-400"
          />
        </button>
      </div>

      {isOptionsOpen && (
        <OptionsModal
          title="Post options"
          editLabel="Edit post"
          deleteLabel="Delete post"
          isEditDisabled={isDeleting}
          isDeleting={isDeleting}
          error={deleteError}
          onClose={() => setIsOptionsOpen(false)}
          onEdit={handleStartEdit}
          onDelete={() => {
            void handleDeletePost();
          }}
        />
      )}

      {selectedComment && (
        <OptionsModal
          title="Comment options"
          editLabel="Edit comment"
          deleteLabel="Delete comment"
          isEditDisabled={deletingCommentId === selectedComment.id}
          isDeleting={deletingCommentId === selectedComment.id}
          error={commentOptionsError}
          onClose={() => setSelectedComment(null)}
          onEdit={handleStartCommentEdit}
          onDelete={() => {
            void handleDeleteComment();
          }}
        />
      )}

      {/* Post Content */}
      <div className="px-4 pb-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveEdit();
                }}
                disabled={!editedContent.trim() || isSavingEdit}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900"
              >
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {post.content}
          </p>
        )}
        {hasBeenUpdated(post) && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Updated {formatStreamDate(getUpdatedAt(post))}
          </span>
        )}
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {getAuthorName(comment)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatStreamDate(getCreatedAt(comment))}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenCommentOptions(comment)}
                        className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Comment options"
                      >
                        <MoreVertical
                          size={16}
                          className="text-gray-500 dark:text-gray-400"
                        />
                      </button>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editedCommentContent}
                          onChange={(event) =>
                            setEditedCommentContent(event.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                        />
                        {commentEditError && (
                          <p className="text-sm text-red-500">
                            {commentEditError}
                          </p>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelCommentEdit}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveCommentEdit(comment);
                            }}
                            disabled={
                              !editedCommentContent.trim() ||
                              savingCommentId === comment.id
                            }
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900"
                          >
                            {savingCommentId === comment.id
                              ? 'Saving...'
                              : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {comment.content}
                        </p>
                        {hasBeenUpdated(comment) && (
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Updated {formatStreamDate(getUpdatedAt(comment))}
                          </span>
                        )}
                      </>
                    )}
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

      {/* Add Comment */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Add class comment..."
            value={commentValue}
            onChange={(event) => onCommentChange(post.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onCommentSubmit(post.id);
              }
            }}
            className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => onCommentSubmit(post.id)}
            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            disabled={!commentValue.trim()}
            aria-label="Send comment"
          >
            <Send size={20} className="text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
