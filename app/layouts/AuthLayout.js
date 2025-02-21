"use client";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({ children }) {
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [router, supabase]);

    return children;
} 