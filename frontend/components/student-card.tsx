'use client';

import React, { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';

interface StudentCardProps {
  firstName: string;
  lastName: string;
  email: string;
  grade: number;
  setIsEnrollmentModalOpen: Dispatch<SetStateAction<boolean>>;
  onOpenStudentOptions: () => void;
}

export default function StudentCard({
  firstName,
  lastName,
  email,
  grade,
  onOpenStudentOptions,
}: StudentCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Card Header */}
      <div className="bg-blue-300 p-4 h-32 relative">
        <h3 className="dark:text-white text-2xl font-bold">{firstName}</h3>
        <h3 className="dark:text-white text-2xl font-bold">{lastName}</h3>
        <p className="dark:text-white text-sm mt-1">{`Grade ${grade}`}</p>
        <p className="dark:text-white text-xs mt-1">{email}</p>

        {/* User Avatar */}
        <div className="absolute bottom-4 right-4 w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
          <Image
            src="/icons/user-circle.svg"
            alt="User"
            width={40}
            height={40}
            className="text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>

      {/* Card Footer with Actions */}
      <section className="p-4 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="View people"
        >
          <Image
            src="/icons/user-circle.svg"
            alt="View people"
            width={20}
            height={20}
            className="text-gray-600 dark:text-gray-400"
          />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            console.log('View folder clicked for class:');
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="View folder"
        >
          <Image
            src="/icons/folder.svg"
            alt="View folder"
            width={20}
            height={20}
            className="text-gray-600 dark:text-gray-400"
          />
        </button>
        {/*
         create function to open a modal for class enrollment

        */}
        <button
          onClick={onOpenStudentOptions}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="More options"
        >
          <Image
            src="/icons/more-vertical.svg"
            alt="More options"
            width={20}
            height={20}
            className="text-gray-600 dark:text-gray-400"
          />
        </button>
      </section>
    </div>
  );
}
