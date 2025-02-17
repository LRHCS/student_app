// Logic determain whether show Login or Dashboard

"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check session on load
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                // Check if profile exists
                const { data: profile, error: profileError } = await supabase
                    .from('Profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (!profile) {
                    // Create new profile if doesn't exist
                    const { error: insertError } = await supabase
                        .from('Profiles')
                        .insert({
                            id: session.user.id,
                            email: session.user.email,
                            created_at: new Date().toISOString(),
                            firstname: session.user.user_metadata?.first_name || '',
                            lastname: session.user.user_metadata?.last_name || '',
                            avatar: session.user.user_metadata?.avatar_url || ''
                        });

                    if (insertError) {
                        console.error('Error creating profile:', insertError);
                    }
                }
            }

            setUser(session?.user || null);
            setLoading(false);
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-16 h-16 border-8 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return user ? <Dashboard /> : <Login />;
}
