'use client';

import { useEffect, useState } from 'react';
import { BookOpen, FileText, MoreVertical, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import CreateAssignmentModal from '@/components/modals/create-assignment-modal';
import { getClassAssignments } from '@/lib/api-client';
import type { Assignment } from '@/lib/types';
import { useUserStore } from '@/store/useUserStore';

function getDateValue(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'Time' in value &&
    'Valid' in value &&
    value.Valid === true &&
    typeof value.Time === 'string'
  ) {
    return value.Time;
  }

  return null;
}

function getAttachmentCount(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'Int32' in value &&
    'Valid' in value &&
    value.Valid === true &&
    typeof value.Int32 === 'number'
  ) {
    return value.Int32;
  }

  return null;
}

function getAssignmentDate(assignment: Assignment) {
  const date = getDateValue(
    assignment.type === 'assignment'
      ? assignment.due_date ?? assignment.assign_date
      : assignment.assign_date
  );

  if (!date) {
    return null;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    console.warn('Received an invalid assignment date:', date);
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
}

export default function ClassworkPage() {
  const { id: classId } = useParams<{ id: string }>();
  const role = useUserStore((state) => state.type);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      setIsLoading(true);

      try {
        const classAssignments = await getClassAssignments(classId);

        if (!cancelled) {
          setAssignments(classAssignments);
        }
      } catch (error) {
        console.error('Could not load class assignments:', error);

        if (!cancelled) {
          setAssignments([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
          <FileText size={20} />
          <span className="font-medium">View your work</span>
        </button>
        {role === 'teacher' && (
          <button
            type="button"
            onClick={() => setIsCreateAssignmentModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={18} />
            Add assignment
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading classwork...
          </p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No classwork has been posted yet.
          </p>
        ) : (
          assignments.map((assignment) => {
            const date = getAssignmentDate(assignment);
            const dueDate = getDateValue(assignment.due_date);
            const attachmentCount = getAttachmentCount(
              assignment.attachment_count
            );
            const dateLabel =
              assignment.type === 'assignment' && dueDate
                ? 'Due'
                : 'Posted';

            return (
              <div
                key={assignment.id}
                className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    assignment.type === 'assignment'
                      ? 'bg-blue-600'
                      : 'bg-gray-400 dark:bg-gray-600'
                  }`}
                >
                  {assignment.type === 'assignment' ? (
                    <FileText size={20} className="text-white" />
                  ) : (
                    <BookOpen size={20} className="text-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {assignment.title}
                      </h3>
                      {date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {dateLabel} {date}
                        </p>
                      )}
                    </div>
                    {attachmentCount ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <FileText size={16} />
                        <span>{attachmentCount}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={(event) => event.stopPropagation()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical
                    size={20}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
              </div>
            );
          })
        )}
      </div>

      {isCreateAssignmentModalOpen && (
        <CreateAssignmentModal
          classId={classId}
          onClose={() => setIsCreateAssignmentModalOpen(false)}
          onAssignmentCreated={(assignment) => {
            setAssignments((currentAssignments) => [
              assignment,
              ...currentAssignments,
            ]);
          }}
        />
      )}
    </div>
  );
}
