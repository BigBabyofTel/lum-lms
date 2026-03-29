"use server"

import {ClassState, FormState, UserState} from "@/lib/types";
import {testUserSchema} from "@/lib/schemas";
import {redirect} from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'


export async function submitForm(_state: FormState | null, formData: FormData): Promise<FormState> {
    const subject = formData.get('subject')
    const grade = formData.get('grade')
    const teacher_id = formData.get('teacherId')

    if (!subject || !grade || !teacher_id) {
        return {error: 'All fields are required.'}
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/classes`, {
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

    } catch (err) {
        console.error(err)
        return { error: 'Something went wrong. Please try again.' }
    }
    redirect('/dashboard')
}


export async function getAllClasses(teacherId: string): Promise<ClassState[]> {
    if (!teacherId) {
        return []
    }
    const valid = testUserSchema.safeParse({id: teacherId})

    if (!valid.success) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/classes?teacherId=${valid.data.id}`, {
            method: 'GET',
            headers: {'Accept': 'application/json'},
        })
        if (!response.ok) return []
        return await response.json()
    } catch (err) {
        console.error(err)
    }
    return []
}

export async function getAllStudents(): Promise<UserState[]> {
    try {
        const response = await fetch(`${API_URL}/api/v1/users`, {
            method: 'GET',
            headers: {'Accept': 'application/json'},
        })
        if (!response.ok) {
            console.error('data was not fetched')
            return []
        }
        return await response.json()
    } catch (err) {
        console.error(err)
    }
    return []
}