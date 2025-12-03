import Image from "next/image"

export default function Page() {

    return (
        <>
            <div
                className="h-dvh w-full flex flex-row items-center justify-around">
                <div className="w-1/4 h-1/5 p-5  bg-gray-200 text-center">Staff
                    <Image src="/teacher.webp" width={50} height={50} alt="an icon representing teachers"/></div>
                <div className="w-1/4 h-1/5 p-5  bg-gray-200 text-center">Student
                    <Image src="/student.webp" width={50} height={50} alt="an icon representing students"/>
                </div>
                <div className="w-1/4 h-1/5 p-5  bg-gray-200 text-center">Parent
                    <Image src="/parent.webp" width={50} height={50} alt="icon representing parents"/>
                </div>
            </div>
        </>
    )
}