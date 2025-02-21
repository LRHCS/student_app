import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';
import { redirect } from 'next/navigation';

// Add this helper function at the top of the file
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default async function DashboardPage() {
    try {
        const supabase = createServerComponentClient({ cookies });
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error:', sessionError);
            redirect('/');
        }

        if (!session) {
            redirect('/');
        }

        // Fetch courses separately first for debugging
        const { data: courses, error: coursesError } = await supabase
            .from('Courses')
            .select('*')
            .eq('user_id', session.user.id);

        if (coursesError) {
            console.error('Error fetching courses:', coursesError);
        }

        // First get the groups where the user is a member
        const { data: memberGroups, error: memberError } = await supabase
            .from('GroupMembers')
            .select('group_id')
            .eq('user_id', session.user.id);

        if (memberError) {
            console.error('Error fetching group memberships:', memberError);
        }

        // Get the actual groups data
        const { data: studyGroups, error: groupsError } = await supabase
            .from('Groups')
            .select('*')
            .in('id', memberGroups?.map(m => m.group_id) || []);

        if (groupsError) {
            console.error('Error fetching groups:', groupsError);
        }

        // Get pending invitations with group details
        const { data: pendingInvitations, error: invitationsError } = await supabase
            .from('GroupInvitations')
            .select(`
                *,
                group:Groups (
                    id,
                    title,
                    description,
                    created_at
                )
            `)
            .eq('email', session.user.email)
            .eq('accepted', false);

        if (invitationsError) {
            console.error('Error fetching invitations:', invitationsError);
        }

        // Fetch other data
        const [
            { data: topics },
            { data: exams },
            { data: assignments },
            { data: lessons }
        ] = await Promise.all([
            supabase
                .from('Topics')
                .select('*'),
            supabase
                .from('Exams')
                .select('*')
                .eq('uid', session.user.id),
            supabase
                .from('Assignments')
                .select('*'),
            supabase
                .from('Lessons')
                .select('*')
        ]);

        console.log('User:', session.user);
        console.log('Study Groups:', studyGroups);
        console.log('Pending Invitations:', pendingInvitations);

        // Format dates in the data before passing to client
        const formattedStudyGroups = studyGroups?.map(group => ({
            ...group,
            created_at: formatDate(group.created_at)
        })) || [];

        const formattedPendingInvitations = pendingInvitations?.map(invitation => ({
            ...invitation,
            created_at: formatDate(invitation.created_at),
            group: invitation.group ? {
                ...invitation.group,
                created_at: formatDate(invitation.group.created_at)
            } : null
        })) || [];

        const initialData = {
            courses: courses || [],
            topics: topics || [],
            exams: exams || [],
            user: session.user,
            assignments: assignments || [],
            lessons: lessons || [],
            studyGroups: formattedStudyGroups,
            pendingInvitations: formattedPendingInvitations
        };

        return <DashboardClient initialData={initialData} fallback={<div>Loading...</div>} />;
    } catch (error) {
        console.error('Dashboard error:', error);
        redirect('/');
    }
} 