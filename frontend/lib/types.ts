import {$ZodIssue} from "zod/v4/core";

export interface UserState {
    id: string
    accessToken?: string;
    first_name: string;
    last_name: string;
    email: string;
    type: string;
    //link to the url for the image
    avatar?: string;
    avatarColor?: string;
    role?: 'teacher' | 'student' | 'parent';
    createdAt?: string;
    updatedAt?: string;
    setId: (id: string) => void;
    setAccessToken: (token: string) => void;
    setUser: ({id, first_name, last_name, email, type}: {id: string, first_name: string, last_name: string, email: string, type: string} ) => void;
    clearUser: () => void;
    errors?: $ZodIssue[];
}

export interface FormState {
    error?: string,
    success?: string
}


export interface ClassState {
    id: string;
    subject: string;
    grade: number;
    teacher?: string;
    teacherId?: string | {UUID: string, Valid: boolean};
    createdAt?: string;
    updatedAt?: string;
    setClasses: (data: Classes[]) => void;
    updateSubject?: (subject: string) => void;
    updateGrade?: (grade: number) => void;
    errors?: $ZodIssue[];
    classes: Classes[]
}

export interface Classes {
    id: string;
    subject: string;
    grade: number;
    teacher?: string;
    teacherId?: string | {UUID: string, Valid: boolean};
}

export interface Assignment {
    id: string;
    title: string;
    type: 'assignment' | 'material';
    assignDate?: string;
    dueDate?: string;
    attachmentCount?: number;
    createdAt?: string;
    updatedAt?: string;
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

