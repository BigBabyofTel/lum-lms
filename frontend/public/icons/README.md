# LMS Icons

This directory contains SVG icons exported from lucide-react for use in the LMS application.

## Available Icons

- **home.svg** - Home icon for navigation
- **calendar.svg** - Calendar icon for schedule
- **check-square.svg** - To-do/task icon
- **archive.svg** - Archive icon for archived classes
- **settings.svg** - Settings/configuration icon
- **user-circle.svg** - User profile icon
- **folder.svg** - Folder/directory icon
- **menu.svg** - Menu/hamburger icon
- **more-vertical.svg** - More options (3 dots vertical)
- **plus.svg** - Add/create icon
- **file-text.svg** - Document/assignment icon
- **book-open.svg** - Book/material icon
- **send.svg** - Send/submit icon
- **users.svg** - Multiple users/people icon
- **mail.svg** - Email/message icon
- **chevron-down.svg** - Dropdown arrow icon

## Usage

These SVG icons can be used directly in HTML/React components:

```html
<img src="/icons/home.svg" alt="Home" />
```

Or in Next.js Image components:

```jsx
import Image from 'next/image'

<Image src="/icons/home.svg" alt="Home" width={24} height={24} />
```

All icons are 24x24px with 2px stroke width and use `currentColor` for easy theming.
