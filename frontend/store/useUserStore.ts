import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UserState } from '@/store/storeTypes';
import { User } from '@/lib/types';

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      //hard coded ID
      id: '',
      access_token: '',
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
          access_token: data.access_token,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          type: data.type,
        }));
      },
      setAccessToken: (token: string) => {
        set(() => ({
          access_token: token,
        }));
      },
      clearUser: () => {
        set(() => ({
          id: '',
          access_token: '',
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
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
      //partialize: (state) => ({ id: state.id }) // only persist the 'id' field
    }
  )
);
