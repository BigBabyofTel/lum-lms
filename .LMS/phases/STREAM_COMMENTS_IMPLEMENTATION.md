# Class Stream & Comments Implementation

> **Part of:** Phase 4 communication work  
> **Files touched:** backend schema, sqlc queries, handlers, routes, existing class stream page, frontend types  
> **Depends on:** `AuthMiddleware`, `class_enrollments`, `GetUserByID`, `GetClassByID`, `IsStudentEnrolled`, `apiFetch` in `frontend/lib/api.ts`

---

## Current State

The database already has `posts` and `comments` tables in `backend/sql/schema/0003_stream.sql`:

```sql
CREATE TABLE posts
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    author_id  uuid REFERENCES users (id) ON DELETE CASCADE,
    parent_id  uuid REFERENCES posts (id) ON DELETE CASCADE,
    content    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE comments
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    post_id    uuid REFERENCES posts (id) ON DELETE CASCADE,
    author_id  uuid REFERENCES users (id) ON DELETE CASCADE,
    content    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);
```

There is also already a frontend stream page and class tab setup:

- `frontend/app/dashboard/class/[id]/page.tsx` is currently the **Stream** tab
- `frontend/app/dashboard/class/[id]/layout.tsx` already points the `Stream` tab to the base class route
- the current stream page uses hardcoded mock posts/comments
- `backend/internal/routes/router.go` currently registers only auth and class routes

**Primary schema problem:** `posts` has no `class_id` column, so posts cannot be scoped to a class.

**Primary backend problem:** the current `AuthMiddleware` only provides `userID`. It does **not** provide `userRole`, so stream handlers should match the current codebase by loading the current user with `GetUserByID` when role checks are needed.

**Primary frontend problem:** the class stream already exists at `frontend/app/dashboard/class/[id]/page.tsx`, so the implementation should update that file instead of creating a brand-new `/stream/page.tsx` route.

---

## Step 1 — Schema Migration

Create `backend/sql/schema/0006_stream_class_id.sql` to match the current migration numbering pattern:

```sql
-- +goose Up
ALTER TABLE posts
    ADD COLUMN class_id uuid REFERENCES classes (id) ON DELETE CASCADE;

CREATE INDEX idx_posts_class_id ON posts (class_id);

-- +goose Down
DROP INDEX IF EXISTS idx_posts_class_id;
ALTER TABLE posts
    DROP COLUMN IF EXISTS class_id;
```

Run it:

```bash
cd backend
goose -dir sql/schema postgres "$DATABASE_URL" up
```

---

## Step 2 — sqlc Queries

Create `backend/sql/queries/0006_stream.sql` to match the current numbered query file pattern:

```sql
-- name: CreatePost :one
INSERT INTO posts (id, class_id, author_id, content, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(class_id),
        sqlc.arg(author_id),
        sqlc.arg(content),
        NOW())
RETURNING *;

-- name: GetPostByID :one
SELECT *
FROM posts
WHERE id = sqlc.arg(id)
LIMIT 1;

-- name: GetPostsByClass :many
SELECT p.*,
       u.first_name,
       u.last_name
FROM posts p
         JOIN users u ON u.id = p.author_id
WHERE p.class_id = sqlc.arg(class_id)
ORDER BY p.created_at DESC;

-- name: DeletePost :exec
DELETE
FROM posts
WHERE id = sqlc.arg(id)
  AND author_id = sqlc.arg(author_id);

-- name: CreateComment :one
INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(post_id),
        sqlc.arg(author_id),
        sqlc.arg(content),
        NOW())
RETURNING *;

-- name: GetCommentsByPost :many
SELECT c.*,
       u.first_name,
       u.last_name
FROM comments c
         JOIN users u ON u.id = c.author_id
WHERE c.post_id = sqlc.arg(post_id)
ORDER BY c.created_at ASC;

-- name: DeleteComment :exec
DELETE
FROM comments
WHERE id = sqlc.arg(id)
  AND author_id = sqlc.arg(author_id);
```

Re-generate the database layer:

```bash
cd backend
sqlc generate
```

---

## Step 3 — Backend Handlers

Create `backend/internal/handlers/stream_handlers.go`.

The handler implementation should match the current codebase patterns:

- use `h *Handler`, just like `class_handlers.go` and `auth_handlers.go`
- pull `userID` from `c.MustGet("userID")`
- **do not** assume `userRole` is in the Gin context, because current `AuthMiddleware` does not set it
- use `h.DB.GetUserByID(...)` when a role check is needed
- use `h.DB.GetClassByID(...)` and `h.DB.IsStudentEnrolled(...)` for access checks

Add a helper first so post and comment handlers share the same class access rules:

```go
func (h *Handler) canAccessClassStream(c *gin.Context, classID uuid.UUID, userID uuid.UUID) (database.User, error) {
    user, err := h.DB.GetUserByID(c, userID)
    if err != nil {
        return database.User{}, err
    }

    class, err := h.DB.GetClassByID(c, classID)
    if err != nil {
        return database.User{}, err
    }

    if user.Type == database.RoleTeacher {
        if !class.TeacherID.Valid || class.TeacherID.UUID != userID {
            return database.User{}, fmt.Errorf("not authorized")
        }
        return user, nil
    }

    if user.Type == database.RoleStudent {
        enrolled, err := h.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
            ClassID:   classID,
            StudentID: userID,
        })
        if err != nil || !enrolled {
            return database.User{}, fmt.Errorf("not enrolled")
        }
        return user, nil
    }

    return database.User{}, fmt.Errorf("role not permitted")
}
```

Then build the handlers around that helper.

```go
package handlers

import (
    "fmt"
    "net/http"

    "github.com/BigBabyofTel/lum-lms/internal/database"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

// POST /api/v1/classes/:id/stream
func (h *Handler) CreatePost(c *gin.Context) {
    classID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
        return
    }

    authorID := c.MustGet("userID").(uuid.UUID)
    if _, err := h.canAccessClassStream(c, classID, authorID); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this class"})
        return
    }

    var params struct {
        Content string `json:"content" binding:"required"`
    }
    if err := c.ShouldBindJSON(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    post, err := h.DB.CreatePost(c, database.CreatePostParams{
        ClassID:  uuid.NullUUID{UUID: classID, Valid: true},
        AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
        Content:  params.Content,
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create post"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{"post": post})
}

// GET /api/v1/classes/:id/stream
func (h *Handler) GetStream(c *gin.Context) {
    classID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
        return
    }

    userID := c.MustGet("userID").(uuid.UUID)
    if _, err := h.canAccessClassStream(c, classID, userID); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this class"})
        return
    }

    posts, err := h.DB.GetPostsByClass(c, uuid.NullUUID{UUID: classID, Valid: true})
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch stream"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"posts": posts})
}

// DELETE /api/v1/stream/:postId
func (h *Handler) DeletePost(c *gin.Context) {
    postID, err := uuid.Parse(c.Param("postId"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
        return
    }
    authorID := c.MustGet("userID").(uuid.UUID)

    err = h.DB.DeletePost(c, database.DeletePostParams{
        ID:       postID,
        AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete post"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "post deleted"})
}

// POST /api/v1/stream/:postId/comments
func (h *Handler) CreateComment(c *gin.Context) {
    postID, err := uuid.Parse(c.Param("postId"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
        return
    }
    authorID := c.MustGet("userID").(uuid.UUID)

    post, err := h.DB.GetPostByID(c, postID)
    if err != nil || !post.ClassID.Valid {
        c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
        return
    }
    if _, err := h.canAccessClassStream(c, post.ClassID.UUID, authorID); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this post"})
        return
    }

    var params struct {
        Content string `json:"content" binding:"required"`
    }
    if err := c.ShouldBindJSON(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    comment, err := h.DB.CreateComment(c, database.CreateCommentParams{
        PostID:   uuid.NullUUID{UUID: postID, Valid: true},
        AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
        Content:  params.Content,
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create comment"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{"comment": comment})
}

// GET /api/v1/stream/:postId/comments
func (h *Handler) GetComments(c *gin.Context) {
    postID, err := uuid.Parse(c.Param("postId"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
        return
    }

    userID := c.MustGet("userID").(uuid.UUID)
    post, err := h.DB.GetPostByID(c, postID)
    if err != nil || !post.ClassID.Valid {
        c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
        return
    }
    if _, err := h.canAccessClassStream(c, post.ClassID.UUID, userID); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this post"})
        return
    }

    comments, err := h.DB.GetCommentsByPost(c, uuid.NullUUID{UUID: postID, Valid: true})
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch comments"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"comments": comments})
}

// DELETE /api/v1/stream/:postId/comments/:commentId
func (h *Handler) DeleteComment(c *gin.Context) {
    commentID, err := uuid.Parse(c.Param("commentId"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
        return
    }
    authorID := c.MustGet("userID").(uuid.UUID)

    err = h.DB.DeleteComment(c, database.DeleteCommentParams{
        ID:       commentID,
        AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete comment"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "comment deleted"})
}
```

---

## Step 4 — Register Routes

Create `backend/internal/routes/stream_routes.go`:

```go
package routes

import (
    "os"

    "github.com/BigBabyofTel/lum-lms/internal/handlers"
    "github.com/BigBabyofTel/lum-lms/internal/middleware"
    "github.com/gin-gonic/gin"
)

func RegisterStreamRoutes(router *gin.RouterGroup, h *handlers.Handler) {
    protected := router.Group("").Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))
    {
        // Stream posts scoped to a class
        protected.GET("/classes/:id/stream", h.GetStream)
        protected.POST("/classes/:id/stream", h.CreatePost)
        protected.DELETE("/stream/:postId", h.DeletePost)

        // Comments on a post
        protected.GET("/stream/:postId/comments", h.GetComments)
        protected.POST("/stream/:postId/comments", h.CreateComment)
        protected.DELETE("/stream/:postId/comments/:commentId", h.DeleteComment)
    }
}
```

Register in `backend/internal/routes/router.go` alongside class routes:

```go
RegisterStreamRoutes(v1, h)
```

The current file is:

```go
v1 := router.Group("/api/v1")
{
    RegisterClassRoutes(v1, h)
    RegisterAuthRoutes(v1, h)
}
```

So the updated version should become:

```go
v1 := router.Group("/api/v1")
{
    RegisterClassRoutes(v1, h)
    RegisterAuthRoutes(v1, h)
    RegisterStreamRoutes(v1, h)
}
```

---

## Step 5 — Frontend Types

The current frontend already has a `Post` interface in `frontend/lib/types.ts`, and the current stream page at
`frontend/app/dashboard/class/[id]/page.tsx` already renders posts/comments from a mock array.

So instead of introducing a second parallel type like `StreamPost`, update the existing `Post` shape so it can support
real API data.

Replace the existing stream-specific part of `frontend/lib/types.ts` with:

```typescript
export interface PostComment {
  id: string;
  post_id?: string;
  author_id?: string;
  author: string;
  content: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  class_id?: string;
  author_id?: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  comments: PostComment[];
}
```

This matches the current frontend naming style more closely and lets the existing stream page keep rendering `post.author`,
`post.createdAt`, and `post.comments` after the backend response is mapped.

---

## Step 6 — Update the Existing Stream Page

Do **not** create `frontend/app/dashboard/class/[id]/stream/page.tsx` yet.

The current app already treats `frontend/app/dashboard/class/[id]/page.tsx` as the Stream tab because
`frontend/app/dashboard/class/[id]/layout.tsx` sets:

```typescript
const tabs = [
  { name: 'Stream', href: baseUrl },
  { name: 'Classwork', href: `${baseUrl}/classwork` },
  { name: 'People', href: `${baseUrl}/people` },
];
```

So the implementation should replace the mock `posts` array inside the existing file.

Update `frontend/app/dashboard/class/[id]/page.tsx` to:

- fetch real posts from `/api/v1/classes/:id/stream`
- keep the existing page as the Stream tab
- keep the existing comment input UX
- map backend rows into the existing `Post` UI shape

Example fetch/mapping pattern:

```typescript
'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Post } from '@/lib/types';

export default function StreamPage() {
  const { id: classId } = useParams<{ id: string }>();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    apiFetch<{ posts: Array<{
      id: string;
      class_id: string;
      author_id: string;
      first_name: string;
      last_name: string;
      content: string;
      created_at: string;
    }> }>(`/api/v1/classes/${classId}/stream`)
      .then((data) =>
        setPosts(
          (data.posts ?? []).map((post) => ({
            id: post.id,
            class_id: post.class_id,
            author_id: post.author_id,
            author: `${post.first_name} ${post.last_name}`,
            content: post.content,
            createdAt: post.created_at,
            comments: [],
          }))
        )
      )
      .catch(console.error);
  }, [classId]);
}
```

Then replace the current hardcoded `posts` array and `console.log('Posting comment...')` placeholder logic with real
API-backed create/delete/load logic.

---

## Step 7 — Comment Loading and Posting

Because the current stream UI is already in `frontend/app/dashboard/class/[id]/page.tsx`, the fastest implementation is
to keep comment rendering there first.

For comments, add real API calls behind the existing comment UI:

- load comments when a post expands
- post a new comment from the existing input
- delete a comment if the current user authored it

Example comment mapping pattern inside the existing page:

```typescript
const loadComments = async (postId: string) => {
  const data = await apiFetch<{ comments: Array<{
    id: string;
    post_id: string;
    author_id: string;
    first_name: string;
    last_name: string;
    content: string;
    created_at: string;
  }> }>(`/api/v1/stream/${postId}/comments`);

  return (data.comments ?? []).map((comment) => ({
    id: comment.id,
    post_id: comment.post_id,
    author_id: comment.author_id,
    author: `${comment.first_name} ${comment.last_name}`,
    content: comment.content,
    createdAt: comment.created_at,
  }));
};
```

Once the inline version is working, you can optionally extract it into `frontend/components/post-card.tsx` as a cleanup
refactor. That extraction is useful later, but it should not be the first required step because the current codebase has
no `post-card.tsx` yet.

---

## Step 8 — Keep the Existing Stream Tab

No new tab is required.

The current layout file `frontend/app/dashboard/class/[id]/layout.tsx` already defines:

```typescript
const tabs = [
  { name: 'Stream', href: baseUrl },
  { name: 'Classwork', href: `${baseUrl}/classwork` },
  { name: 'People', href: `${baseUrl}/people` },
];
```

So the stream comments implementation should plug into the existing base page route:

- `frontend/app/dashboard/class/[id]/page.tsx`

and leave the tab structure alone.

---

## API Endpoint Summary

| Method   | Path                                          | Who         | What                        |
|----------|-----------------------------------------------|-------------|-----------------------------|
| `GET`    | `/api/v1/classes/:id/stream`                  | Teacher + enrolled students | Fetch all posts for a class |
| `POST`   | `/api/v1/classes/:id/stream`                  | Teacher + enrolled students | Create a new post           |
| `DELETE` | `/api/v1/stream/:postId`                      | Post author  | Delete own post             |
| `GET`    | `/api/v1/stream/:postId/comments`             | Teacher + enrolled students | Fetch comments on a post    |
| `POST`   | `/api/v1/stream/:postId/comments`             | Teacher + enrolled students | Add a comment               |
| `DELETE` | `/api/v1/stream/:postId/comments/:commentId`  | Comment author | Delete own comment        |

---

## Deliverables & Exit Criteria

- [ ] Migration adds `class_id` to `posts` and re-runs cleanly
- [ ] `sqlc generate` succeeds with new queries
- [ ] `GET /api/v1/classes/:id/stream` returns posts for a class
- [ ] `POST /api/v1/classes/:id/stream` creates a post scoped to a class
- [ ] `POST /api/v1/stream/:postId/comments` creates a comment on a post
- [ ] Post and comment author can delete their own content; others cannot
- [ ] Existing `frontend/app/dashboard/class/[id]/page.tsx` renders posts in reverse chronological order
- [ ] Comment section expands/collapses per post
- [ ] New comment appears immediately without a page refresh
- [ ] Existing mock `posts` array is removed from `frontend/app/dashboard/class/[id]/page.tsx`
- [ ] Empty state shown when no posts exist
- [ ] `frontend/app/dashboard/class/[id]/layout.tsx` continues to use the base class route as the Stream tab

---

*Luminescence LMS — Stream & Comments Feature Guide*

