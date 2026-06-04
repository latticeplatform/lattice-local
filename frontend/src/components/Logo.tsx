import type { FC } from 'react';

interface LogoProps {
  size?: number;
  mode?: 'light' | 'dark';
}

const Logo: FC<LogoProps> = ({ size = 100 }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="2 1 79 85" width={size}>
      <polygon points="2.7,37.3 42.5,64 42.5,41.5 2.7,14.8" fill="#1C2D46" />
      <polygon points="62.4,73.1 42.5,86.5 42.5,41.5 62.4,28.1" fill="#FF9B72" />
      <polygon points="22.6,73.1 42.5,86.5 42.5,41.5 22.6,28.1" fill="#11233B" />
      <polygon points="82.3,14.8 62.4,1.4 22.6,28.1 42.5,41.5" fill="#9F99FF" />
      <polygon points="2.7,14.8 22.6,1.4 62.4,28.1 42.5,41.5" fill="#8884FF" />
      <polygon points="82.3,37.3 42.5,64 42.5,41.5 82.3,14.8" fill="#EB8258" />
    </svg>
  );
};

export default Logo;
