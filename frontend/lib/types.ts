export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: string;
  //link to the url for the image
  access_token?: string | null;
  avatar?: string;
  avatarColor?: string;
  role?: 'teacher' | 'student' | 'parent' | null;
  grade?: number;
  created_at?: string;
  updated_at?: string | null;
}

export interface FormState {
  error?: string;
  success?: string;
  access_token?: string;
  user?: User;
  fieldErrors?: {
    email?: string;
    password?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
    confirmPassword?: string;
    subject?: string;
    grade?: string;
  };
}

export interface Class {
  id: string;
  subject: string;
  grade: number;
  teacher?: string;
  teacherId?: string | { UUID: string; Valid: boolean };
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassDetailResponse {
  class: Class;
  teacher: User;
}

export interface Assignment {
  id: string;
  type: 'assignment' | 'material';
  title: string;
  class_id: string;
  details?: string | null;
  assign_date?: string | null;
  due_date?: string | null;
  attachment_count?: number | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface CreateAssignmentPayload {
  type: 'assignment' | 'material';
  title: string;
  details?: string;
  due_date?: string;
  attachment_count?: number;
}

export interface UpdateAssignmentPayload {
  type: 'assignment' | 'material';
  title: string;
  details?: string;
  due_date?: string;
  attachment_count?: number;
}

export type AssignmentStatus = 'assigned' | 'submitted' | 'graded' | 'missing';

export interface UserAssignment {
  id: string;
  assignment_id: string;
  student_id: string;
  grade?: number | null;
  status: AssignmentStatus;
  submission_text?: string | null;
  submitted_at?: string | null;
  feedback?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface AssignmentDetailResponse {
  assignment: Assignment;
  user_assignment: UserAssignment | null;
}

export interface AssignmentSubmission extends UserAssignment {
  first_name: string;
  last_name: string;
  email: string;
  student_grade?: number | null;
}

export interface GradebookRow {
  assignment_id: string;
  title: string;
  due_date?: string | null;
  user_assignment_id: string;
  student_id: string;
  grade?: number | null;
  status: AssignmentStatus;
  feedback?: string | null;
  submitted_at?: string | null;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Topic {
  id: string;
  name: string;
  assignments: Assignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  comments: {
    id: string;
    author: string;
    content: string;
    avatar?: string;
    createdAt?: string;
    updatedAt?: string;
  }[];
}
