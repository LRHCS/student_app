import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';
import { loadCalendarData } from "../utils/loadCalendarData";
import { loadDashboardData } from "../utils/loadDashboardData";
import LoadingCard from '../components/LoadingCard';
import { redirect } from 'next/navigation';


// Marking the component as async allows us to await the cookies API
export default async function DashboardPage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // More secure authentication check
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error('Auth error:', userError);
        redirect('/');
    }

    const initialData = await loadDashboardData();
    const calendarData = await loadDashboardData();
    
    return (
        <div className="min-h-screen  p-8">
                <DashboardClient initialData={initialData} calendarData={calendarData} useFallback={<LoadingCard />} />
        </div>
    )
} 