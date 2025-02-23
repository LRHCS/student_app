import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import StudyGroupClient from "./StudyGroupClient";
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getGroupData(supabase, groupId) {
  // First check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch group details
  const { data: group } = await supabase
    .from("Groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) {
    return { notFound: true };
  }

  // Fetch members with profiles
  const { data: membersData } = await supabase
    .from("GroupMembers")
    .select("*")
    .eq("group_id", groupId);

  let members = membersData || [];
  if (members.length > 0) {
    const userIds = members.map(member => member.user_id);
    const { data: profiles } = await supabase
      .from("Profiles")
      .select("id, avatar, display_name")
      .in("id", userIds);

    members = members.map(member => {
      const profile = profiles?.find(p => p.id === member.user_id);
      return { 
        ...member,
        display_name: profile?.display_name || member.username,
        avatar: profile?.avatar || "/default-avatar.png" 
      };
    });
  }

  // Fetch channels
  const { data: channels } = await supabase
    .from("GroupChannels")
    .select("*")
    .eq("group_id", groupId);

  // Fetch folders
  const { data: folders } = await supabase
    .from("GroupFolders")
    .select("*")
    .eq("group_id", groupId)
    .order("order");

  // Fetch initial messages for the first channel
  let initialMessages = [];
  if (channels && channels.length > 0) {
    const { data: messages } = await supabase
      .from("GroupMessages")
      .select("*")
      .eq("channel_id", channels[0].id)
      .order("created_at", { ascending: true });
    initialMessages = messages || [];
  }

  // Fetch user's notes and exams
  const { data: userNotes } = await supabase
    .from('Lessons')
    .select('id, title')
    .eq('uid', session.user.id);

  const { data: userExams } = await supabase
    .from('Exams')
    .select('id, title')
    .eq('uid', session.user.id);

  return {
    group,
    members,
    channels: channels || [],
    folders: folders || [],
    currentUser: session.user,
    initialMessages,
    userNotes: userNotes || [],
    userExams: userExams || []
  };
}

export default async function StudyGroupPage({ params }) {
  const supabase = createServerComponentClient({ cookies });
  
  // Get initial data
  const { 
    group, 
    members, 
    channels, 
    folders, 
    notFound, 
    currentUser,
    initialMessages,
    userNotes,
    userExams
  } = await getGroupData(supabase, params.groupId);
  
  if (notFound) {
    return <div className="p-4">Group not found</div>;
  }

  return (
    <StudyGroupClient 
      initialGroup={group}
      initialMembers={members}
      initialChannels={channels}
      initialFolders={folders}
      initialUser={currentUser}
      initialMessages={initialMessages}
      initialNotes={userNotes}
      initialExams={userExams}
    />
  );
} 