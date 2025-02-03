// src/utils/loadDashboardData.js
import { supabase } from "./client";

export async function loadDashboardData() {
    // Fetch User Info & User ID
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("Error fetching user:", userError);
        return null;
    }

    const userID = user.id;

    // Fetch Courses, Topics, Exams & Profile in one batch
    const [
        { data: coursesData, error: coursesError },
        { data: topicsData, error: topicsError },
        { data: examsData, error: examsError },
        { data: profileData, error: profileError },
    ] = await Promise.all([
        supabase.from("Courses").select("id, title").eq("user_id", userID),
        supabase.from("Topics").select("id, title, course_id"),
        supabase.from("Exams").select("id, title, date, topicId"),
        supabase.from("Profiles").select("firstname, lastname, avatar").eq("id", userID).single(),
    ]);

    // Log errors if any
    if (coursesError) console.error("Error fetching courses:", coursesError);
    if (topicsError) console.error("Error fetching topics:", topicsError);
    if (examsError) console.error("Error fetching exams:", examsError);
    if (profileError) console.error("Error fetching profile:", profileError);

    return {
        courses: coursesData || [],
        topics: topicsData || [],
        exams: examsData || [],
        user: profileData || {},
    };
}
