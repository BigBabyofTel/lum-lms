import { Class, User } from '@/lib/types';

export interface UserState extends User {
  setId: (id: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (data: User) => void;
  clearUser: () => void;
  errors?: [];
}

export interface ClassState extends Class {
  setClasses: (data: Class[]) => void;
  clearClasses: () => void;
  isLoading: boolean;
  setLoading: (value: boolean) => void;
  setError: (e: string | null) => void;
  error: string | null;
  errors?: [];
  classes: Class[];
}
