"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../utils/supabase/client";
import { AiOutlineSend, AiOutlinePlus, AiOutlineCaretDown, AiOutlineCaretRight, AiOutlineEdit, AiOutlineDelete, AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import AlertModal from "../../components/Modals/AlertModal";
import PromptModal from "../../components/Modals/PromptModal";
import ConfirmModal from "../../components/Modals/ConfirmModal";

const AVAILABLE_COMMANDS = [
    { command: 'share', description: 'Share a note or exam with the group' },
];

export default function StudyGroupClient({ initialData }) {
    const [group, setGroup] = useState(initialData.group);
    const [channels, setChannels] = useState(initialData.channels);
    const [selectedChannel, setSelectedChannel] = useState(channels[0] || null);
    const [messages, setMessages] = useState(initialData.initialMessages);
    const [members, setMembers] = useState(initialData.members);
    const [messageText, setMessageText] = useState("");
    const [mobileView, setMobileView] = useState('chat'); // 'chat' or 'members'
    const [showCommandMenu, setShowCommandMenu] = useState(false);
    const [commandSuggestions, setCommandSuggestions] = useState([]);
    const [notesMenu, setNotesMenu] = useState(false);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);
    const [shareType, setShareType] = useState(null);
    const [userExams, setUserExams] = useState([]);
    const [isProcessingCommand, setIsProcessingCommand] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const [newChannel, setNewChannel] = useState({ title: "", description: "", folder: "" });
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
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
    const messagesEndRef = useRef(null);

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

    const showAlert = (message, type = "info") => {
        setAlertMessage(message);
        setAlertType(type);
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
            setSelectedCommandIndex(0);
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
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        if (!selectedChannel) return showAlert("Please select a channel first.", "error");

        // Check if the message is a command
        if (messageText.startsWith('/')) {
            const parts = messageText.slice(1).split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            await handleCommand(command, args);
            return;
        }

        // Regular message handling
        const messageData = {
            channel_id: selectedChannel.id,
            user_id: initialData.currentUser.id,
            username: initialData.currentUser.email,
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

                    // Handle share command...
                    break;
                }
                default:
                    showAlert(`Unknown command: ${command}`, 'error');
            }
        } finally {
            setIsProcessingCommand(false);
        }
    };

    const handleSubmitChannel = async (e) => {
        e.preventDefault();
        if (!newChannel.title.trim()) return showAlert("Channel title is required.", "error");

        try {
            const { data, error } = await supabase
                .from("GroupChannels")
                .insert([{ 
                    group_id: group.id, 
                    title: newChannel.title, 
                    description: newChannel.description
                }])
                .select();

            if (error) throw error;

            setChannels(prev => [...prev, data[0]]);
            if (!selectedChannel) setSelectedChannel(data[0]);
            setNewChannel({ title: "", description: "", folder: "" });
            setIsCreatingChannel(false);
            showAlert("Channel created successfully!", "success");
        } catch (error) {
            console.error("Error creating channel:", error);
            showAlert("Failed to create channel.", "error");
        }
    };

    const handleInviteUser = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return showAlert("Please enter an email.", "error");

        const { error } = await supabase
            .from("GroupInvitations")
            .insert([{ 
                group_id: group.id, 
                email: inviteEmail, 
                invited_by: initialData.currentUser.id 
            }]);

        if (error) {
            console.error("Error inviting user:", error);
            showAlert("Failed to send invitation.", "error");
        } else {
            showAlert("Invitation sent!", "success");
            setInviteEmail("");
            setIsInviteOpen(false);
        }
    };

    useEffect(() => {
        if (!selectedChannel) return;

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

    return (
        <div className="h-screen flex flex-col">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="hover:underline font-bold">
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
                <Link href="/dashboard" className="hover:underline font-bold">
                    Dashboard
                </Link>
                <span>/</span>
                <span>{group.title}</span>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Channels Sidebar */}
                <div className={`
                    md:w-1/4 border-r border-gray-200 bg-gray-50
                    ${mobileView === 'channels' ? 'fixed inset-0 bg-white z-40' : 'hidden md:block'}
                `}>
                    <div className="p-4">
                        <h2 className="text-xl font-bold mb-6 text-gray-800">Channels</h2>
                        <div className="space-y-1 mb-6">
                            {channels.map(channel => (
                                <button
                                    key={channel.id}
                                    onClick={() => setSelectedChannel(channel)}
                                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                        selectedChannel?.id === channel.id
                                            ? "bg-blue-100 text-blue-900"
                                            : "hover:bg-gray-200 text-gray-700"
                                    }`}
                                >
                                    <span className="text-gray-500 mr-2">#</span>
                                    {channel.title}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <button 
                                onClick={() => setIsCreatingChannel(true)}
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <AiOutlinePlus className="text-gray-500" /> Create Channel
                            </button>
                            <button 
                                onClick={() => setIsInviteOpen(true)}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Invite Users
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`
                    flex-1 flex flex-col bg-white
                    ${mobileView === 'chat' ? 'block' : 'hidden md:block'}
                `}>
                    {selectedChannel ? (
                        <>
                            <div className="p-4 border-b bg-white">
                                <h2 className="text-xl font-bold text-gray-800">
                                    <span className="text-gray-500">#</span> {selectedChannel.title}
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                                {messages.map((message) => (
                                    <div key={message.id} className="mb-6">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 relative flex-shrink-0">
                                                <Image
                                                    src={members.find(m => m.user_id === message.user_id)?.avatar || "/default-avatar.png"}
                                                    alt="avatar"
                                                    fill
                                                    className="rounded-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-900">{message.username}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(message.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 break-words">{message.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-4 border-t bg-white">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={handleMessageInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isProcessingCommand}
                                    >
                                        <AiOutlineSend size={20} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="p-4 text-gray-500 text-center">
                            <p>Select a channel to start chatting</p>
                        </div>
                    )}
                </div>

                {/* Members Sidebar */}
                <div className={`
                    md:w-1/4 border-l border-gray-200 bg-gray-50
                    ${mobileView === 'members' ? 'fixed inset-0 bg-white z-40' : 'hidden md:block'}
                `}>
                    <div className="p-4">
                        <h2 className="text-xl font-bold mb-6 text-gray-800">Members</h2>
                        <div className="space-y-3">
                            {/* Current User First */}
                            {members
                                .filter(member => member.user_id === initialData.currentUser.id)
                                .map(member => (
                                    <div key={member.user_id} 
                                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                                    >
                                        <div className="w-10 h-10 relative">
                                            <Image
                                                src={member.avatar || "/default-avatar.png"}
                                                alt="avatar"
                                                fill
                                                className="rounded-full object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{member.username}</span>
                                            <span className="text-sm text-blue-600">You</span>
                                        </div>
                                    </div>
                                ))}

                            {/* Other Members */}
                            {members
                                .filter(member => member.user_id !== initialData.currentUser.id)
                                .map(member => (
                                    <div key={member.user_id} 
                                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-10 h-10 relative">
                                            <Image
                                                src={member.avatar || "/default-avatar.png"}
                                                alt="avatar"
                                                fill
                                                className="rounded-full object-cover"
                                            />
                                        </div>
                                        <span className="font-medium text-gray-700">{member.username}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
                onConfirm={promptModal.onConfirm}
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
    );
} 