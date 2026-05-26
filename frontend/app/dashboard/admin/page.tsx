'use client';
import { useEffect, useState } from 'react';
import { getAllStudents } from '@/lib/actions';
import { User } from '@/lib/types';
import StudentCard from '@/components/student-card';
import { useUserStore } from '@/store/useUserStore';
import EnrollmentModal from '../../../components/modals/enrollment-modal';
import CreateStudentModal from '@/components/modals/create-student-modal';

export default function Page() {
  const [role] = useState('teacher');
  const id = useUserStore((state) => state.id);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [students, setStudents] = useState<User[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await getAllStudents();
      setStudents(Array.isArray(data) ? data : []);
    })();
  }, [id]);
  console.log(students);
  return (
    <>
      {role === 'student' && <h1>student panel</h1>}

      {role === 'teacher' && (
        <div className="w-full">
          <div className="w-full mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsStudentModalOpen(true)}
              className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.length > 0 ? (
              students.map((data) => (
                <StudentCard
                  key={data.id}
                  firstName={data.first_name}
                  lastName={data.last_name}
                  email={data.email}
                  grade={data.grade as number}
                  setIsEnrollmentModalOpen={setIsEnrollmentModalOpen}
                  onOpenStudentOptions={() => setIsEnrollmentModalOpen(true)}
                />
              ))
            ) : (
              <p className="text-sm text-slate-700">No students yet.</p>
            )}
          </div>

          {isEnrollmentModalOpen && (
            <EnrollmentModal onClose={() => setIsEnrollmentModalOpen(false)} />
          )}

          {isStudentModalOpen && (
            <CreateStudentModal onClose={() => setIsStudentModalOpen(false)} />
          )}
        </div>
      )}
    </>
  );
}
