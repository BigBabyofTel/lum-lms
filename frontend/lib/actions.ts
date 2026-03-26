"use server"

import {Class, FormState} from "@/lib/types";
import {redirect} from "next/navigation"
import {testUserSchema} from "@/lib/schemas";
import * as z from "zod";

export async function submitForm(state: FormState | null, formData: FormData): Promise<FormState> {
    const subject = formData.get('subject')
    const grade = formData.get('grade')
    const teacher_id = formData.get('teacherId')

    if (!subject || !grade) {
        return {error: 'All fields are required.'}
    }

    try {
        const response = await fetch('http://localhost:8080/v1/api/classes', {
            method: 'POST',
            body: JSON.stringify({
                subject,
                grade: Number(grade),
                teacher_id
            }),
            headers: {'Content-Type': 'application/json'},
        })

        if (!response.ok) {
            return {error: 'Failed to create class.'}
        }
    } catch (e) {
        console.log(e)
    }


    redirect('http://localhost:3000/dashboard')
}


export async function getAllClasses(teacherId: string): Promise<Class[]> {
    if (!teacherId) {
        console.error("Teacher Id is missing")
    }
    const valid = testUserSchema.safeParse({id: teacherId})

    if (!valid.success) {
        console.error("Id can not be validated")
    }

    try {
        const response = await fetch(`http://localhost:8080/api/v1/classes?teacherId=${valid.data?.id}`, {
            method: 'GET',
            headers: {'Accept': 'application/json'},
        })
        if (!response.ok) return []
        return await response.json() as Class[]
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error(err.issues)
        } else {
            console.error(err)
        }
    }
    return []
}