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
        user?.user_metadata?.avatar_url || "https://ubiajgdnxauaennfuxur.supabase.co/storage/v1/object/public/avatar//default_avatar.jpg"
    );

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
            const avatarUrl = user.user_metadata?.avatar_url || DEFAULT_AVATAR;
            
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

            // Then add the creator as a member
            const { error: memberError } = await supabase
                .from('GroupMembers')
                .insert([{
                    group_id: groupData.id,
                    user_id: user.id,
                    username: user.email,
                    avatar: user.user_metadata?.avatar_url || null,
                    joined_at: new Date().toISOString()
                }]);

            if (memberError) throw memberError;

            setStudyGroups([...studyGroups, groupData]);
            setNewGroup({ title: "", description: "" });
            setIsCreatingGroup(false);

        } catch (error) {
            console.error("Error creating group:", error);
            alert("Failed to create group");
        }
    };

    const handleInvitationResponse = async (invitationId, groupId, accept) => {
        try {
            if (accept) {
                // Add user to group members
                const { error: memberError } = await supabase
                    .from('GroupMembers')
                    .insert([{
                        group_id: groupId,
                        user_id: user.id,
                        username: user.email,
                        avatar: user.user_metadata?.avatar_url || null,
                        joined_at: new Date().toISOString()
                    }]);
                
                if (memberError) throw memberError;
            }

            // Update invitation status
            const { error: updateError } = await supabase
                .from('GroupInvitations')
                .update({ accepted: accept })
                .eq('id', invitationId);

            if (updateError) throw updateError;

            // Update local state
            setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            if (accept) {
                const acceptedGroup = pendingInvitations.find(inv => inv.id === invitationId)?.group;
                if (acceptedGroup) {
                    setStudyGroups(prev => [...prev, acceptedGroup]);
                }
            }
        } catch (error) {
            console.error('Error handling invitation:', error);
            alert('Failed to process invitation');
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

            {/* Study Groups Section */}
            <div className="flex justify-between items-center mt-8">
                <h2 className="text-4xl font-bold m-4 mb-6">Study Groups</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {`${studyGroups.length} groups joined`}
                    </span>
                    <button
                        onClick={() => setIsCreatingGroup(true)}
                        className="p-2 flex items-center justify-center"
                        title="Create Study Group"
                    >
                        <AiOutlinePlus className="text-xl text-gray-500 hover:text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Study Groups List */}
            <div className="flex flex-wrap gap-4">
                {studyGroups.length > 0 ? (
                    studyGroups.map((group) => (
                        <Card key={group.id} className="mb-2 flex flex-col p-4 min-w-[200px]">
                            <Link href={`/study-group/${group.id}`} className="text-xl font-bold mb-2">
                                {group.title}
                            </Link>
                            <p className="text-gray-600 text-sm">{group.description}</p>
                            <p className="text-xs text-gray-400 mt-2">
                                Joined {formatDate(group.created_at)}
                            </p>
                        </Card>
                    ))
                ) : (
                    <Card className="mb-2 flex flex-col justify-center items-center p-6 min-w-[250px] border-2 border-dashed border-gray-300 bg-gray-50">
                        <h3 className="text-lg font-medium text-gray-700">
                            You haven't joined any study group yet
                        </h3>
                        <p className="text-sm text-gray-500">
                            Join a study group to collaborate with peers.
                        </p>
                    </Card>
                )}
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-2xl font-bold mb-4">Pending Invitations</h3>
                    <div className="flex flex-wrap gap-4">
                        {pendingInvitations.map((invitation) => (
                            <Card key={invitation.id} className="mb-2 p-4 min-w-[250px]">
                                <h4 className="font-semibold">{invitation.group.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{invitation.group.description}</p>
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => handleAcceptInvitation(invitation.id)}
                                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                        title="Accept Invitation"
                                    >
                                        Accept
                                    </button>
                                    <button 
                                        onClick={() => handleDeclineInvitation(invitation.id)}
                                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                                        title="Decline Invitation"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

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

            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
                <div className="mb-8 bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Pending Group Invitations</h3>
                    <div className="space-y-4">
                        {pendingInvitations.map((invitation) => (
                            <div key={invitation.id} 
                                className="flex items-center justify-between bg-white p-4 rounded-md shadow-sm">
                                <div>
                                    <h4 className="font-medium">{invitation.group.title}</h4>
                                    <p className="text-sm text-gray-600">{invitation.group.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, true)}
                                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                        title="Accept Invitation"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, false)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                        title="Decline Invitation"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 