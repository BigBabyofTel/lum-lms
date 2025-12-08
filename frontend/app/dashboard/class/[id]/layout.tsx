'use client'
import React, {use, useEffect} from 'react'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useNavbar} from '@/providers/navbar-provider'

interface ClassLayoutProps {
    children: React.ReactNode
    params: Promise<{
        id: string
    }>
}

// Mock class data - in a real app, this would come from an API
const classData: {[key: string]: {name: string, grade: string}} = {
    '1': {name: '2B', grade: 'Grade 2'},
}

export default function ClassLayout({children, params}: ClassLayoutProps) {
    const pathname = usePathname()
    const {id} = use(params)
    const baseUrl = `/dashboard/class/${id}`
    const {setTitle} = useNavbar()
    
    // Get class info from mock data
    const classInfo = classData[id] || {name: 'Class', grade: ''}
    
    // Update navbar title when component mounts or id changes
    useEffect(() => {
        setTitle(classInfo.name)
        
        // Clean up: reset title when component unmounts
        return () => {
            setTitle(null)
        }
    }, [id, classInfo.name, setTitle])

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
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
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
