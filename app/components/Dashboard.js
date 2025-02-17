"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/app/UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import Calendar from "@/app/components/calendar";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/app/utils/client";
import Image from "next/image";
import { loadDashboardData } from "@/app/utils/loadDashboardData"; // Import the data loader
import { RiFocus2Line } from "react-icons/ri";
import ProfileLink from "@/app/components/ProfileLink";
import { PiExam } from "react-icons/pi";
import { MdOutlineAssignment } from "react-icons/md";
export default function Dashboard() {
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [exams, setExams] = useState([]);
    const [user, setUser] = useState({});
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: "" });
    const [assignments, setAssignments] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [editingCourse, setEditingCourse] = useState(null);
    const [studyGroups, setStudyGroups] = useState([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState({ title: "", description: "" });
    const [pendingInvitations, setPendingInvitations] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await loadDashboardData();
            console.log("Dashboard data loaded:", data); // Debug log
            if (data) {
                setCourses(data.courses);
                setTopics(data.topics);
                setExams(data.exams);
                setUser(data.user);
                setAssignments(data.assignments || []);
                setLessons(data.lessons || []);
                setStudyGroups(data.studyGroups || []);
                setPendingInvitations(data.pendingInvitations || []);
                console.log("Study groups:", data.studyGroups); // Debug log
            }
        };

        fetchData();
    }, []);

    const handleSubmitCourse = async (e) => {
        e.preventDefault();
        
        if (editingCourse) {
            // Update existing course
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
            // Create new course (existing code)
            const { data, error } = await supabase
                .from('Courses')
                .insert([{ title: newCourse.title, id: uuidv4(), uid: user.id }])
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
        setIsAddingCourse(true); // We'll reuse the modal
        setNewCourse({ title: course.title });
    };

    const handleDeleteClick = async (courseId) => {
         {
            try {
                const { error } = await supabase
                    .from('Courses')
                    .delete()
                    .eq('id', courseId);

                if (error) throw error;

                // Update local state
                setCourses(courses.filter(course => course.id !== courseId));
            } catch (error) {
                console.error('Error deleting course:', error);
                alert('Failed to delete course');
            }
        }
    };

    const getUnfinishedCounts = (courseId) => {
        // Get topics for this course
        const courseTopics = topics.filter(topic => topic.course_id === courseId);
        const topicIds = courseTopics.map(topic => topic.id);

        // Count unfinished assignments
        const unfinishedAssignments = assignments.filter(assignment => 
            topicIds.includes(assignment.topicId) && 
            (assignment.status === 0 || assignment.status === 1)
        ).length;

        // Count unfinished lessons/notes
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

        // Insert new group into Groups table
        const { data: groupData, error: groupError } = await supabase
            .from("Groups")
            .insert([{ title: newGroup.title, description: newGroup.description }])
            .select();

        if (groupError) {
            console.error("Error creating group:", groupError);
            alert("Failed to create group");
            return;
        }

        const createdGroup = groupData[0];

        // Automatically add the creator as a member of this group
        const { error: memberError } = await supabase
            .from("GroupMembers")
            .insert([{
                group_id: createdGroup.id,
                user_id: user.id,
                username: user.email,
                avatar_url: user.user_metadata?.avatar_url || null,
            }]);
        if (memberError) {
            console.error("Error adding creator to group members:", memberError);
        }

        setStudyGroups([...studyGroups, createdGroup]);
        setNewGroup({ title: "", description: "" });
        setIsCreatingGroup(false);
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

    return (
        <div className="p-4 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <h1 className="text-4xl font-bold m-4 mb-6 align-middle text-center">Courses</h1>
                    <button onClick={() => setIsAddingCourse(true)} className="p-2 flex items-center justify-center">
                        <AiOutlinePlus className="text-xl text-gray-500 bold hover:text-gray-700" />
                    </button>
                </div>

                <div>
                    <Link href="/lsession" className="underline bold absolute top-4 right-20 text-5xl ">
                        <RiFocus2Line />
                    </Link>
                </div>
            </div>

            <ul className="flex-wrap flex-row flex gap-4">
                {courses.map((course) => {
                    const counts = getUnfinishedCounts(course.id);
                    return (
                        <Card key={course.id} className="mb-2 flex flex-col relative group">
                            <div className="w-fit">
                                <Link href={`/course/${course.title}`} className="mr-4 text-xl font-bold">
                                    {course.title}
                                </Link>
                                <div className="text-sm text-gray-600 mt-2 flex gap-2"><MdOutlineAssignment className="text-xl" alt="assignment"/>
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
                })}
                
                {/* Empty state card for courses */}
                {courses.length === 0 && (
                    <Card className="mb-2 flex flex-col justify-center items-center p-6 min-w-[250px] border-2 border-dashed border-gray-300 bg-gray-50">
                        <div className="text-center space-y-3">
                            <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
                            <p className="text-sm text-gray-500">
                                Click the + button above to create your first course
                            </p>
                        </div>
                    </Card>
                )}
            </ul>
            {/* Study Groups Section */}
            <div className="flex justify-between items-center mt-8">
                <h2 className="text-4xl font-bold m-4 mb-6">Study Groups</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {studyGroups.length} groups joined
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
            <ul className="flex flex-wrap gap-4">
                {studyGroups.map((group) => (
                    <Card key={group.id} className="mb-2 flex flex-col p-4 min-w-[200px]">
                        <Link href={`/study-group/${group.id}`} className="text-xl font-bold mb-2">
                            {group.title}
                        </Link>
                        <p className="text-gray-600 text-sm">{group.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                            Joined {new Date(group.created_at).toLocaleDateString()}
                        </p>
                    </Card>
                ))}
                {studyGroups.length === 0 && (
                    <Card className="mb-2 flex flex-col justify-center items-center p-6 min-w-[250px] border-2 border-dashed border-gray-300 bg-gray-50">
                        <h3 className="text-lg font-medium text-gray-700">
                            You haven't joined any study group yet
                        </h3>
                        <p className="text-sm text-gray-500">Join a study group to collaborate with peers.</p>
                    </Card>
                )}
            </ul>
            <ProfileLink />
            <div className="calendar-container">
                <Calendar exam={exams} />
            </div>

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
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                                {editingCourse ? 'Save Changes' : 'Add Course'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleInvitationResponse(invitation.id, invitation.group_id, false)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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
