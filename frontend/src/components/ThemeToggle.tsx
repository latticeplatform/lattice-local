import type { FC } from 'react';
import { IoSunnyOutline, IoMoonOutline } from 'react-icons/io5';
import useTheme from '../hooks/useTheme.ts';

const ThemeToggle: FC = () => {
  const { theme, toggle } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      {theme === 'dark' ? <IoSunnyOutline /> : <IoMoonOutline />}
    </button>
  );
};

export default ThemeToggle;