// src/utils/loadDashboardData.js
import { supabase } from "./client";

export async function loadDashboardData() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        // Fetch courses
        const { data: courses, error: coursesError } = await supabase
            .from('Courses')
            .select('*')
            .eq('user_id', user.id);
        if (coursesError) throw coursesError;

        // Fetch study groups the user is a member of
        const { data: memberGroups, error: memberError } = await supabase
            .from('GroupMembers')
            .select(`
                group_id,
                Groups!inner (*)
            `)
            .eq('user_id', user.id);
        if (memberError) throw memberError;

        // Fetch pending group invitations for the user
        const { data: invitations, error: invitationsError } = await supabase
            .from('GroupInvitations')
            .select(`
                *,
                group:group_id (
                    id,
                    title,
                    description
                )
            `)
            .eq('email', user.email)
            .is('accepted', null);  // Only get pending invitations
        if (invitationsError) throw invitationsError;

        // Transform the joined groups data
        const studyGroups = memberGroups?.map(mg => mg.Groups) || [];

        const { data: assignments } = await supabase
            .from('Assignments')
            .select('*')
            .eq('uid', user.id);

        const { data: exams } = await supabase
            .from('Exams')
            .select('*')
            .eq('uid', user.id);

        // Fetch all required data in parallel
        const [
            { data: topics },
            { data: lessons }
        ] = await Promise.all([
            supabase.from('Topics').select('*'),
            supabase.from('Lessons').select('*')
        ]);

        return {
            user,
            courses: courses || [],
            topics: topics || [],
            exams: exams || [],
            assignments: assignments || [],
            lessons: lessons || [],
            studyGroups: studyGroups || [],
            pendingInvitations: invitations || [],
        };
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        return null;
    }
}
