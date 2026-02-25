import {create} from 'zustand';

export interface UserState {
    id: string;
}

export const useUserStore = create<UserState>(() => ({
    //hard coded ID
    id: '49afc0c3-a283-4364-a0a7-dfda2d440880'
}))