'use client';

import { Pencil, Trash2, X } from 'lucide-react';

interface OptionsModalProps {
  title?: string;
  editLabel?: string;
  deleteLabel?: string;
  isEditDisabled?: boolean;
  isDeleting?: boolean;
  error?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function OptionsModal({
  title = 'Options',
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  isEditDisabled = false,
  isDeleting = false,
  error,
  onClose,
  onEdit,
  onDelete,
}: OptionsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-lg bg-white p-4 shadow-md dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close options"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <button
          type="button"
          onClick={onEdit}
          disabled={isEditDisabled}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Pencil size={18} />
          <span>{editLabel}</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Trash2 size={18} />
          <span>{isDeleting ? 'Deleting...' : deleteLabel}</span>
        </button>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
