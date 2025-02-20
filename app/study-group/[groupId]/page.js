"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AiOutlineSend, AiOutlinePlus, AiOutlineCaretDown, AiOutlineCaretRight, AiOutlineEdit, AiOutlineDelete, AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { supabase } from "@/app/utils/client";
import Link from "next/link";
import AlertModal from "@/app/components/Modals/AlertModal";
import PromptModal from "@/app/components/Modals/PromptModal";
import ConfirmModal from "@/app/components/Modals/ConfirmModal";

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
  const [newChannel, setNewChannel] = useState({ title: "", description: "", folder: "" });

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // A ref to auto-scroll the chat container to the bottom
  const messagesEndRef = useRef(null);

  // Add state for managing folder toggle status for channel groups
  const [folderOpen, setFolderOpen] = useState({});

  // Add new state for storing folder data
  const [folders, setFolders] = useState([]); // Will store full folder objects

  // Update the channels grouping logic
  const folderedChannels = channels.filter(ch => ch.folder_id);
  const ungroupedChannels = channels.filter(ch => !ch.folder_id);

  // Update the grouping logic to use folder_id
  const groupedChannels = folderedChannels.reduce((groups, channel) => {
    const folder = folders.find(f => f.id === channel.folder_id);
    if (folder && !groups[folder.id]) groups[folder.id] = [];
    if (folder) groups[folder.id].push(channel);
    return groups;
  }, {});

  // Toggle folder open/close status
  const toggleFolder = (folderName) => {
    setFolderOpen((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  // Initialize folderOpen state for each group when channels update
  useEffect(() => {
    const groups = Object.keys(groupedChannels);
    setFolderOpen((prev) => {
      const newState = { ...prev };
      groups.forEach((group) => {
        if (newState[group] === undefined) {
          newState[group] = true; // open by default
        }
      });
      return newState;
    });
  }, [channels]);

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
      const { data: membersData, error } = await supabase
        .from("GroupMembers")
        .select("*")
        .eq("group_id", groupId);
      if (error) {
        console.error("Error fetching members:", error);
      } else {
        // Fetch profiles for group members from the Profiles table
        const userIds = membersData.map(member => member.user_id);
        const { data: profiles, error: profileError } = await supabase
          .from("Profiles")
          .select("id, avatar")
          .in("id", userIds);
        if (profileError) {
          console.error("Error fetching profiles:", profileError);
          setMembers(membersData);
        } else {
          const mergedMembers = membersData.map(member => {
            const profile = profiles.find(p => p.id === member.user_id);
            return { ...member, avatar: profile?.avatar || "/default-avatar.png" };
          });
          setMembers(mergedMembers);
        }
      }
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
    if (!currentUser)
      return showAlert("You must be logged in to join the group.", "error");
    const { data, error } = await supabase
      .from("GroupMembers")
      .insert([
        {
          group_id: groupId,
          user_id: currentUser.id,
          username: currentUser.email, // Or use another field for name
          // Removed avatar_url from the insert; we'll fetch it from the Profiles table
        },
      ])
      .select();
    if (error) {
      console.error("Error joining group:", error);
      showAlert("Failed to join group.", "error");
    } else {
      // Fetch the user's profile to retrieve the avatar URL
      const { data: profile, error: profileError } = await supabase
        .from("Profiles")
        .select("id, avatar")
        .eq("id", currentUser.id)
        .single();
      if (profileError) {
        console.error("Error fetching profile for new member:", profileError);
        data[0].avatar = "/default-avatar.png";
      } else {
        data[0].avatar = profile.avatar || "/default-avatar.png";
      }
      // Update members list with the new member
      setMembers((prev) => [...prev, data[0]]);
    }
  };

  // Add new state for command handling
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [userNotes, setUserNotes] = useState([]);

  // Add this effect to fetch user's notes
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserNotes = async () => {
      const { data, error } = await supabase
        .from('Lessons')
        .select('id, title')
        .eq('uid', currentUser.id);
      
      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setUserNotes(data || []);
      }
    };

    fetchUserNotes();
  }, [currentUser]);

  // Add these new states after other state declarations
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState([]);
  const [notesMenu, setNotesMenu] = useState(false);

  // Add these new states after other state declarations
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);

  // Add this constant for available commands
  const AVAILABLE_COMMANDS = [
    { command: 'share', description: 'Share a note or exam with the group' },
  ];

  // Add new state for share type selection
  const [shareType, setShareType] = useState(null); // 'note' or 'exam'
  const [userExams, setUserExams] = useState([]);

  // Add this effect to fetch user's exams
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserExams = async () => {
      const { data, error } = await supabase
        .from('Exams')
        .select('id, title')
        .eq('uid', currentUser.id);
      
      if (error) {
        console.error('Error fetching exams:', error);
      } else {
        setUserExams(data || []);
      }
    };

    fetchUserExams();
  }, [currentUser]);

  // Update the handleCommand function
  const handleCommand = async (command, args) => {
    setIsProcessingCommand(true);
    try {
      switch (command) {
        case 'share': {
          if (args.length === 0) {
            setShareType(null);
            setNotesMenu(true);
            return;
          }

          const type = args[0].toLowerCase();
          if (!['note', 'exam'].includes(type)) {
            showAlert('Please specify type: note or exam', 'error');
            return;
          }

          if (args.length === 1) {
            setShareType(type);
            setNotesMenu(true);
            return;
          }

          const title = args.slice(1).join(' ').trim();
          if (!title) {
            showAlert(`Please specify a ${type} title to share`, 'error');
            return;
          }

          if (type === 'note') {
            const note = userNotes.find(n => 
              n.title.toLowerCase() === title.toLowerCase()
            );
            if (!note) {
              showAlert('Note not found. Please check the title and try again.', 'error');
              return;
            }
            await shareNote(note.id);
          } else {
            const exam = userExams.find(e => 
              e.title.toLowerCase() === title.toLowerCase()
            );
            if (!exam) {
              showAlert('Exam not found. Please check the title and try again.', 'error');
              return;
            }
            await shareExam(exam.id);
          }
          break;
        }
        default:
          showAlert(`Unknown command: ${command}`, 'error');
      }
    } finally {
      setIsProcessingCommand(false);
    }
  };

  // Update the generateNoteUrl function
  const generateNoteUrl = async (noteId) => {
    // Since we need the course title and topic title, we'll need to fetch them
    const { data: noteData, error } = await supabase
      .from('Lessons')
      .select(`
        id,
        title,
        topic_id,
        Topics!inner (
          id,
          title,
          course_id,
          Courses!inner (
            id,
            title
          )
        )
      `)
      .eq('id', noteId)
      .single();

    if (error || !noteData?.Topics?.Courses) {
      console.error('Error fetching note details:', error);
      return '#';
    }

    try {
      const courseTitle = encodeURIComponent(noteData.Topics.Courses.title.replace(/\s+/g, '-').toLowerCase());
      const topicTitle = encodeURIComponent(noteData.Topics.title.replace(/\s+/g, '-').toLowerCase());
      
      return `/course/${courseTitle}/topic/${topicTitle}/notes/${noteId}`;
    } catch (error) {
      console.error('Error generating URL:', error);
      return '#';
    }
  };

  // Update the shareNote function
  const shareNote = async (noteId) => {
    try {
      // Fetch the full note content and generate URL
      const { data: noteData, error: noteError } = await supabase
        .from('Lessons')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError) {
        console.error('Error fetching note:', noteError);
        showAlert('Failed to fetch note content', 'error');
        return;
      }

      const noteUrl = await generateNoteUrl(noteId);
      if (!noteUrl) {
        showAlert('Failed to generate note link', 'error');
        return;
      }

      // Create a shared note message with the link
      const sharedMessage = {
        channel_id: selectedChannel.id,
        user_id: currentUser.id,
        username: currentUser.email,
        message: `Shared note: ${noteData.title}\n\n${noteData.content}`,
        type: 'shared_note',
        metadata: {
          noteId: noteData.id,
          noteTitle: noteData.title,
          noteUrl: noteUrl
        }
      };

      const { error: sendError } = await supabase
        .from('GroupMessages')
        .insert([sharedMessage]);

      if (sendError) {
        console.error('Error sharing note:', sendError);
        showAlert('Failed to share note', 'error');
      } else {
        showAlert('Note shared successfully!', 'success');
        setMessageText('');
      }
    } catch (error) {
      console.error('Error in shareNote:', error);
      showAlert('Failed to share note', 'error');
    }
  };

  // Add this function to generate exam URL
  const generateExamUrl = (examId) => {
    return `/exam/${examId}`;
  };

  // Add this function to share exam
  const shareExam = async (examId) => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('Exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) {
        console.error('Error fetching exam:', examError);
        showAlert('Failed to fetch exam', 'error');
        return;
      }

      const examUrl = generateExamUrl(examId);

      const sharedMessage = {
        channel_id: selectedChannel.id,
        user_id: currentUser.id,
        username: currentUser.email,
        message: `Shared exam: ${examData.title}`,
        type: 'shared_exam',
        metadata: {
          examId: examData.id,
          examTitle: examData.title,
          examUrl: examUrl
        }
      };

      const { error: sendError } = await supabase
        .from('GroupMessages')
        .insert([sharedMessage]);

      if (sendError) {
        console.error('Error sharing exam:', sendError);
        showAlert('Failed to share exam', 'error');
      } else {
        showAlert('Exam shared successfully!', 'success');
        setMessageText('');
      }
    } catch (error) {
      console.error('Error in shareExam:', error);
      showAlert('Failed to share exam', 'error');
    }
  };

  // Update the handleMessageInputChange function
  const handleMessageInputChange = (e) => {
    const value = e.target.value;
    setMessageText(value);

    if (value.startsWith('/')) {
      const commandText = value.slice(1);
      const suggestions = AVAILABLE_COMMANDS.filter(cmd => 
        cmd.command.startsWith(commandText.toLowerCase())
      );
      setCommandSuggestions(suggestions);
      setShowCommandMenu(suggestions.length > 0);
      setSelectedCommandIndex(0); // Reset selection when suggestions change
      setNotesMenu(false);
    } else {
      setShowCommandMenu(false);
      setNotesMenu(false);
    }
  };

  // Add this new function to handle keyboard navigation
  const handleKeyDown = (e) => {
    if (showCommandMenu) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev > 0 ? prev - 1 : commandSuggestions.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev < commandSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          if (commandSuggestions.length > 0) {
            e.preventDefault();
            const selectedCommand = commandSuggestions[selectedCommandIndex];
            setMessageText(`/${selectedCommand.command} `);
            setShowCommandMenu(false);
            if (selectedCommand.command === 'share') {
              setNotesMenu(true);
              setSelectedNoteIndex(0);
            }
          }
          break;
      }
    } else if (notesMenu) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedNoteIndex(prev => 
            prev > 0 ? prev - 1 : userNotes.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedNoteIndex(prev => 
            prev < userNotes.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          if (userNotes.length > 0) {
            e.preventDefault();
            const selectedNote = userNotes[selectedNoteIndex];
            shareNote(selectedNote.id);
            setNotesMenu(false);
          }
          break;
        case 'Escape':
          setNotesMenu(false);
          break;
      }
    }
  };

  // Update the handleSendMessage function
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (!currentUser) return showAlert("You must be logged in to send a message.", "error");
    if (!selectedChannel) return showAlert("Please select a channel first.", "error");

    // Check if the message is a command
    if (messageText.startsWith('/')) {
      const parts = messageText.slice(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      await handleCommand(command, args);
      return;
    }

    // Regular message handling...
    const messageData = {
      channel_id: selectedChannel.id,
      user_id: currentUser.id,
      username: currentUser.email,
      message: messageText,
      type: 'text'
    };

    const { error } = await supabase
      .from("GroupMessages")
      .insert([messageData]);
    
    if (error) {
      console.error("Error sending message:", error);
      showAlert("Message failed to send.", "error");
    } else {
      setMessageText("");
    }
  };

  const handleSubmitChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.title.trim()) return showAlert("Channel title is required.", "error");

    try {
      const { data, error } = await supabase
        .from("GroupChannels")
        .insert([{ 
          group_id: groupId, 
          title: newChannel.title, 
          description: newChannel.description, 
          folder_id: newChannel.folder || null 
        }])
        .select();

      if (error) throw error;

      const createdChannel = data[0];
      setChannels([...channels, createdChannel]);
      if (!selectedChannel) setSelectedChannel(createdChannel);
      setNewChannel({ title: "", description: "", folder: "" });
      setIsCreatingChannel(false);
    } catch (error) {
      console.error("Error creating channel:", error);
      showAlert("Failed to create channel.", "error");
    }
  };

  const handleInviteUser = async (e) => {
      e.preventDefault();
      if (!inviteEmail.trim()) return showAlert("Please enter an email.", "error");

      // Insert invitation into GroupInvitations table (ensure you have created this table)
      const { data, error } = await supabase
         .from("GroupInvitations")
         .insert([{ group_id: groupId, email: inviteEmail, invited_by: currentUser.id }])
         .select();
      if (error) {
         console.error("Error inviting user:", error);
         showAlert("Failed to send invitation.", "error");
      } else {
         showAlert("Invitation sent!", "success");
         setInviteEmail("");
         setIsInviteOpen(false);
      }
  };

  const [orderedFolders, setOrderedFolders] = useState([]);
  const [channelsOrder, setChannelsOrder] = useState({});
  const [ungroupedChannelsOrder, setUngroupedChannelsOrder] = useState([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Add these new states after other state declarations
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Add these new states after your other state declarations
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState("info"); // can be "info", "error", or "success"

  // Add these new states for managing prompts
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    initialValue: "",
    placeholder: "",
    onConfirm: () => {},
  });

  // Add this state for managing confirms
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "",
    confirmStyle: "danger"
  });

  // Add these new states for mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('chat'); // 'chat', 'channels', or 'members'

  // Update orderedFolders state based on groupedChannels
  useEffect(() => {
    const folderNames = Object.keys(groupedChannels);
    const newFolders = folderNames.filter(name => !orderedFolders.includes(name));
    if (newFolders.length > 0) {
      setOrderedFolders(prev => [...prev, ...newFolders]);
    }
  }, [groupedChannels]);

  // Initialize channels order for each folder
  useEffect(() => {
    for (const folder in groupedChannels) {
      setChannelsOrder(prev => {
        if (prev[folder] === undefined) {
          return { ...prev, [folder]: groupedChannels[folder].map(ch => ch.id) };
        }
        return prev;
      });
    }
  }, [groupedChannels]);

  // Initialize ungrouped channels order
  useEffect(() => {
    if (ungroupedChannels.length > 0 && ungroupedChannelsOrder.length !== ungroupedChannels.length) {
      setUngroupedChannelsOrder(ungroupedChannels.map(ch => ch.id));
    }
  }, [ungroupedChannels]);

  // Update the folder drag handlers
  const handleFolderDragStart = (e, folderName, index) => {
    setDraggedItem({ type: 'folder', name: folderName, index });
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "folder", folderName, index }));
  };

  const handleFolderDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem?.type === 'folder' && draggedItem.index !== index) {
      setDropTarget({ type: 'folder', index });
    }
  };

  const handleFolderDragLeave = () => {
    setDropTarget(null);
  };

  const handleFolderDrop = (e, dropIndex) => {
    e.preventDefault();
    setDropTarget(null);
    setDraggedItem(null);
    const data = JSON.parse(e.dataTransfer.getData("application/json"));
    if(data.type !== "folder") return;
    const draggedFolder = data.folderName;
    let newOrder = Array.from(orderedFolders);
    newOrder.splice(data.index, 1);
    newOrder.splice(dropIndex, 0, draggedFolder);
    setOrderedFolders(newOrder);
  };

  // Update the channel drag handlers to support moving between folders
  const handleChannelDragStart = (e, channelId, folderName, index) => {
    setDraggedItem({ type: 'channel', id: channelId, fromFolder: folderName, index });
    e.dataTransfer.setData("application/json", JSON.stringify({ 
      type: "channel", 
      channelId, 
      fromFolder: folderName, 
      index 
    }));
  };

  const handleChannelDragOver = (e, folderName, index) => {
    e.preventDefault();
    if (draggedItem?.type === 'channel') {
      setDropTarget({ type: 'channel', folderName, index });
    }
  };

  const handleChannelDrop = async (e, toFolderId, dropIndex) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("application/json"));
    if (data.type !== "channel") return;

    // Update the channel's folder in Supabase
    const { error } = await supabase
      .from("GroupChannels")
      .update({ folder_id: toFolderId })
      .eq("id", data.channelId);

    if (error) {
      console.error("Error moving channel:", error);
      return;
    }

    // Update local state
    setChannels(prevChannels => {
      return prevChannels.map(channel => {
        if (channel.id === data.channelId) {
          return { ...channel, folder_id: toFolderId };
        }
        return channel;
      });
    });

    // Update channel orders
    if (data.fromFolder) {
      // Remove from old folder
      setChannelsOrder(prev => ({
        ...prev,
        [data.fromFolder]: prev[data.fromFolder].filter(id => id !== data.channelId)
      }));
    } else {
      // Remove from ungrouped
      setUngroupedChannelsOrder(prev => prev.filter(id => id !== data.channelId));
    }

    // Add to new folder
    if (toFolderId) {
      setChannelsOrder(prev => ({
        ...prev,
        [toFolderId]: [
          ...(prev[toFolderId] || []).slice(0, dropIndex),
          data.channelId,
          ...(prev[toFolderId] || []).slice(dropIndex)
        ]
      }));
    } else {
      // Add to ungrouped
      setUngroupedChannelsOrder(prev => [
        ...prev.slice(0, dropIndex),
        data.channelId,
        ...prev.slice(dropIndex)
      ]);
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  // Update the ungrouped channel handlers
  const handleUngroupedChannelDragStart = (e, channelId, index) => {
    setDraggedItem({ type: 'channel', id: channelId, fromFolder: null, index });
    e.dataTransfer.setData("application/json", JSON.stringify({ 
      type: "channel", 
      channelId, 
      fromFolder: null, 
      index 
    }));
  };

  const handleUngroupedChannelDrop = (e, dropIndex) => {
    handleChannelDrop(e, null, dropIndex);
  };

  // Update the folder creation handler
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if(!newFolderName.trim()) {
      showAlert("Folder name is required.", "error");
      return;
    }
    if(folders.some(f => f.name === newFolderName)) {
      showAlert("Folder already exists.", "error");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("GroupFolders")
        .insert([{ 
          group_id: groupId,
          name: newFolderName,
          order: folders.length
        }])
        .select();

      if (error) throw error;

      setFolders(prev => [...prev, data[0]]);
      setOrderedFolders(prev => [...prev, data[0].id]);
      setNewFolderName("");
      setIsCreatingFolder(false);
      showAlert("Folder created successfully", "success");
    } catch (error) {
      console.error("Error creating folder:", error);
      showAlert("Failed to create folder. Please try again.", "error");
    }
  };

  // Update the folders fetch effect
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const { data, error } = await supabase
          .from("GroupFolders")
          .select("*")
          .eq("group_id", groupId)
          .order("order");

        if (error) throw error;

        if (data) {
          setFolders(data);
          setOrderedFolders(data.map(folder => folder.id));
        }
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };

    if (groupId) {
      fetchFolders();
    }
  }, [groupId]);

  // Update handleDeleteFolder to use ConfirmModal
  const handleDeleteFolder = async (folderId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Folder",
      message: "Are you sure you want to delete this folder? All channels will be moved to ungrouped.",
      confirmText: "Delete Folder",
      confirmStyle: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("GroupFolders")
            .delete()
            .eq("id", folderId);

          if (error) throw error;

          // Update channels to remove folder_id
          const { error: channelError } = await supabase
            .from("GroupChannels")
            .update({ folder_id: null })
            .eq("folder_id", folderId);

          if (channelError) throw channelError;

          // Update local state
          setFolders(prev => prev.filter(f => f.id !== folderId));
          setOrderedFolders(prev => prev.filter(id => id !== folderId));
          setChannels(prev => prev.map(ch => 
            ch.folder_id === folderId ? { ...ch, folder_id: null } : ch
          ));
          showAlert("Folder deleted successfully", "success");
        } catch (error) {
          console.error("Error deleting folder:", error);
          showAlert("Failed to delete folder.", "error");
        }
      }
    });
  };

  // Update handleEditFolder to use PromptModal
  const handleEditFolder = async (folder) => {
    setPromptModal({
      isOpen: true,
      title: "Edit Folder Name",
      message: "Enter new name for the folder:",
      initialValue: folder.name,
      placeholder: "Folder name",
      onConfirm: async (newName) => {
        if (!newName || newName === folder.name) return;

        try {
          const { error } = await supabase
            .from("GroupFolders")
            .update({ name: newName })
            .eq("id", folder.id);

          if (error) throw error;

          setFolders(prev => prev.map(f => 
            f.id === folder.id ? { ...f, name: newName } : f
          ));
          showAlert("Folder name updated successfully", "success");
        } catch (error) {
          console.error("Error updating folder:", error);
          showAlert("Failed to update folder name.", "error");
        }
      }
    });
  };

  // Update handleEditChannel to use PromptModal
  const handleEditChannel = async (channel) => {
    setPromptModal({
      isOpen: true,
      title: "Edit Channel Name",
      message: "Enter new name for the channel:",
      initialValue: channel.title,
      placeholder: "Channel name",
      onConfirm: async (newTitle) => {
        if (!newTitle || newTitle === channel.title) return;

        try {
          const { error } = await supabase
            .from("GroupChannels")
            .update({ title: newTitle })
            .eq("id", channel.id);

          if (error) throw error;

          setChannels(prev => prev.map(ch => 
            ch.id === channel.id ? { ...ch, title: newTitle } : ch
          ));
          showAlert("Channel name updated successfully", "success");
        } catch (error) {
          console.error("Error updating channel:", error);
          showAlert("Failed to update channel name.", "error");
        }
      }
    });
  };

  // Update handleDeleteChannel to use ConfirmModal
  const handleDeleteChannel = async (channelId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Channel",
      message: "Are you sure you want to delete this channel? This action cannot be undone.",
      confirmText: "Delete Channel",
      confirmStyle: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("GroupChannels")
            .delete()
            .eq("id", channelId);

          if (error) throw error;

          setChannels(prev => prev.filter(ch => ch.id !== channelId));
          if (selectedChannel?.id === channelId) {
            setSelectedChannel(null);
          }
          showAlert("Channel deleted successfully", "success");
        } catch (error) {
          console.error("Error deleting channel:", error);
          showAlert("Failed to delete channel.", "error");
        }
      }
    });
  };

  // Create a helper function to show alerts
  const showAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
  };

  // Update the renderMessage function to handle invalid URLs better
  const renderMessage = (message) => {
    const sender = members.find((m) => m.user_id === message.user_id);
    
    return (
      <div key={message.id} className="mb-3">
        <div className="flex items-start gap-2">
          <div className="w-12 h-12 relative">
          <Image
            src={sender?.avatar || "/default-avatar.png"}
            alt="avatar"
            fill = "true"
            className="rounded-full mt-1"
          />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-600">{message.username}</span>
              <span className="text-xs text-gray-400">
                {new Date(message.created_at).toLocaleString()}
              </span>
            </div>
            {(message.type === 'shared_note' || message.type === 'shared_exam') && (
              <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  {message.metadata?.noteUrl || message.metadata?.examUrl ? (
                    <Link 
                      href={message.metadata.noteUrl || message.metadata.examUrl}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                    >
                      {message.metadata.noteTitle || message.metadata.examTitle}
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
            {message.type === 'text' && (
              <p className="ml-2">{message.message}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!group) {
    return <div className="p-4">Loading group details...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Link href="../" className="hover:underline font-bold">
            Dashboard
          </Link>
          <span>/</span>
          <span>{group.title}</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <AiOutlineMenu size={24} />
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center gap-2 p-4 border-b">
        <Link href="../" className="hover:underline font-bold">
          Dashboard
        </Link>
        <span>/</span>
        <span>{group.title}</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Channels Sidebar - Hidden on mobile unless selected */}
        <div className={`
          md:w-1/4 border-r border-gray-200
          ${mobileView === 'channels' ? 'fixed inset-0 bg-white z-40' : 'hidden md:block'}
        `}>
          {mobileView === 'channels' && (
            <div className="flex items-center justify-between p-4 border-b md:hidden">
              <h2 className="text-xl font-bold">Channels</h2>
              <button
                onClick={() => setMobileView('chat')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <AiOutlineClose size={24} />
              </button>
            </div>
          )}
          <div className="p-4 overflow-y-auto h-full">
            {orderedFolders.map((folderId, folderIndex) => {
              const folder = folders.find(f => f.id === folderId);
              if (!folder) return null;
              return (
                <div key={folder.id}>
                  {dropTarget?.type === 'folder' && dropTarget.index === folderIndex && (
                    <div className="h-1 bg-blue-500 rounded my-1" />
                  )}
                  <div
                    draggable
                    onDragStart={(e) => handleFolderDragStart(e, folder.id, folderIndex)}
                    onDragOver={(e) => handleFolderDragOver(e, folderIndex)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folderIndex)}
                    onClick={() => toggleFolder(folder.id)}
                    onDragEnd={() => {
                      setDraggedItem(null);
                      setDropTarget(null);
                    }}
                    className={`group flex items-center justify-between cursor-pointer p-2 ${
                      draggedItem?.type === 'folder' && draggedItem.name === folder.id
                        ? 'opacity-50'
                        : ''
                    } bg-gray-200 rounded mt-2 hover:bg-gray-300 transition-colors`}
                  >
                    <span className="font-semibold">{folder.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFolder(folder);
                          }}
                          className="p-1 hover:bg-gray-400 rounded"
                        >
                          <AiOutlineEdit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="p-1 hover:bg-gray-400 rounded text-red-600"
                        >
                          <AiOutlineDelete size={16} />
                        </button>
                      </div>
                      {folderOpen[folder.id] ? (
                        <AiOutlineCaretDown />
                      ) : (
                        <AiOutlineCaretRight />
                      )}
                    </div>
                  </div>
                  {folderOpen[folder.id] && (
                    <ul className="ml-4 mt-1">
                      {(channelsOrder[folder.id] || []).length === 0 ? (
                        // Empty folder drop zone
                        <div
                          className={`p-4 border-2 border-dashed rounded-md ${
                            dropTarget?.type === 'channel' && dropTarget.folderName === folder.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300'
                          }`}
                          onDragOver={(e) => handleChannelDragOver(e, folder.id, 0)}
                          onDrop={(e) => handleChannelDrop(e, folder.id, 0)}
                        >
                          Drop channel here
                        </div>
                      ) : (
                        // Existing channels list
                        <>
                          {(channelsOrder[folder.id] || []).map((channelId, channelIndex) => {
                            const channel = groupedChannels[folder.id]?.find(ch => ch.id === channelId);
                            if (!channel) return null;
                            return (
                              <li key={channel.id}>
                                {dropTarget?.type === 'channel' && 
                                 dropTarget.folderName === folder.id && 
                                 dropTarget.index === channelIndex && (
                                  <div className="h-1 bg-blue-500 rounded my-1" />
                                )}
                                <div
                                  draggable
                                  onDragStart={(e) => handleChannelDragStart(e, channel.id, folder.id, channelIndex)}
                                  onDragOver={(e) => handleChannelDragOver(e, folder.id, channelIndex)}
                                  onDrop={(e) => handleChannelDrop(e, folder.id, channelIndex)}
                                  onClick={() => setSelectedChannel(channel)}
                                  className={`group flex items-center justify-between p-2 cursor-pointer rounded ${
                                    draggedItem?.type === 'channel' && draggedItem.id === channel.id
                                      ? 'opacity-50'
                                      : ''
                                  } ${
                                    selectedChannel && selectedChannel.id === channel.id
                                      ? "bg-blue-100"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  <span>{channel.title}</span>
                                  <div className="hidden group-hover:flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditChannel(channel);
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded"
                                    >
                                      <AiOutlineEdit size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteChannel(channel.id);
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded text-red-600"
                                    >
                                      <AiOutlineDelete size={16} />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                          {dropTarget?.type === 'channel' && 
                           dropTarget.folderName === folder.id && 
                           dropTarget.index === channelsOrder[folder.id]?.length && (
                            <div className="h-1 bg-blue-500 rounded my-1" />
                          )}
                        </>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
            {dropTarget?.type === 'folder' && dropTarget.index === orderedFolders.length && (
              <div className="h-1 bg-blue-500 rounded my-1" />
            )}
            {ungroupedChannels.length > 0 && (
              <>
                <h3 className="mt-4 text-lg font-bold">Ungrouped Channels</h3>
                <ul className="ml-4 mt-1">
                  {ungroupedChannelsOrder.map((channelId, index) => {
                    const channel = ungroupedChannels.find(ch => ch.id === channelId);
                    if (!channel) return null;
                    return (
                      <li key={channel.id}>
                        {dropTarget?.type === 'channel' && 
                         dropTarget.folderName === null && 
                         dropTarget.index === index && (
                          <div className="h-1 bg-blue-500 rounded my-1" />
                        )}
                        <div
                          draggable
                          onDragStart={(e) => handleUngroupedChannelDragStart(e, channel.id, index)}
                          onDragOver={(e) => handleChannelDragOver(e, null, index)}
                          onDrop={(e) => handleChannelDrop(e, null, index)}
                          onClick={() => setSelectedChannel(channel)}
                          className={`group flex items-center justify-between p-2 cursor-pointer rounded ${
                            draggedItem?.type === 'channel' && draggedItem.id === channel.id
                              ? 'opacity-50'
                              : ''
                          } ${
                            selectedChannel && selectedChannel.id === channel.id
                              ? "bg-blue-100"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <span>{channel.title}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChannel(channel);
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <AiOutlineEdit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChannel(channel.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded text-red-600"
                            >
                              <AiOutlineDelete size={16} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {dropTarget?.type === 'channel' && 
                   dropTarget.folderName === null && 
                   dropTarget.index === ungroupedChannelsOrder.length && (
                    <div className="h-1 bg-blue-500 rounded my-1" />
                  )}
                </ul>
              </>
            )}
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
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="w-full px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area - Full width on mobile */}
        <div className={`
          flex-1 flex flex-col
          ${mobileView === 'chat' ? 'block' : 'hidden md:block'}
        `}>
          {selectedChannel ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedChannel.title}</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.map((message) => renderMessage(message))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t relative">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={messageText}
                      onChange={handleMessageInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message... (try /share)"
                      className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {/* Command Menu */}
                    {showCommandMenu && (
                      <div className="absolute bottom-full left-0 w-full bg-white border rounded-lg shadow-lg mb-1 max-h-48 overflow-y-auto">
                        {commandSuggestions.map((cmd, index) => (
                          <button
                            key={cmd.command}
                            type="button"
                            onClick={() => {
                              setMessageText(`/${cmd.command} `);
                              setShowCommandMenu(false);
                              if (cmd.command === 'share') {
                                setNotesMenu(true);
                                setSelectedNoteIndex(0);
                              }
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 ${
                              index === selectedCommandIndex ? 'bg-blue-50' : ''
                            }`}
                          >
                            <span className="font-bold">/{cmd.command}</span>
                            <span className="text-gray-600 text-sm">{cmd.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Notes Menu */}
                    {notesMenu && (
                      <div className="absolute bottom-full left-0 w-full bg-white border rounded-lg shadow-lg mb-1 max-h-48 overflow-y-auto">
                        {!shareType ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setShareType('note')}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              Share Note
                            </button>
                            <button
                              type="button"
                              onClick={() => setShareType('exam')}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              Share Exam
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="px-4 py-2 bg-gray-100 font-medium">
                              Select {shareType === 'note' ? 'Note' : 'Exam'} to Share
                            </div>
                            {(shareType === 'note' ? userNotes : userExams).length === 0 ? (
                              <div className="px-4 py-2 text-gray-500">No {shareType}s found</div>
                            ) : (
                              (shareType === 'note' ? userNotes : userExams).map((item, index) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    shareType === 'note' ? shareNote(item.id) : shareExam(item.id);
                                    setNotesMenu(false);
                                    setShareType(null);
                                  }}
                                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                                    index === selectedNoteIndex ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  {item.title}
                                </button>
                              ))
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={isProcessingCommand}
                  >
                    <AiOutlineSend size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="p-4">Please select a channel.</div>
          )}
        </div>

        {/* Members Sidebar - Hidden on mobile unless selected */}
        <div className={`
          md:w-1/4 border-l border-gray-200
          ${mobileView === 'members' ? 'fixed inset-0 bg-white z-40' : 'hidden md:block'}
        `}>
          {mobileView === 'members' && (
            <div className="flex items-center justify-between p-4 border-b md:hidden">
              <h2 className="text-xl font-bold">Members</h2>
              <button
                onClick={() => setMobileView('chat')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <AiOutlineClose size={24} />
              </button>
            </div>
          )}
          <div className="p-4 overflow-y-auto h-full">
            <h2 className="text-2xl font-semibold mb-4">Members</h2>
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.user_id} className="flex items-center gap-3 p-2 border rounded transition-colors hover:bg-gray-50">
                  <div className="w-12 h-12 relative">
                  <Image
                    src={member.avatar || "/default-avatar.png"}
                    alt="avatar"
                    fill = "true"
                    className="rounded-full"
                  />
                  </div>
                  <span>{member.username}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <AiOutlineClose size={24} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <button
                  onClick={() => {
                    setMobileView('channels');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded"
                >
                  Channels
                </button>
                <button
                  onClick={() => {
                    setMobileView('members');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded"
                >
                  Members
                </button>
                <button
                  onClick={() => setIsCreatingChannel(true)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded"
                >
                  Create Channel
                </button>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded"
                >
                  Create Folder
                </button>
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded"
                >
                  Invite Users
                </button>
              </div>
            </div>
          </div>
        )}

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
              <label className="block mb-4">
                <span className="text-gray-700 mb-2 block">Folder (optional):</span>
                <select
                  value={newChannel.folder}
                  onChange={(e) => setNewChannel({ ...newChannel, folder: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingChannel(false);
                    setNewChannel({ title: "", description: "", folder: "" });
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

        {isCreatingFolder && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <form onSubmit={handleCreateFolder} className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h3 className="text-xl font-semibold mb-4">Create Folder</h3>
              <label className="block mb-4">
                <span className="text-gray-700 mb-2 block">Folder Name:</span>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </label>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  Create Folder
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

        {/* Alert and Confirm Modals */}
        {alertMessage && (
          <AlertModal
            message={alertMessage}
            type={alertType}
            onClose={() => setAlertMessage(null)}
          />
        )}
        <PromptModal
          isOpen={promptModal.isOpen}
          onClose={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={(value) => {
            promptModal.onConfirm(value);
            setPromptModal(prev => ({ ...prev, isOpen: false }));
          }}
          title={promptModal.title}
          message={promptModal.message}
          initialValue={promptModal.initialValue}
          placeholder={promptModal.placeholder}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          confirmStyle={confirmModal.confirmStyle}
        />
      </div>
    </div>
  );
} 