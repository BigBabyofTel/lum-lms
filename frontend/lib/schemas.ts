import {z} from 'zod';

export const userSchema = z.object({
    id: z.string(),
    email: z.email(),
    first_name: z.string(),
    last_name: z.string()
})

export const testUserSchema = userSchema.omit({email: true, first_name: true, last_name: true})


export type User = z.infer<typeof userSchema>;

export const classSchema = z.object({
    id: z.uuid(),
    subject: z.string(),
    grade: z.number(),
    teacherId: z.uuid(),
})

export type UserClass = z.infer<typeof classSchema>;



