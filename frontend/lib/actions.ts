'use server';

import { Class, FormState, User } from '@/lib/types';
import { classSchema, loginSchema, RegisterSchema } from '@/lib/schemas';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function createClassForm(
  _state: FormState | null,
  formData: FormData
): Promise<FormState> {
  const { subject, grade, access_token } = Object.fromEntries(formData);
  if (!subject || !grade || !access_token || typeof access_token !== 'string') {
    return { error: 'All fields are required.' };
  }

  try {
    const valid = classSchema.safeParse({ subject, grade });
    if (!valid.success) {
      const fieldErrors = z.flattenError(valid.error).fieldErrors;
      return {
        fieldErrors: {
          subject: fieldErrors.subject?.[0],
          grade: fieldErrors.grade?.[0],
        },
      };
    }
    const response = await fetch(`${API_URL}/api/v1/classes`, {
      method: 'POST',
      body: JSON.stringify(valid.data),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!response.ok) {
      return { error: 'Failed to create class.' };
    }
  } catch (err) {
    console.error(err);
    return { error: 'Something went wrong. Please try again.' };
  }
  return { success: 'Class created!' };
}

export async function getAllClasses(accessToken: string): Promise<Class[]> {
  if (!accessToken) {
    return [];
  }
  try {
    const response = await fetch(`${API_URL}/api/v1/classes`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function getAllStudents(): Promise<User[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      console.error('data was not fetched');
      return [];
    }
    return await response.json();
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function handleRegister(
  _state: FormState | null,
  formData: FormData
): Promise<FormState> {
  try {
    const data = Object.fromEntries(formData);
    const valid = RegisterSchema.safeParse(data);

    if (!valid.success) {
      const fieldErrors = z.flattenError(valid.error).fieldErrors;
      return {
        fieldErrors: {
          email: fieldErrors.email?.[0],
          first_name: fieldErrors.first_name?.[0],
          last_name: fieldErrors.last_name?.[0],
          password: fieldErrors.password?.[0],
          confirmPassword: fieldErrors.confirmPassword?.[0],
          role: fieldErrors.role?.[0],
        },
      };
    }

    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: valid.data.email,
        first_name: valid.data.first_name,
        last_name: valid.data.last_name,
        password: valid.data.password,
        type: valid.data.role,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return { error: 'Register failed' };
  } catch (err) {
    console.error(err);
    return { error: 'Something went wrong' };
  }
  redirect('/auth');
}

export async function handleLogin(
  _state: FormState | null,
  formData: FormData
): Promise<FormState> {
  try {
    const data = Object.fromEntries(formData);
    const valid = loginSchema.safeParse(data);

    if (!valid.success) {
      const fieldErrors = z.flattenError(valid.error).fieldErrors;
      return {
        fieldErrors: {
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0],
          role: fieldErrors.role?.[0],
        },
      };
    }
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        email: valid.data.email,
        password: valid.data.password,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return { error: 'Invalid credentials' };

    const d = await response.json();
    const rawCookie = response.headers.get('set-cookie');
    if (rawCookie) {
      const match = rawCookie.match(/refresh_token=([^;]+)/);
      if (match) {
        const cookieStore = await cookies();
        cookieStore.set('refresh_token', match[1], {
          httpOnly: true,
          path: '/',
          maxAge: 604800,
          sameSite: 'strict',
        });
      }
    }

    return { access_token: d.access_token, user: d.user };
  } catch (err) {
    console.error(err);
    return { error: 'Something went wrong' };
  }
}
