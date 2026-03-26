export interface User {
    id: string
    firstName: string;
    lastName: string;
    email: string;
    //link to the url for the image
    avatar?: string;
    avatarColor: string;
    role: 'teacher' | 'student' | 'parent';
    parent_of_id?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FormState {
    error?: string,
    success?: string
}


export interface Class {
    id: string;
    subject: string;
    grade: number;
    teacher?: string;
    teacherId?: {UUID: string, Valid: boolean};
    createdAt?: string;
    updatedAt?: string;
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

