"use client"
import {useState} from 'react'

export default function Page() {
    const [role, setRole] = useState('teacher')

    return (
        <>
            {role === 'student' && (
                <h1>
                    student panel
                </h1>
            )}

            {role === 'teacher' && (
                <h1>
                    admin panel
                </h1>
            )}


        </>
    )
}