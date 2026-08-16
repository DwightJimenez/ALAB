import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  ArrowLeft,
  SlidersHorizontal,
  UploadCloud,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { TeacherQuizReview } from "./TeacherQuizReview";
import LabGroupManager from "./MatchMaking";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- UTILITY: Extract all active Supabase URLs from the editor's HTML ---
const extractMediaUrls = (html) => {
  const regex = /src=["']([^"']+)["']/g;
  const urls = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (
      match[1].includes(supabaseUrl) &&
      match[1].includes("inventory-images")
    ) {
      urls.push(match[1]);
    }
  }
  return urls;
};

const CreateExperiment = ({ templateToEdit, onBack }) => {
  const [inventoryList, setInventoryList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableCriteria, setAvailableCriteria] = useState([]);
  const [isImportingPDF, setIsImportingPDF] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- UPLOAD & MEDIA TRACKING STATES ---
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const knownMediaRef = useRef([]); // Tracks all active Supabase files to spot deleted ones

  // --- AUTO-SAVE STATES ---
  const [activeExperimentId, setActiveExperimentId] = useState(
    templateToEdit?.id || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const initialMount = useRef(true);

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
    enablePeerEvaluation: templateToEdit?.enablePeerEvaluation || false,
    peerEvaluationCriteria: templateToEdit?.peerEvaluationCriteria || [
      {
        name: "Participation",
        description: "Actively contributed to the lab work.",
        maxScore: 5,
      },
      {
        name: "Teamwork",
        description: "Collaborated well with other members.",
        maxScore: 5,
      },
    ],
  });

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const handleUpload = async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `experiment_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
      const filePath = `blocknote/${fileName}`;

      setIsUploading(true);
      setUploadProgress(0);

      const publicUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${supabaseUrl}/storage/v1/object/inventory-images/${filePath}`,
          true,
        );

        xhr.setRequestHeader("Authorization", `Bearer ${supabaseAnonKey}`);
        xhr.setRequestHeader("apikey", supabaseAnonKey);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.setRequestHeader("x-upsert", "false");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const { data } = supabase.storage
              .from("inventory-images")
              .getPublicUrl(filePath);

            // Add to known media list so we can track it for potential deletion later
            knownMediaRef.current.push(data.publicUrl);
            resolve(data.publicUrl);
          } else {
            let errorMsg = "Upload failed";
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.error) errorMsg = res.error;
            } catch (e) {}
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      return publicUrl;
    } catch (error) {
      console.error("Supabase file upload error:", error);
      toast.error("Failed to upload file.");
      return "";
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const editor = useCreateBlockNote({
    uploadFile: handleUpload,
  });

  // --- AUTO-SAVE TRIGGER ---
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    setIsDirty(true);
    setLastInteraction(Date.now());
  }, [template]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveExperiment(true);
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInteraction, isDirty]);

  // --- UNIFIED SAVE FUNCTION (Includes Storage Cleanup) ---
  const saveExperiment = useCallback(
    async (isAutoSave = false) => {
      try {
        const validSkillIds = template.skillIds
          .filter((id) => id !== "")
          .map((id) => parseInt(id, 10));

        const validMaterials = template.materials
          .filter((m) => m.inventoryId !== "")
          .map((m) => ({
            ...m,
            numberOfItems: parseInt(m.numberOfItems, 10) || 1,
          }));

        if (
          !template.title ||
          !template.subjectId ||
          template.sections.length === 0 ||
          validSkillIds.length === 0 ||
          validMaterials.length === 0
        ) {
          if (!isAutoSave) {
            toast.error(
              "Please provide a title, select a subject, pick at least one section, choose a skill, and add a material.",
            );
          }
          return false;
        }

        setIsSaving(true);
        const htmlContent = await editor.blocksToHTMLLossy(editor.document);

        // --- SUPABASE STORAGE CLEANUP ROUTINE ---
        // 1. Get all urls currently visible in the editor
        const currentUrls = extractMediaUrls(htmlContent);

        // 2. Find files we know about but are no longer in the editor
        const orphanedUrls = knownMediaRef.current.filter(
          (url) => !currentUrls.includes(url),
        );

        // 3. Delete them from Supabase storage silently
        if (orphanedUrls.length > 0) {
          const pathsToDelete = orphanedUrls
            .map((url) => url.split("/inventory-images/")[1])
            .filter(Boolean);

          if (pathsToDelete.length > 0) {
            supabase.storage
              .from("inventory-images")
              .remove(pathsToDelete)
              .catch((err) =>
                console.error("Silently failed to delete orphaned file:", err),
              );
          }
        }

        // 4. Update known media tracker to match active document state
        knownMediaRef.current = currentUrls;
        // ----------------------------------------

        const templatePayload = {
          title: template.title,
          subjectId: template.subjectId,
          criteriaId: template.criteriaId
            ? parseInt(template.criteriaId, 10)
            : null,
          skillIds: validSkillIds,
          materials: validMaterials,
          instructionsHTML: htmlContent,
          isGroupSubmission: template.isGroupSubmission,
          maxGroupSize: template.isGroupSubmission ? template.maxGroupSize : 1,
          enablePeerEvaluation: template.isGroupSubmission
            ? template.enablePeerEvaluation
            : false,
          peerEvaluationCriteria: template.enablePeerEvaluation
            ? template.peerEvaluationCriteria
            : [],
        };

        const isEditing = !!activeExperimentId;
        const templateUrl = isEditing
          ? `${API_URL}/api/experiments/${activeExperimentId}`
          : `${API_URL}/api/experiments/create`;

        const templateResponse = await fetch(templateUrl, {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(templatePayload),
        });

        const templateData = await templateResponse.json();

        if (!templateResponse.ok) {
          if (!isAutoSave)
            toast.error(templateData.error || "Failed to save template.");
          setIsSaving(false);
          return false;
        }

        const experimentId = isEditing
          ? activeExperimentId
          : templateData.experiment.id;

        if (!isEditing) setActiveExperimentId(experimentId);

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
          if (!isAutoSave)
            toast.error(
              assignData.error ||
                "Template saved, but failed to assign sections.",
            );
          setIsSaving(false);
          return false;
        }

        setIsDirty(false);
        setLastSaved(new Date());

        if (!isAutoSave) {
          toast.success(
            `Experiment ${isEditing ? "updated" : "created"} and assigned successfully!`,
          );
          if (onBack) onBack();
        }
      } catch (error) {
        console.error("Error saving template:", error);
        if (!isAutoSave) toast.error("A network error occurred.");
      } finally {
        setIsSaving(false);
      }
    },
    [template, editor, activeExperimentId, API_URL, onBack],
  );

  // --- DELETE FULL EXPERIMENT (Database + Storage Wipe) ---
  const handleDeleteExperiment = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this entire experiment? This action cannot be undone.",
      )
    )
      return;

    try {
      setIsSaving(true);

      // 1. Wipe all active media files belonging to this experiment from Supabase
      if (knownMediaRef.current.length > 0) {
        const pathsToDelete = knownMediaRef.current
          .map((url) => url.split("/inventory-images/")[1])
          .filter(Boolean);

        if (pathsToDelete.length > 0) {
          await supabase.storage.from("inventory-images").remove(pathsToDelete);
        }
      }

      // 2. Delete database record
      const response = await fetch(
        `${API_URL}/api/experiments/${activeExperimentId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete experiment.");
      }

      toast.success("Experiment deleted successfully!");
      if (onBack) onBack();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete experiment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file.");
      return;
    }

    setIsImportingPDF(true);
    const toastId = toast.loading(
      "AI is converting your PDF layout into BlockNote...",
    );

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch(`${API_URL}/api/ai/parse-pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to process PDF with AI.");

      const { html } = await response.json();
      const blocks = await editor.tryParseHTMLToBlocks(html);

      if (blocks && blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
        toast.success("PDF imported with preserved formatting!", {
          id: toastId,
        });
        setIsDirty(true);
        setLastInteraction(Date.now());
      } else {
        toast.error("Could not parse formatted blocks from the document.", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to process PDF.", { id: toastId });
    } finally {
      setIsImportingPDF(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [invRes, skillsRes, sectionsRes, subjectsRes, criteriaRes] =
          await Promise.all([
            fetch(`${API_URL}/api/inventory`, { credentials: "include" }),
            fetch(`${API_URL}/api/skills`, { credentials: "include" }),
            fetch(
              `${API_URL}/api/class-management/available-sections/${user.id}`,
              { credentials: "include" },
            ),
            fetch(`${API_URL}/api/subjects`, { credentials: "include" }),
            fetch(`${API_URL}/api/criteria/${user.id}`, {
              credentials: "include",
            }),
          ]);

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
        // Track the initially loaded media files
        knownMediaRef.current = extractMediaUrls(
          templateToEdit.instructionsHTML,
        );

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
    const updatedCriteria = template.peerEvaluationCriteria.filter(
      (_, i) => i !== index,
    );
    setTemplate((prev) => ({
      ...prev,
      peerEvaluationCriteria: updatedCriteria,
    }));
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
          {activeExperimentId ? "Edit Experiment" : "Create Experiment"}
        </h1>
      </div>

      <div className='flex-1 flex flex-col lg:flex-row gap-6 items-start'>
        {/* Left Sidebar */}
        {isSidebarOpen && (
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
                  <SlidersHorizontal className='w-4 h-4 text-indigo-600' />{" "}
                  Grading Rubric Criteria
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
                        <span className='text-sm font-medium'>
                          {sectionName}
                        </span>
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

              <div className='flex flex-col items-start gap-3 bg-slate-50 p-3 rounded-lg border'>
                <div className='flex gap-3 text-center items-center '>
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
                    className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                  />
                  <div className='flex flex-col'>
                    <Label
                      htmlFor='requireSafetyGate'
                      className='font-semibold cursor-pointer flex justify-center'
                    >
                      Require Safety Gate
                    </Label>
                    <span className='text-xs text-muted-foreground mt-1'>
                      Students must pass the BKT assessment before accessing
                      this lab.
                    </span>
                  </div>
                </div>

                {template.requireSafetyGate && (
                  <>
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
                                    onChange={(e) =>
                                      setNewSkillName(e.target.value)
                                    }
                                    required
                                  />
                                  <p className='text-xs text-slate-500 mt-2'>
                                    Default probability parameters will be
                                    applied.
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
                              onChange={(e) =>
                                handleSkillSelect(index, e.target.value)
                              }
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
                    </div>{" "}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant='secondary'
                          size='sm'
                          className='bg-indigo-100 mx-auto text-indigo-700 hover:bg-indigo-200 border border-indigo-200 shadow-sm'
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
                              Use Gemini to generate a BKT assessment based on
                              your drafted instructions.
                            </SheetDescription>
                          </SheetHeader>

                          <Separator />

                          <div className='pb-20'>
                            <TeacherQuizReview
                              lessonId={activeExperimentId || "new-experiment"}
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
                  </>
                )}
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
                          Student Self-Assigned (CODE)
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
                                  experimentId={activeExperimentId}
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
                          Allow group members to rate each other's
                          contributions.
                        </span>

                        {template.enablePeerEvaluation && (
                          <div className='mt-3'>
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                                >
                                  <SlidersHorizontal className='w-3.5 h-3.5 mr-2' />
                                  Customize Evaluation Rating
                                </Button>
                              </SheetTrigger>
                              <SheetContent
                                side='bottom'
                                className='max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white'
                              >
                                <div className='max-w-3xl mx-auto py-6 space-y-6'>
                                  <SheetHeader>
                                    <SheetTitle className='text-2xl'>
                                      Peer Evaluation Criteria
                                    </SheetTitle>
                                    <SheetDescription>
                                      Define the specific metrics students will
                                      use to evaluate their group mates.
                                    </SheetDescription>
                                  </SheetHeader>
                                  <Separator />

                                  <div className='space-y-4 pb-20'>
                                    {template.peerEvaluationCriteria.map(
                                      (criterion, index) => (
                                        <div
                                          key={index}
                                          className='flex gap-4 items-start bg-slate-50 p-4 rounded-lg border relative group'
                                        >
                                          <div className='flex-1 space-y-3'>
                                            <div className='flex gap-4'>
                                              <div className='flex-1'>
                                                <Label className='text-xs text-muted-foreground uppercase'>
                                                  Criterion Name
                                                </Label>
                                                <Input
                                                  value={criterion.name}
                                                  onChange={(e) =>
                                                    updateEvaluationCriterion(
                                                      index,
                                                      "name",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder='e.g., Participation'
                                                  className='mt-1 bg-white'
                                                />
                                              </div>
                                              <div className='w-24'>
                                                <Label className='text-xs text-muted-foreground uppercase'>
                                                  Max Score
                                                </Label>
                                                <Input
                                                  type='number'
                                                  min='1'
                                                  value={criterion.maxScore}
                                                  onChange={(e) =>
                                                    updateEvaluationCriterion(
                                                      index,
                                                      "maxScore",
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 1,
                                                    )
                                                  }
                                                  className='mt-1 bg-white'
                                                />
                                              </div>
                                            </div>
                                            <div>
                                              <Label className='text-xs text-muted-foreground uppercase'>
                                                Description
                                              </Label>
                                              <Input
                                                value={criterion.description}
                                                onChange={(e) =>
                                                  updateEvaluationCriterion(
                                                    index,
                                                    "description",
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder='What does a good score look like?'
                                                className='mt-1 bg-white'
                                              />
                                            </div>
                                          </div>
                                          <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() =>
                                              removeEvaluationCriterion(index)
                                            }
                                            className='text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0'
                                            disabled={
                                              template.peerEvaluationCriteria
                                                .length <= 1
                                            }
                                          >
                                            <Trash2 className='w-4 h-4' />
                                          </Button>
                                        </div>
                                      ),
                                    )}

                                    <Button
                                      variant='outline'
                                      onClick={addEvaluationCriterion}
                                      className='w-full border-dashed'
                                    >
                                      <Plus className='w-4 h-4 mr-2' /> Add
                                      Criterion
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
                  {template.materials.map((material, index) => {
                    const selectedItem =
                      inventoryList.find(
                        (item) => item.id === material.inventoryId,
                      ) || null;

                    return (
                      <div
                        key={`material-${index}`}
                        className='flex items-center gap-2'
                      >
                        <span className='text-sm font-medium text-muted-foreground w-4 shrink-0'>
                          {index + 1}.
                        </span>

                        <div className='flex-1 min-w-0'>
                          <Combobox
                            items={inventoryList}
                            value={selectedItem ? selectedItem.name : ""}
                            onValueChange={(selectedValue) => {
                              const foundItem = inventoryList.find(
                                (i) => i.name === selectedValue,
                              );
                              if (foundItem) {
                                handleMaterialSelect(index, foundItem.id);
                              }
                            }}
                            itemToStringValue={(item) => {
                              if (!item) return "";
                              return typeof item === "string"
                                ? item
                                : item.name;
                            }}
                            className='flex h-9 w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate'
                          >
                            <ComboboxInput
                              placeholder='Select item...'
                              className='h-9'
                            />
                            <ComboboxContent>
                              <ComboboxEmpty>No items found.</ComboboxEmpty>
                              <ComboboxList>
                                {(item) => (
                                  <ComboboxItem key={item.id} value={item.name}>
                                    {item.name}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </div>

                        <Input
                          type='number'
                          min='1'
                          placeholder='Qty'
                          className='w-20 h-9 shrink-0'
                          value={material.numberOfItems}
                          onChange={(e) => {
                            const newMaterials = [...template.materials];
                            newMaterials[index].numberOfItems = e.target.value;
                            setTemplate({
                              ...template,
                              materials: newMaterials,
                            });
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
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <div className='shrink-0 p-6 pt-0 mt-auto flex flex-col gap-3 bg-white rounded-b-xl z-10'>
              <Separator className='mb-2' />

              <Button
                onClick={() => saveExperiment(false)}
                className='w-full'
                disabled={isSaving || isUploading}
              >
                {activeExperimentId ? "Update Template" : "Save Template"}
              </Button>

              {/* --- NEW DELETE EXPERIMENT BUTTON --- */}
              {activeExperimentId && (
                <Button
                  variant='destructive'
                  onClick={handleDeleteExperiment}
                  className='w-full'
                  disabled={isSaving || isUploading}
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  Delete Template
                </Button>
              )}

              {onBack && (
                <Button
                  variant='outline'
                  onClick={onBack}
                  className='w-full'
                  disabled={isSaving || isUploading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Right Editor */}
        <div className='flex-1 w-full flex flex-col min-w-0'>
          <Card className='flex flex-col shadow-sm border-muted h-full relative overflow-hidden'>
            <CardHeader className='bg-muted/30 border-b py-4 flex flex-row justify-between items-center shrink-0 relative'>
              {isUploading && (
                <div className='absolute bottom-0 left-0 w-full h-1 bg-muted'>
                  <div
                    className='h-full bg-indigo-600 transition-all duration-300 ease-out'
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className='text-muted-foreground hover:text-foreground mr-1'
                  title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose className='w-5 h-5' />
                  ) : (
                    <PanelLeft className='w-5 h-5' />
                  )}
                </Button>

                <CardTitle className='text-lg'>Document Editor</CardTitle>

                <span className='text-xs font-medium ml-2 text-muted-foreground flex items-center gap-1.5 transition-opacity'>
                  {isUploading ? (
                    <>
                      <Loader2 className='w-3 h-3 animate-spin text-indigo-500' />
                      <span className='text-indigo-600'>
                        Uploading media ({uploadProgress}%)...
                      </span>
                    </>
                  ) : isSaving ? (
                    <>
                      <Loader2 className='w-3 h-3 animate-spin text-indigo-500' />
                      <span className='text-indigo-600'>Saving...</span>
                    </>
                  ) : isDirty ? (
                    "Unsaved changes"
                  ) : lastSaved ? (
                    <>
                      <CheckCircle2 className='w-3 h-3 text-emerald-500' />
                      <span className='text-emerald-600'>
                        Saved at{" "}
                        {lastSaved.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </>
                  ) : null}
                </span>
              </div>

              <div className='flex items-center gap-3'>
                <span className='text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded hidden sm:inline-block mr-2'>
                  Type '/' for commands
                </span>

                <input
                  type='file'
                  accept='application/pdf'
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
                  <UploadCloud className='w-4 h-4 mr-2' />
                  {isImportingPDF ? "Extracting..." : "Import PDF"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className='p-0 bg-background flex justify-center'>
              <div className='w-full max-w-[900px] md:p-6 min-h-[800px]'>
                <BlockNoteView
                  editor={editor}
                  theme='light'
                  onChange={() => {
                    setIsDirty(true);
                    setLastInteraction(Date.now());
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateExperiment;
