import {Class, User} from "@/lib/types";


export interface UserState extends User {
    accessToken: string | null;
    setId: (id: string) => void;
    setAccessToken: (token: string) => void;
    setUser: (data: User) => void;
    clearUser: () => void;
    errors?: [];
}

export interface ClassState extends Class {
    setClasses: (data: Class[]) => void;
    clearClasses: () => void;
    errors?: [];
    classes: Class[]
}