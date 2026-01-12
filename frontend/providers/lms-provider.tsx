'use client'
import React, {createContext, ReactNode, useContext, useState} from 'react'
import {Class, ClassDetail, User} from '@/lib/types'
import {lmsConfig} from '@/config/lms-config'

interface LmsContextType {
    user: User
    classes: Class[]
    activeClass: ClassDetail | null
    isLoading: boolean
    setActiveClass: (id: string) => void
}

const LmsContext = createContext<LmsContextType | undefined>(undefined)

export function LmsProvider({children}: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false)

    // Initialize with your mock config data
    const [user] = useState<User>(lmsConfig.user)

    // This would eventually be fetched from your Go backend
    const [classes] = useState<Class[]>([
        {id: '1', name: '2B', grade: 'Grade 2', teacher: 'Unknown user', color: 'bg-blue-600'}
    ])

    const [activeClass, setActiveClassData] = useState<ClassDetail | null>(null)

    const setActiveClass = (id: string) => {
        setIsLoading(true)
        // In a real app, you'd fetch specific class data here
        // For now, you'd filter your mock data objects
        console.log(`Loading data for class: ${id}`)
        setIsLoading(false)
    }

    return (
        <LmsContext.Provider value={{user, classes, activeClass, isLoading, setActiveClass}}>
            {children}
        </LmsContext.Provider>
    )
}

export function useLms() {
    const context = useContext(LmsContext)
    if (context === undefined) {
        throw new Error('useLms must be used within an LmsProvider')
    }
    return context
}