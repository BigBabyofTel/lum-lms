import { create } from 'zustand';
import { ClassState } from '@/store/storeTypes';
import { Class } from '@/lib/types';
import { apiFetch } from '@/lib/api';

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
      isLoading: v,
    }));
  },
  setError: (e: string | null) => {
    set(() => ({
      error: e,
    }));
  },
  setClasses: (data: Class[]) => {
    set(() => ({
      classes: data,
      errors: [],
    }));
  },
  fetchClasses: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ classes: Class[] }>('/api/v1/classes/get');
      set({ classes: data.classes ?? [], isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
  clearClasses: () => {
    set(() => ({
      classes: [],
      errors: [],
    }));
  },
}));
