'use client';

import { Send, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CommentCard from '@/components/comment-card';
import CommentFormModal from '@/components/modals/comment-form-modal';
import { useClassInfo } from '@/components/providers/class-provider';
import type { Post, PostComment } from '@/lib/types';
import {
  createPostComment,
  deletePost,
  deletePostComment,
  getClassStream,
  getPostComments,
  updatePost,
  updatePostComment,
} from '@/lib/api-client';
import { useUserStore } from '@/store/useUserStore';

async function loadCommentsForPosts(posts: Post[]): Promise<Post[]> {
  return Promise.all(
    posts.map(async (post) => {
      try {
        const comments = await getPostComments(post.id);

        return {
          ...post,
          comments,
        };
      } catch (error) {
        console.error(`Could not load comments for post ${post.id}:`, error);

        return {
          ...post,
          comments: [],
        };
      }
    })
  );
}

function replacePostComments(
  posts: Post[],
  postId: string,
  comments: PostComment[]
) {
  return posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    return {
      ...post,
      comments,
    };
  });
}

export default function StreamPage() {
  const { id: classId } = useParams<{ id: string }>();
  const { classInfo } = useClassInfo();
  const firstName = useUserStore((state) => state.first_name);
  const lastName = useUserStore((state) => state.last_name);
  const currentUserName = `${firstName} ${lastName}`.trim() || 'You';
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStream() {
      try {
        const streamPosts = await getClassStream(classId);
        const postsWithComments = await loadCommentsForPosts(streamPosts);

        if (!cancelled) {
          setPosts(postsWithComments);
        }
      } catch (error) {
        console.error('Could not load stream:', error);

        if (!cancelled) {
          setPosts([]);
        }
      }
    }

    void loadStream();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  const handlePostCreated = (post: Post) => {
    setPosts((currentPosts) => [
      {
        ...post,
        author: post.author ?? currentUserName,
        comments: post.comments ?? [],
      },
      ...currentPosts,
    ]);
  };

  const handleCommentChange = (postId: string, value: string) => {
    setCommentInputs((currentInputs) => ({
      ...currentInputs,
      [postId]: value,
    }));
  };

  const handleCommentSubmit = async (postId: string) => {
    const content = commentInputs[postId]?.trim();

    if (!content) {
      return;
    }

    try {
      await createPostComment(postId, content);
      const comments = await getPostComments(postId);

      setPosts((currentPosts) =>
        replacePostComments(currentPosts, postId, comments)
      );
      handleCommentChange(postId, '');
    } catch (error) {
      console.error('Could not add comment:', error);
    }
  };

  const handleEditPost = async (postId: string, content: string) => {
    const updatedPost = await updatePost(postId, content);

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              ...updatedPost,
              author: post.author,
              first_name: post.first_name,
              last_name: post.last_name,
              comments: post.comments,
            }
          : post
      )
    );
  };

  const handleEditComment = async (
    postId: string,
    commentId: string,
    content: string
  ) => {
    const updatedComment = await updatePostComment(postId, commentId, content);

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          comments: (post.comments ?? []).map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  ...updatedComment,
                  author: comment.author,
                  first_name: comment.first_name,
                  last_name: comment.last_name,
                  avatar: comment.avatar,
                }
              : comment
          ),
        };
      })
    );
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    await deletePostComment(postId, commentId);

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          comments: (post.comments ?? []).filter(
            (comment) => comment.id !== commentId
          ),
        };
      })
    );
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      setPosts((currentPosts) =>
        currentPosts.filter((post) => post.id !== postId)
      );
      setCommentInputs((currentInputs) => {
        const nextInputs = { ...currentInputs };
        delete nextInputs[postId];
        return nextInputs;
      });
    } catch (error) {
      console.error('Could not delete post:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Class Header Banner */}
      <div className="bg-gradient-to-b from-gray-700 to-gray-400 rounded-lg h-48 relative overflow-hidden">
        <div className="absolute bottom-4 left-6">
          <h2 className="text-white text-3xl font-bold">
            {classInfo?.subject ?? 'Class'}
          </h2>
          <p className="text-white text-sm">
            {classInfo ? `Grade ${classInfo.grade}` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setIsCommentModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            aria-label="Add post"
          >
            <Send size={16} />
            <span>Add Post</span>
          </button>
        </div>
        {posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
            >
              <CommentCard
                post={post}
                commentValue={commentInputs[post.id] || ''}
                onCommentChange={handleCommentChange}
                onCommentSubmit={(postId) => {
                  void handleCommentSubmit(postId);
                }}
                onEditPost={handleEditPost}
                onDeletePost={handleDeletePost}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users size={16} />
            <span>No class posts yet.</span>
          </div>
        )}
      </div>

      {isCommentModalOpen && (
        <CommentFormModal
          classId={classId}
          onClose={() => setIsCommentModalOpen(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
