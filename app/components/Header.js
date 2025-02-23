
import Link from "next/link";
import Image from "next/image";
import { RiFocus2Line } from "../config/icons";
import { useDarkMode } from '../contexts/DarkModeContext';
import { useUser } from '../contexts/UserContext'

const Header = () => {
  const { user } = useUser()
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const SunIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
    </svg>
  );

  const MoonIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>

        <Link 
          href="/lsession" 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200"
          aria-label="Focus session"
        >
          <RiFocus2Line className="w-5 h-5" />
        </Link>

        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{user.display_name}</span>
            <div className="relative h-8 w-8">
              <Link href="/user">
                <Image 
                  src={user.avatar} 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full"
                  fill={true}
                />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 