import {
  Assignment,
  AssignmentDetailResponse,
  AssignmentSubmission,
  Class,
  CreateAssignmentPayload,
  GradebookRow,
  Post,
  PostComment,
  UpdateAssignmentPayload,
  User,
  UserAssignment,
} from '@/lib/types';
import { apiFetch } from '@/lib/api';

export async function getAllClasses(): Promise<Class[]> {
  const data = await apiFetch<{ classes: Class[] }>('/api/v1/classes');
  return Array.isArray(data.classes) ? data.classes : [];
}

export async function getAllStudents(): Promise<User[]> {
  const data = await apiFetch<User[]>('/api/v1/students');
  return Array.isArray(data) ? data : [];
}

export async function getClassStudents(classId: string): Promise<User[]> {
  const data = await apiFetch<{ students: User[] }>(
    `/api/v1/classes/${classId}/students`
  );
  return Array.isArray(data.students) ? data.students : [];
}

export async function fetchStudentClasses(studentId: string): Promise<Class[]> {
  const data = await apiFetch<{ classes: Class[] }>(
    `/api/v1/students/${studentId}/classes`
  );
  return Array.isArray(data.classes) ? data.classes : [];
}

export async function batchEnroll(
  studentId: string,
  classIds: string[]
): Promise<void> {
  if (classIds.length === 0) return;
  await apiFetch(`/api/v1/students/${studentId}/enrollments`, {
    method: 'POST',
    body: JSON.stringify({ class_ids: classIds }),
  });
}

export async function unenrollStudent(
  studentId: string,
  classId: string
): Promise<void> {
  await apiFetch(`/api/v1/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
  });
}

export async function getClassAssignments(
  classId: string
): Promise<Assignment[]> {
  const data = await apiFetch<{ assignments: Assignment[] }>(
    `/api/v1/classes/${classId}/assignments`
  );
  return Array.isArray(data.assignments) ? data.assignments : [];
}

export async function createAssignment(
  classId: string,
  payload: CreateAssignmentPayload
): Promise<Assignment> {
  const data = await apiFetch<{ assignment: Assignment }>(
    `/api/v1/classes/${classId}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return data.assignment;
}

export async function getAssignment(
  assignmentId: string
): Promise<AssignmentDetailResponse> {
  return apiFetch<AssignmentDetailResponse>(
    `/api/v1/assignments/${assignmentId}`
  );
}

export async function updateAssignment(
  assignmentId: string,
  payload: UpdateAssignmentPayload
): Promise<Assignment> {
  const data = await apiFetch<{ assignment: Assignment }>(
    `/api/v1/assignments/${assignmentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return data.assignment;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/v1/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

export async function submitAssignment(
  assignmentId: string,
  submissionText: string
): Promise<UserAssignment> {
  const data = await apiFetch<{ submission: UserAssignment }>(
    `/api/v1/assignments/${assignmentId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ submission_text: submissionText }),
    }
  );
  return data.submission;
}

export async function getAssignmentSubmissions(
  assignmentId: string
): Promise<AssignmentSubmission[]> {
  const data = await apiFetch<{ submissions: AssignmentSubmission[] }>(
    `/api/v1/assignments/${assignmentId}/submissions`
  );
  return Array.isArray(data.submissions) ? data.submissions : [];
}

export async function gradeUserAssignment(
  userAssignmentId: string,
  payload: { grade: number; feedback?: string }
): Promise<UserAssignment> {
  const data = await apiFetch<{ user_assignment: UserAssignment }>(
    `/api/v1/user-assignments/${userAssignmentId}/grade`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  return data.user_assignment;
}

export async function getClassGradebook(
  classId: string
): Promise<GradebookRow[]> {
  const data = await apiFetch<{ gradebook: GradebookRow[] }>(
    `/api/v1/classes/${classId}/gradebook`
  );
  return Array.isArray(data.gradebook) ? data.gradebook : [];
}

export async function getClassStream(classId: string): Promise<Post[]> {
  const data = await apiFetch<{ posts: Post[] }>(
    `/api/v1/classes/${classId}/stream`
  );
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function createClassPost(
  classId: string,
  content: string
): Promise<Post> {
  const data = await apiFetch<{ post: Post }>(
    `/api/v1/classes/${classId}/stream`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    }
  );
  return data.post;
}

export async function updatePost(
  postId: string,
  content: string
): Promise<Post> {
  const data = await apiFetch<{ post: Post }>(`/api/v1/stream/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return data.post;
}

export async function deletePost(postId: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/v1/stream/${postId}`, {
    method: 'DELETE',
  });
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const data = await apiFetch<{ comments: PostComment[] }>(
    `/api/v1/stream/${postId}/comments`
  );
  return Array.isArray(data.comments) ? data.comments : [];
}

export async function createPostComment(
  postId: string,
  content: string
): Promise<PostComment> {
  const data = await apiFetch<{ comment: PostComment }>(
    `/api/v1/stream/${postId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    }
  );
  return data.comment;
}

export async function updatePostComment(
  postId: string,
  commentId: string,
  content: string
): Promise<PostComment> {
  const data = await apiFetch<{ comment: PostComment }>(
    `/api/v1/stream/${postId}/comments/${commentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }
  );
  return data.comment;
}

export async function deletePostComment(
  postId: string,
  commentId: string
): Promise<void> {
  await apiFetch<{ message: string }>(
    `/api/v1/stream/${postId}/comments/${commentId}`,
    {
      method: 'DELETE',
    }
  );
}
