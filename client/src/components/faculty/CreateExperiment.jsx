import React, { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, SlidersHorizontal, UploadCloud, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { TeacherQuizReview } from "./TeacherQuizReview";
import LabGroupManager from "./MatchMaking";

import { createClient } from "@supabase/supabase-js";

// --- Import pdfjs for client-side PDF parsing ---
import * as pdfjsLib from "pdfjs-dist";

// Set the worker source to match the installed version via CDN to avoid Vite build issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CreateExperiment = ({ templateToEdit, onBack }) => {
  const [inventoryList, setInventoryList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableCriteria, setAvailableCriteria] = useState([]);
  const [isImportingPDF, setIsImportingPDF] = useState(false);

  // Reference for the hidden file input
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  const initialSkillIds = templateToEdit?.skillIds
    ? templateToEdit.skillIds
    : templateToEdit?.skillId
      ? [templateToEdit.skillId.toString()]
      : [""];

  const [template, setTemplate] = useState({
    title: templateToEdit?.title || "",
    subjectId: templateToEdit?.subjectId || "",
    criteriaId: templateToEdit?.criteriaId || "",
    sections: [],
    dueDate: "",
    requireSafetyGate: true,
    skillIds: initialSkillIds,
    materials: templateToEdit?.materials || [
      { inventoryId: "", name: "", numberOfItems: "" },
    ],
    isGroupSubmission: templateToEdit?.isGroupSubmission || false,
    groupFormation: templateToEdit?.groupFormation || "student",
    maxGroupSize: templateToEdit?.maxGroupSize || 4,
    assignmentId: templateToEdit?.assignmentId || null,
    labSessionId: templateToEdit?.labSessionId || null,
    // --- Added Peer Evaluation States ---
    enablePeerEvaluation: templateToEdit?.enablePeerEvaluation || false,
    peerEvaluationCriteria: templateToEdit?.peerEvaluationCriteria || [
      { name: "Participation", description: "Actively contributed to the lab work.", maxScore: 5 },
      { name: "Teamwork", description: "Collaborated well with other members.", maxScore: 5 },
    ],
  });

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const handleUpload = async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `experiment_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
      const filePath = `blocknote/${fileName}`;

      const { error } = await supabase.storage
        .from("inventory-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("inventory-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Supabase image upload error:", error);
      toast.error("Failed to upload image.");
      return "";
    }
  };

  const editor = useCreateBlockNote({
    uploadFile: handleUpload,
  });

  const handleImportPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file.");
      return;
    }

    setIsImportingPDF(true);
    const toastId = toast.loading("AI is converting your PDF layout into BlockNote...");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      // Send PDF to your backend Express route
      const response = await fetch(`${API_URL}/api/ai/parse-pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to process PDF with AI.");
      }

      const { html } = await response.json();

      // Convert Gemini's HTML straight into BlockNote blocks!
      const blocks = await editor.tryParseHTMLToBlocks(html);

      if (blocks && blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
        toast.success("PDF imported with preserved formatting!", { id: toastId });
      } else {
        toast.error("Could not parse formatted blocks from the document.", { id: toastId });
      }
    } catch (error) {
      console.error("PDF Import Error:", error);
      toast.error(error.message || "Failed to process PDF.", { id: toastId });
    } finally {
      setIsImportingPDF(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [invRes, skillsRes, sectionsRes, subjectsRes, criteriaRes] = await Promise.all(
          [
            fetch(`${API_URL}/api/inventory`, { credentials: "include" }),
            fetch(`${API_URL}/api/skills`, { credentials: "include" }),
            fetch(
              `${API_URL}/api/class-management/available-sections/${user.id}`,
              { credentials: "include" },
            ),
            fetch(`${API_URL}/api/subjects`, { credentials: "include" }),
            fetch(`${API_URL}/api/criteria/${user.id}`, { credentials: "include" }),
          ],
        );

        if (invRes.ok) setInventoryList(await invRes.json());
        if (skillsRes.ok) setSkillsList(await skillsRes.json());
        if (sectionsRes.ok) setAvailableSections(await sectionsRes.json());
        if (subjectsRes.ok) setAvailableSubjects(await subjectsRes.json());
        if (criteriaRes.ok) setAvailableCriteria(await criteriaRes.json());
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    fetchData();
  }, [user?.id, API_URL]);

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
                assignmentId:
                  currentAssignments[0].id ||
                  currentAssignments[0].assignmentId ||
                  prev.assignmentId,
                labSessionId:
                  currentAssignments[0].labSessionId || prev.labSessionId,
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
      const response = await fetch(`${API_URL}/api/skills`, {
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
      materials: [
        ...template.materials,
        { inventoryId: "", name: "", numberOfItems: "" },
      ],
    });
  };

  const removeMaterial = (index) => {
    const newMaterials = template.materials.filter((_, i) => i !== index);
    setTemplate({ ...template, materials: newMaterials });
  };

  // --- Peer Evaluation Handlers ---
  const addEvaluationCriterion = () => {
    setTemplate((prev) => ({
      ...prev,
      peerEvaluationCriteria: [
        ...prev.peerEvaluationCriteria,
        { name: "", description: "", maxScore: 5 },
      ],
    }));
  };

  const updateEvaluationCriterion = (index, field, value) => {
    const updatedCriteria = [...template.peerEvaluationCriteria];
    updatedCriteria[index][field] = value;
    setTemplate((prev) => ({
      ...prev,
      peerEvaluationCriteria: updatedCriteria,
    }));
  };

  const removeEvaluationCriterion = (index) => {
    const updatedCriteria = template.peerEvaluationCriteria.filter((_, i) => i !== index);
    setTemplate((prev) => ({
      ...prev,
      peerEvaluationCriteria: updatedCriteria,
    }));
  };

  const handleSave = async () => {
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);

      const validSkillIds = template.skillIds
        .filter((id) => id !== "")
        .map((id) => parseInt(id, 10));

      const templatePayload = {
        title: template.title,
        subjectId: template.subjectId,
        criteriaId: template.criteriaId ? parseInt(template.criteriaId, 10) : null,
        skillIds: validSkillIds,
        materials: template.materials
          .filter((m) => m.inventoryId !== "")
          .map((m) => ({
            ...m,
            numberOfItems: parseInt(m.numberOfItems, 10) || 1,
          })),
        instructionsHTML: htmlContent,
        isGroupSubmission: template.isGroupSubmission,
        maxGroupSize: template.isGroupSubmission ? template.maxGroupSize : 1,
        enablePeerEvaluation: template.isGroupSubmission ? template.enablePeerEvaluation : false,
        peerEvaluationCriteria: template.enablePeerEvaluation ? template.peerEvaluationCriteria : [],
      };

      if (
        !templatePayload.title ||
        !templatePayload.subjectId ||
        template.sections.length === 0 ||
        templatePayload.skillIds.length === 0 ||
        templatePayload.materials.length === 0
      ) {
        toast.error(
          "Please provide a title, select a subject, pick at least one section, choose a skill, and add a material.",
        );
        return;
      }

      const isEditing = !!templateToEdit;
      const templateUrl = isEditing
        ? `${API_URL}/api/experiments/${templateToEdit.id}`
        : `${API_URL}/api/experiments/create`;

      const method = isEditing ? "PUT" : "POST";

      const templateResponse = await fetch(templateUrl, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(templatePayload),
      });

      const templateData = await templateResponse.json();

      if (!templateResponse.ok) {
        return toast.error(templateData.error || "Failed to save template.");
      }

      const experimentId = isEditing
        ? templateToEdit.id
        : templateData.experiment.id;

      const assignPayload = {
        yearAndSections: template.sections,
        dueDate: template.dueDate || null,
        requireSafetyGate: template.requireSafetyGate,
      };

      const assignResponse = await fetch(
        `${API_URL}/api/experiments/${experimentId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(assignPayload),
        },
      );

      const assignData = await assignResponse.json();

      if (!assignResponse.ok) {
        return toast.error(
          assignData.error || "Template saved, but failed to assign sections.",
        );
      }

      toast.success(
        `Experiment ${isEditing ? "updated" : "created"} and assigned successfully!`,
      );
      if (onBack) onBack();
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
        {/* Left Sidebar */}
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
                Subject
              </Label>
              <select
                className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                value={template.subjectId}
                onChange={(e) =>
                  setTemplate({ ...template, subjectId: e.target.value })
                }
              >
                <option value='' disabled>
                  Select a subject...
                </option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-3'>
              <Label className='text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
                <SlidersHorizontal className='w-4 h-4 text-indigo-600' /> Grading Rubric Criteria
              </Label>
              <select
                className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                value={template.criteriaId}
                onChange={(e) =>
                  setTemplate({ ...template, criteriaId: e.target.value })
                }
              >
                <option value=''>Select criteria rubric...</option>
                {availableCriteria.map((crit) => (
                  <option key={crit.id} value={crit.id}>
                    {crit.name}
                  </option>
                ))}
              </select>
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

                  {/* --- NEW PEER EVALUATION SECTION --- */}
                  <div className='flex items-start space-x-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm mt-4'>
                    <input
                      type='checkbox'
                      id='enablePeerEvaluation'
                      checked={template.enablePeerEvaluation}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          enablePeerEvaluation: e.target.checked,
                        })
                      }
                      className='h-4 w-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
                    />
                    <div className='flex flex-col w-full'>
                      <Label
                        htmlFor='enablePeerEvaluation'
                        className='font-semibold cursor-pointer text-indigo-900'
                      >
                        Individual Peer Evaluation
                      </Label>
                      <span className='text-xs text-muted-foreground mt-1'>
                        Allow group members to rate each other's contributions.
                      </span>

                      {template.enablePeerEvaluation && (
                        <div className="mt-3">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
                                Customize Evaluation Rating
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white">
                              <div className="max-w-3xl mx-auto py-6 space-y-6">
                                <SheetHeader>
                                  <SheetTitle className="text-2xl">Peer Evaluation Criteria</SheetTitle>
                                  <SheetDescription>
                                    Define the specific metrics students will use to evaluate their group mates.
                                  </SheetDescription>
                                </SheetHeader>
                                <Separator />
                                
                                <div className="space-y-4 pb-20">
                                  {template.peerEvaluationCriteria.map((criterion, index) => (
                                    <div key={index} className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border relative group">
                                      <div className="flex-1 space-y-3">
                                        <div className="flex gap-4">
                                          <div className="flex-1">
                                            <Label className="text-xs text-muted-foreground uppercase">Criterion Name</Label>
                                            <Input 
                                              value={criterion.name} 
                                              onChange={(e) => updateEvaluationCriterion(index, "name", e.target.value)} 
                                              placeholder="e.g., Participation" 
                                              className="mt-1 bg-white"
                                            />
                                          </div>
                                          <div className="w-24">
                                            <Label className="text-xs text-muted-foreground uppercase">Max Score</Label>
                                            <Input 
                                              type="number" 
                                              min="1" 
                                              value={criterion.maxScore} 
                                              onChange={(e) => updateEvaluationCriterion(index, "maxScore", parseInt(e.target.value) || 1)} 
                                              className="mt-1 bg-white"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Description</Label>
                                          <Input 
                                            value={criterion.description} 
                                            onChange={(e) => updateEvaluationCriterion(index, "description", e.target.value)} 
                                            placeholder="What does a good score look like?" 
                                            className="mt-1 bg-white"
                                          />
                                        </div>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeEvaluationCriterion(index)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                        disabled={template.peerEvaluationCriteria.length <= 1}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}

                                  <Button variant="outline" onClick={addEvaluationCriterion} className="w-full border-dashed">
                                    <Plus className="w-4 h-4 mr-2" /> Add Criterion
                                  </Button>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      )}
                    </div>
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

                    <Input
                      type='number'
                      min='1'
                      placeholder='Qty'
                      className='w-20 h-9 shrink-0'
                      value={material.numberOfItems}
                      onChange={(e) => {
                        const newMaterials = [...template.materials];
                        newMaterials[index].numberOfItems = e.target.value;
                        setTemplate({ ...template, materials: newMaterials });
                      }}
                    />

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

                {/* --- ADDED: Hidden file input and Import PDF Button --- */}
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImportPDF}
                />
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImportingPDF}
                  className='bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {isImportingPDF ? "Extracting..." : "Import PDF"}
                </Button>

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