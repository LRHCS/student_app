import { supabase } from "./client";

export async function loadCalendarData() {
    try {
        // Get the current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error("Error getting user:", userError);
            return { exams: [], assignments: [], courses: [], topics: [] };
        }
        if (!user) {
            console.error("No user logged in");
            return { exams: [], assignments: [], courses: [], topics: [] };
        }

        // Fetch only courses for the current user
        const { data: courses, error: coursesError } = await supabase
            .from("Courses")
            .select("*")
            .eq("user_id", user.id);
        if (coursesError) {
            console.error("Error fetching courses:", coursesError);
            return { exams: [], assignments: [], courses: [], topics: [] };
        }

        // Get course ids from the user's courses
        const courseIds = courses.map(course => course.id);

        // Fetch topics that belong to these courses
        const { data: topics, error: topicsError } = await supabase
            .from("Topics")
            .select("id, title, course_id")
            .in("course_id", courseIds);
        if (topicsError) {
            console.error("Error fetching topics:", topicsError);
            return { exams: [], assignments: [], courses, topics: [] };
        }

        // Extract topic ids from the topics list
        const topicIds = topics.map(topic => topic.id);

        // Fetch assignments and exams only for topics that belong to the user's courses
        const [assignmentsResponse, examsResponse] = await Promise.all([
            supabase
                .from("Assignments")
                .select("id, date, title, topicId, status")
                .in("topicId", topicIds),
            supabase
                .from("Exams")
                .select("id, date, title, topicId")
                .in("topicId", topicIds)
        ]);

        if (assignmentsResponse.error)
            console.error("Error fetching assignments:", assignmentsResponse.error);
        if (examsResponse.error)
            console.error("Error fetching exams:", examsResponse.error);

        return {
            exams: examsResponse.data || [],
            assignments: assignmentsResponse.data || [],
            courses,
            topics: topics || []
        };
    } catch (error) {
        console.error("Error loading calendar data:", error);
        return { exams: [], assignments: [], courses: [], topics: [] };
    }
}
