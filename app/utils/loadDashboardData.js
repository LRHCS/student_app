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

        // Fetch pending invitations
        // Fetch pending group invitations for the user
        const { data: invitations, error: invitationsError } = await supabase
            .from('GroupInvitations')
            .select(`
                *,
                group:group_id (
                    id,
                    title,
                    description,
                    created_at
                ),
                inviter:invited_by (
                    display_name,
                    avatar
                )
            `)
            .eq('email', user.email)
            .is('accepted', null);  // Only get pending invitations
        if (invitationsError) throw invitationsError;

        return {
            courses: courses || [],
            topics: topics || [],
            exams: exams || [],
            user: user,
            assignments: assignments || [],
            lessons: lessons || [],
            studyGroups: formattedStudyGroups,
            pendingInvitations: invitations || []
        };
    } catch (error) {
        console.error('Dashboard error:', error);
        redirect('/');
    }
}
