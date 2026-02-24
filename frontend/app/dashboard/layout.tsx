'use client'
import React, {useState} from "react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import {NavbarProvider, useNavbar} from "@/components/providers/navbar-provider";
import ClassFormModal from "@/components/class-form-modal";

// ---------------------------------------------------------------------------
// Inner layout — needs useNavbar so it must sit inside NavbarProvider
// ---------------------------------------------------------------------------
function DashboardContent({children}: Readonly<{ children: React.ReactNode }>) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const {title} = useNavbar()

    return (
        <div className="min-h-screen">
            <Navbar
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                title={title ?? undefined}
            />
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onOpenCreateClass={() => setIsModalOpen(true)}
            />
            {/* Main content area with top padding for navbar */}
            <main className="pt-20 p-8 transition-all duration-300">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Create class modal — lives here so sidebar can trigger it */}
            {isModalOpen && (
                <ClassFormModal
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    )
}

export default function DashboardLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <NavbarProvider>
            <DashboardContent>
                {children}
            </DashboardContent>
        </NavbarProvider>
    )
}

