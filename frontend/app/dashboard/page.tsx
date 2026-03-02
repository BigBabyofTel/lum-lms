'use client'
import React, {useEffect, useState} from 'react'
import ClassCard from '@/components/class-card'
import {useUserStore} from "@/store/useUserStore";
import {getAllClasses} from "@/lib/actions";
import {Class} from "@/lib/types";


export default function Page() {
    const id = useUserStore((state) => state.id)
    const [classData, setClassData] = useState<Class[]>([])

//load the data attached to users_id that is set in auth
    useEffect(() => {
        console.log(id)
        if (!id) return
        //add logic for GET request
        const timer = setTimeout(async() => {
            const data: Class[] = await getAllClasses(id as string)
            setClassData(data)
            return
        }, 500)
        return () => clearTimeout(timer)
    }, [id])



console.log(classData[0].id)
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
            </div>

            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classData?.map((classDetails) => (
                    <ClassCard
                        key={classDetails.id}
                        id={classDetails.id}
                        name={classDetails.subject}
                        grade={classDetails.grade}
                        teacher={classDetails.subject}
                        color={'blue'}
                    />
                ))}
            </div>
        </div>
    )
}

