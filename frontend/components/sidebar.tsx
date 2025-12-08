'use client'
import React from 'react'
import {Home, Calendar, CheckSquare, Archive, Settings, Plus} from 'lucide-react'
import Link from 'next/link'

interface SidebarItem {
    label: string
    href: string
    icon: React.ReactNode
    active?: boolean
}

interface EnrolledClass {
    id: string
    name: string
    grade: string
    color: string
}

// Mock enrolled classes - this would come from data fetching in a real app
const enrolledClasses: EnrolledClass[] = [
    {id: '1', name: '2B', grade: 'Grade 2', color: 'bg-blue-600'},
]

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

export default function Sidebar({isOpen, onClose}: SidebarProps) {
    const mainItems: SidebarItem[] = [
        {label: 'Home', href: '/dashboard', icon: <Home size={20}/>, active: true},
        {label: 'Calendar', href: '/dashboard/calendar', icon: <Calendar size={20}/>},
    ]

    const bottomItems: SidebarItem[] = [
        {label: 'Archived classes', href: '/dashboard/archived', icon: <Archive size={20}/>},
        {label: 'Settings', href: '/dashboard/settings', icon: <Settings size={20}/>},
    ]

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-screen w-80 bg-gray-50 dark:bg-gray-900 
                    transition-transform duration-300 ${isOpen ? 'z-50' : 'z-40'}
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* User Profile Section */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                                A
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Augustus Baker</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">augustus.tb@gmail.com</p>
                            </div>
                        </div>
                        <button
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Add account"
                        >
                            <Plus size={20} className="text-gray-600 dark:text-gray-400"/>
                        </button>
                    </div>

                    {/* Main Navigation Items */}
                    <nav className="px-4 space-y-1">
                        {mainItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
                                    item.active
                                        ? 'bg-blue-200 dark:bg-blue-900 text-gray-900 dark:text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                                }`}
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Enrolled Section */}
                    <div className="mt-6 px-4">
                        <h3 className="px-4 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            Enrolled
                        </h3>
                        <nav className="space-y-1">
                            <Link
                                href="/dashboard/todo"
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                            >
                                <CheckSquare size={20}/>
                                <span className="font-medium">To-do</span>
                            </Link>
                            {enrolledClasses.map((classItem) => (
                                <Link
                                    key={classItem.id}
                                    href={`/dashboard/class/${classItem.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className={`w-8 h-8 ${classItem.color} rounded flex items-center justify-center text-white text-sm font-bold`}>
                                        {classItem.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{classItem.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{classItem.grade}</p>
                                    </div>
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Bottom Navigation */}
                    <nav className="px-4 pb-4 space-y-1">
                        {bottomItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Help Button */}
                    <div className="p-4 flex justify-end">
                        <button
                            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Help"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}
