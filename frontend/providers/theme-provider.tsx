'use client'
import React, {useEffect, useState} from 'react'
import {Moon, Sun} from 'lucide-react'

export default function ThemeProvider({children}: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark)
    }, [isDark])

    console.log(isDark)
    return (
        <>
            <button
                className="absolute top-4 right-4"
                onClick={() => setIsDark(!isDark)}>
                {
                    isDark ? <Sun color="white"/> :
                        <Moon/>
                }
            </button>
            {children}
        </>
    )
}
