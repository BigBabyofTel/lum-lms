/**
 * LMS Configuration File
 * 
 * This file contains all the customizable settings for the LMS.
 * Modify these values to customize the look and feel of your LMS.
 */

export const lmsConfig = {
  // Application Settings
  app: {
    name: 'Luminescence',
    tagline: 'A light for your education',
  },

  // User Profile Settings (default values)
  user: {
    name: 'Augustus Baker',
    email: 'augustus.tb@gmail.com',
    avatar: 'A',
    avatarColor: 'bg-purple-600',
  },

  // Sidebar Settings
  sidebar: {
    width: 'w-80', // Tailwind class for sidebar width
    backgroundColor: 'bg-gray-50 dark:bg-gray-900',
    activeItemColor: 'bg-blue-200 dark:bg-blue-900',
    hoverColor: 'hover:bg-gray-200 dark:hover:bg-gray-800',
  },

  // Dashboard Settings
  dashboard: {
    title: 'Classroom',
    gridColumns: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', // Responsive grid
  },

  // Class Card Settings
  classCard: {
    defaultColor: 'bg-blue-600',
    colors: [
      'bg-blue-600',
      'bg-green-600',
      'bg-red-600',
      'bg-purple-600',
      'bg-yellow-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-teal-600',
    ],
  },

  // Theme Settings
  theme: {
    // Light mode gradient
    lightGradient: 'bg-gradient-to-r from-yellow-400 to-orange-300',
    // Dark mode gradient
    darkGradient: 'bg-gradient-to-r from-blue-900 to-indigo-950',
  },

  // Navigation Items (customizable)
  navigation: {
    main: [
      { label: 'Home', href: '/dashboard', icon: 'Home' },
      { label: 'Calendar', href: '/dashboard/calendar', icon: 'Calendar' },
    ],
    enrolled: [
      { label: 'To-do', href: '/dashboard/todo', icon: 'CheckSquare' },
    ],
    bottom: [
      { label: 'Archived classes', href: '/dashboard/archived', icon: 'Archive' },
      { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
    ],
  },

  // Tab Configuration
  tabs: [
    { name: 'Stream', path: '' },
    { name: 'Classwork', path: '/classwork' },
    { name: 'People', path: '/people' },
  ],

  // Features (enable/disable features)
  features: {
    darkMode: true,
    comments: true,
    notifications: true,
    fileUpload: true,
    calendar: true,
  },
}

// Helper function to get a random class color
export function getRandomClassColor(): string {
  const colors = lmsConfig.classCard.colors
  return colors[Math.floor(Math.random() * colors.length)]
}

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof lmsConfig.features): boolean {
  return lmsConfig.features[feature]
}
