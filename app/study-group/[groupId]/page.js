import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import StudyGroupClient from './StudyGroupClient';

export default async function StudyGroupPage({ params }) {
    const { groupId } = await params;
    
    // Wait for cookies to be available
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        redirect('/');
    }

    try {
        // Fetch group details
        const { data: groupData, error: groupError } = await supabase
        .from("Groups")
        .select("*")
        .eq("id", groupId)
        .single();

        if (groupError) throw groupError;

        // Fetch channels
        const { data: channelsData, error: channelsError } = await supabase
        .from("GroupChannels")
        .select("*")
        .eq("group_id", groupId);

        if (channelsError) throw channelsError;

        // Fetch members
        const { data: membersData, error: membersError } = await supabase
        .from("GroupMembers")
        .select("*")
        .eq("group_id", groupId);

        if (membersError) throw membersError;

        // Fetch profiles for group members
        const userIds = membersData.map(member => member.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("Profiles")
          .select("id, avatar")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Merge member data with profiles
          const mergedMembers = membersData.map(member => {
            const profile = profilesData.find(p => p.id === member.user_id);
            return { ...member, avatar: profile?.avatar || "/default-avatar.png" };
          });

        // Get initial messages for first channel if exists
        let initialMessages = [];
        if (channelsData.length > 0) {
            const { data: messagesData, error: messagesError } = await supabase
      .from("GroupMessages")
          .select("*")
                .eq("channel_id", channelsData[0].id)
                .order("created_at", { ascending: true });

            if (messagesError) throw messagesError;
            // Format dates before sending to client
            initialMessages = messagesData.map(message => ({
                ...message,
                created_at: formatDate(message.created_at)
            }));
        }

        const initialData = {
            group: groupData,
            channels: channelsData,
            members: mergedMembers,
            initialMessages,
            currentUser: session.user
        };

        return <StudyGroupClient initialData={initialData} />;

    } catch (error) {
        console.error('Error loading study group:', error);
        redirect('/dashboard');
    }
}

// Add the same formatDate helper function
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
  };