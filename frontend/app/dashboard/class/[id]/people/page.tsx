'use client';
import React, { useState, useEffect } from 'react';
import { UserCircle2, MoreVertical, Mail } from 'lucide-react';
import { User } from '@/lib/types';
import { useUserStore } from '@/store/useUserStore';
import { getClassStudents } from '@/lib/api-client';
import { useClassInfo } from '@/components/providers/class-provider';

export default function PeoplePage() {
  const id = useUserStore((state) => state.id);
  const accessToken = useUserStore((state) => state.access_token);
  const { classInfo, teacher } = useClassInfo();
  const [students, setStudents] = useState<User[]>([]);

  useEffect(() => {
    if (!id || !accessToken || !classInfo) return;
    (async () => {
      const data = await getClassStudents(classInfo.id);
      setStudents(data);
    })();
  }, [id, accessToken, classInfo]);

  return (
    <div className="space-y-8">
      {/* Teachers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-normal text-blue-600 dark:text-blue-400">
            Teachers
          </h2>
          <button
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical
              size={20}
              className="text-gray-600 dark:text-gray-400"
            />
          </button>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {teacher && (
            <div
              key={teacher.id}
              className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <UserCircle2
                    size={24}
                    className="text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {teacher.first_name} {teacher.last_name}
                  </p>
                  {teacher.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {teacher.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Send email"
                >
                  <Mail
                    size={20}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
                <button
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical
                    size={20}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Students Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-normal text-blue-600 dark:text-blue-400">
            Students
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              ({students.length})
            </span>
          </h2>
          <button
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical
              size={20}
              className="text-gray-600 dark:text-gray-400"
            />
          </button>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                {student.avatar ? (
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {student.avatar}
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <UserCircle2
                      size={24}
                      className="text-gray-500 dark:text-gray-400"
                    />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {`${student.first_name} ${student.last_name}`}
                  </p>
                  {student.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {student.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Send email"
                >
                  <Mail
                    size={20}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
                <button
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical
                    size={20}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
