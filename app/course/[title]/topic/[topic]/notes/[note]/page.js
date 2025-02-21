import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NotesClient from './NotesClient';
import { DragProvider } from '../../../../../../contexts/DragContext';

export default async function NotePage({ params }) {
    const { note, topic, title } = await params;
    
    // Wait for cookies to be available
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        redirect('/');
    }

    try {
        // Fetch lesson data
        const { data: lesson, error: lessonError } = await supabase
            .from('Lessons')
            .select('*')
            .eq('id', note)
            .single();

        if (lessonError) throw lessonError;

        let parsedContent = [];
        try {
            parsedContent = JSON.parse(lesson.content || '[]');
            } catch (e) {
                console.error('Error parsing content:', e);
        }

        const initialData = {
            lessonId: note,
            courseTitle: decodeURIComponent(title),
            topicTitle: decodeURIComponent(topic),
            content: parsedContent,
            title: lesson.title || ''
        };

    return (
        <DragProvider>
                <NotesClient initialData={initialData} />
        </DragProvider>
    );

    } catch (error) {
        console.error('Error loading note:', error);
        redirect(`/course/${decodeURIComponent(title)}/topic/${decodeURIComponent(topic)}`);
    }
}