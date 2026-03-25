"use client"

import {createContext, ReactNode, useContext, useState} from "react";

interface UserContextType {
    id: string | null
    setId: (id: string| null) => void
}

const UserContext = createContext<UserContextType| undefined>(undefined)

export function UserProvider({children}: {children: ReactNode}) {
    const [id, setId] = useState<string| null>(null)

    return (
        <UserContext.Provider value={{id, setId}}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('Not able to read id')
    }
    return context
}