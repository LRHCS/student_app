// src/utils/loadDashboardData.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export async function loadDashboardData() {
    try {
        const supabase = createServerComponentClient({ cookies });
        
        // Get authenticated user data securely
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('Auth error:', userError);
            redirect('/');
        }

        // Fetch courses
        const { data: courses, error: coursesError } = await supabase
            .from('Courses')
            .select('*')
            .eq('user_id', user.id);

        if (coursesError) {
            console.error('Error fetching courses:', coursesError);
        }

        // First get the groups where the user is a member
        const { data: memberGroups, error: memberError } = await supabase
            .from('GroupMembers')
            .select('group_id')
            .eq('user_id', user.id);

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
            .eq('email', user.email)
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
                .eq('uid', user.id),
            supabase
                .from('Assignments')
                .select('*'),
            supabase
                .from('Lessons')
                .select('*')
        ]);

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

        return {
            courses: courses || [],
            topics: topics || [],
            exams: exams || [],
            user: user,
            assignments: assignments || [],
            lessons: lessons || [],
            studyGroups: formattedStudyGroups,
            pendingInvitations: formattedPendingInvitations
        };
    } catch (error) {
        console.error('Dashboard error:', error);
        redirect('/');
    }
}
