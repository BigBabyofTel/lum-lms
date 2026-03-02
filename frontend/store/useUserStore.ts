import {create} from 'zustand';
import {testUserSchema,} from "@/lib/schemas";
import {$ZodIssue} from "zod/v4/core";

export interface UserState {
    id: string| null;
    setId: (id: string ) => void;
    errors?: $ZodIssue[];
}

export const useUserStore = create<UserState>((set) => ({
    //hard coded ID
    id: '',
    setId: (id: string) => {
        const result = testUserSchema.safeParse({id})
        if (!result.success) {
            const fieldErrors = result.error.issues;
            set(() => ({
                errors: {...fieldErrors}
            }))
            console.error(`Validation failed`, fieldErrors);
            return false;
        }
        set(() => ({
            id: result.data.id,
            errors: []
        }))
    },
    errors: []
}))