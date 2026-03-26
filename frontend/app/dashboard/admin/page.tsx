"use client"
import {useEffect, useState} from 'react'
import {getAllStudents} from "@/lib/actions";
import {User} from "@/lib/types";
import StudentCard from "@/components/student-card";
import {useUserStore} from "@/store/useUserStore";

export default function Page() {
    const [role, _] = useState('teacher')
    const [user, setUser] = useState<User[]>([])
    const id = useUserStore((state) => state.id)

    useEffect(() => {
        if (!id) return
        (async() => {
            const data = await getAllStudents()
            setUser(data)
            return
        })()
    }, [])

    return (
        <>
            {role === 'student' && (
                <h1>
                    student panel
                </h1>
            )}

            {role === 'teacher' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {
                        user.map((data) => (
                            <StudentCard key ={data.id}
                                         firstName={data.firstName}
                                         lastName={data.lastName}
                                         email={data.email}
                                         grade={'0'} />
                        ))
                    }
                </div>
            )}


        </>
    )
}