'use client';

import { Send, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CommentCard from '@/components/comment-card';
import CommentFormModal from '@/components/modals/comment-form-modal';
import { useClassInfo } from '@/components/providers/class-provider';
import type { Post, PostComment } from '@/lib/types';
import { createPostComment, getClassStream } from '@/lib/api-client';
import { useUserStore } from '@/store/useUserStore';

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'U';
}

function appendCommentToPost(
  posts: Post[],
  postId: string,
  comment: PostComment
) {
  return posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    return {
      ...post,
      comments: [
        ...(Array.isArray(post.comments) ? post.comments : []),
        comment,
      ],
    };
  });
}

export default function StreamPage() {
  const { id: classId } = useParams<{ id: string }>();
  const { classInfo } = useClassInfo();
  const firstName = useUserStore((state) => state.first_name);
  const lastName = useUserStore((state) => state.last_name);
  const currentUserName = `${firstName} ${lastName}`.trim() || 'You';
  const currentUserAvatar = getInitials(firstName, lastName);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStream() {
      try {
        const streamPosts = await getClassStream(classId);

        if (!cancelled) {
          setPosts(streamPosts);
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

  const addComment = async (postId: string, content: string) => {
    const comment = await createPostComment(postId, content);

    setPosts((currentPosts) =>
      appendCommentToPost(currentPosts, postId, {
        ...comment,
        author: currentUserName,
        avatar: currentUserAvatar,
        createdAt: comment.createdAt ?? comment.created_at,
      })
    );
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
              <CommentCard post={post} />
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
          posts={posts}
          onClose={() => setIsCommentModalOpen(false)}
          onSubmit={addComment}
        />
      )}
    </div>
  );
}
