"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { AiOutlineSend, AiOutlinePlus } from "react-icons/ai";
import { supabase } from "@/app/utils/client";
import Link from "next/link";

export default function StudyGroupPage() {
  const params = useParams();
  const groupId = params.groupId;
  
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ title: "", description: "" });

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // A ref to auto-scroll the chat container to the bottom
  const messagesEndRef = useRef(null);

  // Fetch the current user from Supabase Auth
  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error("Error fetching user:", error);
      setCurrentUser(user);
    }
    fetchUser();
  }, []);

  // Fetch group details, messages, members and setup realtime for chat messages
  useEffect(() => {
    if (!groupId) return;

    // Fetch group details (e.g., title, description)
    const fetchGroupDetails = async () => {
      const { data, error } = await supabase
        .from("Groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (error) console.error("Error fetching group:", error);
      else setGroup(data);
    };

    // Fetch channels for this group and ensure a default "Main" channel exists
    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from("GroupChannels")
        .select("*")
        .eq("group_id", groupId);
      if (error) {
        console.error("Error fetching channels:", error);
      } else {
        if (!data || data.length === 0) {
          // Create the default "Main" channel if none exist
          const { data: mainData, error: mainError } = await supabase
            .from("GroupChannels")
            .insert([{ group_id: groupId, title: "Main", description: "Default main channel" }])
            .select();
          if (mainError) {
            console.error("Error creating default main channel:", mainError);
          } else {
            setChannels(mainData);
            setSelectedChannel(mainData[0]);
          }
        } else {
          setChannels(data);
          if (!selectedChannel) {
            setSelectedChannel(data[0]);
          }
        }
      }
    };

    // Fetch chat messages for the selected channel
    const fetchMessages = async () => {
      if (!selectedChannel) return;
      const { data, error } = await supabase
        .from("GroupMessages")
        .select("*")
        .eq("channel_id", selectedChannel.id)
        .order("created_at", { ascending: true });
      if (error) console.error("Error fetching messages:", error);
      else setMessages(data);
    };

    // Fetch group members list
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("GroupMembers")
        .select("*")
        .eq("group_id", groupId);
      if (error) console.error("Error fetching members:", error);
      else setMembers(data);
    };

    fetchGroupDetails();
    fetchMessages();
    fetchMembers();
    fetchChannels();

    // Setup realtime subscription for new messages in the selected channel
    if (selectedChannel) {
      const messageChannel = supabase.channel("realtime_group_messages_channel_" + selectedChannel.id);
      messageChannel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "GroupMessages",
          filter: `channel_id=eq.${selectedChannel.id}`,
        },
        (payload) => {
          console.log("Realtime message received:", payload);
          setMessages((prev) => [...prev, payload.new]);
        }
      ).subscribe();

      return () => {
         supabase.removeChannel(messageChannel);
      };
    }
  }, [groupId, selectedChannel]);

  // Auto-scroll chat to bottom when messages update.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Check if current user is in the group members list
  const isMember =
    currentUser &&
    members.some((member) => member.user_id === currentUser.id);

  // Handle "Join Group" button click
  const handleJoinGroup = async () => {
    if (!currentUser) return alert("You must be logged in to join the group.");
    const { data, error } = await supabase
      .from("GroupMembers")
      .insert([
        {
          group_id: groupId,
          user_id: currentUser.id,
          username: currentUser.email, // Or use another field for name
          avatar_url: currentUser.user_metadata?.avatar_url || null,
        },
      ])
      .select();
    if (error) {
      console.error("Error joining group:", error);
      alert("Failed to join group.");
    } else {
      // Update members list (either re-fetch or append the new member)
      setMembers((prev) => [...prev, data[0]]);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (!currentUser) return alert("You must be logged in to send a message.");
    if (!selectedChannel)
       return alert("Please select a channel first.");
    const messageData = {
      channel_id: selectedChannel.id, // now sending to the selected channel
      user_id: currentUser.id,
      username: currentUser.email,
      message: messageText,
    };

    const { error } = await supabase
      .from("GroupMessages")
      .insert([messageData]);
    if (error) {
      console.error("Error sending message:", error);
      alert("Message failed to send.");
    } else {
      setMessageText("");
      // New message is added in realtime
    }
  };

  const handleSubmitChannel = async (e) => {
      e.preventDefault();
      if (!newChannel.title.trim()) return alert("Channel title is required.");

      // Insert new channel into GroupChannels table (ensure you have this table)
      const { data, error } = await supabase
        .from("GroupChannels")
        .insert([{ group_id: groupId, title: newChannel.title, description: newChannel.description }])
        .select();

      if (error) {
          console.error("Error creating channel:", error);
          alert("Failed to create channel.");
      } else {
          const createdChannel = data[0];
          setChannels([...channels, createdChannel]);
          if (!selectedChannel) setSelectedChannel(createdChannel);
          setNewChannel({ title: "", description: "" });
          setIsCreatingChannel(false);
      }
  };

  const handleInviteUser = async (e) => {
      e.preventDefault();
      if (!inviteEmail.trim()) return alert("Please enter an email.");

      // Insert invitation into GroupInvitations table (ensure you have created this table)
      const { data, error } = await supabase
         .from("GroupInvitations")
         .insert([{ group_id: groupId, email: inviteEmail, invited_by: currentUser.id }])
         .select();
      if (error) {
         console.error("Error inviting user:", error);
         alert("Failed to send invitation.");
      } else {
         alert("Invitation sent!");
         setInviteEmail("");
         setIsInviteOpen(false);
      }
  };

  if (!group) {
    return <div className="p-4">Loading group details...</div>;
  }

  return (
    <div>
        <Link href="../" className="hover:underline mb-4 inline-block font-bold">
                Dashboard
      </Link>
      <span> /</span>
      <span> {group.title}</span>
    <div className="flex flex-col md:flex-row h-screen">
      

      {/* Left Sidebar: Channel Overview */}
      <div className="md:w-1/4 border-r border-gray-200 p-4 flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Channels</h2>
        <ul>
          {channels.map((channel) => (
            <li
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              className={`p-2 cursor-pointer rounded ${selectedChannel && selectedChannel.id === channel.id ? "bg-blue-100" : "hover:bg-gray-100"}`}
            >
              {channel.title}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <button 
            onClick={() => setIsCreatingChannel(true)} 
            className="w-full px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-2"
          >
            <AiOutlinePlus /> Create Channel
          </button>
          <button 
            onClick={() => setIsInviteOpen(true)} 
            className="w-full px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
          >
            Invite Users
          </button>
        </div>
      </div>

      {/* Middle: Chat Area */}
      <div className="md:w-1/2 flex flex-col p-4">
        {selectedChannel ? (
          <>
            <h2 className="text-3xl font-bold mb-4">{selectedChannel.title}</h2>
            <div className="flex-1 overflow-y-auto border rounded p-4 bg-gray-50">
              {messages.map((message) => {
                // Find the sender's details from the members array based on user_id
                const sender = members.find((m) => m.user_id === message.user_id);
                return (
                  <div key={message.id} className="mb-3">
                    <div className="flex items-start gap-2">
                      {/* Display the sender's avatar */}
                      <Image
                        src={sender?.avatar_url || "/default-avatar.png"}
                        alt="avatar"
                        width={30}
                        height={30}
                        className="rounded-full mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-600">{message.username}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="ml-2">{message.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                <AiOutlineSend size={20} />
              </button>
            </form>
          </>
        ) : (
          <div>Please select a channel.</div>
        )}
      </div>

      {/* Right Sidebar: Members List */}
      <div className="md:w-1/4 p-4">
        <h2 className="text-2xl font-semibold mb-4">Members</h2>
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.user_id} className="flex items-center gap-3 p-2 border rounded transition-colors hover:bg-gray-50">
              <Image
                src={member.avatar_url || "/default-avatar.png"}
                alt="avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span>{member.username}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Modals */}
      {isCreatingChannel && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <form onSubmit={handleSubmitChannel} className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Create Channel</h3>
            <label className="block mb-4">
              <span className="text-gray-700 mb-2 block">Channel Title:</span>
              <input
                type="text"
                value={newChannel.title}
                onChange={(e) => setNewChannel({ ...newChannel, title: e.target.value })}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </label>
            <label className="block mb-4">
              <span className="text-gray-700 mb-2 block">Description:</span>
              <textarea
                value={newChannel.description}
                onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                rows="4"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingChannel(false);
                  setNewChannel({ title: "", description: "" });
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      {isInviteOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <form onSubmit={handleInviteUser} className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Invite User</h3>
            <label className="block mb-4">
              <span className="text-gray-700 mb-2 block">User Email:</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteEmail("");
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </div>
  );
} 