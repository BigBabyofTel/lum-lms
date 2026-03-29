import {create} from 'zustand';
import {testUserSchema, tokenSchema, userSchema} from "@/lib/schemas";
import {createJSONStorage, persist} from "zustand/middleware";
import {UserState} from "@/lib/types";


export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            //hard coded ID
            id: '',
            accessToken: '',
            first_name: '',
            last_name: '',
            email: '',
            type: '',
            errors: [],
            //functions
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
            setUser: ({id, first_name, last_name, email, type}: {id: string, first_name: string, last_name: string, email: string, type: string}) => {
                const result = userSchema.safeParse({id, first_name, last_name, email, type})
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
                    first_name: result.data.first_name,
                    last_name: result.data.last_name,
                    email: result.data.email,
                    type: result.data.type,
                }))
            },
            setAccessToken: (token) => {
                const result = tokenSchema.safeParse(token)
                if (!result.success) {
                    const fieldErrors = result.error.issues;
                    set(() => ({
                        errors: {...fieldErrors}
                    }))
                    console.error('Access token is not valid', fieldErrors)
                    return false
                }
                set(() => ({
                    accessToken: result.data.accessToken
                }))
            } ,
            clearUser: () => {}
        }),
        {
            name: 'user-storage', // name of the item in storage
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            //partialize: (state) => ({ id: state.id }) // only persist the 'id' field
        }
    )
)