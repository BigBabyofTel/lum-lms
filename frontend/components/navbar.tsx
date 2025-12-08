'use client'
import React from 'react'
import {Menu, X} from 'lucide-react'
import {ThemeToggleButton} from '@/providers/theme-provider'

interface NavbarProps {
    isSidebarOpen: boolean
    onToggleSidebar: () => void
}

export default function Navbar({isSidebarOpen, onToggleSidebar}: NavbarProps) {
    return (
        <nav
            className="fixed top-0 right-0 left-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50">
            <div className="flex items-center justify-between h-full px-4">
                {/* Left side - Menu toggle button */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Toggle sidebar"
                >
                    {isSidebarOpen ? <X size={24}/> : <Menu size={24}/>}
                </button>

                {/* Center - Brand name */}
                <div className="flex-1 px-4 flex justify-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        <span className="text-indigo-700 dark:text-orange-600">l</span>u<span
                        className="text-indigo-700 dark:text-orange-600">m</span>ine<span
                        className="text-indigo-700 dark:text-orange-600">s</span>cence
                    </h1>
                </div>

                {/* Right side - Theme switcher and other actions */}
                <div className="flex items-center gap-3">
                    <ThemeToggleButton/>
                    {/* Add more navbar items here (notifications, user menu, etc.) */}
                </div>
            </div>
        </nav>
    )
}
