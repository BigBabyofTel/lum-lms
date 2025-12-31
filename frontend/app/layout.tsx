import type {Metadata} from "next";
import "./globals.css";
import React from "react";
import ThemeProvider from '../providers/theme-provider';


export const metadata: Metadata = {
    title: "Luminescence",
    description: "A light for your education",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body
            className="bg-gradient-to-r from-yellow-400 to-orange-300 dark:bg-gradient-to-r dark:from-blue-900 dark:to-indigo-950 dark:text-white "
        >
        <ThemeProvider>
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}
