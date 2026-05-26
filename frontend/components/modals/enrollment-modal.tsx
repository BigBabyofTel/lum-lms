'use client';

import { X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useClassStore } from '@/store/useClassesStore';
import { useUserStore } from '@/store/useUserStore';
import { User } from '@/lib/types';
import Image from 'next/image';

interface EnrollmentModalProps {
  onClose?: () => void;
  students: User[];
}

export default function EnrollmentModal({
  onClose,
  students,
}: EnrollmentModalProps) {
  const id = useUserStore((state) => state.id);
  const fetchClasses = useClassStore((state) => state.fetchClasses);
  const classes = useClassStore((state) => state.classes);

  useEffect(() => {
    if (!id) return;
    if (classes.length > 0) return;
    void fetchClasses();
  }, [id, classes.length, fetchClasses]);
  const student = students[0];
  console.log(student);
  return (
    /* Backdrop — click outside the card to close */
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Modal card — stop propagation so clicks inside don't close */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Enrollment options
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-between bg-slate-600 p-2 text-sm">
          <div className="flex">
            <Image
              src="/icons/user-circle.svg"
              alt="User"
              width={20}
              height={20}
              className="text-gray-500 dark:text-gray-400"
            />
            <span className="w-full p-2">
              {student.first_name} {student.last_name}
            </span>
          </div>
          <div className="w-full flex items-center justify-between">
            <div className="">{`${student.grade}th Grade`}</div>
            <div>{`Student ID: ${student.id}`}</div>
          </div>
        </div>
        search bar available classes
      </div>
    </div>
  );
}
