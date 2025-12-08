'use client'
import React, {use} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {Menu, MoreVertical} from 'lucide-react'

interface ClassLayoutProps {
    children: React.ReactNode
    params: Promise<{
        id: string
    }>
}

export default function ClassLayout({children, params}: ClassLayoutProps) {
    const pathname = usePathname()
    const {id} = use(params)
    const baseUrl = `/dashboard/class/${id}`
    
    const tabs = [
        {name: 'Stream', href: baseUrl},
        {name: 'Classwork', href: `${baseUrl}/classwork`},
        {name: 'People', href: `${baseUrl}/people`},
    ]
    
    const isActiveTab = (href: string) => {
        if (href === baseUrl) {
            return pathname === baseUrl
        }
        return pathname.startsWith(href)
    }

    return (
        <div className="space-y-0">
            {/* Class Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Menu"
                    >
                        <Menu size={24} className="text-gray-700 dark:text-gray-300"/>
                    </button>
                    <div>
                        <h1 className="text-xl font-normal text-gray-900 dark:text-white">2B</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Grade 2</p>
                    </div>
                </div>
                <button
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="More options"
                >
                    <MoreVertical size={24} className="text-gray-700 dark:text-gray-300"/>
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-0">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                                isActiveTab(tab.href)
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab.name}
                            {isActiveTab(tab.href) && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                            )}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {children}
            </div>
        </div>
    )
}
