'use client'
import React, {useState} from 'react'
import {BookOpen, Home, Menu, Settings, Users, X} from 'lucide-react'
import Link from 'next/link'

interface SidebarItem {
    label: string
    href: string
    icon: React.ReactNode
}

const sidebarItems: SidebarItem[] = [
    {label: 'Dashboard', href: '/dashboard', icon: <Home size={20}/>},
    {label: 'Students', href: '/students', icon: <Users size={20}/>},
    {label: 'Courses', href: '/courses', icon: <BookOpen size={20}/>},
    {label: 'Settings', href: '/settings', icon: <Settings size={20}/>},
]

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg"
            >
                {isOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
                    transition-transform duration-300 z-40
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo/Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white ml-10">
                            LuMineScence
                        </h2>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 p-4 space-y-2">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300
                                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            © 2025 LuMineScence
                        </p>
                    </div>
                </div>
            </aside>
        </>
    )
}

