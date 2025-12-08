'use client'
import React from 'react'
import Link from 'next/link'
import {UserCircle2, Folder, MoreVertical} from 'lucide-react'

interface ClassCardProps {
    id: string
    name: string
    grade: string
    teacher: string
    color?: string
}

export default function ClassCard({id, name, grade, teacher, color = 'bg-blue-600'}: ClassCardProps) {
    return (
        <Link href={`/dashboard/class/${id}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                {/* Card Header */}
                <div className={`${color} p-4 h-32 relative`}>
                    <h3 className="text-white text-2xl font-bold">{name}</h3>
                    <p className="text-white text-sm mt-1">{grade}</p>
                    <p className="text-white text-xs mt-1">{teacher}</p>
                    
                    {/* User Avatar */}
                    <div className="absolute bottom-4 right-4 w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <UserCircle2 size={40} className="text-gray-500 dark:text-gray-400"/>
                    </div>
                </div>

                {/* Card Footer with Actions */}
                <div className="p-4 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            // Handle people action
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="View people"
                    >
                        <UserCircle2 size={20} className="text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            // Handle folder action
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="View folder"
                    >
                        <Folder size={20} className="text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            // Handle more options
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="More options"
                    >
                        <MoreVertical size={20} className="text-gray-600 dark:text-gray-400"/>
                    </button>
                </div>
            </div>
        </Link>
    )
}
