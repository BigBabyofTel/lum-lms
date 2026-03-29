'use client'
import React, {useEffect} from 'react'
import {useUserStore} from "@/store/useUserStore";
import {getAllClasses} from "@/lib/actions";
import ClassCard from "@/components/class-card";
import {useClassStore} from "@/store/useClassesStore";


export default function Page() {
    const id = useUserStore((state) => state.id)
    const setClasses = useClassStore((state) => state.setClasses)
    const classes = useClassStore((state) => state.classes)

//load the data attached to users_id that is set in auth
    useEffect(() => {
        if (!id) return
        if (classes.length > 0) return
       (async() => {
            const data = await getAllClasses(id as string)
            setClasses(data)
           })()
    }, [id])
//add conditional rendering for if there is nothing here
// this is the view for a teacher
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
            </div>

            {/* Class Cards Grid */}
            {id && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes?.map((data) => (
                        <ClassCard
                            key={data.id}
                            name={data.subject}
                            grade={data.grade}
                            teacher={'Mr. Baker'}
                            color={'bg-blue-400'}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

