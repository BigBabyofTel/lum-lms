"use client"
import {useState} from 'react'
import {User} from "@/lib/types";

export default function Page() {
    const [role, setRole] = useState('teacher')
    const [students, setStudents] = useState<User[]>([{}])


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