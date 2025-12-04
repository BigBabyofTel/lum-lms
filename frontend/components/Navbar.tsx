'use client';

import Link from 'next/link';
import { useState } from 'react';
import Button from './ui/Button';
import { HamburgerMenu, Moon, Sun, X } from './ui/icons';

const navigationLink = [
  {
    name: 'Home',
    href: '/',
  },
  {
    name: 'About',
    href: '/about',
  },
  {
    name: 'Features',
    href: '/features',
  },
  {
    name: 'Pricing',
    href: '/pricing',
  },
];

function HamburgerOpen({ handleHamburger }) {
  return (
    <div className="absolute top-0 left-0 h-full w-full bg-gray-50 z-50 rounded-2xl">
      <header className="flex justify-between items-center h-14 px-4 @sm:px-6">
        <Link href="/">Logo</Link>
        <Button variant="icon" onClick={handleHamburger}>
          <X className="size-5 cursor-pointer" />
        </Button>
      </header>

      <div>
        <ul className="flex flex-col gap-4 px-4 @sm:px-6">
          {navigationLink.map((el, idx) => (
            <li key={idx}>
              <Link
                href={el.href}
                className="text-xl font-semibold text-gray-900 dark:text-gray-100"
              >
                {el.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ToggleTheme() {
  let theme = 'light';
  function handleTheme() {
    return 'light';
  }
  return (
    <Button variant="icon" onClick={handleTheme}>
      {theme === 'dark' && <Moon className="size-5 stroke-blue-500" />}
      {theme === 'light' && <Sun className="size-5 stroke-blue-500" />}
    </Button>
  );
}

export default function Navbar() {
  const [hamburger, setHamburger] = useState<boolean>(false);

  function handleHamburger() {
    setHamburger(!hamburger);
  }

  return (
    <div className="flex h-14 items-center justify-between gap-8 px-4 sm:px-6">
      <div className="flex-1">
        <Link href="/" aria-label="home">
          Logo
        </Link>
      </div>

      <ul className="flex flex-1 justify-center gap-5 max-sm:hidden">
        {navigationLink.map(({ href, name }, idx) => (
          <li key={idx}>
            <Link
              href={href}
              className="text-sm/6 text-gray-950 dark:text-white"
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-end gap-5 max-sm:hidden flex-1">
        <ToggleTheme />

        <div className="h-6 w-px bg-gray-950/10 dark:bg-white/10" />

        <Link href="/login">
          <Button variant="outline">Login</Button>
        </Link>

        <Link href="/signup">
          <Button variant="default">Sign up</Button>
        </Link>
      </div>

      <div className="flex gap-2.5 items-center sm:hidden">
        <ToggleTheme />

        <Button variant="icon" onClick={handleHamburger}>
          <HamburgerMenu className="size-4" />
        </Button>
      </div>

      {hamburger && <HamburgerOpen handleHamburger={handleHamburger} />}
    </div>
  );
}
