'use client'
import React, {useEffect, useState} from 'react'

export default function ThemeProvider({children}: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark)
    }, [isDark])

    console.log(isDark)
    return (
        <>
            <button onClick={() => setIsDark(!isDark)}>Toggle Theme</button>
            {children}
        </>
    )
}
