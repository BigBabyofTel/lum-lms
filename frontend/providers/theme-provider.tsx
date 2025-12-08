'use client'
import React, {createContext, useContext, useEffect, useState} from 'react'
import {Moon, Sun} from 'lucide-react'

interface ThemeContextType {
    isDark: boolean
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}

export function ThemeToggleButton() {
    const {isDark, toggleTheme} = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
        >
            {isDark ? <Sun size={20} className="text-yellow-500"/> : <Moon size={20} className="text-gray-700"/>}
        </button>
    )
}

export default function ThemeProvider({children}: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        // Check system preference on mount
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        setIsDark(mediaQuery.matches)

        // Listen for changes
        const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches)
        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark)
    }, [isDark])

    const toggleTheme = () => setIsDark(!isDark)

    return (
        <ThemeContext.Provider value={{isDark, toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    )
}
