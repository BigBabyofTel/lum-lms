import { Class, User } from '@/lib/types';
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
