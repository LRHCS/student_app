import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TopicClient from './TopicClient';

export default async function TopicPage({ params }) {

    
    const {topic} = await params;
    const {title} = await params;

    const topicTitle = decodeURIComponent(topic);
    const courseTitle = decodeURIComponent(title);

    // Wait for cookies to be available
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        redirect('/');
    }

    try {
        // Fetch topic data
        const { data: topic, error: topicError } = await supabase
            .from('Topics')
            .select('*')
            .eq('title', topicTitle)
            .single();

        if (topicError) throw topicError;

        // Fetch lessons for this topic
        const { data: lessons, error: lessonsError } = await supabase
            .from('Lessons')
            .select('*')
            .eq('topic_id', topic.id)
            .order('id', { ascending: true });

        if (lessonsError) throw lessonsError;

        // Fetch assignments for this topic
        const { data: assignments, error: assignmentsError } = await supabase
            .from('Assignments')
            .select('*')
            .eq('topicId', topic.id);

        if (assignmentsError) throw assignmentsError;

        // Format dates for assignments
        const formattedAssignments = assignments.map(assignment => ({
            ...assignment,
            date: assignment.date ? new Date(assignment.date).toLocaleDateString() : ''
        }));

        const initialData = {
            topic,
            lessons,
            assignments: formattedAssignments,
            courseTitle,
            topicTitle
        };

        return <TopicClient initialData={initialData} />;

    } catch (error) {
        console.error('Error loading topic:', error);
        redirect(`/course/${courseTitle}`);
    }
}
