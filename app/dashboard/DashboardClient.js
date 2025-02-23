"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card } from "..//UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import Calendar from "../components/Calendar";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../utils/supabase/client";
import ProfileLink from "../components/Header";
import { MdOutlineAssignment } from "react-icons/md";
import LoadingCard from "../components/LoadingCard";
import { useRouter } from "next/navigation";
import { Head } from "next/head";
import { createHash } from 'crypto';
import { useUser } from '../contexts/UserContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function DashboardClient({ initialData, calendarData }) {
    const { user, setUser } = useUser();
    const supabase = createClientComponentClient();
    const [courses, setCourses] = useState(initialData.courses);
    const [topics, setTopics] = useState(initialData.topics);
    const [exams, setExams] = useState(initialData.exams);
    const [assignments, setAssignments] = useState(initialData.assignments);
    const [lessons, setLessons] = useState(initialData.lessons);
    const [studyGroups, setStudyGroups] = useState(initialData.studyGroups);
    const [pendingInvitations, setPendingInvitations] = useState(initialData.pendingInvitations);
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: "" });
    const [editingCourse, setEditingCourse] = useState(null);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState({ title: "", description: "" });
    const [error, setError] = useState(null);
    const [currentAvatar, setCurrentAvatar] = useState(
        user?.avatar || user?.user_metadata?.avatar_url || "https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg"
    );
    const [showInvitations, setShowInvitations] = useState(false);
    const [isInvitingMembers, setIsInvitingMembers] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [selectedGroupForInvite, setSelectedGroupForInvite] = useState(null);

    const router = useRouter();

    useEffect(() => {
        if (!initialData) {
            router.refresh();
        }
    }, [initialData, router]);



    useEffect(() => {
        const registerUserProfile = async () => {
            if (!user) return;

            const DEFAULT_AVATAR = "https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg";
            const avatarUrl = user.avatar || user.user_metadata?.avatar_url || DEFAULT_AVATAR;
            
            // Update local avatar state immediately
            setCurrentAvatar(avatarUrl);

            try {
                // Check if profile already exists
                const { data: existingProfile } = await supabase
                    .from('Profiles')
                    .select()
                    .eq('id', user.id)
                    .single();

                const password = user.user_metadata?.password || null;
                const hashedPassword = password ? 
                    createHash('sha256').update(password).digest('hex') : 
                    null;

                if (!existingProfile) {
                    // Create new profile if doesn't exist
                    const { error: profileError } = await supabase
                        .from('Profiles')
                        .insert([{
                            id: user.id,
                            email: user.email,
                            avatar: avatarUrl,
                            password: hashedPassword,
                            created_at: new Date().toISOString(),
                        }]);

                    if (profileError) {
                        console.error('Profile creation error:', profileError);
                        throw profileError;
                    }

                    // Update user metadata to ensure avatar persists
                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { avatar_url: avatarUrl }
                    });

                    if (updateError) {
                        console.error('User metadata update error:', updateError);
                    }
                } else if (!existingProfile.avatar || !existingProfile.password) {
                    // Update existing profile with missing fields
                    const { error: updateError } = await supabase
                        .from('Profiles')
                        .update({ 
                            avatar: avatarUrl,
                            password: hashedPassword || existingProfile.password,
                        })
                        .eq('id', user.id);

                    if (updateError) {
                        console.error('Profile update error:', updateError);
                        throw updateError;
                    }
                }
            } catch (error) {
                console.error('Error registering user profile:', error);
                setError(error);
            }
        };

        registerUserProfile();
    }, [user]);

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">Error: {error.message}</p>
            </div>
        );
    }

    if (!initialData) {
        return (
            <div className="p-4">
                <div className="flex flex-wrap gap-4">
                    {[1, 2, 3].map((i) => (
                        <LoadingCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    const handleSubmitCourse = async (e) => {
        e.preventDefault();
        
        if (editingCourse) {
            const { data, error } = await supabase
                .from('Courses')
                .update({ title: newCourse.title })
                .eq('id', editingCourse.id)
                .select();

            if (error) {
                console.error('Error updating course:', error);
                alert('Failed to update course');
            } else {
                setCourses(courses.map(course => 
                    course.id === editingCourse.id ? data[0] : course
                ));
            }
        } else {
            const { data, error } = await supabase
                .from('Courses')
                .insert([{ 
                    title: newCourse.title, 
                    id: uuidv4(), 
                    user_id: user.id 
                }])
                .select();

            if (error) {
                console.error('Error adding course:', error);
                alert('Failed to add course');
            } else {
                setCourses([...courses, data[0]]);
            }
        }

        setIsAddingCourse(false);
        setNewCourse({ title: '' });
        setEditingCourse(null);
    };

    const handleEditClick = (course) => {
        setEditingCourse(course);
        setIsAddingCourse(true);
        setNewCourse({ title: course.title });
    };

    const handleDeleteClick = async (courseId) => {
        try {
            const { error } = await supabase
                .from('Courses')
                .delete()
                .eq('id', courseId);

            if (error) throw error;
            setCourses(courses.filter(course => course.id !== courseId));
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Failed to delete course');
        }
    };

    const getUnfinishedCounts = (courseId) => {
        const courseTopics = topics.filter(topic => topic.course_id === courseId);
        const topicIds = courseTopics.map(topic => topic.id);

        const unfinishedAssignments = assignments.filter(assignment => 
            topicIds.includes(assignment.topicId) && 
            (assignment.status === 0 || assignment.status === 1)
        ).length;

        const unfinishedLessons = lessons.filter(lesson => 
            topicIds.includes(lesson.topic_id) && 
            (lesson.status === 0 || lesson.status === 1)
        ).length;

        return { assignments: unfinishedAssignments, lessons: unfinishedLessons };
    };

    const handleInvitationResponse = async (invitationId, groupId, accept) => {
        if (accept) {
            // Add user to group members
            const { error: memberError } = await supabase
                .from('GroupMembers')
                .insert([{
                    group_id: groupId,
                    user_id: user.id,
                    username: user.email,
                    avatar_url: user.user_metadata?.avatar_url || null,
                }]);
            
            if (memberError) {
                console.error('Error accepting invitation:', memberError);
                alert('Failed to join group');
                return;
            }
        }

        // Update invitation status
        const { error: updateError } = await supabase
            .from('GroupInvitations')
            .update({ accepted: accept })
            .eq('id', invitationId);

        if (updateError) {
            console.error('Error updating invitation:', updateError);
            return;
        }

        // Update local state
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        if (accept) {
            const acceptedGroup = pendingInvitations.find(inv => inv.id === invitationId)?.group;
            if (acceptedGroup) {
                setStudyGroups(prev => [...prev, acceptedGroup]);
            }
        }
    };

    const handleSubmitGroup = async (e) => {
        e.preventDefault();
        if (!newGroup.title.trim()) return alert("Group title is required.");
        if (!user?.id) return alert("You must be logged in to create a group.");

        try {
            // First create the group
            const { data: groupData, error: groupError } = await supabase
                .from('Groups')
                .insert([{
                    title: newGroup.title,
                    description: newGroup.description,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (groupError) throw groupError;

            // Then add the creator as a member - removed avatar field since it's not in schema
            const { error: memberError } = await supabase
                .from('GroupMembers')
                .insert([{
                    group_id: groupData.id,
                    user_id: user.id,
                    username: user.email,
                    joined_at: new Date().toISOString()
                }]);

            if (memberError) throw memberError;

            setStudyGroups([...studyGroups, groupData]);
            setNewGroup({ title: "", description: "" });
            setIsCreatingGroup(false);

        } catch (error) {
            console.error("Error creating group:", error);
            alert(`Failed to create group: ${error.message}`);
        }
    };

    

    const handleSendInvitation = async (e) => {
        e.preventDefault();
        
        if (!inviteEmail || !selectedGroupForInvite) {
            alert('Please provide an email address');
            return;
        }

        try {
            // Check if user is already a member
            const { data: existingMember, error: memberError } = await supabase
                .from('GroupMembers')
                .select('*')
                .eq('group_id', selectedGroupForInvite.id)
                .eq('username', inviteEmail)
                .single();

            if (existingMember) {
                alert('This user is already a member of the group');
                return;
            }

            // Check if invitation already exists
            const { data: existingInvite, error: inviteError } = await supabase
                .from('GroupInvitations')
                .select('*')
                .eq('group_id', selectedGroupForInvite.id)
                .eq('email', inviteEmail)
                .is('accepted', null)
                .single();

            if (existingInvite) {
                alert('An invitation has already been sent to this email');
                return;
            }

            // Send new invitation
            const { error: sendError } = await supabase
                .from('GroupInvitations')
                .insert([{
                    group_id: selectedGroupForInvite.id,
                    email: inviteEmail,
                    invited_by: user.id,
                    created_at: new Date().toISOString(),
                    accepted: null
                }]);

            if (sendError) throw sendError;

            alert('Invitation sent successfully!');
            setInviteEmail('');
            setIsInvitingMembers(false);
            setSelectedGroupForInvite(null);

        } catch (error) {
            console.error('Error sending invitation:', error);
            alert('Failed to send invitation');
        }
    };

    return (
        <div className="p-4 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <h1 className="text-4xl font-bold m-4 mb-6 align-middle text-center">Courses</h1>
                    <button onClick={() => setIsAddingCourse(true)} className="p-2 flex items-center justify-center" title="Add Course">
                        <AiOutlinePlus className="text-xl text-gray-500 bold hover:text-gray-700" />
                    </button>
                </div>


            </div>

            <div className="flex-wrap flex-row flex gap-4">
                {courses.length > 0 ? (
                    courses.map((course) => {
                        const counts = getUnfinishedCounts(course.id);
                        return (
                            <Card key={course.id} className="mb-2 flex flex-col relative group">
                                <div className="w-fit">
                                    <Link href={`/course/${course.title}`} className="mr-4 text-xl font-bold">
                                        {course.title}
                                    </Link>
                                    <div className="text-sm text-gray-600 mt-2 flex gap-2">
                                        <MdOutlineAssignment className="text-xl" alt="assignment"/>
                                        <p>{counts.assignments}</p>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-4">
                                    <button 
                                        onClick={() => handleEditClick(course)}
                                        className="text-gray-950 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                        title="Edit course"
                                    >
                                        <CiEdit className="text-xl" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClick(course.id)}
                                        className="p-1 text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete course"
                                    >
                                        <RiDeleteBin5Line className="text-xl" />
                                    </button>
                                </div>
                            </Card>
                        );
                    })
                ) : (
                    <Card className="mb-2 flex flex-col justify-center items-center p-6 min-w-[250px] border-2 border-dashed border-gray-300 bg-gray-50">
                        <div className="text-center space-y-3">
                            <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
                            <p className="text-sm text-gray-500">
                                Click the + button above to create your first course
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Study Groups Section with Invitations Button */}
            <div className="flex justify-between items-center mt-8">
                <h2 className="text-4xl font-bold m-4 mb-6">Study Groups</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowInvitations(!showInvitations)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-sm">
                            Invitations
                            {pendingInvitations.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                                    {pendingInvitations.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setIsCreatingGroup(true)}
                        className="p-2 flex items-center justify-center"
                        title="Create Study Group"
                    >
                        <AiOutlinePlus className="text-xl text-gray-500 hover:text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Study Groups Grid */}
            <div className="relative">
                <div className="flex flex-wrap gap-4">
                    {studyGroups.length > 0 ? (
                        studyGroups.map((group) => (
                            <Card key={group.id} className="mb-2 flex flex-col p-4 w-full md:w-[calc(33.33%-1rem)] transition-all hover:shadow-lg">
                                <Link href={`/study-group/${group.id}`} className="text-xl font-bold mb-2 hover:text-blue-600 transition-colors">
                                    {group.title}
                                </Link>
                                <p className="text-gray-600 text-sm">{group.description}</p>


                            </Card>
                        ))
                    ) : (
                        <Card className="mb-2 flex flex-col justify-center items-center p-6 w-full border-2 border-dashed border-gray-300 bg-gray-50">
                            <h3 className="text-lg font-medium text-gray-700">
                                You haven't joined any study group yet
                            </h3>
                            <p className="text-sm text-gray-500">
                                Join a study group to collaborate with peers.
                            </p>
                        </Card>
                    )}
                </div>

                {/* Invitations Popup */}
                {showInvitations && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                            <div className="flex justify-between items-center p-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-700">
                                    Pending Invitations
                                    {pendingInvitations.length > 0 && 
                                        <span className="ml-2 text-sm text-gray-500">({pendingInvitations.length})</span>
                                    }
                                </h3>
                                <button 
                                    onClick={() => setShowInvitations(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-4 max-h-[70vh] overflow-y-auto flex flex-col gap-4 justify-center items-center">
                                <div className="">
                                    {pendingInvitations.length > 0 ? (
                                        pendingInvitations.map((invitation) => (
                                            <Card 
                                                key={invitation.id} 
                                                className="bg-white transition-all hover:shadow-md w-full"
                                            >
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium text-gray-900">
                                                            {invitation.group?.title || 'Unnamed Group'}
                                                        </h4>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDate(invitation.created_at)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {invitation.inviter?.avatar && (
                                                            <img 
                                                                src={invitation.inviter.avatar} 
                                                                alt="Inviter avatar"
                                                                className="w-6 h-6 rounded-full"
                                                            />
                                                        )}
                                                        <p className="text-sm text-gray-600">
                                                            Invited by: {invitation.inviter?.display_name || 'Unknown user'}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mb-3">
                                                        {invitation.group?.description}
                                                    </p>
                                                    <div className="flex gap-2 mt-3">
                                                        <button
                                                            onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, true)}
                                                            className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, false)}
                                                            className="flex-1 px-3 py-1.5 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-gray-500">
                                            <p>No pending invitations</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ProfileLink avatarUrl={currentAvatar} />
            <div className="calendar-container">
                <Calendar 
                    calendarData={{
                        ...calendarData,
                        assignments: assignments // Use assignments from initialData state
                    }} 
                />
            </div>

            {/* Add Course Modal */}
            {isAddingCourse && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <form className="bg-white p-6 rounded-lg shadow-lg w-96" onSubmit={handleSubmitCourse}>
                        <h3 className="text-xl font-semibold mb-4">
                            {editingCourse ? 'Edit Course' : 'Add Course'}
                        </h3>
                        <label className="block mb-4">
                            <span className="text-gray-700 mb-2 block">Course Title:</span>
                            <input
                                type="text"
                                value={newCourse.title}
                                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </label>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddingCourse(false);
                                    setEditingCourse(null);
                                    setNewCourse({ title: '' });
                                }}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                                title="Cancel"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                title="Save Changes"
                            >
                                {editingCourse ? 'Save Changes' : 'Add Course'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Create Group Modal */}
            {isCreatingGroup && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <form className="bg-white p-6 rounded-lg shadow-lg w-96" onSubmit={handleSubmitGroup}>
                        <h3 className="text-xl font-semibold mb-4">Create Study Group</h3>
                        <label className="block mb-4">
                            <span className="text-gray-700 mb-2 block">Group Title:</span>
                            <input
                                type="text"
                                value={newGroup.title}
                                onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </label>
                        <label className="block mb-4">
                            <span className="text-gray-700 mb-2 block">Description:</span>
                            <textarea
                                value={newGroup.description}
                                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows="4"
                            />
                        </label>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreatingGroup(false);
                                    setNewGroup({ title: "", description: "" });
                                }}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                                title="Cancel"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                title="Create Group"
                            >
                                Create Group
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isInvitingMembers && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <form onSubmit={handleSendInvitation} className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h3 className="text-xl font-semibold mb-4">
                            Invite to {selectedGroupForInvite?.title}
                        </h3>
                        <label className="block mb-4">
                            <span className="text-gray-700 mb-2 block">Email Address:</span>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                                placeholder="Enter email address"
                            />
                        </label>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsInvitingMembers(false);
                                    setInviteEmail('');
                                    setSelectedGroupForInvite(null);
                                }}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                                Send Invitation
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
        
    );
} 