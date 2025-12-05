import type {Metadata} from "next";
import "./globals.css";
import React from "react";
import ThemeProvider from '@/providers/theme-provider';


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

        >
        <ThemeProvider>
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}
