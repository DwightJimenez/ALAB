import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner"; // Sonner toasts

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { TeacherQuizReview } from "./TeacherQuizReview";

import LabGroupManager from "./MatchMaking";

const CreateExperiment = ({ templateToEdit, onBack }) => {
  const [inventoryList, setInventoryList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  const initialSkillIds = templateToEdit?.skillIds
    ? templateToEdit.skillIds
    : templateToEdit?.skillId
      ? [templateToEdit.skillId.toString()]
      : [""];

  // ADDED: Track assignmentId and labSessionId in state
  const [template, setTemplate] = useState({
    title: templateToEdit?.title || "",
    sections: [],
    dueDate: "",
    requireSafetyGate: true,
    skillIds: initialSkillIds,
    materials: templateToEdit?.materials || [{ inventoryId: "", name: "" }],
    isGroupSubmission: templateToEdit?.isGroupSubmission || false,
    groupFormation: templateToEdit?.groupFormation || "student",
    maxGroupSize: templateToEdit?.maxGroupSize || 4,
    assignmentId: templateToEdit?.assignmentId || null,
    labSessionId: templateToEdit?.labSessionId || null,
  });

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const editor = useCreateBlockNote();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, skillsRes, sectionsRes] = await Promise.all([
          fetch(`${API_URL}/api/inventory`, { credentials: "include" }),
          fetch(`${API_URL}/api/skills`, { credentials: "include" }),
          fetch(`${API_URL}/api/users/sections`, { credentials: "include" }),
        ]);

        if (invRes.ok) setInventoryList(await invRes.json());
        if (skillsRes.ok) setSkillsList(await skillsRes.json());
        if (sectionsRes.ok) setAvailableSections(await sectionsRes.json());
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const loadRichText = async () => {
      if (templateToEdit && templateToEdit.instructionsHTML) {
        const blocks = await editor.tryParseHTMLToBlocks(
          templateToEdit.instructionsHTML,
        );
        editor.replaceBlocks(editor.document, blocks);
      }
    };
    loadRichText();
  }, [templateToEdit, editor]);

  useEffect(() => {
    if (templateToEdit) {
      const fetchCurrentAssignments = async () => {
        try {
          const response = await fetch(
            `${API_URL}/api/experiments/${templateToEdit.id}/assignments`,
            { credentials: "include" },
          );

          if (response.ok) {
            const currentAssignments = await response.json();

            if (currentAssignments.length > 0) {
              setTemplate((prev) => ({
                ...prev,
                sections: currentAssignments.map((a) => a.yearAndSection),
                dueDate: currentAssignments[0].dueDate || "",
                requireSafetyGate:
                  currentAssignments[0].activeSafetyGate !== undefined
                    ? currentAssignments[0].activeSafetyGate
                    : true,
                // ADDED: Extract Assignment & Lab Session IDs from the existing assignment data
                assignmentId: currentAssignments[0].id || currentAssignments[0].assignmentId || prev.assignmentId,
                labSessionId: currentAssignments[0].labSessionId || prev.labSessionId,
              }));
            }
          }
        } catch (error) {
          console.error("Failed to load existing assignments", error);
        }
      };

      fetchCurrentAssignments();
    }
  }, [templateToEdit, API_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplate({ ...template, [name]: value });
  };

  const toggleSection = (sectionName) => {
    setTemplate((prev) => {
      const isSelected = prev.sections.includes(sectionName);
      return {
        ...prev,
        sections: isSelected
          ? prev.sections.filter((s) => s !== sectionName)
          : [...prev.sections, sectionName],
      };
    });
  };

  const handleSkillSelect = (index, value) => {
    const newSkillIds = [...template.skillIds];
    newSkillIds[index] = value;
    setTemplate({ ...template, skillIds: newSkillIds });
  };

  const addSkill = () => {
    setTemplate({ ...template, skillIds: [...template.skillIds, ""] });
  };

  const removeSkill = (index) => {
    const newSkillIds = template.skillIds.filter((_, i) => i !== index);
    setTemplate({ ...template, skillIds: newSkillIds });
  };

  const handleCreateSkill = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/admin/skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSkillName,
          description: "Auto-created from Experiment setup",
        }),
      });

      if (response.ok) {
        const createdSkill = await response.json();
        setSkillsList([...skillsList, createdSkill]);

        const newSkillIds = [...template.skillIds];
        if (newSkillIds[newSkillIds.length - 1] === "") {
          newSkillIds[newSkillIds.length - 1] = createdSkill.id.toString();
        } else {
          newSkillIds.push(createdSkill.id.toString());
        }

        setTemplate({ ...template, skillIds: newSkillIds });
        setIsSkillModalOpen(false);
        setNewSkillName("");
      }
    } catch (error) {
      console.error("Failed to create skill:", error);
    }
  };

  const handleMaterialSelect = (index, selectedInventoryId) => {
    const selectedItem = inventoryList.find(
      (item) => item.id === parseInt(selectedInventoryId),
    );
    const newMaterials = [...template.materials];
    newMaterials[index] = {
      ...newMaterials[index],
      inventoryId: selectedItem.id,
      name: selectedItem.name,
    };
    setTemplate({ ...template, materials: newMaterials });
  };

  const addMaterial = () => {
    setTemplate({
      ...template,
      materials: [...template.materials, { inventoryId: "", name: "" }],
    });
  };

  const removeMaterial = (index) => {
    const newMaterials = template.materials.filter((_, i) => i !== index);
    setTemplate({ ...template, materials: newMaterials });
  };

  const handleSave = async () => {
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);

      const validSkillIds = template.skillIds
        .filter((id) => id !== "")
        .map((id) => parseInt(id, 10));

      const payload = {
        title: template.title,
        sections: template.sections,
        dueDate: template.dueDate || null,
        requireSafetyGate: template.requireSafetyGate,
        // ADDED: Passing assignmentId and labSessionId for updating
        assignmentId: template.assignmentId,
        labSessionId: template.labSessionId,
        skillIds: validSkillIds,
        materials: template.materials.filter((m) => m.inventoryId !== ""),
        instructionsHTML: htmlContent,
        isGroupSubmission: template.isGroupSubmission,
        groupFormation: template.isGroupSubmission
          ? template.groupFormation
          : null,
        maxGroupSize: template.isGroupSubmission ? template.maxGroupSize : 1,
      };

      if (
        !payload.title ||
        payload.sections.length === 0 ||
        payload.skillIds.length === 0 ||
        payload.materials.length === 0
      ) {
        toast.error(
          "Please provide a title, select at least one section, choose a skill, and add a material.",
        );
        return;
      }

      const isEditing = !!templateToEdit;
      const url = isEditing
        ? `${API_URL}/api/experiments/${templateToEdit.id}`
        : `${API_URL}/api/experiments/create`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Template ${isEditing ? "updated" : "saved"} successfully!`);
        if (onBack) onBack();
      } else {
        toast.error(data.error || "Failed to save template.");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("A network error occurred.");
    }
  };

  const selectedSkillNames = template.skillIds
    .map((id) => skillsList.find((s) => s.id === parseInt(id))?.name)
    .filter(Boolean);

  return (
    <div className='w-full p-4 lg:p-6 flex flex-col gap-6 min-h-screen'>
      <div className='shrink-0 mb-2'>
        {onBack && (
          <Button
            variant='ghost'
            onClick={onBack}
            className='mb-4 -ml-4 text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Library
          </Button>
        )}
        <h1 className='text-3xl font-bold tracking-tight'>
          {templateToEdit ? "Edit Experiment" : "Create Experiment"}
        </h1>
      </div>

      <div className='flex-1 flex flex-col lg:flex-row gap-6 items-start'>
        
        {/* Left Sidebar - NO STICKY, scrolls naturally with the page */}
        <Card className='w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col shadow-sm border-muted h-fit max-h-[calc(100vh-140px)] lg:sticky lg:top-6'>
          <CardHeader className='bg-muted/30 border-b py-4 shrink-0'>
            <CardTitle className='text-lg'>Details</CardTitle>
          </CardHeader>

          <CardContent className='p-6 space-y-6 overflow-y-auto'>
            <div className='space-y-3'>
              <Label
                htmlFor='title'
                className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'
              >
                Experiment Title
              </Label>
              <Input
                id='title'
                name='title'
                placeholder='e.g., Effect of Light on Plant Growth'
                value={template.title}
                onChange={handleInputChange}
                className='bg-background font-medium text-md'
              />
            </div>

            <div className='space-y-3'>
              <Label className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                Target Sections
              </Label>
              <div className='max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 bg-white'>
                {availableSections.length > 0 ? (
                  availableSections.map((sectionName, index) => (
                    <label
                      key={index}
                      className='flex items-center space-x-2 cursor-pointer'
                    >
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        checked={template.sections.includes(sectionName)}
                        onChange={() => toggleSection(sectionName)}
                      />
                      <span className='text-sm font-medium'>{sectionName}</span>
                    </label>
                  ))
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    Loading sections...
                  </p>
                )}
              </div>
            </div>

            <div className='space-y-3'>
              <Label className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                Target / Due Date (Optional)
              </Label>
              <Input
                type='date'
                value={template.dueDate}
                onChange={(e) =>
                  setTemplate({ ...template, dueDate: e.target.value })
                }
                className='bg-background font-medium text-md'
              />
            </div>

            <div className='flex items-start space-x-3 bg-slate-50 p-3 rounded-lg border'>
              <input
                type='checkbox'
                id='requireSafetyGate'
                checked={template.requireSafetyGate}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    requireSafetyGate: e.target.checked,
                  })
                }
                className='h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              />
              <div className='flex flex-col'>
                <Label
                  htmlFor='requireSafetyGate'
                  className='font-semibold cursor-pointer'
                >
                  Require Safety Gate
                </Label>
                <span className='text-xs text-muted-foreground mt-1'>
                  Students must pass the BKT assessment before accessing this
                  lab.
                </span>
              </div>
            </div>

            <Separator />

            <div className='space-y-3 p-4 bg-muted/20 rounded-lg border'>
              <Label className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                Submission Type
              </Label>
              <select
                className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                value={template.isGroupSubmission ? "true" : "false"}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    isGroupSubmission: e.target.value === "true",
                  })
                }
              >
                <option value='false'>Individual</option>
                <option value='true'>By Group</option>
              </select>

              {template.isGroupSubmission && (
                <div className='pt-3 space-y-4 border-t border-muted-foreground/20 mt-3'>
                  <div className='space-y-2'>
                    <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      Group Formation
                    </Label>
                    <select
                      className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      value={template.groupFormation}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          groupFormation: e.target.value,
                        })
                      }
                    >
                      <option value='student'>
                        Student Self-Assigned (QR)
                      </option>
                      <option value='teacher'>
                        Teacher Assigned (BKT Auto-Group)
                      </option>
                    </select>
                  </div>

                  {template.groupFormation === "teacher" && (
                    <div className='space-y-2 pt-1 pb-1'>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant='secondary'
                            size='sm'
                            disabled={template.sections.length === 0}
                            className='w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 shadow-sm disabled:opacity-50'
                          >
                            👥 Open Matchmaking Board
                          </Button>
                        </SheetTrigger>

                        <SheetContent
                          side='bottom'
                          className='max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white'
                        >
                          <div className='max-w-6xl mx-auto py-6 space-y-6'>
                            <SheetHeader className='mb-6'>
                              <SheetTitle className='text-2xl'>
                                Adjust Lab Groups
                              </SheetTitle>
                              <SheetDescription>
                                Review and manually adjust the BKT-generated
                                student groups.
                              </SheetDescription>
                            </SheetHeader>

                            <Separator />

                            <div className='pb-20'>
                              <LabGroupManager
                                sections={template.sections}
                                groupSize={template.maxGroupSize}
                                // ADDED: Passing IDs to Matchmaking
                                experimentId={templateToEdit?.id}
                                assignmentId={template.assignmentId}
                                labSessionId={template.labSessionId}
                              />
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                      {template.sections.length === 0 && (
                        <p className='text-xs text-red-500'>
                          Please select at least one Target Section above.
                        </p>
                      )}
                    </div>
                  )}

                  <div className='space-y-2'>
                    <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      Max Group Size
                    </Label>
                    <Input
                      type='number'
                      min='2'
                      max='10'
                      value={template.maxGroupSize}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          maxGroupSize: parseInt(e.target.value) || 2,
                        })
                      }
                      className='bg-background font-medium h-9'
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <Label className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                  Target BKT Skills
                </Label>
                <div className='flex items-center gap-2'>
                  <Dialog
                    open={isSkillModalOpen}
                    onOpenChange={setIsSkillModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-6 px-2 text-xs text-blue-600'
                      >
                        + New
                      </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-white text-black border-none sm:max-w-md'>
                      <DialogHeader>
                        <DialogTitle>Quick Add BKT Skill</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={handleCreateSkill}
                        className='space-y-4 pt-4'
                      >
                        <div>
                          <Label>Skill Name</Label>
                          <Input
                            placeholder='e.g., Microscope Handling'
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            required
                          />
                          <p className='text-xs text-slate-500 mt-2'>
                            Default probability parameters will be applied.
                          </p>
                        </div>
                        <Button type='submit' className='w-full'>
                          Add & Select
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={addSkill}
                    className='px-2 h-6 text-xs'
                  >
                    + Slot
                  </Button>
                </div>
              </div>

              <div className='space-y-3'>
                {template.skillIds.map((skillId, index) => (
                  <div
                    key={`skill-${index}`}
                    className='flex items-center gap-2'
                  >
                    <span className='text-sm font-medium text-muted-foreground w-4 shrink-0'>
                      {index + 1}.
                    </span>
                    <select
                      className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      value={skillId}
                      onChange={(e) => handleSkillSelect(index, e.target.value)}
                    >
                      <option value='' disabled>
                        Select a skill...
                      </option>
                      {skillsList.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant='destructive'
                      size='icon'
                      className='w-9 h-9 shrink-0'
                      onClick={() => removeSkill(index)}
                      disabled={template.skillIds.length === 1}
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <Label className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                  Required Inventory
                </Label>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={addMaterial}
                  className='h-6 px-2 text-xs'
                >
                  + Add Item
                </Button>
              </div>

              <div className='space-y-3'>
                {template.materials.map((material, index) => (
                  <div
                    key={`material-${index}`}
                    className='flex items-center gap-2'
                  >
                    <span className='text-sm font-medium text-muted-foreground w-4 shrink-0'>
                      {index + 1}.
                    </span>
                    <select
                      className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate'
                      value={material.inventoryId}
                      onChange={(e) =>
                        handleMaterialSelect(index, e.target.value)
                      }
                    >
                      <option value='' disabled>
                        Select item...
                      </option>
                      {inventoryList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant='destructive'
                      size='icon'
                      className='w-9 h-9 shrink-0'
                      onClick={() => removeMaterial(index)}
                      disabled={template.materials.length === 1}
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          {/* Footer pinned to the bottom of the card */}
          <div className='shrink-0 p-6 pt-0 mt-auto flex flex-col gap-3 bg-white rounded-b-xl z-10'>
            <Separator className='mb-2' />
            <Button onClick={handleSave} className='w-full'>
              {templateToEdit ? "Update Template" : "Save Template"}
            </Button>
            {onBack && (
              <Button variant='outline' onClick={onBack} className='w-full'>
                Cancel
              </Button>
            )}
          </div>
        </Card>

        {/* Right Editor */}
        <div className='flex-1 w-full flex flex-col min-w-0'>
          <Card className='flex flex-col shadow-sm border-muted h-full'>
            <CardHeader className='bg-muted/30 border-b py-4 flex flex-row justify-between items-center shrink-0'>
              <CardTitle className='text-lg'>Document Editor</CardTitle>

              <div className='flex items-center gap-3'>
                <span className='text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded hidden sm:inline-block mr-2'>
                  Type '/' for commands
                </span>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant='secondary'
                      size='sm'
                      className='bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 shadow-sm'
                    >
                      ✨ AI Safety Gate
                    </Button>
                  </SheetTrigger>

                  <SheetContent
                    side='bottom'
                    className='max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white'
                  >
                    <div className='max-w-4xl mx-auto py-6 space-y-6'>
                      <SheetHeader className='mb-6'>
                        <SheetTitle className='text-2xl'>
                          Configure Safety Gate
                        </SheetTitle>
                        <SheetDescription>
                          Use Gemini to generate a BKT assessment based on your
                          drafted instructions.
                        </SheetDescription>
                      </SheetHeader>

                      <Separator />

                      <div className='pb-20'>
                        <TeacherQuizReview
                          lessonId={templateToEdit?.id || "new-experiment"}
                          editor={editor}
                          availableSkills={
                            selectedSkillNames.length > 0
                              ? selectedSkillNames
                              : ["General Lab Safety"]
                          }
                        />
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>

            <CardContent className='p-0 bg-background flex justify-center'>
              <div className='w-full max-w-[900px] md:p-6 min-h-[800px]'>
                <BlockNoteView editor={editor} theme='light' />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateExperiment;