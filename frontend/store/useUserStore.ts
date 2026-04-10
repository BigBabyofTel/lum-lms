import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UserState } from '@/store/storeTypes';
import { User } from '@/lib/types';

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
        set(() => ({
          id: id,
          errors: [],
        }));
      },
      setUser: (data: User) => {
        set(() => ({
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
        }));
      },
      setAccessToken: (token: string) => {
        set(() => ({
          accessToken: token,
        }));
      },
      clearUser: () => {
        set(() => ({
          id: '',
          accessToken: '',
          first_name: '',
          last_name: '',
          email: '',
          type: '',
          errors: [],
        }));
      },
    }),
    {
      name: 'user-storage', // name of the item in storage
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      //partialize: (state) => ({ id: state.id }) // only persist the 'id' field
    }
  )
);
