'use client'
import {createContext, useContext} from 'react'

export interface CreatedClass {
    id: string
    name: string
    grade: string
    teacher: string
    color: string
}

interface DashboardClassContextType {
    createdClasses: CreatedClass[]
}

export const DashboardClassContext = createContext<DashboardClassContextType>({createdClasses: []})

export function useDashboardClasses() {
    return useContext(DashboardClassContext)
}

