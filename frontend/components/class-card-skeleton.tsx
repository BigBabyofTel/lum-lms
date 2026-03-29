export function ClassCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-300 dark:bg-gray-600"/>
            <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"/>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"/>
            </div>
        </div>
    )
}