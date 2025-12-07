"use client"
import Image from "next/image"
import {useRouter} from "next/navigation"

export default function Page() {
    const router = useRouter()
    return (
        <>
            <section
                className="h-dvh w-full flex flex-col items-center justify-evenly">
                <div>
                    <h1 className="text-5xl "><span
                        className="text-indigo-700 dark:text-orange-600">l</span>u<span
                        className="text-indigo-700 dark:text-orange-600">m</span>ine<span
                        className="text-indigo-700 dark:text-orange-600">s</span>cence
                    </h1>
                </div>
                <div>
                    <h2 className="text-lg">Sign in to your account as</h2>
                </div>
                <div
                    className="w-full flex flex-row items-center justify-around">
                    <div
                        role="button"
                        onClick={() => router.push('/dashboard')}
                        className="ww-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100">
                        <span className="mt-5">Staff</span>
                        <Image src="/teacher.webp" width={100} height={100} alt="an icon representing teachers"/></div>
                    <div
                        className="w-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100">
                        <span className="mt-5">Parent</span>
                        <Image src="/parent.webp" width={75} height={75} alt="icon representing parents"
                               className="mt-[20px]"/>
                    </div>
                    <div
                        className="w-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100">
                        <span className="mt-5">Student</span>
                        <Image src="/student.webp" width={100} height={100} alt="an icon representing students"/>
                    </div>

                </div>
            </section>
        </>
    )
}