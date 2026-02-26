import {create} from 'zustand';
import {testUserSchema, UserClass,} from "@/lib/schemas";
import {$ZodIssue} from "zod/v4/core";

export interface UserState {
    id: string| null;
    setId: (id: string | null) => void;
    errors: Record<string, Partial<Record<keyof UserClass, string>> | $ZodIssue[]>;
}

export const useUserStore = create<UserState>((set) => ({
    //hard coded ID
    id: null,
    setId: (id: string| null) => {
        const result = testUserSchema.safeParse({id})
        if (!result.success) {
            const fieldErrors = result.error.issues;
            set((state) => ({
                errors: {...state.errors, fieldErrors}
            }))
            console.error(`Validation failed`, fieldErrors);
            return false;
        }
        set((result) => ({
            id: result.id,
            errors: {...result.errors}
        }))
    },
    errors: {}
}))