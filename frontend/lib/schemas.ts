import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  type: z.enum(['teacher', 'student', 'parent']),
  grade: z.coerce.number().optional(),
});

export type User = z.infer<typeof userSchema>;
// Omits certain values
/*
export const testUserSchema = userSchema.omit({
  email: true,
  first_name: true,
  last_name: true,
});
*/
export const RegisterSchema = z
  .object({
    email: z.email('Must be a valid email'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Passwords must match'),
    role: z.enum(['teacher', 'student', 'parent'], {
      error: 'Please select a role',
    }),
    grade: z.coerce.number().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.role !== 'student' || data.grade, {
    message: 'Grade is required for students',
    path: ['grade'],
  });

export type Register = z.infer<typeof RegisterSchema>;

export const loginSchema = z.object({
  email: z.email('must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['teacher', 'student', 'parent'], {
    error: 'Please select a role',
  }),
});

export const classSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  grade: z.coerce.number().min(1, 'Grade must be at least 1'),
});

export type Class = z.infer<typeof classSchema>;
