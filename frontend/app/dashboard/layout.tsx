'use client'
import React, {useState} from "react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import {NavbarProvider, useNavbar} from "@/providers/navbar-provider";

function DashboardContent({
                              children,
                          }: Readonly<{
    children: React.ReactNode;
}>) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const {title} = useNavbar();

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
            />
            {/* Main content area with top padding for navbar */}
            <main className="pt-20 p-8 transition-all duration-300">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({
                                            children,
                                        }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <NavbarProvider>
            <DashboardContent>
                {children}
            </DashboardContent>
        </NavbarProvider>
    );
}
