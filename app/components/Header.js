"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { RiFocus2Line } from "react-icons/ri";
import { fetchUserData } from "../CRUD";
import { useDarkMode } from '../context/DarkModeContext';

const Header = () => {
  const [userData, setUserData] = useState(null);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    fetchUserData().then(data => setUserData(data));
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 h-20  shadow-md z-50 bg-white">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo or Brand */}
        <Link href="/" className="text-xl font-bold">
          Study 
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-100  transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Focus Session Link */}
          <Link 
            href="/lsession" 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200"
            aria-label="Focus session"
          >
            <RiFocus2Line className="w-6 h-6" />
          </Link>

          {/* Profile Link */}
          {userData && (
            <Link 
              href="/user" 
              className="relative w-10 h-10 overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700"
            >
              {userData.avatar ? (
                <Image
                  src={userData.avatar}
                  alt="User Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-sm">
                  {userData.firstname?.[0]}{userData.lastname?.[0]}
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 