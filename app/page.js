// Added SEO meta tags using metadata export for Next.js
export const metadata = {
    title: 'Login | MyApp',
    description: 'Sign in to access your personalized dashboard and manage your profile on MyApp.',
    openGraph: {
        title: 'Login | MyApp',
        description: 'Sign in to access your personalized dashboard and manage your profile on MyApp.',
        url: 'https://yourdomain.com', // Replace with your actual domain
    },
    twitter: {
        card: 'summary_large_image',
        site: '@your_twitter_handle', // Replace with your Twitter handle
        title: 'Login | MyApp',
        description: 'Sign in to access your personalized dashboard and manage your profile on MyApp.'
    }
};

// Logic determain whether show Login or Dashboard
import Login from './components/Login/Login'; 
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
                display_name: session.user.user_metadata?.display_name || '',
                avatar: session.user.user_metadata?.avatar || ''
            });

        if (insertError) {
            console.error('Error creating profile:', insertError);
        }
    }

    // Redirect to dashboard if authenticated
    redirect('/dashboard');
}
