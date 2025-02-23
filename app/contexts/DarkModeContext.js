'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// Removed static import of darkreader to prevent SSR errors
// import { enable, disable } from 'darkreader'

const DarkModeContext = createContext()

export const DarkModeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check initial preference
    const savedPreference = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    setIsDark(savedPreference ? savedPreference === 'true' : prefersDark)
  }, [])

  useEffect(() => {
    // Ensure this code runs only on the client
    if (typeof window !== 'undefined') {
      if (isDark) {
        import('darkreader').then((module) => {
          // Configure dark reader settings as needed
          module.enable({
            brightness: 100,
            contrast: 90,
            sepia: 10,
          })
        }).catch((err) => console.error('Failed to load darkreader:', err))
      } else {
        import('darkreader').then((module) => {
          module.disable()
        }).catch((err) => console.error('Failed to load darkreader:', err))
      }
    }
    localStorage.setItem('darkMode', isDark)
  }, [isDark])

  const toggleDarkMode = () => {
    setIsDark(prev => !prev)
  }

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => useContext(DarkModeContext) 