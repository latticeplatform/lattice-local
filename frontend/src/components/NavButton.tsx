import type { FC } from "react";
import type { IconType } from "react-icons";
import { NavLink } from "react-router-dom";

interface INavButtonProps {
  title: string;
  icon: IconType;
  path: string;
}

const NavButton: FC<INavButtonProps> = ({ title, icon: Icon, path }) => {
  return (
    <div id='navbutton'>
      <span className='title'>{title}</span>
      <NavLink to={path} aria-label={title}>
        <button className='button'>
          <Icon size={100} />
        </button>
      </NavLink>
    </div>
  );
};

export default NavButton;