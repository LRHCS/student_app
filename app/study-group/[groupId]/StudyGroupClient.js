"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AiOutlineSend, AiOutlinePlus, AiOutlineCaretDown, AiOutlineCaretRight, AiOutlineEdit, AiOutlineDelete, AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { supabase } from "../../utils/supabase/client";
import Link from "next/link";
import AlertModal from "../../components/Modals/AlertModal";
import PromptModal from "../../components/Modals/PromptModal";
import ConfirmModal from "../../components/Modals/ConfirmModal";

export default function StudyGroupClient({ 
  initialGroup, 
  initialMembers, 
  initialChannels, 
  initialFolders,
  initialUser,
  initialMessages,
  initialNotes,
  initialExams
}) {
  const params = useParams();
  const groupId = params.groupId;
  
  const [group, setGroup] = useState(initialGroup);
  const [messages, setMessages] = useState(initialMessages);
  const [members, setMembers] = useState(initialMembers);
  const [messageText, setMessageText] = useState("");
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [channels, setChannels] = useState(initialChannels);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ title: "", description: "", folder: "" });
  const [folders, setFolders] = useState(initialFolders);
  const messagesEndRef = useRef(null);

  const [folderOpen, setFolderOpen] = useState({});
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState([]);
  const [notesMenu, setNotesMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);

  const folderedChannels = channels.filter(ch => ch.folder_id);
  const ungroupedChannels = channels.filter(ch => !ch.folder_id);

  const groupedChannels = folderedChannels.reduce((groups, channel) => {
    const folder = folders.find(f => f.id === channel.folder_id);
    if (folder && !groups[folder.id]) groups[folder.id] = [];
    if (folder) groups[folder.id].push(channel);
    return groups;
  }, {});

  const toggleFolder = (folderName) => {
    setFolderOpen((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

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

  const generateExamUrl = (examId) => {
    return `/exam/${examId}`;
  };

  const AVAILABLE_COMMANDS = [
    { command: 'share', description: 'Share a note or exam with the group' },
  ];

  const [shareType, setShareType] = useState(null); // 'note' or 'exam'
  const [userNotes, setUserNotes] = useState(initialNotes);
  const [userExams, setUserExams] = useState(initialExams);

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

  const generateNoteUrl = async (noteId) => {
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

  const shareNote = async (noteId) => {
    try {
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (!currentUser) return showAlert("You must be logged in to send a message.", "error");
    if (!selectedChannel) return showAlert("Please select a channel first.", "error");

    if (messageText.startsWith('/')) {
      const parts = messageText.slice(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      await handleCommand(command, args);
      return;
    }

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

  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState("info");

  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    initialValue: "",
    placeholder: "",
    onConfirm: () => {},
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "",
    confirmStyle: "danger"
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('chat');

  useEffect(() => {
    const folderNames = Object.keys(groupedChannels);
    const newFolders = folderNames.filter(name => !orderedFolders.includes(name));
    if (newFolders.length > 0) {
      setOrderedFolders(prev => [...prev, ...newFolders]);
    }
  }, [groupedChannels]);

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

  useEffect(() => {
    if (ungroupedChannels.length > 0 && ungroupedChannelsOrder.length !== ungroupedChannels.length) {
      setUngroupedChannelsOrder(ungroupedChannels.map(ch => ch.id));
    }
  }, [ungroupedChannels]);

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

    const { error } = await supabase
      .from("GroupChannels")
      .update({ folder_id: toFolderId })
      .eq("id", data.channelId);

    if (error) {
      console.error("Error moving channel:", error);
      return;
    }

    setChannels(prevChannels => {
      return prevChannels.map(channel => {
        if (channel.id === data.channelId) {
          return { ...channel, folder_id: toFolderId };
        }
        return channel;
      });
    });

    if (data.fromFolder) {
      setChannelsOrder(prev => ({
        ...prev,
        [data.fromFolder]: prev[data.fromFolder].filter(id => id !== data.channelId)
      }));
    } else {
      setUngroupedChannelsOrder(prev => prev.filter(id => id !== data.channelId));
    }

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
      setUngroupedChannelsOrder(prev => [
        ...prev.slice(0, dropIndex),
        data.channelId,
        ...prev.slice(dropIndex)
      ]);
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

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

          const { error: channelError } = await supabase
            .from("GroupChannels")
            .update({ folder_id: null })
            .eq("folder_id", folderId);

          if (channelError) throw channelError;

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

  const showAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
  };

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

  useEffect(() => {
    if (!selectedChannel) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("GroupMessages")
        .select("*")
        .eq("channel_id", selectedChannel.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        showAlert("Failed to load messages.", "error");
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

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
  }, [selectedChannel]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels]);

  if (!group) {
    return <div className="p-4">Loading group details...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
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

      <div className="hidden md:flex items-center gap-2 p-4 border-b">
        <Link href="../" className="hover:underline font-bold">
          Dashboard
        </Link>
        <span>/</span>
        <span>{group.title}</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
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
              {members
                .filter(member => member.user_id === currentUser?.id)
                .map((member) => (
                  <li key={member.user_id} className="flex items-center gap-3 p-2 border rounded transition-colors bg-blue-50 hover:bg-blue-100">
                    <div className="w-12 h-12 relative">
                      <Image
                        src={member.avatar || "/default-avatar.png"}
                        alt="avatar"
                        fill="true"
                        className="rounded-full"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span>{member.display_name || member.username}</span>
                      <span className="text-sm text-blue-600">You</span>
                    </div>
                  </li>
                ))}

              {members
                .filter(member => member.user_id !== currentUser?.id)
                .map((member) => (
                  <li key={member.user_id} className="flex items-center gap-3 p-2 border rounded transition-colors hover:bg-gray-50">
                    <div className="w-12 h-12 relative">
                      <Image
                        src={member.avatar || "/default-avatar.png"}
                        alt="avatar"
                        fill="true"
                        className="rounded-full"
                      />
                    </div>
                    <span>{member.display_name || member.username}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

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