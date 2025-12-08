'use client'
import ClassCard from '@/components/class-card'
import {Menu, Plus} from 'lucide-react'

// Mock data - would come from data fetching in a real app
const classes = [
    {
        id: '1',
        name: '2B',
        grade: 'Grade 2',
        teacher: 'Unknown user',
        color: 'bg-blue-600'
    },
]

export default function Page() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => console.log('Dashboard menu clicked')}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Menu"
                    >
                        <Menu size={24} className="text-gray-700 dark:text-gray-300"/>
                    </button>
                    <h1 className="text-2xl font-normal text-gray-900 dark:text-white">
                        Classroom
                    </h1>
                </div>
                <button
                    onClick={() => console.log('Add new class clicked')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Add class"
                >
                    <Plus size={24} className="text-gray-700 dark:text-gray-300"/>
                </button>
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