import {create} from 'zustand';
import {testUserSchema, userSchema} from "@/lib/schemas";
import {$ZodIssue} from "zod/v4/core";
import {createJSONStorage, persist} from "zustand/middleware";

export interface UserState {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    type: string | null;
    setId: (id: string) => void;
    setUser: ({id, firstName, lastName, email, type}: {id: string, firstName: string, lastName: string, email: string, type: string} ) => void;
    errors?: $ZodIssue[];
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            //hard coded ID
            id: '',
            firstName: '',
            lastName: '',
            email: '',
            type: '',
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
            setUser: ({id, firstName, lastName, email, type}: {id: string, firstName: string, lastName: string, email: string, type: string}) => {
                const result = userSchema.safeParse({id, firstName, lastName, email, type})
                if(!result.success) {
                    const fieldErrors = result.error.issues;
                    set(() => ({
                        errors: {...fieldErrors}
                    }))
                    console.error('Fetching students error', fieldErrors)
                    return false;
                }
                set(()=> ({
                    id: result.data.id,
                    firstName: result.data.first_name,
                    lastName: result.data.last_name,
                    email: result.data.email,
                    type: result.data.type,
                }))
            },
            errors: []
        }),
        {
            name: 'user-storage', // name of the item in storage
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            //partialize: (state) => ({ id: state.id }) // only persist the 'id' field
        }
    )
)