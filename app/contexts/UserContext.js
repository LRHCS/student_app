'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        
        if (session?.user) {
          // Try to fetch existing profile by user ID first
          let { data: profile, error: profileError } = await supabase
            .from('Profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          // If no profile found by ID, try finding by email
          if (profileError && profileError.code === 'PGRST116') {
            const { data: emailProfile, error: emailError } = await supabase
              .from('Profiles')
              .select('*')
              .eq('email', session.user.email)
              .single()

            if (!emailError && emailProfile) {
              // Update the profile's ID to match the current user's ID
              const { error: updateError } = await supabase
                .from('Profiles')
                .update({ id: session.user.id })
                .eq('email', session.user.email)

              if (!updateError) {
                profile = { ...emailProfile, id: session.user.id }
              }
            } else {
              // No profile exists at all, create new one
              const { data: newProfile, error: createError } = await supabase
                .from('Profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  created_at: new Date().toISOString(),
                  display_name: session.user.email.split('@')[0],
                  avatar: session.user.user_metadata?.avatar_url || 
                         'https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg'
                })
                .select()
                .single()

              if (createError) {
                console.error('Error creating profile:', createError)
              } else {
                profile = newProfile
              }
            }
          } else if (profileError) {
            console.error('Error fetching profile:', profileError)
          }

          // Set user with profile data if we have it
          if (profile) {
            setUser({
              ...session.user,
              ...profile
            })
          } else {
            // Fallback to just session user data if we couldn't get/create profile
            setUser(session.user)
          }
        }
      } catch (error) {
        console.error('Error in user context:', error)
      }
    }

    fetchUserProfile()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchUserProfile()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 