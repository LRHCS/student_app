// Logic determain whether show Login or Dashboard
import Login from './components/Login/Login'; 
import DashboardPage from './dashboard/page';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Page() {
    const supabase = createServerComponentClient({ cookies });
    
    // Check session on server
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return <Login />;
    }

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

    // Redirect to dashboard if authenticated
    redirect('/dashboard');
}
