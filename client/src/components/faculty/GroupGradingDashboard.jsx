import React, { useState, useEffect, useMemo } from "react";
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
  ArrowRight,
  Users,
  SlidersHorizontal,
  Table as TableIcon,
  Timer,
  MessageSquare,
  Star,
  X,
  Beaker,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  MonitorPlay,
  Maximize2
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
function GroupGradingDashboard({ groupId, onBack, isSidebarOpen, toggleSidebar }) {
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
            setGrade(data.submission.grade !== null ? data.submission.grade : "");
            setFeedback(data.submission.feedback || "");
            // CRITICAL FIX: Load previously saved rubric scores
            setRubricScores(data.submission.rubricScores || {});
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
      // Calculate grade automatically based on rubric points
      const maxTotal = criteriaComponents.reduce((sum, comp) => sum + (comp.maxScore || comp.points || 5), 0);
      const currentTotal = Object.values(newScores).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

      const calculatedGrade = ((currentTotal / maxTotal) * 100).toFixed(1);
      setGrade(calculatedGrade.endsWith(".0") ? calculatedGrade.slice(0, -2) : calculatedGrade);
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    const rubricCriteria = groupData?.assignment?.template?.criteria || null;

    if (rubricCriteria && Object.keys(rubricScores).length < rubricCriteria.components.length) {
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
        toast.success("Grade and feedback saved successfully!");
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

  if (loading) return <div className='flex h-full items-center justify-center bg-[#F8F9FA]'><LogoLoader size='sm' /></div>;

  if (!groupData) {
    return (
      <div className='flex flex-col h-full items-center justify-center gap-4 bg-[#F8F9FA] relative'>
        <Button onClick={onBack}>Close Dashboard</Button>
      </div>
    );
  }

  const rubricCriteria = groupData?.assignment?.template?.criteria || null;

  return (
    <div className='flex flex-col h-full bg-[#F8F9FA] overflow-hidden font-sans border-l relative'>
      <div className='flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10'>
        <div className='flex items-center gap-2'>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-slate-500 hover:text-slate-800 h-8 w-8 shrink-0">
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </Button>
          <Button variant='ghost' size='icon' onClick={onBack} className="h-8 w-8">
            <X className='h-4 w-4' />
          </Button>
          <span className='text-[16px] font-semibold text-gray-800 border-l pl-3'>
            Group {groupId} Workspace
          </span>
        </div>
      </div>

      <HocuspocusProviderWebsocketComponent url={url}>
        <HocuspocusRoom name={`group-${groupId}`}>
          <div className='flex flex-1 overflow-hidden'>
            {/* Document Side */}
            <div className='flex-1 overflow-y-auto p-8 relative'>
              <div className='mx-auto bg-white shadow-md border border-gray-200 p-10 min-h-[1056px] max-w-[816px]'>
                <ReadOnlyEditor />
              </div>
            </div>
            
            {/* Tools/Grading Sidebar */}
            <div className='w-[400px] bg-white border-l border-gray-200 overflow-y-auto flex flex-col'>
              <div className='p-6 pb-4'>
                <LiveMemberList members={groupData.members} />
                <WorkspaceActivityIndicator />
              </div>
              <Separator />
              <div className='p-6 flex-1'>
                <form onSubmit={handleSaveGrade} className='space-y-6'>
                  
                  {/* CRITICAL FIX: The Missing Rubric UI */}
                  {rubricCriteria && rubricCriteria.components && rubricCriteria.components.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rubric Scoring</h3>
                      {rubricCriteria.components.map((comp, index) => {
                        const maxPoints = comp.maxScore || comp.points || 5;
                        return (
                          <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold text-sm text-slate-800 leading-tight">
                                  {comp.name || `Criterion ${index + 1}`}
                                </div>
                                {comp.description && (
                                  <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    {comp.description}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded shrink-0 ml-2">
                                {rubricScores[index] || 0} / {maxPoints}
                              </div>
                            </div>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max={maxPoints}
                              value={rubricScores[index] ?? ""}
                              onChange={(e) => handleRubricScoreChange(index, parseFloat(e.target.value) || 0, rubricCriteria.components)}
                              placeholder={`Score out of ${maxPoints}`}
                              className="h-8 text-sm mt-2 bg-white"
                              required
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Feedback Textarea */}
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-foreground'>Feedback</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full min-h-[100px] p-3 text-sm border rounded-md border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                      placeholder="Add constructive feedback..."
                    />
                  </div>

                  {/* Overall Grade Input */}
                  <div className='space-y-2 pt-2 border-t'>
                    <label className='text-sm font-medium text-foreground'>Overall Grade</label>
                    <Input
                      type='number' step='0.1' min='0' max='100'
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      readOnly={!!rubricCriteria}
                      className={`text-lg font-bold h-12 ${rubricCriteria ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed select-none" : ""}`}
                      required
                    />
                    {rubricCriteria && (
                      <p className="text-[10px] text-slate-400 italic">
                        Grade is calculated automatically from the rubric scores.
                      </p>
                    )}
                  </div>
                  
                  <Button type='submit' className='w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base shadow-sm' disabled={isSaving}>
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
// 5. LIVE GALLERY VIEW (Zoom-like Feature)
// ==========================================

function GalleryThumbnailCard({ group, onSelect }) {
  const wsURL = import.meta.env.VITE_WS_URL;
  const url = `${wsURL}/collaboration`;

  return (
    <HocuspocusProviderWebsocketComponent url={url}>
      <HocuspocusRoom name={`group-${group.joinCode}`}>
        <ThumbnailContent group={group} onSelect={onSelect} />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}

function ThumbnailContent({ group, onSelect }) {
  const awarenessStates = useHocuspocusAwareness();
  const activeIdentifiers = awarenessStates
    .map((state) => state.user?.name || state.user?.id)
    .filter((id) => id && id !== "Teacher (Grading)");
  
  const isOnline = activeIdentifiers.length > 0;

  return (
    <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all duration-200 relative group/thumb cursor-pointer h-72">
      
      {/* Live Indicator overlay */}
      {isOnline && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-emerald-500 text-white px-2 py-1 rounded shadow-sm text-[10px] font-bold uppercase tracking-wider animate-in fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Live
        </div>
      )}

      {/* FIXED: Removed pointer-events-none from this wrapper div */}
      <div 
        className="relative flex-1 overflow-hidden bg-slate-50 cursor-pointer" 
        onClick={() => onSelect(group.joinCode)}
      >
        {/* We make the container 200% width/height, scale it to 50%, and origin top-left to create a perfect thumbnail */}
        {/* pointer-events-none STAYS here so the editor text isn't clickable */}
        <div className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50 opacity-90 p-6 pointer-events-none">
          <ReadOnlyEditor />
        </div>

        {/* Hover Overlay with Button */}
        <div className="absolute inset-0 bg-slate-900/0 group-hover/thumb:bg-slate-900/5 transition-colors flex items-center justify-center">
          <Button 
            className="opacity-0 group-hover/thumb:opacity-100 transition-opacity translate-y-4 group-hover/thumb:translate-y-0 duration-200 bg-indigo-600 hover:bg-indigo-700" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onSelect(group.joinCode); 
            }}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Focus Workspace
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between shrink-0" onClick={() => onSelect(group.joinCode)}>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800">Group {group.joinCode}</span>
          <span className="text-[10px] text-slate-500 uppercase font-semibold">{group.members?.length || 0} Members</span>
        </div>
        <div className="flex -space-x-2">
          {group.members?.slice(0, 3).map((member) => (
             <Avatar key={member.id} className='border-2 border-white h-7 w-7'>
               <AvatarFallback className={`text-[10px] ${activeIdentifiers.includes(member.name) || activeIdentifiers.includes(member.id) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                 {member.name?.charAt(0)}
               </AvatarFallback>
             </Avatar>
          ))}
          {group.members?.length > 3 && (
            <div className="h-7 w-7 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{group.members.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveGalleryDashboard({ data, onBack, onSelectGroup }) {
  const { experiment, section, groups } = data;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] overflow-hidden relative">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 h-9" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Grid
          </Button>
          <Separator orientation="vertical" className="h-6 bg-slate-700" />
          <div className="flex flex-col">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MonitorPlay className="w-5 h-5 text-indigo-400" /> Live Gallery View
            </h2>
            <p className="text-xs text-slate-400 font-medium">{section} • {experiment}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-200">{groups.length} Workspaces Active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {groups.map((group) => (
            <GalleryThumbnailCard key={group.joinCode} group={group} onSelect={onSelectGroup} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. EXPERIMENT OVERVIEW (Card Grid)
// ==========================================
function ExperimentOverview({ data, onSelectGroup, isSidebarOpen, toggleSidebar, onOpenGallery }) {
  const { experiment, section, groups } = data;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const lowerQuery = searchQuery.toLowerCase();
    
    return groups.filter((group) => {
      const matchGroupCode = group.joinCode?.toLowerCase().includes(lowerQuery);
      const matchMember = group.members?.some((m) => m.name?.toLowerCase().includes(lowerQuery));
      return matchGroupCode || matchMember;
    });
  }, [groups, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] overflow-y-auto relative">
      <div className="bg-white px-8 py-6 border-b border-slate-200 shadow-sm shrink-0 flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-slate-500 hover:text-slate-800 h-8 w-8 shrink-0 -ml-2" title="Toggle Sidebar">
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </Button>
        
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-slate-500 text-sm font-medium mb-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                {section}
              </Badge>
              <span>•</span>
              <span>{groups.length} Groups</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-indigo-500" />
              {experiment}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student or group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 shadow-sm"
              />
            </div>
            <Button onClick={onOpenGallery} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2">
              <MonitorPlay className="w-4 h-4" /> Live Gallery
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {filteredGroups.length === 0 ? (
           <div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-12">
             <Users className="w-12 h-12 opacity-20" />
             <p className="text-sm font-medium text-slate-500">No students or groups match your search.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGroups.map((group) => (
              <GroupCard key={group.joinCode} group={group} onSelect={onSelectGroup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, onSelect }) {
  // Same Group Card functionality as provided in original code
  const wsURL = import.meta.env.VITE_WS_URL;
  const url = `${wsURL}/collaboration`;

  return (
    <HocuspocusProviderWebsocketComponent url={url}>
      <HocuspocusRoom name={`group-${group.joinCode}`}>
        <GroupCardContent group={group} onSelect={onSelect} />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}

function GroupCardContent({ group, onSelect }) {
  const awarenessStates = useHocuspocusAwareness();
  const { totalActiveTimeMs } = useDocumentMetadata();

  const activeIdentifiers = awarenessStates
    .map((state) => state.user?.name || state.user?.id)
    .filter((identifier) => identifier && identifier !== "Teacher (Grading)");

  const isOnline = activeIdentifiers.length > 0;
  const isSubmitted = group.status === "SUBMITTED";
  const hasGrade = group.submission && group.submission.grade !== null;

  return (
    <div 
      onClick={() => onSelect(group.joinCode)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col h-full relative group/card"
    >
      {isOnline && (
        <div className="absolute top-0 right-0 -mt-1.5 -mr-1.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800">Group {group.joinCode}</h4>
          <div className="flex items-center gap-1 mt-1">
            {isSubmitted ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-0">Submitted</Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-0">Active</Badge>
            )}
          </div>
        </div>
        
        {hasGrade ? (
          <div className="text-center">
            <div className="text-2xl font-black text-indigo-600 leading-none">{group.submission.grade}</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Grade</div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
            <FileText className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex-1 mt-2">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Members</p>
        <div className="flex -space-x-2 overflow-hidden">
          {group.members?.map((member) => {
            const isMemberOnline = activeIdentifiers.includes(member.name) || activeIdentifiers.includes(member.id);
            return (
              <Avatar key={member.id} className='border-2 border-white h-8 w-8' title={member.name}>
                <AvatarFallback className={`text-xs ${isMemberOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {member.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )
          })}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" />
          {formatTotalTime(totalActiveTimeMs)}
        </div>
        <div className="flex items-center text-indigo-600 group-hover/card:text-indigo-700 font-semibold transition-colors">
          Review <ArrowRight className="w-3 h-3 ml-1" />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. MAIN DIRECTORY MANAGER (Sidebar Layout)
// ==========================================
export default function SubmissionsDirectory() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [isGalleryMode, setIsGalleryMode] = useState(false); // Track if gallery mode is active
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
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
  }, [API_URL]);

  const treeData = useMemo(() => {
    const filteredGroups = groups.filter((group) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      const groupMatch = `group ${group.id}`.includes(searchLower) || group.joinCode?.toLowerCase().includes(searchLower);
      const memberMatch = group.members?.some((m) => m.name?.toLowerCase().includes(searchLower));
      const assignmentMatch = group.assignment?.template?.title?.toLowerCase().includes(searchLower) || group.assignment?.yearAndSection?.toLowerCase().includes(searchLower);
      
      return groupMatch || memberMatch || assignmentMatch;
    });

    const tree = {};
    filteredGroups.forEach((group) => {
      const subject = group.assignment?.template?.subject?.name || group.assignment?.subject?.name || "General Subject";
      const section = group.assignment?.yearAndSection || "Unassigned Section";
      const experiment = group.assignment?.template?.title || "Unnamed Experiment";

      if (!tree[subject]) tree[subject] = {};
      if (!tree[subject][section]) tree[subject][section] = {};
      if (!tree[subject][section][experiment]) tree[subject][section][experiment] = [];

      tree[subject][section][experiment].push(group);
    });

    return tree;
  }, [groups, searchQuery]);

  if (loading) return <div className='flex h-screen items-center justify-center w-full'><LogoLoader size='sm' /></div>;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      
      {/* SIDEBAR (Navigation) */}
      {isSidebarOpen && !isGalleryMode && !selectedGroupId && (
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-200 flex flex-col gap-4 shrink-0 bg-white">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Lab Workspaces</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search classes or experiments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {Object.keys(treeData).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">No active groups yet.</div>
            ) : (
              Object.entries(treeData).map(([subject, sections]) => (
                <div key={subject} className="mb-6">
                  <div className="px-5 py-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{subject}</h3></div>
                  {Object.entries(sections).map(([section, experiments]) => (
                    <div key={section} className="mb-2">
                      <div className="px-5 py-1.5 mb-1 bg-slate-100/50"><h4 className="text-sm font-semibold text-slate-800">{section}</h4></div>
                      <div>
                        {Object.entries(experiments).map(([experiment, groupList]) => {
                          const isSelectedExperiment = selectedExperiment?.experiment === experiment && selectedExperiment?.section === section;

                          return (
                            <button
                              key={experiment}
                              onClick={() => {
                                setSelectedExperiment({ subject, section, experiment, groups: groupList });
                                setSelectedGroupId(null);
                                setIsGalleryMode(false);
                              }}
                              className={`w-full flex items-center justify-between px-5 py-2.5 hover:bg-slate-100 text-left transition-colors border-l-2 ${isSelectedExperiment ? "bg-indigo-50 border-indigo-500 text-indigo-900" : "border-transparent text-slate-700"}`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Beaker className={`w-4 h-4 shrink-0 ${isSelectedExperiment ? "text-indigo-500" : "text-slate-400"}`} />
                                <span className="text-sm font-medium truncate">{experiment}</span>
                              </div>
                              <Badge variant="secondary" className={`text-[10px] ml-2 shrink-0 ${isSelectedExperiment ? "bg-indigo-100 text-indigo-700" : ""}`}>
                                {groupList.length}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT PANE */}
      <div className="flex-1 bg-white relative flex flex-col h-full">
        {selectedGroupId ? (
          <GroupGradingDashboard
            groupId={selectedGroupId}
            isSidebarOpen={isSidebarOpen && !isGalleryMode}
            toggleSidebar={toggleSidebar}
            onBack={() => { setSelectedGroupId(null); }}
          />
        ) : isGalleryMode && selectedExperiment ? (
          <LiveGalleryDashboard
            data={selectedExperiment}
            onBack={() => setIsGalleryMode(false)}
            onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
          />
        ) : selectedExperiment ? (
          <ExperimentOverview 
            data={selectedExperiment}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
            onOpenGallery={() => setIsGalleryMode(true)}
          />
        ) : (
          <div className="flex flex-col h-full items-center justify-center text-slate-400 gap-4 bg-[#F8F9FA] relative">
            <div className="absolute top-4 left-4 z-10">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-slate-500 hover:text-slate-800 h-8 w-8 bg-white/50 border border-slate-200 shadow-sm" title="Toggle Sidebar">
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
              </Button>
            </div>
            <FileText className="w-16 h-16 opacity-20" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-600">No Experiment Selected</h3>
              <p className="text-sm">Select an experiment from the sidebar to view its groups</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}