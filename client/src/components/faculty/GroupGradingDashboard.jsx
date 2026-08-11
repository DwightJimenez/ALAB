import React, { useState, useEffect } from "react";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusProvider,
  useHocuspocusAwareness,
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
  SlidersHorizontal,
  Table as TableIcon,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import LogoLoader from "../LogoLoader";

// ==========================================
// CUSTOM HOOK: Read Hidden Yjs Metadata
// ==========================================
function useDocumentMetadata() {
  const provider = useHocuspocusProvider();
  const [meta, setMeta] = useState({ totalActiveTimeMs: 0, lastActiveUser: null });

  useEffect(() => {
    if (!provider?.document) return;
    const metadataMap = provider.document.getMap("metadata");

    const updateState = () => {
      setMeta({
        totalActiveTimeMs: metadataMap.get("totalActiveTimeMs") || 0,
        lastActiveUser: metadataMap.get("lastActiveUser"),
      });
    };

    updateState();
    metadataMap.observe(updateState);

    return () => metadataMap.unobserve(updateState);
  }, [provider]);

  return meta;
}

// Utility to format milliseconds into HH:MM:SS or MM:SS
function formatTotalTime(ms) {
  if (!ms || ms === 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

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

  return <BlockNoteView editor={editor} editable={false} theme='light' />;
}

// ==========================================
// 2. WORKSPACE ACTIVITY WIDGET
// ==========================================
function WorkspaceActivityIndicator() {
  const { totalActiveTimeMs, lastActiveUser } = useDocumentMetadata();

  return (
    <div className='bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6 shadow-sm'>
      <h3 className='text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2'>
        <Timer className='w-4 h-4 text-indigo-500' />
        Total Time Spent
      </h3>
      <div>
        <p className='text-xl font-black text-slate-800 tracking-tight'>
          {formatTotalTime(totalActiveTimeMs)}
        </p>
        {lastActiveUser && (
          <p className='text-xs text-slate-500 mt-1'>
            Last edit by <span className='font-medium text-slate-700'>{lastActiveUser}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. LIVE MEMBER LIST COMPONENT
// ==========================================
function LiveMemberList({ members }) {
  const awarenessStates = useHocuspocusAwareness();

  const activeIdentifiers = awarenessStates
    .map((state) => state.user?.name || state.user?.id)
    .filter((identifier) => identifier && identifier !== "Teacher (Grading)");

  return (
    <div className='space-y-3'>
      {members?.map((member) => {
        const isOnline = activeIdentifiers.includes(member.name) || activeIdentifiers.includes(member.id);

        return (
          <div key={member.id} className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isOnline ? 'bg-emerald-50/30 border-emerald-100' : 'bg-muted/20'}`}>
            <div className='flex items-center gap-3'>
              <div className="relative">
                <Avatar className='h-8 w-8'>
                  <AvatarFallback className={`text-xs ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {member.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" title="Online" />
                )}
              </div>
              <div className='flex flex-col overflow-hidden'>
                <span className='text-sm font-medium truncate'>{member.name}</span>
                <span className='text-xs text-muted-foreground truncate'>{member.email}</span>
              </div>
            </div>
            
            {isOnline && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] uppercase px-1.5 py-0 tracking-wider">
                Active
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 4. GRADING WORKSPACE DASHBOARD
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
  const [rubricScores, setRubricScores] = useState({});

  useEffect(() => {
    const fetchGradingData = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/workspace/grading?groupId=${groupId}`,
          { credentials: "include" },
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

  const handleRubricScoreChange = (compIndex, score, criteriaComponents) => {
    const newScores = { ...rubricScores, [compIndex]: score };
    setRubricScores(newScores);

    if (criteriaComponents && criteriaComponents.length > 0) {
      const maxTotal = criteriaComponents.length * 5;
      const currentTotal = Object.values(newScores).reduce(
        (sum, val) => sum + val,
        0,
      );

      const calculatedGrade = ((currentTotal / maxTotal) * 100).toFixed(1);
      setGrade(
        calculatedGrade.endsWith(".0")
          ? calculatedGrade.slice(0, -2)
          : calculatedGrade,
      );
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    const rubricCriteria = groupData?.assignment?.template?.criteria || null;

    if (
      rubricCriteria &&
      Object.keys(rubricScores).length < rubricCriteria.components.length
    ) {
      toast.error("Please score all rubric criteria before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/workspace/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupCode: groupId,
          grade: parseFloat(grade),
          feedback: feedback,
          rubricScores: rubricScores,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Grade and rubric evaluation saved successfully!");
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

  if (loading) return <div className='flex h-screen items-center justify-center'><LogoLoader size='sm' /></div>;

  if (!groupData) {
    return (
      <div className='flex flex-col h-screen items-center justify-center gap-4'>
        <p>Group not found.</p>
        <Button onClick={onBack}>Return to Directory</Button>
      </div>
    );
  }

  const isSubmitted = groupData.status === "SUBMITTED";
  const rubricCriteria = groupData?.assignment?.template?.criteria || null;

  return (
    <div className='flex flex-col h-screen bg-[#F8F9FA] overflow-hidden font-sans'>
      <div className='flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={onBack}>
            <ArrowLeft className='h-5 w-5' />
          </Button>
          <span className='text-[18px] font-semibold text-gray-800 border-l pl-3 ml-1'>
            {groupData?.assignment?.template?.title || `Group ${groupId} Workspace`}
          </span>
        </div>
      </div>

      <HocuspocusProviderWebsocketComponent url={url}>
        <HocuspocusRoom name={`group-${groupId}`}>
          <div className='flex flex-1 overflow-hidden'>
            <div className='flex-1 overflow-y-auto p-8 relative'>
              {!isSubmitted && (
                <div className='absolute top-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm z-20'>
                  <Clock className='w-4 h-4' />
                  Viewing live work. This group has not officially submitted yet.
                </div>
              )}
              <div className='mx-auto bg-white shadow-md border border-gray-200 p-10 min-h-[1056px] w-[816px]'>
                <ReadOnlyEditor />
              </div>
            </div>

            <div className='w-[450px] bg-white border-l border-gray-200 overflow-y-auto flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]'>
              <div className='p-6 pb-4'>
                <h3 className='text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2'>
                  <Users className='w-4 h-4' />
                  Group Members
                </h3>
                <LiveMemberList members={groupData.members} />
                
                {/* TIMER ACTIVITY COMPONENT */}
                <WorkspaceActivityIndicator />
              </div>

              <Separator />

              <div className='p-6 flex-1'>
                {rubricCriteria && rubricCriteria.components && (
                  <div className='mb-8 space-y-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <h3 className='text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2'>
                        <SlidersHorizontal className='w-4 h-4 text-indigo-600' />
                        Rubric: {rubricCriteria.name}
                      </h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1.5 px-2">
                            <TableIcon className="w-3.5 h-3.5" /> Full Table
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl w-full bg-white p-6 max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl">Rubric Criteria Matrix: {rubricCriteria.name}</DialogTitle>
                          </DialogHeader>
                          <div className="overflow-x-auto mt-4 rounded-md border">
                            <Table className="w-full min-w-[800px]">
                              <TableHeader className="bg-slate-100">
                                <TableRow>
                                  <TableHead className="font-bold border-r w-[22%]">Criteria</TableHead>
                                  <TableHead className="font-bold border-r text-center bg-emerald-50 text-emerald-800 w-[15.6%]">5 - Excellent</TableHead>
                                  <TableHead className="font-bold border-r text-center bg-blue-50 text-blue-800 w-[15.6%]">4 - Good</TableHead>
                                  <TableHead className="font-bold border-r text-center bg-amber-50 text-amber-800 w-[15.6%]">3 - Average</TableHead>
                                  <TableHead className="font-bold border-r text-center bg-orange-50 text-orange-800 w-[15.6%]">2 - Fair</TableHead>
                                  <TableHead className="font-bold text-center bg-red-50 text-red-800 w-[15.6%]">1 - Poor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rubricCriteria.components.map((comp, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium border-r text-xs text-slate-900 bg-slate-50/50 align-top">
                                      <p className="font-bold">{comp.name}</p>
                                    </TableCell>
                                    <TableCell className="border-r text-xs text-slate-700 align-top bg-emerald-50/25">
                                      {comp.ratings?.[5] || "N/A"}
                                    </TableCell>
                                    <TableCell className="border-r text-xs text-slate-700 align-top bg-blue-50/25">
                                      {comp.ratings?.[4] || "N/A"}
                                    </TableCell>
                                    <TableCell className="border-r text-xs text-slate-700 align-top bg-amber-50/25">
                                      {comp.ratings?.[3] || "N/A"}
                                    </TableCell>
                                    <TableCell className="border-r text-xs text-slate-700 align-top bg-orange-50/25">
                                      {comp.ratings?.[2] || "N/A"}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-700 align-top bg-red-50/25">
                                      {comp.ratings?.[1] || "N/A"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className='space-y-4'>
                      {rubricCriteria.components.map((comp, idx) => (
                        <div key={idx} className='border rounded-md p-3 bg-slate-50/50 shadow-sm'>
                          <p className='text-xs font-semibold text-slate-800 mb-2 leading-snug'>{comp.name}</p>
                          <div className='flex gap-1 mb-2'>
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type='button'
                                onClick={() => handleRubricScoreChange(idx, score, rubricCriteria.components)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${
                                  rubricScores[idx] === score
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                          {rubricScores[idx] && comp.ratings[rubricScores[idx]] && (
                            <div className='text-[11px] text-slate-600 bg-white p-2 rounded border border-dashed border-indigo-200 mt-2 animate-in fade-in zoom-in-95 duration-200'>
                              <span className='font-semibold text-indigo-700'>Level {rubricScores[idx]}:</span> {comp.ratings[rubricScores[idx]]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className='text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2'>
                  <CheckCircle className='w-4 h-4 text-emerald-600' />
                  Evaluation
                </h3>

                {!isSubmitted && (
                  <p className='text-sm text-muted-foreground mb-4 bg-amber-50 p-3 rounded border border-amber-100'>
                    Note: You can grade this assignment early, but the group is still marked as Active.
                  </p>
                )}

                <form onSubmit={handleSaveGrade} className='space-y-5'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-foreground flex justify-between'>
                      <span>Overall Grade</span>
                      {rubricCriteria && <span className='text-xs text-indigo-600 font-normal'>Auto-calculated from rubric</span>}
                    </label>
                    <Input
                      type='number'
                      step='0.1'
                      min='0'
                      max='100'
                      placeholder='e.g. 95'
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      readOnly={!!rubricCriteria}
                      className={`text-lg font-bold h-12 ${rubricCriteria ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed select-none" : ""}`}
                      required
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-foreground'>Written Feedback</label>
                    <textarea
                      placeholder='Provide constructive feedback for the group...'
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className='w-full min-h-[150px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y'
                    />
                  </div>

                  <Button
                    type='submit'
                    className='w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base'
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Grade & Feedback"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </HocuspocusRoom>
      </HocuspocusProviderWebsocketComponent>
    </div>
  );
}

// ==========================================
// 5. DIRECTORY TABLE ROW
// ==========================================
function DirectoryTableRow({ group, onSelect }) {
  const wsURL = import.meta.env.VITE_WS_URL;
  const url = `${wsURL}/collaboration`;

  return (
    <HocuspocusProviderWebsocketComponent url={url}>
      <HocuspocusRoom name={`group-${group.joinCode}`}>
        <DirectoryRowContent group={group} onSelect={onSelect} />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}

function DirectoryRowContent({ group, onSelect }) {
  const awarenessStates = useHocuspocusAwareness();
  const { totalActiveTimeMs } = useDocumentMetadata();

  const activeIdentifiers = awarenessStates
    .map((state) => state.user?.name || state.user?.id)
    .filter((identifier) => identifier && identifier !== "Teacher (Grading)");

  const isSubmitted = group.status === "SUBMITTED";
  const hasGrade = group.submission && group.submission.grade !== null;

  const leader = group.members?.find((m) => m.GroupMember?.role === "LEADER" || m.role === "LEADER");
  const leaderName = leader ? leader.name : "Unknown Leader";

  return (
    <tr className='hover:bg-gray-50/50 transition-colors'>
      <td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap'>
        Group {group.joinCode}
      </td>

      <td className='px-6 py-4'>
        <div className='font-bold text-slate-800 line-clamp-2'>
          {group.assignment?.template?.title || "Unknown Experiment"}
        </div>
        <div className='text-xs text-slate-500 mt-1 font-medium bg-slate-100 w-fit px-2 py-0.5 rounded'>
          {group.assignment?.yearAndSection || "Unknown Section"}
        </div>
      </td>

      <td className='px-6 py-4'>
        <div className='flex -space-x-2 overflow-hidden'>
          {group.members?.map((member) => {
            const isOnline = activeIdentifiers.includes(member.name) || activeIdentifiers.includes(member.id);
            return (
              <div key={member.id} className="relative inline-block">
                <Avatar className='border-2 border-white h-8 w-8' title={member.name}>
                  <AvatarFallback className={`text-xs ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {member.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white z-10" title="Active in Workspace" />
                )}
              </div>
            );
          })}
        </div>
        <div className='flex flex-col text-xs font-medium text-gray-900 mt-2 truncate w-fit'>
          {leaderName}
          <span className='text-center text-muted-foreground font-normal'>(Leader)</span>
        </div>
      </td>

      <td className='px-6 py-4'>
        {isSubmitted ? (
          <Badge variant='default' className='bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none flex w-fit items-center gap-1'>
            <CheckCircle className='w-3 h-3' /> Submitted
          </Badge>
        ) : (
          <Badge variant='secondary' className='bg-amber-100 text-amber-800 hover:bg-amber-100 border-none flex w-fit items-center gap-1'>
            <Clock className='w-3 h-3' /> Active
          </Badge>
        )}
      </td>

      {/* NEW: Time Duration Column */}
      <td className='px-6 py-4'>
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 whitespace-nowrap bg-slate-100 px-2.5 py-1 rounded-md w-fit border">
          <Timer className="w-3.5 h-3.5 text-slate-500" />
          {formatTotalTime(totalActiveTimeMs)}
        </div>
      </td>

      <td className='px-6 py-4 font-medium'>
        {hasGrade ? (
          <span className='text-indigo-600 font-bold'>{group.submission.grade} / 100</span>
        ) : (
          <span className='text-muted-foreground'>—</span>
        )}
      </td>

      <td className='px-6 py-4 text-right'>
        <Button
          onClick={() => onSelect(group.joinCode)}
          variant={hasGrade ? "outline" : "default"}
          size='sm'
          className='flex items-center gap-2 ml-auto'
        >
          <FileText className='w-4 h-4' />
          {hasGrade ? "Review" : "Open"}
        </Button>
      </td>
    </tr>
  );
}

// ==========================================
// 6. MAIN DIRECTORY MANAGER
// ==========================================
export default function SubmissionsDirectory() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
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

  if (selectedGroupId !== null) {
    return (
      <GroupGradingDashboard
        groupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
      />
    );
  }

  const filteredGroups = groups.filter((group) => {
    const searchLower = searchQuery.toLowerCase();
    const groupMatch = `group ${group.id}`.includes(searchLower) || group.joinCode?.toLowerCase().includes(searchLower);
    const memberMatch = group.members?.some((m) => m.name?.toLowerCase().includes(searchLower));
    const assignmentMatch = group.assignment?.template?.title?.toLowerCase().includes(searchLower) || group.assignment?.yearAndSection?.toLowerCase().includes(searchLower);
    
    return groupMatch || memberMatch || assignmentMatch;
  });

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center w-full'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  return (
    <div className='w-full m-6 p-8 font-sans'>
      <div className='space-y-6'>
        {/* Header Section */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Lab Submissions</h1>
            <p className='text-sm text-muted-foreground'>
              Overview of workspaces for the classes you handle.
            </p>
          </div>

          {/* Search Bar */}
          <div className='relative w-72'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search student, group, or experiment...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className='bg-white border rounded-lg shadow-sm overflow-hidden'>
          <table className='w-full text-sm text-left'>
            <thead className='bg-gray-50 border-b text-xs uppercase text-muted-foreground font-semibold'>
              <tr>
                <th className='px-6 py-4'>Lab Group</th>
                <th className='px-6 py-4'>Experiment & Section</th>
                <th className='px-6 py-4'>Members</th>
                <th className='px-6 py-4'>Status</th>
                <th className='px-6 py-4'>Active Time</th>
                <th className='px-6 py-4'>Grade</th>
                <th className='px-6 py-4 text-right'>Action</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan='7' className='px-6 py-12 text-center text-muted-foreground'>
                    {searchQuery ? "No matching groups found." : "No groups have been formed in your sections yet."}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <DirectoryTableRow 
                    key={group.joinCode} 
                    group={group} 
                    onSelect={setSelectedGroupId} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}