'use client';
import { useEffect, useState } from 'react';
import { getAllStudents } from '@/lib/actions';
import { User } from '@/lib/types';
import StudentCard from '@/components/student-card';
import { useUserStore } from '@/store/useUserStore';
import StudentCardModalOptions from '@/components/student-card-modal-options';

export default function Page() {
  const [role, _] = useState('teacher');
  const id = useUserStore((state) => state.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<User[]>([
    {
      id: '',
      first_name: '',
      last_name: '',
      email: '',
      type: '',
    },
  ]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await getAllStudents();
      setUser(data);
      return;
    })();
  }, [id]);

  console.log(user);
  return (
    <>
      {role === 'student' && <h1>student panel</h1>}

      {role === 'teacher' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.map((data) => (
            <StudentCard
              key={data.id}
              firstName={data.first_name}
              lastName={data.last_name}
              email={data.email}
              grade={'0'}
              setIsModalOpen={setIsModalOpen}
              onOpenStudentOptions={() => setIsModalOpen(true)}
            />
          ))}
          {isModalOpen && (
            <StudentCardModalOptions onClose={() => setIsModalOpen(false)} />
          )}
        </div>
      )}
    </>
  );
}
