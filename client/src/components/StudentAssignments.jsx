import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

import { toast } from "sonner";
import { io } from "socket.io-client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const StudentAssignments = () => {
  const { user } = useSelector((state) => state.auth);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExperiment, setActiveExperiment] = useState(null);
  const [files, setFiles] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef(null);
  const [labGroup, setLabGroup] = useState(null);
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [joinPin, setJoinPin] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;
  const SOCKET_URL = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;

  const editor = useCreateBlockNote();

  const getDisplayName = (memberObj) => {
    if (!memberObj) return "Student";
    if (memberObj.firstName)
      return `${memberObj.firstName} ${memberObj.lastName || ""}`.trim();
    return memberObj.name || memberObj.username || memberObj.email || "Student";
  };

  const syncGroupState = async (experimentId) => {
    try {
      const res = await fetch(`${API_URL}/api/group/my-group/${experimentId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const dbGroup = await res.json();
        if (dbGroup) {
          setLabGroup(dbGroup);
          localStorage.setItem(
            `labGroup_${experimentId}`,
            JSON.stringify(dbGroup),
          );
        }
      }
    } catch (error) {
      console.error("Failed to sync true group state", error);
    }
  };

  useEffect(() => {
    if (!user || !user.section || !user.year) {
      setLoading(false);
      return;
    }

    const yearAndSection = `${user.year} - ${user.section}`;

    const fetchAssignments = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/experiments/assignments/${yearAndSection}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const data = await response.json();
          setAssignments(data);
        }
      } catch (error) {
        toast.error("Failed to load assignments");
        console.error("Failed to load assignments", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  useEffect(() => {
    const initExperiment = async () => {
      if (!activeExperiment) return;

      if (activeExperiment.template.instructionsHTML) {
        const blocks = await editor.tryParseHTMLToBlocks(
          activeExperiment.template.instructionsHTML,
        );
        editor.replaceBlocks(editor.document, blocks);
      }

      setFiles([]);
      setIsSubmitted(false);
      setIsJoinMode(false);
      setJoinPin("");

      let initialGroup = null;
      const savedGroupStr = localStorage.getItem(
        `labGroup_${activeExperiment.id}`,
      );

      if (savedGroupStr) {
        initialGroup = JSON.parse(savedGroupStr);
      }

      if (activeExperiment.template.isGroupSubmission) {
        if (initialGroup && initialGroup.status === "FORMING") {
          try {
            const res = await fetch(
              `${API_URL}/api/group/lobby/${initialGroup.joinCode}`,
              { credentials: "include" },
            );
            if (res.ok) {
              const liveLobby = await res.json();
              setLabGroup(liveLobby);
            } else {
              setLabGroup(null);
              localStorage.removeItem(`labGroup_${activeExperiment.id}`);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          await syncGroupState(activeExperiment.id);
        }
      } else {
        setLabGroup(null);
      }
    };

    initExperiment();
  }, [activeExperiment, editor]);

  useEffect(() => {
    if (activeExperiment) {
      if (labGroup) {
        localStorage.setItem(
          `labGroup_${activeExperiment.id}`,
          JSON.stringify(labGroup),
        );
      } else {
        localStorage.removeItem(`labGroup_${activeExperiment.id}`);
      }
    }
  }, [labGroup, activeExperiment]);

  useEffect(() => {
    if (!labGroup || !labGroup.joinCode || labGroup.status !== "FORMING")
      return;

    console.log("Connecting to WebSocket at:", SOCKET_URL);
    const socket = io(SOCKET_URL, { withCredentials: true });

    socket.on("connect", () => {
      console.log("Socket connected! Joining room:", labGroup.joinCode);
      socket.emit("join_lobby_room", labGroup.joinCode);
    });

    socket.on("lobby_updated", (updatedLobbyData) => {
      console.log("SOCKET: User joined/left!", updatedLobbyData);
      setLabGroup((prev) => ({ ...prev, members: updatedLobbyData.members }));
    });

    socket.on("group_locked", (data) => {
      setLabGroup((prev) => ({
        ...prev,
        id: data.groupId,
        status: data.status,
      }));
    });

    socket.on("lobby_cancelled", () => {
      toast.error("The leader has left and the lobby has been closed.");
      setLabGroup(null);
      setIsJoinMode(false);
      if (activeExperiment) {
        localStorage.removeItem(`labGroup_${activeExperiment.id}`);
      }
    });

    const fallbackPoll = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/group/lobby/${labGroup.joinCode}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const liveData = await res.json();
          setLabGroup((prev) => {
            if (prev && prev.members.length !== liveData.members.length) {
              console.log("POLLER: Found missing members, updating UI!");
              return { ...prev, members: liveData.members };
            }
            return prev;
          });
        }
      } catch (err) {}
    }, 3000);

    return () => {
      clearInterval(fallbackPoll);
      socket.disconnect();
    };
  }, [labGroup?.joinCode, labGroup?.status]);

  const handleCreateGroup = async () => {
    try {
      const response = await fetch(`${API_URL}/api/group/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignmentId: activeExperiment.id,
          labSessionId: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLabGroup({
          id: null,
          joinCode: data.joinCode,
          status: "FORMING",
          role: "LEADER",
          members: [{ ...user, role: "LEADER" }],
        });
        toast.success("Group created successfully!");
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to create group.");
      }
    } catch (error) {
      toast.error("Network error occurred.");
      console.error(error);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/group/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ joinCode: joinPin.toUpperCase() }),
      });

      if (response.ok) {
        const lobbyRes = await fetch(
          `${API_URL}/api/group/lobby/${joinPin.toUpperCase()}`,
          { credentials: "include" },
        );
        if (lobbyRes.ok) {
          const lobbyData = await lobbyRes.json();
          const myRoleObj = lobbyData.members.find((m) => m.id === user.id);
          setLabGroup({
            ...lobbyData,
            role: myRoleObj ? myRoleObj.role : "MEMBER",
          });
        } else {
          const data = await response.json();
          setLabGroup({
            id: null,
            joinCode: data.joinCode,
            status: "FORMING",
            role: "MEMBER",
            members: [{ ...user, role: "MEMBER" }],
          });
        }
        setIsJoinMode(false);
        toast.success("Joined group successfully!");
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to join group.");
      }
    } catch (error) {
      toast.error("Network error occurred.");
      console.error(error);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await fetch(`${API_URL}/api/group/lobby/${labGroup.joinCode}/cancel`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.success("Left the lobby.");
    } catch (error) {
      console.error("Cleanup error", error);
    }

    setLabGroup(null);
    setIsJoinMode(false);
    if (activeExperiment) {
      localStorage.removeItem(`labGroup_${activeExperiment.id}`);
    }
  };

  const handleLockGroup = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/group/${labGroup.joinCode}/lock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ itemInstanceIds: [] }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setLabGroup((prev) => ({
          ...prev,
          id: data.groupId,
          status: "ACTIVE",
        }));
        toast.success("Group locked. You can now start the experiment.");
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to lock group.");
      }
    } catch (error) {
      toast.error("Network error occurred.");
      console.error(error);
    }
  };

  const handleGroupSubmit = async () => {
    const htmlContent = await editor.blocksToHTMLLossy(editor.document);

    try {
      const response = await fetch(
        `${API_URL}/api/group/${labGroup.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            submissionData: { html: htmlContent },
          }),
        },
      );

      if (response.ok) {
        setLabGroup((prev) => ({ ...prev, status: "SUBMITTED" }));
        setIsSubmitted(true);
        toast.success("Group experiment submitted successfully!");
      } else {
        toast.error("Failed to submit experiment.");
      }
    } catch (error) {
      toast.error("Network error occurred.");
      console.error(error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleTurnIn = () => {
    setIsSubmitted(true);
    toast.success("Assignment turned in.");
  };

  const handleUnsubmit = () => {
    setIsSubmitted(false);
    toast.info("Submission reverted.");
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading student profile...
      </div>
    );
  }

  if (activeExperiment) {
    const { template } = activeExperiment;
    const isGroupMode = template.isGroupSubmission;

    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setActiveExperiment(null)}
          className="-ml-4"
        >
          ← Back to Assignments
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT SIDE: Assignment Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/10 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-3xl font-bold text-primary">
                      {template.title}
                    </CardTitle>
                    {isGroupMode && (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-100 text-indigo-700"
                      >
                        👥 Group Submission (Max {template.maxGroupSize})
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Due{" "}
                    {activeExperiment.dueDate
                      ? new Date(activeExperiment.dueDate).toLocaleDateString()
                      : "No deadline"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-8">
                <div className="px-2">
                  <h3 className="text-lg font-semibold mb-3">
                    Required Lab Materials
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {template.materials.map((m, idx) => (
                      <li key={idx} className="text-sm font-medium">
                        {m.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
                <div className="blocknote-readonly-flush -ml-1">
                  <BlockNoteView
                    editor={editor}
                    editable={false}
                    theme="light"
                    sideMenu={false}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE: Submissions State Machine */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
            <Card
              className={`shadow-sm ${isGroupMode && !labGroup ? "border-indigo-200" : "border-muted"}`}
            >
              <CardHeader className="pb-4 flex flex-row items-center justify-between border-b bg-muted/10">
                <CardTitle className="text-xl font-semibold">
                  {isGroupMode ? "Group Workspace" : "Your Work"}
                </CardTitle>
                <span
                  className={`text-sm font-medium ${isSubmitted || labGroup?.status === "SUBMITTED" ? "text-muted-foreground" : "text-green-600"}`}
                >
                  {isSubmitted || labGroup?.status === "SUBMITTED"
                    ? "Turned in"
                    : "Assigned"}
                </span>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                {/* --- STATE 1: GROUP REQUIRED, NOT FORMED --- */}
                {isGroupMode && !labGroup && !isJoinMode && (
                  <div className="text-center space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <p className="text-sm font-medium text-indigo-800">
                        This laboratory requires a group submission. Form a team
                        to unlock the equipment cart and submission panel.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button
                        onClick={handleCreateGroup}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        Create Group
                      </Button>
                      <Button
                        onClick={() => setIsJoinMode(true)}
                        variant="outline"
                        className="w-full"
                      >
                        Enter PIN to Join
                      </Button>
                    </div>
                  </div>
                )}

                {/* --- STATE 2: JOINING A GROUP --- */}
                {isGroupMode && !labGroup && isJoinMode && (
                  <form onSubmit={handleJoinGroup} className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsJoinMode(false)}
                      className="mb-2 -ml-2"
                    >
                      ← Back
                    </Button>
                    <div className="text-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter the 6-digit group PIN below.
                      </p>
                      <Input
                        placeholder="e.g. A1B2C3"
                        className="text-center font-mono text-lg uppercase tracking-widest"
                        maxLength={6}
                        value={joinPin}
                        onChange={(e) => setJoinPin(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={joinPin.length < 6}
                    >
                      Join Group
                    </Button>
                  </form>
                )}

                {/* --- STATE 3: LOBBY FORMING --- */}
                {isGroupMode && labGroup?.status === "FORMING" && (
                  <div className="space-y-6 text-center">
                    {labGroup.role === "LEADER" ? (
                      <>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Group PIN
                        </p>
                        <h2 className="text-4xl font-mono font-bold tracking-widest">
                          {labGroup.joinCode}
                        </h2>

                        <p className="text-xs text-muted-foreground mt-4">
                          Share this PIN with your group members.
                        </p>
                      </>
                    ) : (
                      <div className="p-6 bg-muted/20 rounded-lg animate-pulse">
                        <p className="text-sm font-medium">
                          Waiting for leader to lock the group...
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* --- Accordion for Members in Lobby --- */}
                    <div className="text-left w-full">
                      <Accordion
                        type="single"
                        collapsible
                        defaultValue="members"
                        className="w-full"
                      >
                        <AccordionItem value="members" className="border-none">
                          <AccordionTrigger className="text-xs text-muted-foreground uppercase py-2 hover:no-underline hover:text-primary">
                            Joined Members ({labGroup.members?.length || 1}/
                            {template.maxGroupSize})
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-1 pr-1">
                              {Array.from({
                                length:
                                  template.maxGroupSize ||
                                  labGroup.members?.length ||
                                  1,
                              }).map((_, index) => {
                                const m = labGroup.members?.[index];

                                if (m) {
                                  const userRole =
                                    m.GroupMember?.role || m.role || "MEMBER";
                                  return (
                                    <div
                                      key={m.id}
                                      className="text-sm font-medium p-2 bg-muted/30 border rounded-md flex items-center gap-2 animate-in fade-in"
                                    >
                                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                                      <span className="truncate">
                                        {getDisplayName(m)}
                                      </span>
                                      {userRole === "LEADER" ? (
                                        <Badge
                                          variant="outline"
                                          className="ml-auto shrink-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                        >
                                          👑 Leader
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto shrink-0 text-[10px] bg-muted/50 text-muted-foreground"
                                        >
                                          Member
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div
                                      key={`empty-slot-${index}`}
                                      className="text-sm font-medium p-2 bg-transparent border border-dashed border-muted-foreground/40 rounded-md flex items-center justify-center text-muted-foreground/50"
                                    >
                                      <span className="text-xs uppercase tracking-wider">
                                        Empty Slot
                                      </span>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* --- Leave Lobby Buttons --- */}
                    {labGroup.role === "LEADER" ? (
                      <div className="flex flex-col gap-3 mt-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="w-full">
                              Lock Group & Unlock Submission
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Lock this group?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Once locked, no other students will be able to
                                join this group. You can then proceed to the
                                experiment workspace.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleLockGroup}>
                                Lock Group
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full text-muted-foreground hover:text-destructive"
                            >
                              Leave & Destroy Lobby
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Destroy Lobby?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                As the leader, leaving now will destroy the
                                lobby and disconnect all joined members. This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleLeaveLobby}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Destroy Lobby
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full mt-4 text-muted-foreground hover:text-destructive"
                          >
                            Leave Lobby
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Leave this group?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to leave this group lobby?
                              You will need the PIN to rejoin.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleLeaveLobby}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              Leave Lobby
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}

                {(!isGroupMode ||
                  labGroup?.status === "ACTIVE" ||
                  labGroup?.status === "SUBMITTED") && (
                  <div className="space-y-4">
                    {isGroupMode && (
                      <div className="mb-4 bg-muted/20 rounded-lg border p-1">
                        {/* --- Accordion for Members in Workspace --- */}
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="team" className="border-none">
                            <AccordionTrigger className="py-2 px-3 hover:no-underline text-xs font-medium">
                              <div className="flex justify-between items-center w-full pr-2">
                                <span>Group Session Active</span>
                                <Badge
                                  variant="outline"
                                  className="bg-background"
                                >
                                  {labGroup.members?.length || 1} /{" "}
                                  {template.maxGroupSize} Members
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                              <div className="space-y-2 pt-2 border-t">
                                {Array.from({
                                  length:
                                    template.maxGroupSize ||
                                    labGroup.members?.length ||
                                    1,
                                }).map((_, index) => {
                                  const m = labGroup.members?.[index];

                                  if (m) {
                                    const userRole =
                                      m.GroupMember?.role || m.role || "MEMBER";
                                    return (
                                      <div
                                        key={m.id}
                                        className="text-sm font-medium p-2 bg-background border rounded-md flex items-center gap-2 animate-in fade-in"
                                      >
                                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                                        <span className="truncate">
                                          {getDisplayName(m)}
                                        </span>
                                        {userRole === "LEADER" ? (
                                          <Badge
                                            variant="outline"
                                            className="ml-auto shrink-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                          >
                                            👑 Leader
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="ml-auto shrink-0 text-[10px] bg-muted/50 text-muted-foreground"
                                          >
                                            Member
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div
                                        key={`empty-slot-${index}`}
                                        className="text-sm font-medium p-2 bg-transparent border border-dashed border-muted-foreground/40 rounded-md flex items-center justify-center text-muted-foreground/50"
                                      >
                                        <span className="text-xs uppercase tracking-wider">
                                          Empty Slot
                                        </span>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}

                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                          >
                            <span className="text-sm truncate pr-2 font-medium">
                              {file.name}
                            </span>
                            {!isSubmitted &&
                              labGroup?.status !== "SUBMITTED" && (
                                <button
                                  onClick={() => removeFile(idx)}
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                >
                                  ✕
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                    />

                    {!isSubmitted && labGroup?.status !== "SUBMITTED" ? (
                      <>
                        <Button
                          variant="outline"
                          className="w-full justify-center font-semibold bg-background"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className="mr-2 text-lg leading-none">+</span>{" "}
                          Add file
                        </Button>
                        <Button
                          className="w-full font-semibold"
                          onClick={
                            isGroupMode ? handleGroupSubmit : handleTurnIn
                          }
                        >
                          {isGroupMode
                            ? "Submit Experiment for Group"
                            : files.length > 0
                              ? "Turn in"
                              : "Mark as done"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full font-semibold"
                        onClick={isGroupMode ? null : handleUnsubmit}
                        disabled={isGroupMode}
                      >
                        {isGroupMode ? "Submission Locked" : "Unsubmit"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Assignment Grid View ---
  const displayYearSection =
    user.year && user.section ? `${user.year} - ${user.section}` : "Unassigned";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          My Assigned Experiments
        </h1>
        <p className="text-muted-foreground mt-1">
          Showing laboratory requirements for:{" "}
          <Badge variant="outline">{displayYearSection}</Badge>
        </p>
      </div>

      <Separator />

      {loading ? (
        <p>Loading your assignments...</p>
      ) : !user.section ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-destructive">
          <p>
            Your profile does not have a section assigned. Please contact your
            teacher.
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            No experiments assigned to {displayYearSection} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="flex flex-col hover:border-primary transition-colors cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => setActiveExperiment(assignment)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl pr-2">
                    {assignment.template.title}
                  </CardTitle>
                  {assignment.template.isGroupSubmission && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                      Group
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Due:{" "}
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString()
                    : "No deadline"}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <Badge variant="outline">
                  {assignment.template.materials.length} Materials Required
                </Badge>
              </CardContent>
              <div className="p-4 border-t bg-muted/5 text-center text-sm font-medium text-primary flex items-center justify-center gap-2">
                Open Experiment Workspace →
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
