"use server"

import {FormState} from "@/lib/types";

export async function submitForm(state: FormState | null, formData: FormData): Promise<FormState>  {
    const subject = formData.get('subject')
    const grade = formData.get('grade')
    const teacherId = formData.get('teacherId')

    if (!subject || !grade) {
        return { error: 'All fields are required.'}
    }

    try {
        const response = await fetch('http://localhost:8080/v1/api/classes', {
            method: 'POST',
            body: JSON.stringify({
                subject,
                grade,
                teacherId
            }),
            headers: { 'Content-Type': 'application/json'},
        })

        const results = await response.json()
        console.log(results, state)

    } catch (e) {
        console.log(e)
    }



    return { success: 'Class created successfully.'}
}