import React, { useState, useEffect } from "react";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  Search,
  FileText,
  CheckCircle,
  Clock,
  ArrowLeft,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import LogoLoader from "../LogoLoader";

// ==========================================
// 1. READ-ONLY EDITOR (For the Teacher)
// ==========================================
function ReadOnlyEditor() {
  const provider = useHocuspocusProvider();

  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: provider.document.getXmlFragment("document-store"),
      user: {
        name: "Teacher (Grading)",
        color: "#6366f1",
      },
    },
  });

  return <BlockNoteView editor={editor} editable={false} theme="light" />;
}

// ==========================================
// 2. GRADING WORKSPACE DASHBOARD
// ==========================================
function GroupGradingDashboard({ groupId, onBack }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const wsURL = import.meta.env.VITE_WS_URL;
  const url = `${wsURL}/collaboration`;

  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGradingData = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/workspace/grading?groupId=${groupId}`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          setGroupData(data);

          if (data.submission) {
            setGrade(data.submission.grade || "");
            setFeedback(data.submission.feedback || "");
          }
        } else {
          toast.error("Failed to load group data.");
        }
      } catch (error) {
        console.error("Error fetching grading data:", error);
        toast.error("Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchGradingData();
  }, [groupId, API_URL]);

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/workspace/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: groupId,
          grade: parseFloat(grade),
          feedback: feedback,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Grade saved successfully!");
        setGroupData((prev) => ({
          ...prev,
          submission: data.submission,
        }));
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to save grade.");
      }
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error("Network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading workspace...
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <p>Group not found.</p>
        <Button onClick={onBack}>Return to Directory</Button>
      </div>
    );
  }

  const isSubmitted = groupData.status === "SUBMITTED";

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-[18px] font-semibold text-gray-800 border-l pl-3 ml-1">
            {groupData?.experimentTitle || `Group ${groupId} Workspace`}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: The Read-Only Document */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {!isSubmitted && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm z-20">
              <Clock className="w-4 h-4" />
              Viewing live work. This group has not officially submitted yet.
            </div>
          )}
          <div className="mx-auto bg-white shadow-md border border-gray-200 p-10 min-h-[1056px] w-[816px]">
            <HocuspocusProviderWebsocketComponent url={url}>
              <HocuspocusRoom name={`group-${groupId}`}>
                <ReadOnlyEditor />
              </HocuspocusRoom>
            </HocuspocusProviderWebsocketComponent>
          </div>
        </div>

        {/* RIGHT PANEL: Grading & Members Sidebar */}
        <div className="w-[400px] bg-white border-l border-gray-200 overflow-y-auto flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
          <div className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Group Members
            </h3>
            <div className="space-y-3">
              {groupData.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 border"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {member.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {member.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="p-6 flex-1">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Evaluation
            </h3>

            {!isSubmitted && (
              <p className="text-sm text-muted-foreground mb-4">
                Note: You can grade this assignment early, but the group is
                still marked as Active.
              </p>
            )}

            <form onSubmit={handleSaveGrade} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Score / Grade
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 95"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="text-lg font-semibold"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Feedback
                </label>
                <textarea
                  placeholder="Provide constructive feedback for the group..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full min-h-[150px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Grade & Feedback"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. MAIN DIRECTORY MANAGER
// ==========================================
export default function SubmissionsDirectory() {
  const API_URL = import.meta.env.VITE_API_URL;

  // This state controls which view we see.
  // null = Directory Table. number = BlockNote Workspace
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // We only need to fetch the directory if we are looking at it
    if (selectedGroupId !== null) return;

    const fetchGroups = async () => {
      try {
        const response = await fetch(`${API_URL}/api/workspace/directory`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setGroups(data);
        } else {
          toast.error("Failed to load directory.");
        }
      } catch (error) {
        console.error("Error fetching directory:", error);
        toast.error("Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [API_URL, selectedGroupId]);

  // If a group is selected, render the Dashboard view instead
  if (selectedGroupId !== null) {
    return (
      <GroupGradingDashboard
        groupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
      />
    );
  }

  // Filter groups safely using member.name
  const filteredGroups = groups.filter((group) => {
    const searchLower = searchQuery.toLowerCase();
    const groupMatch = `group ${group.id}`.includes(searchLower);
    const memberMatch = group.members?.some((m) =>
      m.name?.toLowerCase().includes(searchLower),
    );
    return groupMatch || memberMatch;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center w-full">
        <LogoLoader size="sm"/>
      </div>
    );
  }

  return (
    <div className="w-full m-6 p-8 font-sans">
      <div className=" space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Lab Submissions
            </h1>
            <p className="text-sm text-muted-foreground">
              Overview of all group workspaces
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student or group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4">Lab Group</th>
                <th className="px-6 py-4">Members</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No groups found.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const isSubmitted = group.status === "SUBMITTED";
                  const hasGrade =
                    group.submission && group.submission.grade !== null;

                  return (
                    <tr
                      key={group.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        Group {group.id}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex -space-x-2 overflow-hidden">
                          {group.members?.map((member) => (
                            <Avatar
                              key={member.id}
                              className="inline-block border-2 border-white h-8 w-8"
                              title={member.name}
                            >
                              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                                {member.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {group.members?.length || 0} students
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isSubmitted ? (
                          <Badge
                            variant="default"
                            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none flex w-fit items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Submitted
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none flex w-fit items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> Active
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {hasGrade ? (
                          <span className="text-indigo-600">
                            {group.submission.grade} / 100
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          onClick={() => setSelectedGroupId(group.id)} // THIS IS THE TRIGGER
                          variant={hasGrade ? "outline" : "default"}
                          size="sm"
                          className="flex items-center gap-2 ml-auto"
                        >
                          <FileText className="w-4 h-4" />
                          {hasGrade ? "Review" : "Open Workspace"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
