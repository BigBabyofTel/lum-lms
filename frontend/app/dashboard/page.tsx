'use client';
import React, { useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { getAllClasses } from '@/lib/actions';
import ClassCard from '@/components/class-card';
import { useClassStore } from '@/store/useClassesStore';
import { ClassCardSkeleton } from '@/components/class-card-skeleton';

export default function Page() {
  const id = useUserStore((state) => state.id);
  const setClasses = useClassStore((state) => state.setClasses);
  const classes = useClassStore((state) => state.classes);

  const isLoading = useClassStore((state) => state.isLoading);
  const setLoading = useClassStore((state) => state.setLoading);
  const error = useClassStore((state) => state.error);
  const setError = useClassStore((state) => state.setError);

  //load the data attached to users_id that is set in auth
  useEffect(() => {
    if (!id) return;
    if (classes.length > 0) return;
    setLoading(true);
    (async () => {
      try {
        const data = await getAllClasses(id as string);
        setClasses(data);
      } catch (err) {
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);
  //add conditional rendering for if there is nothing here
  // this is the view for a teacher
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          My Classes
        </h2>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Class Cards Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes?.map((data) => (
            <ClassCard
              key={data.id}
              name={data.subject}
              grade={data.grade}
              teacher={'Mr. Baker'}
              color={'bg-blue-400'}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && <p className="text-center text-red-500">{error}</p>}

      {/* Empty state */}
      {!isLoading && !error && classes.length === 0 && id && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">No classes yet</p>
          <p className="text-sm mt-1">
            Create your first class to get started.
          </p>
        </div>
      )}
    </div>
  );
}
