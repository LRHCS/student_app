'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { enable, disable } from 'darkreader'

const DarkModeContext = createContext()

export function DarkModeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check initial preference
    const savedPreference = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    setIsDarkMode(savedPreference ? savedPreference === 'true' : prefersDark)
  }, [])

  useEffect(() => {
    if (isDarkMode) {
      enable({
        brightness: 100,
        contrast: 90,
        sepia: 10
      })
    } else {
      disable()
    }
    localStorage.setItem('darkMode', isDarkMode)
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
} 