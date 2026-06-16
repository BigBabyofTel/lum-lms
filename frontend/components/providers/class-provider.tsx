'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Class, ClassDetailResponse, User } from '@/lib/types';
import { useNavbar } from '@/components/providers/navbar-provider';
import { apiFetch } from '@/lib/api';

interface ClassContextValue {
  classInfo: Class | null;
  teacher: User | null;
}

const ClassContext = createContext<ClassContextValue>({
  classInfo: null,
  teacher: null,
});

export function ClassProvider({
  classId,
  children,
}: {
  classId: string;
  children: React.ReactNode;
}) {
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const { setTitle } = useNavbar();

  useEffect(() => {
    let cancelled = false;

    async function loadClass() {
      try {
        const data = await apiFetch<ClassDetailResponse>(`/api/v1/classes/${classId}`);

        if (!cancelled) {
          setClassInfo(data.class);
          setTitle(data.class.subject);
          setTeacher(data.teacher);
        }
      } catch {
        if (!cancelled) {
          setClassInfo(null);
          setTitle('Class not found');
          setTeacher(null);
        }
      }
    }

    void loadClass();

    return () => {
      cancelled = true;
      setTitle(null);
      setTeacher(null);
    };
  }, [classId, setTitle]);

  return (
    <ClassContext.Provider value={{ classInfo, teacher }}>
      {children}
    </ClassContext.Provider>
  );
}

export function useClassInfo() {
  return useContext(ClassContext);
}
