import React, { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Users, RefreshCw } from "lucide-react";

const LabGroupManager = ({
  sections = [],
  template,
  setTemplate,
  experimentId,
  assignmentId,
  labSessionId,
}) => {
  const [groupsBySection, setGroupsBySection] = useState({});
  const [strategies, setStrategies] = useState({});
  const [activeTab, setActiveTab] = useState(sections[0] || "");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const initializedSections = useRef(new Set());
  const prevGroupSize = useRef(template?.maxGroupSize); // Track previous max group size
  const abortControllerRef = useRef(null); // Used to cancel ongoing fetch requests

  const API_URL = import.meta.env.VITE_API_URL;

  // --- CANCEL HANDLER ---
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Cancel the fetch request
    }
    setIsGenerating(false);
    setIsSaving(false);
    toast.info("Operation cancelled.");
  };

  // 1. Check for existing saved groups in the DB
  const checkExistingGroups = useCallback(
    async (sectionName) => {
      if (!assignmentId && !experimentId) return null;

      try {
        const queryId = assignmentId
          ? `assignmentId=${assignmentId}`
          : `experimentId=${experimentId}`;
        const response = await fetch(
          `${API_URL}/api/matchmaking/existing?${queryId}&sectionName=${sectionName}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        const data = await response.json();

        if (data.success && data.groups && data.groups.length > 0) {
          const groupMap = {};
          data.groups.forEach((groupArray, index) => {
            groupMap[`group-${index}`] = groupArray;
          });
          return groupMap;
        }
        return null;
      } catch (error) {
        console.error(
          `Error checking existing groups for ${sectionName}:`,
          error,
        );
        return null;
      }
    },
    [API_URL, assignmentId, experimentId],
  );

  // 4. Handle Save Groups (Hoisted so fetchGroupsForSection can use it)
  const handleSaveGroups = useCallback(
    async (sectionName, groupsData = null, silent = false) => {
      setIsSaving(true);
      
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const groupsSource = groupsData || groupsBySection[sectionName] || {};
        const finalizedGroups = Object.values(groupsSource);

        const response = await fetch(`${API_URL}/api/matchmaking/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            sectionName,
            finalizedGroups,
            experimentId,
            assignmentId,
            labSessionId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (!silent) toast.success(`Groups for ${sectionName} updated!`);
        } else {
          toast.error(data.error || `Failed to save groups for ${sectionName}`);
        }
      } catch (error) {
        if (error.name === "AbortError") return; // Ignore abort errors seamlessly
        console.error("Error saving groups:", error);
        toast.error("A network error occurred while saving.");
      } finally {
        setIsSaving(false);
      }
    },
    [API_URL, experimentId, assignmentId, labSessionId, groupsBySection],
  );

  // 2. Generate new groups manually via algorithm
  const fetchGroupsForSection = useCallback(
    async (sectionName, strategyType = "heterogeneous", currentGroupSize) => {
      setIsGenerating(true);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${API_URL}/api/matchmaking/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            yearAndSection: sectionName,
            groupSize: currentGroupSize || template?.maxGroupSize || 4,
            strategy: strategyType,
          }),
        });

        const data = await response.json();

        if (data.success) {
          const groupMap = {};
          data.groups.forEach((groupArray, index) => {
            groupMap[`group-${index}`] = groupArray;
          });

          setGroupsBySection((prev) => ({
            ...prev,
            [sectionName]: groupMap,
          }));

          // Auto-save immediately after generation
          await handleSaveGroups(sectionName, groupMap, true);
        } else {
          toast.error(`Failed to generate groups for ${sectionName}`);
        }
      } catch (error) {
        if (error.name === "AbortError") return; // Ignore abort errors seamlessly
        console.error("Error fetching matchmaking data:", error);
        toast.error("Network error while generating groups.");
      } finally {
        setIsGenerating(false);
      }
    },
    [API_URL, template?.maxGroupSize, handleSaveGroups],
  );

  // 3. Initial Load: Check DB only, DO NOT auto-generate
  useEffect(() => {
    const fetchAllSections = async () => {
      if (!sections || sections.length === 0) return;

      setLoading(true);
      try {
        await Promise.all(
          sections.map(async (sectionName) => {
            if (!initializedSections.current.has(sectionName)) {
              setStrategies((prev) => ({
                ...prev,
                [sectionName]: "heterogeneous",
              }));

              const existingGroups = await checkExistingGroups(sectionName);

              setGroupsBySection((prev) => ({
                ...prev,
                [sectionName]: existingGroups || null,
              }));

              initializedSections.current.add(sectionName);
            }
          }),
        );

        if (!sections.includes(activeTab)) {
          setActiveTab(sections[0]);
        }
      } catch (error) {
        console.error("Error initializing sections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSections();
  }, [sections, checkExistingGroups, activeTab]);

  // Listener for Template Max Group Size Changes
  useEffect(() => {
    const currentSize = template?.maxGroupSize;
    if (
      currentSize &&
      prevGroupSize.current &&
      prevGroupSize.current !== currentSize
    ) {
      toast.info(`Max group size changed to ${currentSize}. Updating groups...`);

      // Update only the sections that already have groups generated
      sections.forEach((sectionName) => {
        if (
          groupsBySection[sectionName] !== null &&
          groupsBySection[sectionName] !== undefined
        ) {
          const currentStrategy = strategies[sectionName] || "heterogeneous";
          fetchGroupsForSection(sectionName, currentStrategy, currentSize);
        }
      });

      prevGroupSize.current = currentSize;
    } else if (currentSize && !prevGroupSize.current) {
      // Set initial ref if it was undefined on first mount
      prevGroupSize.current = currentSize;
    }
  }, [
    template?.maxGroupSize,
    sections,
    strategies,
    fetchGroupsForSection,
    groupsBySection,
  ]);

  const handleStrategyChange = (sectionName, newStrategy) => {
    setStrategies((prev) => ({ ...prev, [sectionName]: newStrategy }));
  };

  // 5. Drag and Drop with Auto-Save
  const onDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sectionGroups = { ...groupsBySection[activeTab] };
    const sourceDroppableId = source.droppableId;
    const destDroppableId = destination.droppableId;

    if (sourceDroppableId === destDroppableId) {
      const items = [...sectionGroups[sourceDroppableId]];
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      sectionGroups[sourceDroppableId] = items;
    } else {
      const sourceItems = [...sectionGroups[sourceDroppableId]];
      const destItems = [...sectionGroups[destDroppableId]];

      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);

      sectionGroups[sourceDroppableId] = sourceItems;
      sectionGroups[destDroppableId] = destItems;
    }

    setGroupsBySection((prev) => ({
      ...prev,
      [activeTab]: sectionGroups,
    }));

    await handleSaveGroups(activeTab, sectionGroups, true);
  };

  if (loading) {
    return (
      <div className='p-8 text-center text-muted-foreground flex items-center justify-center gap-2'>
        <RefreshCw className='w-5 h-5 animate-spin' />
        Loading Lab Groups...
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className='p-8 text-center text-muted-foreground'>
        No sections selected.
      </div>
    );
  }

  return (
    <>
      {/* 
        SAFETY LOCK: Active during fetch or save. 
        Provides an easy way out if the backend is taking too long.
      */}
      {(isGenerating || isSaving) && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/10">
          <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-200 flex flex-col items-center min-w-[240px]">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
            <p className="font-medium text-slate-700 mb-6 text-center">
              {isGenerating ? "Generating optimal groups..." : "Saving your changes..."}
            </p>
            <Button variant="outline" onClick={handleCancel} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className='flex flex-col space-y-4'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='mb-4 flex flex-wrap h-auto bg-muted/50 p-1'>
            {sections.map((sectionName) => (
              <TabsTrigger
                key={sectionName}
                value={sectionName}
                className='px-4 py-2'
              >
                {sectionName}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((sectionName) => (
            <TabsContent key={sectionName} value={sectionName} className='mt-0'>
              <div className='bg-slate-50 border rounded-xl p-6'>
                <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4'>
                  <div>
                    <h3 className='text-lg font-semibold'>
                      {sectionName} - Lab Stations
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      {groupsBySection[sectionName]
                        ? "Drag and drop students to adjust groups. Changes save automatically."
                        : "Create optimal student pairings for this lab session."}
                    </p>
                  </div>

                  <div className='flex flex-wrap items-end gap-4 w-full md:w-auto justify-end relative z-10'>
                    {/* MAX GROUP SIZE INPUT */}
                    <div className='space-y-2'>
                      <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                        Max Group Size
                      </Label>
                      <Input
                        type='number'
                        min='2'
                        max='10'
                        value={template?.maxGroupSize || 4}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            maxGroupSize: parseInt(e.target.value) || 2,
                          })
                        }
                        className='bg-background font-medium h-9 w-24'
                        disabled={isGenerating || isSaving}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                        Strategy
                      </Label>
                      <select
                        className='flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-48 disabled:opacity-50'
                        value={strategies[sectionName] || "heterogeneous"}
                        onChange={(e) =>
                          handleStrategyChange(sectionName, e.target.value)
                        }
                        disabled={isGenerating || isSaving}
                      >
                        <option value='heterogeneous'>
                          Balanced (Safety Lead)
                        </option>
                        <option value='homogeneous'>
                          Targeted Supervision (Grouped)
                        </option>
                      </select>
                    </div>

                    <Button
                      onClick={() =>
                        fetchGroupsForSection(
                          sectionName,
                          strategies[sectionName],
                        )
                      }
                      disabled={isGenerating || isSaving}
                      className='bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9'
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className='w-4 h-4 mr-2 animate-spin' />{" "}
                          Generating...
                        </>
                      ) : groupsBySection[sectionName] ? (
                        <>
                          <RefreshCw className='w-4 h-4 mr-2' /> Regenerate
                        </>
                      ) : (
                        <>
                          <Users className='w-4 h-4 mr-2' /> Generate Groups
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* EMPTY STATE UI */}
                {!groupsBySection[sectionName] ? (
                  <div className='flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50'>
                    <Users className='w-12 h-12 text-slate-300 mb-4' />
                    <h4 className='text-lg font-medium text-slate-700 mb-2'>
                      No groups created yet
                    </h4>
                    <p className='text-slate-500 text-center mb-6 max-w-sm'>
                      Generate initial lab groupings using your selected
                      matchmaking strategy.
                    </p>
                    <Button
                      onClick={() =>
                        fetchGroupsForSection(
                          sectionName,
                          strategies[sectionName],
                        )
                      }
                      disabled={isGenerating || isSaving}
                    >
                      {isGenerating ? "Processing..." : "Generate Lab Groups"}
                    </Button>
                  </div>
                ) : (
                  /* DRAG AND DROP UI */
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className='flex gap-4 flex-wrap pb-4 relative z-10'>
                      {Object.entries(groupsBySection[sectionName]).map(
                        ([groupId, students]) => (
                          <Droppable key={groupId} droppableId={groupId} isDropDisabled={isSaving || isGenerating}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`p-4 w-[260px] rounded-lg border-2 transition-colors ${
                                  snapshot.isDraggingOver
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-white border-slate-100 shadow-sm"
                                } ${isSaving ? 'opacity-70' : ''}`}
                                style={{ minHeight: "250px" }}
                              >
                                <h4 className='font-semibold text-slate-700 mb-4 border-b pb-2 flex items-center justify-between'>
                                  Station {parseInt(groupId.split("-")[1]) + 1}
                                  <span className='text-xs font-normal text-slate-400'>
                                    {students.length} / {template?.maxGroupSize || 4}
                                  </span>
                                </h4>

                                <div className='space-y-2'>
                                  {students.map((student, index) => (
                                    <Draggable
                                      key={student.id.toString()}
                                      draggableId={student.id.toString()}
                                      index={index}
                                      isDragDisabled={isSaving || isGenerating}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-3 rounded-md border text-sm transition-shadow ${
                                            snapshot.isDragging
                                              ? "bg-white shadow-lg border-emerald-400 z-50"
                                              : "bg-white shadow-sm border-slate-200 hover:border-slate-300"
                                          }`}
                                          style={{
                                            userSelect: "none",
                                            borderLeftWidth: "4px",
                                            borderLeftColor: getScoreColor(
                                              student.SafetyProfile?.bktScore ||
                                                0.1,
                                            ),
                                            ...provided.draggableProps.style,
                                          }}
                                        >
                                          <div className='font-medium text-slate-900 truncate'>
                                            {student.firstName} {student.lastName}
                                          </div>
                                          <div className='text-xs text-slate-500 mt-1 flex justify-between'>
                                            <span>Mastery:</span>
                                            <span className='font-semibold'>
                                              {(
                                                (student.SafetyProfile
                                                  ?.bktScore || 0.1) * 100
                                              ).toFixed(0)}
                                              %
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              </div>
                            )}
                          </Droppable>
                        ),
                      )}
                    </div>
                  </DragDropContext>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
};

const getScoreColor = (score) => {
  if (score >= 0.8) return "#10b981";
  if (score >= 0.5) return "#f59e0b";
  return "#ef4444";
};

export default LabGroupManager;