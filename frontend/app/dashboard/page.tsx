'use client'
import React, {useEffect, useState} from 'react'
import {useUserStore} from "@/store/useUserStore";
import {getAllClasses} from "@/lib/actions";
import {Class} from "@/lib/types";
import ClassCard from "@/components/class-card";


export default function Page() {
    const id = useUserStore((state) => state.id)
    const [classData, setClassData] = useState<Class[]>([])

//load the data attached to users_id that is set in auth
    useEffect(() => {
        if (!id) return
        //add logic for GET request
       (async() => {
            const data = await getAllClasses(id as string) ?? []
            setClassData(data)
            return
        })()
    }, [id])
console.log(classData)
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
            </div>

            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classData.map((data) => (
                    <ClassCard
                        key={data.id}
                        name={data.subject}
                        grade={data.grade}
                        teacher={'Mr.Baker'}
                        color={'blue'}
                    />
                ))}
            </div>
        </div>
    )
}

