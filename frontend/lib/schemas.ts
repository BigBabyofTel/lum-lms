import {z} from 'zod';

export const userSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    first_name: z.string(),
    last_name: z.string()
})

export type User = z.infer<typeof userSchema>;

export const classSchema = z.object({
    id: z.uuid(),
    subject: z.string(),
    grade: z.number(),
    teacherId: z.uuid(),
})

export type UserClass = z.infer<typeof classSchema>;



