"use server"

import {Class, FormState, User} from "@/lib/types";
import {classSchema, loginSchema, RegisterSchema, testUserSchema} from "@/lib/schemas";
import {redirect} from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

// need to rename create class
export async function submitForm(_state: FormState | null, formData: FormData): Promise<FormState> {
    const {subject, grade, teacher_id} = Object.fromEntries(formData)
    if (!subject || !grade || !teacher_id) {
        return {error: 'All fields are required.'}
    }

    try {
        const valid = classSchema.safeParse({subject, grade, teacher_id})
        if (!valid.success) {
            return { error: valid.error.issues.map(i => i.message).join(', ') };
        }
        const response = await fetch(`${API_URL}/api/v1/classes`, {
            method: 'POST',
            body: JSON.stringify(valid.data),
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


export async function getAllClasses(teacherId: string): Promise<Class[]> {
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

export async function getAllStudents(): Promise<User[]> {
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

export async function handleRegister(_state: FormState | null, formData: FormData ): Promise<FormState> {
    try {
        const data = Object.fromEntries(formData)
        const valid = RegisterSchema.safeParse(data)

        if (!valid.success) {
            return {error: valid.error.issues.map(i => i.message).join(',')}
        }

        const response = await fetch(`${API_URL}/api/v1/users/register`, {
            method: 'POST',
            body: JSON.stringify({
                email: valid.data.email,
                first_name: valid.data.first_name,
                last_name: valid.data.last_name,
                password: valid.data.password,
                role: valid.data.role
            })
        })

        if (!response.ok) return { error: 'Register failed'}

    } catch (err) {
        console.error(err)
    }
    redirect('/auth')
}

export async function handleLogin(_state: FormState | null, formData: FormData ): Promise<FormState> {
    try {
        const data = Object.fromEntries(formData)
        const valid = loginSchema.safeParse(data)

        if (!valid.success) {
            return {error: valid.error.issues.map(i => i.message).join(',')}
        }

        const response = await fetch(`${API_URL}/api/v1/users/login`, {
            method: "POST",
            body: JSON.stringify({
                email: valid.data.email,
                password: valid.data.password
            })
        })
        if(!response.ok) return { error: 'Invalid credentials'};
    } catch (err) {
        console.error(err)
    }
    redirect('/dashboard')
}