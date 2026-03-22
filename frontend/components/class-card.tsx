'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface ClassCardProps {
    name: string
    grade: number
    teacher: string
    color?: string
}

export default function ClassCard({name, grade, teacher = 'Mr.Baker', color = 'bg-blue-400'}: ClassCardProps) {
    return (
        <Link href={`/dashboard/class/${name}`}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                {/* Card Header */}
                <div className={`${color} p-4 h-32 relative`}>
                    <h3 className="dark:text-white text-2xl font-bold">{name}</h3>
                    <p className="dark:text-white text-sm mt-1">{grade}</p>
                    <p className="dark:text-white text-xs mt-1">{teacher}</p>

                    {/* User Avatar */}
                    <div
                        className="absolute bottom-4 right-4 w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <Image src="/icons/user-circle.svg" alt="User" width={40} height={40}
                               className="text-gray-500 dark:text-gray-400"/>
                    </div>
                </div>

                {/* Card Footer with Actions */}
                <div className="p-4 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            console.log('View people clicked for class:')
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="View people"
                    >
                        <Image src="/icons/user-circle.svg" alt="View people" width={20} height={20}
                               className="text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            console.log('View folder clicked for class:')
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="View folder"
                    >
                        <Image src="/icons/folder.svg" alt="View folder" width={20} height={20}
                               className="text-gray-600 dark:text-gray-400"/>
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            console.log('More options clicked for class:')
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="More options"
                    >
                        <Image src="/icons/more-vertical.svg" alt="More options" width={20} height={20}
                               className="text-gray-600 dark:text-gray-400"/>
                    </button>
                </div>
            </div>
        </Link>
    )
}
