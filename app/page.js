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
            setUser(session?.user || null);
            setLoading(false);
        };

        getSession();


    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return user ? <Dashboard /> : <Login />;
}
