'use client'

import { useEffect, useRef } from 'react'

export default function Captcha({ setCaptchaToken }) {
  const captchaRef = useRef(null)

  useEffect(() => {
    // Load Turnstile only once when component mounts
    const loadTurnstile = async () => {
      if (typeof window !== 'undefined' && !window.turnstile) {
        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        script.async = true
        script.defer = true
        document.body.appendChild(script)
      }

      // Wait for Turnstile to be loaded
      while (!window.turnstile) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Render the widget
      window.turnstile.render(captchaRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        callback: function(token) {
          setCaptchaToken(token)
        },
      })
    }

    loadTurnstile()

    // Cleanup function
    return () => {
      if (captchaRef.current) {
        window.turnstile?.remove(captchaRef.current)
      }
    }
  }, [setCaptchaToken])

  return <div ref={captchaRef} className="mt-4" />
}
