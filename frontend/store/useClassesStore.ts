import {create} from 'zustand';
import {classArraySchema, classSchema} from "@/lib/schemas";
import {Classes, ClassState} from "@/lib/types";


export const useClassStore = create<ClassState>((set) => ({
    id: '',
    subject: '',
    grade: 0,
    teacher_id: '',
    errors: [],
    classes: [{
        id: "",
        subject: "",
        grade: 0
    }],
    setClasses: (data: Classes[]) => {
        const result = classArraySchema.safeParse(data)
        if (!result.success) {
            const fieldErrors = result.error.issues
            set(() => ({
                 errors: [...fieldErrors]
            }))
            console.error('Validation failed', fieldErrors)
            return false;
        }
        set(() => ({
            classes: result.data,
            errors: [],
        }))

    },
    updateSubject: (subject:string) => {
        const result = classSchema.safeParse(subject)
        if (!result.success) {
            const fieldErrors = result.error.issues;
            set(() => ({
                errors: {...fieldErrors}
            }))
            console.error(`Validation failed`, fieldErrors);
            return false;
        }
        set((result) => ({
            subject: result.subject,
            errors: []
        }));
        console.log('Subject updated')
    },
    updateGrade: (grade) => {
        const result = classSchema.safeParse(grade);
        if (!result.success) {
            const fieldErrors = result.error.issues;
            set(() => ({
                errors: {...fieldErrors}
            }))
            console.error('validation failed', fieldErrors)
        }
        set((result) => ({
            grade: result.grade,
            errors: []
        }))
        console.log('Grade updated')
    },
}))