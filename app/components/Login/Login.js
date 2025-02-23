'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { FaGoogle, FaApple } from '../../config/icons'
import Captcha from './captcha'
import { useUser } from '../../contexts/UserContext'
import { createHash } from 'crypto'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)

  const router = useRouter()
  const supabase = createClientComponentClient()
  const { setUser } = useUser()

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    
    if (!captchaToken) {
      setError('Please complete the captcha')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const authResponse = isSignUp 
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              captchaToken,
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            }
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
            options: {
              captchaToken,
            }
          })

      if (authResponse.error) throw authResponse.error

      // Hash password for storage
      const hashedPassword = createHash('sha256').update(password).digest('hex')
      
      if (isSignUp) {
        // Create profile after successful signup
        if (authResponse.data?.user) {
          const { error: profileError } = await supabase
            .from('Profiles')
            .insert({
              id: authResponse.data.user.id,
              email: authResponse.data.user.email,
              created_at: new Date().toISOString(),
              display_name: email.split('@')[0],
              password: hashedPassword,
              avatar: 'https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg'
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
            setError('Account created but profile setup failed. Please contact support.')
            return
          }

          // Set user in context
          setUser({
            ...authResponse.data.user,
            display_name: email.split('@')[0],
            avatar: 'https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg',
            password: hashedPassword
          })
        }
        setError('Please check your email for the confirmation link')
      } else {
        // For sign in, fetch existing profile
        const { data: profile, error: profileError } = await supabase
          .from('Profiles')
          .select('*')
          .eq('id', authResponse.data.user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          throw profileError
        }

        // Set user in context with profile data
        setUser({
          ...authResponse.data.user,
          ...profile
        })

        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider) => {
    if (!captchaToken) {
      setError('Please complete the captcha')
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          captchaToken,
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      if (error) throw error

      // Create or update profile after OAuth login
      if (data?.user) {
        const { data: existingProfile } = await supabase
          .from('Profiles')
          .select()
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('Profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              display_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
              avatar: data.user.user_metadata?.avatar_url || 'https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg',
              created_at: new Date().toISOString()
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
          }
        }

        // Set user in context
        setUser({
          ...data.user,
          display_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url || 'https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg'
        })
      }
    } catch (error) {
      setError(error.message)
    } finally {
      router.refresh()
    }
  }

  // Update the OAuth handlers to use the new function
  const handleGoogleLogin = () => handleOAuthLogin('google')
  const handleAppleLogin = () => handleOAuthLogin('apple')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Captcha setCaptchaToken={setCaptchaToken} />

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center gap-2 justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FaGoogle />
              Sign in with Google
            </button>

            <button
              onClick={handleAppleLogin}
              className="w-full flex items-center gap-2 justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FaApple className="text-xl" />
              Sign in with Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
