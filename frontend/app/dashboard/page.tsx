'use client'
import React, {useEffect} from 'react'
import ClassCard from '@/components/class-card'
import {useUser} from "@/components/providers/user-provider";

interface ClassItem {
    id: string
    name: string
    grade: string
    teacher: string
    color: string
}

// Mock data | Make api call to fetch class data
const initialClasses: ClassItem[] = [
    {
        id: '1',
        name: '5B',
        grade: 'Grade 2',
        teacher: 'Mr. Baker',
        color: 'bg-blue-600'
    },
]

export default function Page() {
    const classes = [...initialClasses]
    const id = useUser()

//load the data attached to users_id that is set in auth
    useEffect(() => {
        console.log(id)
    })




    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
            </div>

            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem) => (
                    <ClassCard
                        key={classItem.id}
                        id={classItem.id}
                        name={classItem.name}
                        grade={classItem.grade}
                        teacher={classItem.teacher}
                        color={classItem.color}
                    />
                ))}
            </div>
        </div>
    )
}

