# LMS Components

This directory contains all the reusable UI components for the Luminescence LMS.

## Components Overview

### Sidebar Component (`sidebar.tsx`)
The main navigation sidebar that displays user profile, navigation items, enrolled classes, and settings.

**Features:**
- User profile section with avatar and email
- Main navigation items (Home, Calendar)
- Enrolled section with To-do and class list
- Bottom navigation (Archived classes, Settings)
- Help button
- Responsive mobile overlay

**Customization:**
- Modify user information in the component props or by connecting to data source
- Add/remove navigation items by editing the `mainItems` and `bottomItems` arrays
- Change colors via Tailwind classes (e.g., `bg-blue-200` for active state)
- Adjust width by changing the `w-80` class

**Usage:**
```tsx
<Sidebar 
  isOpen={isSidebarOpen} 
  onClose={() => setIsSidebarOpen(false)} 
/>
```

### Class Card Component (`class-card.tsx`)
Displays a class card on the dashboard with class information and action buttons.

**Features:**
- Class name and grade display
- Teacher information
- User avatar placeholder
- Action buttons (people, folder, more options)
- Customizable background color for header

**Customization:**
- Change header colors via the `color` prop (e.g., `bg-blue-600`, `bg-green-600`)
- Modify card layout by editing the component structure
- Add more action buttons in the footer section
- Customize hover effects and transitions

**Usage:**
```tsx
<ClassCard
  id="1"
  name="2B"
  grade="Grade 2"
  teacher="Unknown user"
  color="bg-blue-600"
/>
```

### Navbar Component (`navbar.tsx`)
The top navigation bar with menu toggle, branding, and theme switcher.

**Features:**
- Sidebar toggle button
- App branding/logo
- Theme toggle button
- Additional action buttons (can be extended)

**Customization:**
- Modify the brand name styling
- Add notification icons, user menu, or search bar
- Change background colors and shadows
- Adjust height via the `h-16` class

**Usage:**
```tsx
<Navbar 
  isSidebarOpen={isSidebarOpen} 
  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
/>
```

## Styling Guidelines

### Color Scheme
- **Primary:** Blue (`blue-600`, `blue-400`)
- **Accent:** Purple (`purple-600`)
- **Backgrounds:** 
  - Light mode: `gray-50`, `gray-100`
  - Dark mode: `gray-900`, `gray-800`
- **Interactive elements:** Rounded corners with `rounded-lg` or `rounded-full`

### Typography
- **Headings:** Font sizes range from `text-xl` to `text-3xl`
- **Body text:** `text-sm` to `text-base`
- **Font weights:** `font-medium` for emphasis, `font-bold` for headings

### Spacing
- **Padding:** Consistent use of `p-4`, `p-6` for sections
- **Gaps:** `gap-2`, `gap-3`, `gap-4` for flex/grid layouts
- **Margins:** `space-y-*` for vertical stacking

## Making Changes

### Adding New Navigation Items
1. Open `sidebar.tsx`
2. Add items to `mainItems`, `enrolledItems`, or `bottomItems` arrays:
```tsx
{label: 'New Item', href: '/new-path', icon: <IconComponent size={20}/>}
```

### Adding New Class Card Colors
1. Open `class-card.tsx` or use the config file
2. Pass different Tailwind color classes via the `color` prop:
```tsx
<ClassCard color="bg-purple-600" ... />
```

### Customizing Icons
- All icons use lucide-react
- Icons are available as SVG files in `/public/icons/`
- To change an icon, import from `lucide-react` and replace:
```tsx
import {NewIcon} from 'lucide-react'
<NewIcon size={20}/>
```

### Dark Mode Support
- All components support dark mode via Tailwind's `dark:` variants
- Add dark mode styles: `dark:bg-gray-900 dark:text-white`
- Theme is controlled by the ThemeProvider in `/providers/theme-provider.tsx`

## Best Practices

1. **Consistency:** Use existing Tailwind classes and spacing patterns
2. **Accessibility:** Include proper ARIA labels and semantic HTML
3. **Responsiveness:** Test on mobile, tablet, and desktop
4. **Performance:** Keep components lightweight and avoid unnecessary re-renders
5. **Type Safety:** Use TypeScript interfaces for props

## Configuration

For global customization, edit the configuration file at `/config/lms-config.ts`:
- Application name and tagline
- Default colors and themes
- Navigation structure
- Feature flags

## Need Help?

- Check the main project README for setup instructions
- Review the design references in `/public/` for visual guidelines
- Consult the Tailwind CSS documentation for styling options
- Look at existing components for patterns and examples
