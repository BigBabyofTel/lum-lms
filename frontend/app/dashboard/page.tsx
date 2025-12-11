'use client'
import ClassCard from '@/components/class-card'

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