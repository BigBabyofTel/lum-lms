'use client';

import { X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { batchEnroll, fetchStudentClasses } from '@/lib/actions';
import { Class, User } from '@/lib/types';
import { useClassStore } from '@/store/useClassesStore';
import { useUserStore } from '@/store/useUserStore';
import Image from 'next/image';

interface EnrollmentModalProps {
  onClose?: () => void;
  student: User;
}

export default function EnrollmentModal({
  onClose,
  student,
}: EnrollmentModalProps) {
  const id = useUserStore((state) => state.id);
  const accessToken = useUserStore((state) => state.access_token);
  const fetchClasses = useClassStore((state) => state.fetchClasses);
  const classes = useClassStore((state) => state.classes);
  const isLoadingClasses = useClassStore((state) => state.isLoading);
  const classLoadError = useClassStore((state) => state.error);

  const [studentClasses, setStudentClasses] = useState<Class[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingStudentClasses, setIsLoadingStudentClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (classes.length > 0) return;
    void fetchClasses();
  }, [id, classes.length, fetchClasses]);

  useEffect(() => {
    if (!accessToken || !student.id) return;

    let cancelled = false;

    async function loadStudentClasses() {
      setIsLoadingStudentClasses(true);
      setError(null);

      try {
        const enrolledClasses = await fetchStudentClasses(
          accessToken as string,
          student.id
        );
        if (cancelled) return;

        setStudentClasses(enrolledClasses);
        setSelectedClassIds(
          new Set(enrolledClasses.map((classItems) => classItems.id))
        );
      } catch {
        if (!cancelled) {
          setError('Could not load this enrollment status');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudentClasses(false);
        }
      }
    }
    void loadStudentClasses();

    return () => {
      cancelled = true;
    };
  }, [accessToken, student.id]);

  const studentInitials =
    `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase();
  const initials = studentInitials || 'ST';

  const enrolledClassIds = useMemo(
    () => new Set(studentClasses.map((classItem) => classItem.id)),
    [studentClasses]
  );

  const filteredClasses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return classes;
    }

    return classes.filter((classItem) => {
      const subject = classItem.subject.toLowerCase();
      const teacher = classItem.teacher?.toLowerCase() ?? '';
      const grade = String(classItem.grade);

      return (
        subject.includes(normalizedSearch) ||
        teacher.includes(normalizedSearch) ||
        grade.includes(normalizedSearch)
      );
    });
  }, [classes, searchTerm]);

  const newClassIds = useMemo(
    () =>
      Array.from(selectedClassIds).filter(
        (classId) => !enrolledClassIds.has(classId)
      ),
    [selectedClassIds, enrolledClassIds]
  );

  function toggleClassSelection(classId: string) {
    if (enrolledClassIds.has(classId)) {
      return;
    }

    setSelectedClassIds((current) => {
      const next = new Set(current);

      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }

      return next;
    });
  }

  async function handleSubmit() {
    if (!accessToken || newClassIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await batchEnroll(accessToken, student.id, newClassIds);
      const updatedStudentClasses = await fetchStudentClasses(
        accessToken,
        student.id
      );

      setStudentClasses(updatedStudentClasses);
      setSelectedClassIds(
        new Set(updatedStudentClasses.map((classItem) => classItem.id))
      );

      onClose?.();
    } catch {
      setError('Could not enroll student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const alreadyEnrolledBadge =
    'rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700';

  const notEnrolledBadge =
    'rounded-md border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700';

  const classColors = [
    'bg-emerald-500',
    'bg-violet-500',
    'bg-orange-500',
    'bg-blue-500',
    'bg-red-500',
    'bg-amber-500',
  ];

  return (
    /* Backdrop — click outside the card to close */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6"
      onClick={onClose}
    >
      {/* Modal card — stop propagation so clicks inside don't close */}
      <div
        className="flex max-h-[calc(100vh-24px)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-4 sm:p-6">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">
                Enroll Student in Class
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Select the classes you&apos;d like to enroll this student in.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close modal"
            >
              <X size={22} />
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:gap-4 sm:p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-base font-semibold text-violet-700 sm:h-12 sm:w-12">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">
                {student.first_name} {student.last_name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                <span>
                  {student.grade ? `${student.grade}th Grade` : 'Grade not set'}
                </span>
                <span className="mx-1">•</span>
                <span className="block max-w-full truncate sm:inline">
                  Student ID: {student.id}
                </span>
              </p>
            </div>
          </div>

          <div className="relative">
            <Image
              src="/icons/search.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search classes by name, teacher, or grade"
              className="h-12 w-full rounded-lg border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Available Classes
              </h3>
            </div>

            <div>
              {(isLoadingClasses || isLoadingStudentClasses) && (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Loading classes...
                </div>
              )}

              {!isLoadingClasses &&
                !isLoadingStudentClasses &&
                classes.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No classes available.
                  </div>
                )}

              {!isLoadingClasses &&
                !isLoadingStudentClasses &&
                classes.length > 0 &&
                filteredClasses.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No classes match your search.
                  </div>
                )}

              {!isLoadingClasses &&
                !isLoadingStudentClasses &&
                filteredClasses.map((classItem, index) => {
                  const isEnrolled = enrolledClassIds.has(classItem.id);
                  const isSelected = selectedClassIds.has(classItem.id);
                  const colorClass = classColors[index % classColors.length];

                  return (
                    <label
                      key={classItem.id}
                      className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex sm:items-center sm:gap-4"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isEnrolled}
                        onChange={() => toggleClassSelection(classItem.id)}
                        className="mt-2 h-5 w-5 rounded border-slate-300 text-blue-600 sm:mt-0"
                      />

                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${colorClass}`}
                      >
                        {classItem.subject.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="col-start-2 min-w-0 sm:col-auto sm:flex-1">
                        <p className="truncate font-semibold text-slate-950">
                          {classItem.subject}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Grade {classItem.grade} •{' '}
                          {classItem.teacher ?? 'Teacher not assigned'}
                        </p>
                      </div>

                      <span
                        className={`col-start-2 w-fit sm:col-auto ${
                          isEnrolled ? alreadyEnrolledBadge : notEnrolledBadge
                        }`}
                      >
                        {isEnrolled ? 'Already enrolled' : 'Not enrolled'}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 p-4 sm:p-6">
          {(error || classLoadError) && (
            <p className="mb-3 text-sm text-red-600">
              {error ?? classLoadError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              {newClassIds.length}{' '}
              {newClassIds.length === 1 ? 'class' : 'classes'} selected
            </p>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-5"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || newClassIds.length === 0 || !accessToken
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
              >
                {isSubmitting ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
