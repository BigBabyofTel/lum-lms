import {create} from 'zustand';
import {v4 as uuidv4} from 'uuid'
import {classSchema, UserClass} from "@/lib/schemas";
import {$ZodIssue} from "zod/v4/core";


export interface ClassState {
    id: string;
    subject: string;
    grade: number;
    teacher_id: string;
    errors: Record<string, Partial<Record<keyof UserClass, string>> | $ZodIssue[]>;
    createClass: (data: UserClass) => void;
    updateSubject: (subject: string) => void;
    updateGrade: (grade: number) => void;
}

export const useClassStore = create<ClassState>((set) => ({
    id: String(uuidv4()),
    subject: '',
    grade: 0,
    teacher_id: String(uuidv4()),
    errors: {},

    createClass: (data: UserClass) => {
        const result = classSchema.safeParse(data)

        if (!result.success) {
            const fieldErrors = result.error.issues;
            set((state) => ({
                errors: {...state.errors, fieldErrors}
            }))
            console.error('Validation failed', fieldErrors)
            return false;
        }

        set((result) => ({
            id: result.id,
            subject: result.subject,
            grade: result.grade,
            teacher_id: result.teacher_id,
            errors: {...result.errors}
        }))
        console.log('Class has been added')
    },
    updateSubject: (subject:string) => {
        const result = classSchema.safeParse(subject)
        if (!result.success) {
            const fieldErrors = result.error.issues;
            set((state) => ({
                errors: {...state.errors, fieldErrors}
            }))
            console.error(`Validation failed`, fieldErrors);
            return false;
        }
        set((result) => ({
            subject: result.subject,
            errors: {...result.errors}
        }));
        console.log('Subject updated')
    },
    updateGrade: (grade) => {
        const result = classSchema.safeParse(grade);
        if (!result.success) {
            const fieldErrors = result.error.issues;
            set((state) => ({
                errors: {...state.errors, fieldErrors}
            }))
            console.error('validation failed', fieldErrors)
        }
        set((result) => ({
            grade: result.grade,
            errors: {...result.errors}
        }))
        console.log('Grade updated')
    },
}))