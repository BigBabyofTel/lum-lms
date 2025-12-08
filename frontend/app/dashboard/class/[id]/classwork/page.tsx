'use client'
import React, {useState} from 'react'
import {FileText, BookOpen, MoreVertical, ChevronDown} from 'lucide-react'

interface Assignment {
    id: string
    title: string
    type: 'assignment' | 'material'
    date: string
    dateLabel: string
    attachmentCount?: number
}

interface Topic {
    id: string
    name: string
    assignments: Assignment[]
}

// Mock data
const topics: Topic[] = [
    {
        id: '1',
        name: 'Social Studies',
        assignments: [
            {
                id: '1',
                title: 'Unit 4 Lesson 3',
                type: 'material',
                date: 'May 14, 2020',
                dateLabel: 'Posted',
                attachmentCount: 1
            },
            {
                id: '2',
                title: 'Unit 4 lesson 2',
                type: 'material',
                date: 'May 13, 2020',
                dateLabel: 'Posted'
            },
            {
                id: '3',
                title: 'Unit 4 lesson 1',
                type: 'material',
                date: 'May 11, 2020',
                dateLabel: 'Posted',
                attachmentCount: 5
            },
            {
                id: '4',
                title: 'Unit 3 part 1',
                type: 'assignment',
                date: 'Apr 10, 2020',
                dateLabel: 'Due',
                attachmentCount: 3
            },
            {
                id: '5',
                title: 'Unit 3 Textbook clips',
                type: 'material',
                date: 'Apr 7, 2020',
                dateLabel: 'Posted',
                attachmentCount: 9
            },
            {
                id: '6',
                title: 'Social Studies Unit 4 Vocabulary',
                type: 'material',
                date: 'May 2, 2020',
                dateLabel: 'Posted'
            }
        ]
    },
    {
        id: '2',
        name: 'Science',
        assignments: [
            {
                id: '7',
                title: 'Growing a plant games',
                type: 'material',
                date: 'May 13, 2020',
                dateLabel: 'Edited',
                attachmentCount: 1
            }
        ]
    }
]

export default function ClassworkPage() {
    const [selectedTopic, setSelectedTopic] = useState('All topics')

    return (
        <div className="space-y-6">
            {/* View Your Work Button */}
            <div>
                <button className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <FileText size={20}/>
                    <span className="font-medium">View your work</span>
                </button>
            </div>

            {/* Topic Filter */}
            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Topic filter</label>
                <div className="relative">
                    <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="appearance-none px-4 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors cursor-pointer w-64"
                    >
                        <option>All topics</option>
                        {topics.map((topic) => (
                            <option key={topic.id} value={topic.name}>
                                {topic.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" size={20}/>
                </div>
            </div>

            {/* Topics and Assignments */}
            <div className="space-y-8">
                {topics.map((topic) => (
                    <div key={topic.id}>
                        {/* Topic Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-normal text-gray-900 dark:text-white">{topic.name}</h2>
                            <button
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                aria-label="More options"
                            >
                                <MoreVertical size={20} className="text-gray-600 dark:text-gray-400"/>
                            </button>
                        </div>

                        {/* Assignments List */}
                        <div className="space-y-2">
                            {topic.assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                >
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        assignment.type === 'assignment' 
                                            ? 'bg-blue-600' 
                                            : 'bg-gray-400 dark:bg-gray-600'
                                    }`}>
                                        {assignment.type === 'assignment' ? (
                                            <FileText size={20} className="text-white"/>
                                        ) : (
                                            <BookOpen size={20} className="text-white"/>
                                        )}
                                    </div>

                                    {/* Assignment Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {assignment.dateLabel} {assignment.date}
                                                </p>
                                            </div>
                                            {assignment.attachmentCount && (
                                                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                    <FileText size={16}/>
                                                    <span>{assignment.attachmentCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* More Options */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            // Handle more options
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        aria-label="More options"
                                    >
                                        <MoreVertical size={20} className="text-gray-600 dark:text-gray-400"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
