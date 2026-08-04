import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";

const LabGroupManager = ({
  sections = [],
  groupSize = 4,
  experimentId,
  assignmentId,
  labSessionId,
}) => {
  const [groupsBySection, setGroupsBySection] = useState({});
  const [strategies, setStrategies] = useState({});
  const [activeTab, setActiveTab] = useState(sections[0] || "");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchGroupsForSection = useCallback(
    async (sectionName, strategyType = "heterogeneous") => {
      try {
        const response = await fetch(`${API_URL}/api/matchmaking/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            yearAndSection: sectionName,
            groupSize: groupSize,
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
        } else {
          toast.error(`Failed to generate groups for ${sectionName}`);
        }
      } catch (error) {
        console.error("Error fetching matchmaking data:", error);
        toast.error("Network error while generating groups.");
      }
    },
    [API_URL, groupSize],
  );

  useEffect(() => {
    const fetchAllSections = async () => {
      if (!sections || sections.length === 0) return;

      setLoading(true);
      try {
        await Promise.all(
          sections.map((sectionName) => {
            setStrategies((prev) => ({
              ...prev,
              [sectionName]: "heterogeneous",
            }));
            return fetchGroupsForSection(sectionName, "heterogeneous");
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
  }, [sections, fetchGroupsForSection]);

  const handleStrategyChange = (sectionName, newStrategy) => {
    setStrategies((prev) => ({ ...prev, [sectionName]: newStrategy }));
    fetchGroupsForSection(sectionName, newStrategy);
    toast.info(`Re-sorting ${sectionName} using ${newStrategy} strategy...`);
  };

  const onDragEnd = (result) => {
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
  };

  const handleSaveGroups = async (sectionName) => {
    setIsSaving(true);
    try {
      const finalizedGroups = Object.values(groupsBySection[sectionName] || {});

      const response = await fetch(`${API_URL}/api/matchmaking/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
        toast.success(
          `Groups for ${sectionName} have been saved successfully!`,
        );
      } else {
        toast.error(data.error || `Failed to save groups for ${sectionName}`);
      }
    } catch (error) {
      console.error("Error saving groups:", error);
      toast.error("A network error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='p-8 text-center text-muted-foreground flex items-center justify-center gap-2'>
        <RefreshCw className='w-5 h-5 animate-spin' />
        Running BKT sorting algorithm...
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
                    Drag and drop students to override the automated groups.
                  </p>
                </div>

                <div className='flex items-center gap-3 w-full md:w-auto justify-end'>
                  <div className='flex flex-col'>
                    <select
                      className='flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      value={strategies[sectionName] || "heterogeneous"}
                      onChange={(e) =>
                        handleStrategyChange(sectionName, e.target.value)
                      }
                    >
                      <option value='heterogeneous'>
                        Balanced (Safety Lead)
                      </option>
                      <option value='homogeneous'>
                        Targeted Supervision (Grouped)
                      </option>
                    </select>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={() => handleSaveGroups(sectionName)}
                    disabled={isSaving}
                    className='bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  >
                    <Save className='w-4 h-4 mr-2' />
                    {isSaving ? "Saving..." : "Lock in Groups"}
                  </Button>
                </div>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <div className='flex gap-4 flex-wrap pb-4'>
                  {groupsBySection[sectionName] &&
                    Object.entries(groupsBySection[sectionName]).map(
                      ([groupId, students]) => (
                        <Droppable key={groupId} droppableId={groupId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-4 w-[260px] rounded-lg border-2 transition-colors ${
                                snapshot.isDraggingOver
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-white border-slate-100 shadow-sm"
                              }`}
                              style={{ minHeight: "250px" }}
                            >
                              <h4 className='font-semibold text-slate-700 mb-4 border-b pb-2'>
                                Station {parseInt(groupId.split("-")[1]) + 1}
                              </h4>

                              <div className='space-y-2'>
                                {students.map((student, index) => (
                                  <Draggable
                                    key={student.id.toString()}
                                    draggableId={student.id.toString()}
                                    index={index}
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
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const getScoreColor = (score) => {
  if (score >= 0.8) return "#10b981";
  if (score >= 0.5) return "#f59e0b";
  return "#ef4444";
};

export default LabGroupManager;
