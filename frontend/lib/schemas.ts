import {z} from 'zod';

export const userSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    type: z.enum(['teacher', 'student', 'parent'])
})

// Omits certain values
export const testUserSchema = userSchema.omit({email: true, first_name: true, last_name: true,})


export type User = z.infer<typeof userSchema>;

export const classSchema = z.object({
    id: z.uuid(),
    subject: z.string().min(1).max(20),
    grade: z.int().min(1).max(12),
    teacher_id: z.uuid(),
})

export type Class = z.infer<typeof classSchema>;



