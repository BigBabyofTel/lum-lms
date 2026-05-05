import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  type: z.enum(['teacher', 'student', 'parent']),
});

export type User = z.infer<typeof userSchema>;
// Omits certain values
export const testUserSchema = userSchema.omit({
  email: true,
  first_name: true,
  last_name: true,
});

export const RegisterSchema = z
  .object({
    email: z.email(),
    first_name: z.string(),
    last_name: z.string(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Confirm password must be at least 8 characters'),
    role: z.enum(['teacher', 'student', 'parent']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type Register = z.infer<typeof RegisterSchema>;

export const loginSchema = z.object({
  email: z.email('must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['teacher', 'student', 'parent'], {
    error: 'Please select a role',
  }),
});

export type Login = z.infer<typeof loginSchema>;

export const classSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  grade: z.coerce.number().min(1, 'Grade must be at least 1'),
});

export type Class = z.infer<typeof classSchema>;
