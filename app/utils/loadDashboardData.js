// src/utils/loadDashboardData.js
import { supabase } from "./client";

export async function loadDashboardData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return null;

        // Fetch all required data in parallel
        const [
            { data: courses }, 
            { data: topics },
            { data: exams },
            { data: assignments },
            { data: lessons }
        ] = await Promise.all([
            supabase.from('Courses').select('*').eq('user_id', user.id),
            supabase.from('Topics').select('*'),
            supabase.from('Exams').select('*'),
            supabase.from('Assignments').select('*'),
            supabase.from('Lessons').select('*')
        ]);

        return {
            courses: courses || [],
            topics: topics || [],
            exams: exams || [],
            assignments: assignments || [],
            lessons: lessons || [],
            user
        };
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        return null;
    }
}
