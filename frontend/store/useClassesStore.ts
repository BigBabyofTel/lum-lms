import {create} from 'zustand';
import {ClassState} from "@/store/storeTypes";
import {Class} from "@/lib/types";


export const useClassStore = create<ClassState>((set) => ({
    id: '',
    subject: '',
    grade: 0,
    teacher_id: '',
    isLoading: false,
    error: null,
    errors: [],
    classes: [],
    setLoading: (v: boolean) => {
        set(() => ({
            isLoading: v
        }))
    },
    setError: (e:string| null) => {
        set(() => ({
            error: e
        }))
    },
    setClasses: (data: Class[]) => {
        set(() => ({
            classes: data,
            errors: [],
        }))
    },
    clearClasses: () => {
        set(() => ({
            classes: [],
            errors: [],
        }))
    }
}))