import {z} from 'zod';

export const userSchema = z.object({
    id: z.string(),
    email: z.email(),
    first_name: z.string(),
    last_name: z.string(),
    type: z.string(),
    //functions

})

export const tokenSchema = z.object({
    accessToken: z.string().min(1),
})

// Omits certain values
export const testUserSchema = userSchema.omit({email: true, first_name: true, last_name: true, type: true})


export type User = z.infer<typeof userSchema>;

export const classSchema = z.object({
    id: z.uuid(),
    subject: z.string(),
    grade: z.number(),
    teacher_id: z.string(),
})

export const classArraySchema = z.array(classSchema)

export type Class = z.infer<typeof classSchema>;



