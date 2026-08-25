import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import {
  ArrowLeft,
  SlidersHorizontal,
  UploadCloud,
  Trash2,
  Loader2,
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  X,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { TeacherQuizReview } from "./TeacherQuizReview";
import LabGroupManager from "./MatchMaking";
import CriteriaMaker from "./CriteriaMaker";
import ManageBKT from "@/components/faculty/ManageBKT";
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
import SVGComponent from "./SVGComponent";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  const [isImportingPDF, setIsImportingPDF] = useState(false);
  const [isImportingWord, setIsImportingWord] = useState(false); // New state for Word import

  // Ribbon Tab State
  const [activeTab, setActiveTab] = useState("setup");
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);
  const [isCriteriaSheetOpen, setIsCriteriaSheetOpen] = useState(false);

  // Sections Dropdown State for Ribbon
  const [isSectionsDropdownOpen, setIsSectionsDropdownOpen] = useState(false);

  // --- UPLOAD & MEDIA TRACKING STATES ---
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const knownMediaRef = useRef([]);

  // --- AUTO-SAVE & EXIT STATES ---
  const [activeExperimentId, setActiveExperimentId] = useState(
    templateToEdit?.id || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editorInteraction, setEditorInteraction] = useState(null);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const [wipeGroupsOnSave, setWipeGroupsOnSave] = useState(false);
  const fileInputRef = useRef(null);
  const wordFileInputRef = useRef(null); // New ref for Word file input

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
    criteria: templateToEdit?.criteria || null,
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

  // Targeted state updater to accurately track user changes for the Ribbon
  const updateTemplateState = (updater) => {
    setTemplate(updater);
    setIsDirty(true);
  };

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

  useEffect(() => {
    if (!editorInteraction) return;
    const timer = setTimeout(() => {
      saveExperiment(true, false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [editorInteraction]);

  const handleBack = () => {
    if (isDirty) {
      setShowExitPrompt(true);
    } else {
      if (onBack) onBack();
    }
  };

  const saveExperiment = useCallback(
    async (isAutoSave = false, shouldExit = false) => {
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

        setIsSaving(true);
        const htmlContent = await editor.blocksToHTMLLossy(editor.document);

        const templatePayload = {
          // Provide fallbacks so database constraints don't crash on empty strings
          title: template.title || "Untitled Experiment",
          subjectId: template.subjectId || null,
          criteria: template.criteria,
          skillIds: validSkillIds,
          materials: validMaterials,
          instructionsHTML: htmlContent,
          isGroupSubmission: template.isGroupSubmission,
          groupFormation: template.isGroupSubmission
            ? template.groupFormation
            : "student",
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

        if (!isAutoSave && wipeGroupsOnSave && template.sections.length > 0) {
          try {
            await Promise.all(
              template.sections.map((section) =>
                fetch(`${API_URL}/api/matchmaking/save`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    sectionName: section,
                    finalizedGroups: [],
                    experimentId: experimentId,
                    assignmentId: template.assignmentId,
                    labSessionId: template.labSessionId,
                  }),
                }),
              ),
            );
            setWipeGroupsOnSave(false);
          } catch (err) {
            console.error("Failed to clear matchmaking groups:", err);
          }
        }

        setLastSaved(new Date());

        // ONLY clear the dirty state if this was a manual save
        if (!isAutoSave) {
          setIsDirty(false);
          toast.success(
            `Experiment ${isEditing ? "updated" : "created"} successfully!`,
          );
          if (shouldExit && onBack) onBack();
        }
        return true;
      } catch (error) {
        console.error("Error saving template:", error);
        if (!isAutoSave) toast.error("A network error occurred.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [template, editor, activeExperimentId, API_URL, onBack, wipeGroupsOnSave],
  );

  const handleDeleteExperiment = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this entire experiment? This action cannot be undone.",
      )
    )
      return;

    try {
      setIsSaving(true);

      if (knownMediaRef.current.length > 0) {
        const pathsToDelete = knownMediaRef.current
          .map((url) => url.split("/inventory-images/")[1])
          .filter(Boolean);

        if (pathsToDelete.length > 0) {
          await supabase.storage.from("inventory-images").remove(pathsToDelete);
        }
      }

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
        setEditorInteraction(Date.now());
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

  // --- NEW HANDLER FOR WORD IMPORT ---
  const handleImportWord = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(doc|docx)$/i)) {
      toast.error("Please select a valid Word document (.doc or .docx).");
      return;
    }

    setIsImportingWord(true);
    const toastId = toast.loading(
      "AI is converting your Word document into BlockNote...",
    );

    try {
      const formData = new FormData();
      // Assuming your backend uses "word" or "file" for the key (adjust as needed if it shares the same endpoint)
      formData.append("word", file);

      // Assumed endpoint for parsing word documents.
      // Update this if you use the same `/parse-pdf` route for all files.
      const response = await fetch(`${API_URL}/api/ai/parse-word`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok)
        throw new Error("Failed to process Word document with AI.");

      const { html } = await response.json();
      const blocks = await editor.tryParseHTMLToBlocks(html);

      if (blocks && blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
        toast.success("Word document imported with preserved formatting!", {
          id: toastId,
        });
        setEditorInteraction(Date.now());
      } else {
        toast.error("Could not parse formatted blocks from the document.", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to process Word document.", {
        id: toastId,
      });
    } finally {
      setIsImportingWord(false);
      if (wordFileInputRef.current) wordFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [invRes, skillsRes, sectionsRes, subjectsRes] = await Promise.all(
          [
            fetch(`${API_URL}/api/inventory`, { credentials: "include" }),
            fetch(`${API_URL}/api/skills`, { credentials: "include" }),
            fetch(
              `${API_URL}/api/class-management/available-sections/${user.id}`,
              { credentials: "include" },
            ),
            fetch(`${API_URL}/api/subjects`, { credentials: "include" }),
          ],
        );

        if (invRes.ok) setInventoryList(await invRes.json());
        if (skillsRes.ok) setSkillsList(await skillsRes.json());
        if (sectionsRes.ok) setAvailableSections(await sectionsRes.json());
        if (subjectsRes.ok) setAvailableSubjects(await subjectsRes.json());
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    fetchData();
  }, [user?.id, API_URL]);

  useEffect(() => {
    const loadRichText = async () => {
      if (templateToEdit && templateToEdit.instructionsHTML) {
        knownMediaRef.current = extractMediaUrls(
          templateToEdit.instructionsHTML,
        );

        const blocks = await editor.tryParseHTMLToBlocks(
          templateToEdit.instructionsHTML,
        );
        editor.replaceBlocks(editor.document, blocks);

        setTimeout(() => setIsDirty(false), 100);
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

              setTimeout(() => setIsDirty(false), 100);
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
    updateTemplateState({ ...template, [name]: value });
  };

  const toggleSection = (sectionName) => {
    updateTemplateState((prev) => {
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
    updateTemplateState({ ...template, skillIds: newSkillIds });
  };

  const addSkill = () => {
    updateTemplateState({ ...template, skillIds: [...template.skillIds, ""] });
  };

  const removeSkill = (index) => {
    const newSkillIds = template.skillIds.filter((_, i) => i !== index);
    updateTemplateState({ ...template, skillIds: newSkillIds });
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

        updateTemplateState({ ...template, skillIds: newSkillIds });
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
    updateTemplateState({ ...template, materials: newMaterials });
  };

  const addMaterial = () => {
    updateTemplateState({
      ...template,
      materials: [
        ...template.materials,
        { inventoryId: "", name: "", numberOfItems: "" },
      ],
    });
  };

  const removeMaterial = (index) => {
    const newMaterials = template.materials.filter((_, i) => i !== index);
    updateTemplateState({ ...template, materials: newMaterials });
  };

  const addEvaluationCriterion = () => {
    updateTemplateState((prev) => ({
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
    updateTemplateState((prev) => ({
      ...prev,
      peerEvaluationCriteria: updatedCriteria,
    }));
  };

  const removeEvaluationCriterion = (index) => {
    const updatedCriteria = template.peerEvaluationCriteria.filter(
      (_, i) => i !== index,
    );
    updateTemplateState((prev) => ({
      ...prev,
      peerEvaluationCriteria: updatedCriteria,
    }));
  };

  const selectedSkillNames = template.skillIds
    .map((id) => skillsList.find((s) => s.id === parseInt(id))?.name)
    .filter(Boolean);

  // ==========================================
  // RIBBON UI RENDER METHODS
  // ==========================================

  const renderTabButton = (tabId, label) => (
    <button
      onClick={() => {
        setActiveTab(tabId);
        setIsRibbonCollapsed(false);
      }}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        activeTab === tabId && !isRibbonCollapsed
          ? "border-indigo-600 text-indigo-700 bg-white"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className='flex flex-col h-screen w-full bg-[#f3f4f6] overflow-hidden font-sans'>
      {/* INJECT TOUR HERE */}
      {user && (
        <ExperimentBuilderTour user={user} setActiveTab={setActiveTab} />
      )}

      <Dialog open={showExitPrompt} onOpenChange={setShowExitPrompt}>
        <DialogContent className='sm:max-w-md bg-white'>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <div className='text-sm text-slate-500 mb-2'>
            You have unsaved changes in this template. Would you like to save
            them before leaving?
          </div>
          <div className='flex flex-col sm:flex-row gap-2 justify-end mt-4'>
            <Button variant='ghost' onClick={() => setShowExitPrompt(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                setShowExitPrompt(false);
                if (onBack) onBack();
              }}
            >
              Discard Changes
            </Button>
            <Button
              onClick={async () => {
                const success = await saveExperiment(false, true);
                if (success) setShowExitPrompt(false);
              }}
              disabled={isSaving}
              className='bg-indigo-600 hover:bg-indigo-700 text-white min-w-[110px]'
            >
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                "Save & Exit"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK ACCESS HEADER */}
      <header
        data-tour='tour-exp-header'
        className='relative shrink-0 flex items-center justify-between px-4 h-12 bg-gradient-to-r from-[#8F1EAE] to-indigo-500 text-white shadow-sm z-20'
      >
        <div
          className='absolute inset-y-0 left-0 w-1/2 pointer-events-none opacity-30 z-0'
          style={{
            maskImage: "linear-gradient(to right, black 20%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, black 20%, transparent 100%)",
          }}
        >
          <SVGComponent />
        </div>
        <div className='flex items-center gap-4 relative z-10'>
          {onBack && (
            <button
              onClick={handleBack}
              className='p-1.5 hover:bg-indigo-600 rounded-md transition-colors'
              title='Back to Library'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>
          )}
          <div className='flex items-center gap-3'>
            <span className='font-semibold text-sm'>
              {activeExperimentId
                ? "Edit Experiment Template"
                : "New Experiment Template"}
            </span>
            <Separator orientation='vertical' className='h-4 bg-indigo-500' />
            <div className='flex items-center gap-2'>
              <button
                onClick={() => saveExperiment(false, false)}
                disabled={isSaving || isUploading}
                className='p-1.5 hover:bg-indigo-600 rounded-md transition-colors disabled:opacity-50'
                title='Save Document'
              >
                <Save className='w-4 h-4' />
              </button>

              <span className='text-[10px] font-medium text-indigo-100 flex items-center gap-1.5'>
                {isUploading ? (
                  <>
                    <Loader2 className='w-3 h-3 animate-spin' /> Uploading...
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className='w-3 h-3 animate-spin' /> Saving...
                  </>
                ) : isDirty ? (
                  "Unsaved changes"
                ) : lastSaved ? (
                  <>
                    <CheckCircle2 className='w-3 h-3 text-indigo-300' /> Saved
                    to cloud
                  </>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2 relative z-10'>
          {activeExperimentId && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleDeleteExperiment}
              disabled={isSaving || isUploading}
              className='text-indigo-100 hover:text-white hover:bg-red-500 h-8 px-3 text-xs'
            >
              <Trash2 className='w-3.5 h-3.5 mr-1.5' /> Delete
            </Button>
          )}

          {/* WORD IMPORT INPUT & BUTTON */}
          <input
            type='file'
            accept='.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ref={wordFileInputRef}
            style={{ display: "none" }}
            onChange={handleImportWord}
          />
          <Button
            variant='secondary'
            size='sm'
            onClick={() => wordFileInputRef.current?.click()}
            disabled={isImportingWord || isImportingPDF}
            className='h-8 bg-blue-600 text-white hover:bg-blue-500 border-none px-3 text-xs'
          >
            <UploadCloud className='w-3.5 h-3.5 mr-1.5' />
            {isImportingWord ? "Extracting..." : "Import Word"}
          </Button>

          {/* PDF IMPORT INPUT & BUTTON */}
          <input
            type='file'
            accept='application/pdf'
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImportPDF}
          />
          <Button
            variant='secondary'
            size='sm'
            onClick={() => fileInputRef.current?.click()}
            disabled={isImportingPDF || isImportingWord}
            className='h-8 bg-indigo-600 text-white hover:bg-indigo-500 border-none px-3 text-xs'
          >
            <UploadCloud className='w-3.5 h-3.5 mr-1.5' />
            {isImportingPDF ? "Extracting..." : "Import PDF"}
          </Button>
        </div>
      </header>

      {/* RIBBON TABS */}
      <div
        data-tour='tour-exp-ribbon'
        className='shrink-0 bg-white border-b border-slate-200 z-10 flex justify-between items-center px-2 pt-1'
      >
        <div className='flex'>
          {renderTabButton("setup", "Document Setup")}
          {renderTabButton("grading", "Assessment & Safety")}
          {renderTabButton("teams", "Teams & Collaboration")}
          {renderTabButton("materials", "Inventory & Materials")}
        </div>
        <button
          onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
          className='p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors mr-2'
          title={isRibbonCollapsed ? "Expand Ribbon" : "Collapse Ribbon"}
        >
          {isRibbonCollapsed ? (
            <ChevronDown className='w-4 h-4' />
          ) : (
            <ChevronUp className='w-4 h-4' />
          )}
        </button>
      </div>

      {/* RIBBON CONTENT AREA */}
      {!isRibbonCollapsed && (
        <div className='shrink-0 bg-slate-50 border-b border-slate-200 shadow-sm z-10 min-h-[110px] flex px-4 py-3 overflow-x-auto'>
          {/* --- TAB: DOCUMENT SETUP --- */}
          {activeTab === "setup" && (
            <div className='flex gap-6 h-full items-start'>
              {/* General Info Group */}
              <div
                data-tour='tour-setup-title'
                className='flex flex-col gap-3 pr-6 border-r border-slate-200 min-w-[280px]'
              >
                <div className='flex flex-col gap-1.5'>
                  <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                    Experiment Title
                  </Label>
                  <Input
                    id='title'
                    placeholder='e.g., Effect of Light on Plant Growth'
                    value={template.title}
                    onChange={handleInputChange}
                    name='title'
                    className='h-8 text-sm bg-white'
                  />
                </div>
              </div>

              {/* Course Details Group */}
              <div
                data-tour='tour-setup-subject'
                className='flex gap-4 pr-6 border-r border-slate-200'
              >
                <div className='flex flex-col gap-1.5 min-w-[180px]'>
                  <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                    Subject
                  </Label>
                  <select
                    className='flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-sm'
                    value={template.subjectId}
                    onChange={(e) =>
                      updateTemplateState({
                        ...template,
                        subjectId: e.target.value,
                      })
                    }
                  >
                    <option value='' disabled>
                      Select subject...
                    </option>

                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='flex flex-col gap-1.5 min-w-[150px]'>
                  <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                    Target Date
                  </Label>
                  <Input
                    type='date'
                    value={template.dueDate}
                    onChange={(e) =>
                      updateTemplateState({
                        ...template,
                        dueDate: e.target.value,
                      })
                    }
                    className='h-8 text-sm bg-white'
                  />
                </div>
              </div>

              {/* Sections Group */}
              <div
                data-tour='tour-setup-sections'
                className='flex flex-col gap-1.5 min-w-[220px]'
              >
                <Label className='text-[10px] uppercase text-slate-500 font-bold flex justify-between'>
                  Target Sections
                  <span className='text-indigo-600 lowercase font-medium'>
                    {template.sections.length} selected
                  </span>
                </Label>

                <div className='relative'>
                  <div
                    onClick={() =>
                      setIsSectionsDropdownOpen(!isSectionsDropdownOpen)
                    }
                    className='flex h-8 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-1 text-sm cursor-pointer'
                  >
                    <span className='truncate pr-2'>
                      {template.sections.length > 0
                        ? template.sections.join(", ")
                        : "Select sections..."}
                    </span>
                    <ChevronDown className='h-4 w-4 opacity-50' />
                  </div>

                  {isSectionsDropdownOpen && (
                    <div className='absolute top-9 left-0 w-full bg-white border shadow-md rounded-md p-2 z-50 max-h-40 overflow-y-auto'>
                      {availableSections.length > 0 ? (
                        availableSections.map((sectionName, index) => (
                          <label
                            key={index}
                            className='flex items-center space-x-2 p-1.5 hover:bg-slate-50 cursor-pointer rounded'
                          >
                            <input
                              type='checkbox'
                              className='h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
                              checked={template.sections.includes(sectionName)}
                              onChange={() => toggleSection(sectionName)}
                            />
                            <span className='text-xs font-medium'>
                              {sectionName}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className='text-xs text-muted-foreground p-2'>
                          Loading...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {isSectionsDropdownOpen && (
                  <div
                    className='fixed inset-0 z-40'
                    onClick={() => setIsSectionsDropdownOpen(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* --- TAB: ASSESSMENT & SAFETY --- */}
          {activeTab === "grading" && (
            <div className='flex gap-6 h-full items-start'>
              {/* Grading Rubric Group */}
              <div
                data-tour='tour-grading-rubric'
                className='flex flex-col gap-2 pr-6 border-r border-slate-200 min-w-[200px]'
              >
                <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                  Grading Rubric
                </Label>
                <div className='flex flex-col justify-center h-14 bg-white border border-slate-200 rounded-md p-2'>
                  {template.criteria &&
                  template.criteria.components &&
                  template.criteria.components.length > 0 ? (
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                        <span className='text-xs font-medium text-emerald-700'>
                          Attached ({template.criteria.components.length})
                        </span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Sheet
                          open={isCriteriaSheetOpen}
                          onOpenChange={setIsCriteriaSheetOpen}
                        >
                          <SheetTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-6 px-1.5 text-[10px]'
                            >
                              Edit
                            </Button>
                          </SheetTrigger>
                          <SheetContent
                            side='bottom'
                            className='max-h-[90vh] sm:h-[90vh] overflow-y-auto rounded-t-xl bg-white z-[100]'
                          >
                            <div className='max-w-4xl mx-auto py-6 space-y-6'>
                              <SheetHeader className='mb-6'>
                                <SheetTitle className='text-2xl'>
                                  Configure Dedicated Criteria
                                </SheetTitle>
                              </SheetHeader>
                              <CriteriaMaker
                                editor={editor}
                                initialCriteria={template.criteria}
                                onSave={(savedProfile) => {
                                  updateTemplateState({
                                    ...template,
                                    criteria: savedProfile,
                                  });
                                  setIsCriteriaSheetOpen(false);
                                }}
                              />
                            </div>
                          </SheetContent>
                        </Sheet>
                        <button
                          onClick={() =>
                            updateTemplateState({ ...template, criteria: null })
                          }
                          className='text-slate-400 hover:text-red-500 p-1'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-slate-500'>
                        None attached
                      </span>
                      <Sheet
                        open={isCriteriaSheetOpen}
                        onOpenChange={setIsCriteriaSheetOpen}
                      >
                        <SheetTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-6 px-2 text-[10px]'
                          >
                            + Create
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side='bottom'
                          className='max-h-[90vh] sm:h-[90vh] overflow-y-auto rounded-t-xl bg-white z-[100]'
                        >
                          <div className='max-w-4xl mx-auto py-6 space-y-6'>
                            <SheetHeader className='mb-6'>
                              <SheetTitle className='text-2xl'>
                                Configure Dedicated Criteria
                              </SheetTitle>
                            </SheetHeader>
                            <CriteriaMaker
                              editor={editor}
                              onSave={(savedProfile) => {
                                updateTemplateState({
                                  ...template,
                                  criteria: savedProfile,
                                });
                                setIsCriteriaSheetOpen(false);
                              }}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Gate Group */}
              <div
                data-tour='tour-grading-safety'
                className='flex flex-col gap-2 min-w-[400px]'
              >
                {/* Wrapped the label and the new button in a flex-between container */}
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                      Safety Gate (BKT)
                    </Label>
                    <label className='flex items-center gap-1.5 cursor-pointer ml-2'>
                      <input
                        type='checkbox'
                        className='h-3 w-3'
                        checked={template.requireSafetyGate}
                        onChange={(e) =>
                          updateTemplateState({
                            ...template,
                            requireSafetyGate: e.target.checked,
                          })
                        }
                      />
                      <span className='text-xs font-medium'>Enable</span>
                    </label>
                    {template.requireSafetyGate && (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 text-[10px] text-indigo-600 hover:bg-indigo-50 font-bold'
                          >
                            ⚙️ Manage BKT Bank
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side='bottom'
                          className='max-h-[90vh] h-[90vh] overflow-hidden rounded-t-xl bg-white z-[100] p-0 flex flex-col'
                        >
                          <SheetHeader className='p-6 border-b shrink-0'>
                            <SheetTitle className='text-2xl'>
                              BKT Skills & Questions Bank
                            </SheetTitle>
                          </SheetHeader>

                          {/* Render the ManageBKT component here */}
                          <div className='flex-1 overflow-y-auto bg-slate-50'>
                            <ManageBKT />
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                  </div>
                </div>

                {template.requireSafetyGate ? (
                  <div className='flex gap-4 items-center h-14'>
                    <div className='flex-1 flex gap-2 items-center bg-white border rounded-md p-1.5 px-2 overflow-x-auto min-w-0'>
                      <span className='text-[10px] text-slate-400 font-semibold shrink-0'>
                        SKILLS:
                      </span>
                      {template.skillIds.map((skillId, index) => (
                        <div key={index} className='flex items-center gap-1'>
                          <select
                            className='h-6 min-w-[120px] rounded border border-input bg-slate-50 px-1 text-xs shrink-0'
                            value={skillId}
                            onChange={(e) =>
                              handleSkillSelect(index, e.target.value)
                            }
                          >
                            <option value='' disabled>
                              Select skill...
                            </option>
                            {skillsList.map((skill) => (
                              <option key={skill.id} value={skill.id}>
                                {skill.name}
                              </option>
                            ))}
                          </select>

                          {/* NEW: Remove Skill Button */}
                          <button
                            onClick={() => removeSkill(index)}
                            disabled={template.skillIds.length === 1} // Prevent deleting the last skill
                            className='text-slate-400 hover:text-red-500 p-1 disabled:opacity-30 transition-colors'
                            title='Remove Skill'
                          >
                            <Trash2 className='w-3 h-3' />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={addSkill}
                        className='h-6 px-2 text-[10px] shrink-0 border border-dashed border-slate-300'
                      >
                        + Add
                      </Button>
                    </div>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          size='sm'
                          className='h-8 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 shadow-sm shrink-0 text-xs'
                        >
                          ✨ Generate Quiz
                        </Button>
                      </SheetTrigger>
                      <SheetContent
                        side='bottom'
                        className='max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white z-[100]'
                      >
                        <div className='max-w-4xl mx-auto py-6 space-y-6'>
                          <SheetHeader className='mb-6'>
                            <SheetTitle className='text-2xl'>
                              Configure Safety Gate
                            </SheetTitle>
                          </SheetHeader>
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
                      </SheetContent>
                    </Sheet>
                  </div>
                ) : (
                  <div className='h-14 flex items-center text-xs text-slate-400 italic'>
                    Safety Gate is disabled for this experiment.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- TAB: TEAMS & COLLABORATION --- */}
          {activeTab === "teams" && (
            <div className='flex gap-6 h-full items-start'>
              {/* Mode Group */}
              <div
                data-tour='tour-teams-mode'
                className='flex flex-col gap-1.5 pr-6 border-r border-slate-200 min-w-[150px]'
              >
                <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                  Submission Mode
                </Label>
                <select
                  className='flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-sm'
                  value={template.isGroupSubmission ? "true" : "false"}
                  onChange={(e) =>
                    updateTemplateState({
                      ...template,
                      isGroupSubmission: e.target.value === "true",
                    })
                  }
                >
                  <option value='false'>Individual</option>
                  <option value='true'>By Group</option>
                </select>
              </div>

              {/* Group Settings */}
              {template.isGroupSubmission && (
                <>
                  <div
                    data-tour='tour-teams-matchmaking'
                    className='flex gap-4 pr-6 border-r border-slate-200'
                  >
                    <div className='flex flex-col gap-1.5 min-w-[200px]'>
                      <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                        Group Formation
                      </Label>
                      <select
                        className='flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-sm'
                        value={template.groupFormation}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (
                            val === "student" &&
                            template.groupFormation === "teacher"
                          ) {
                            toast.info(
                              "Teacher-assigned groups will be cleared when you click 'Update Template'.",
                            );
                            setWipeGroupsOnSave(true);
                          } else {
                            setWipeGroupsOnSave(false);
                          }
                          updateTemplateState({
                            ...template,
                            groupFormation: val,
                          });
                        }}
                      >
                        <option value='student'>Student Self-Assigned</option>
                        <option value='teacher'>Auto-Group (BKT)</option>
                      </select>
                    </div>

                    <div className='flex flex-col gap-1.5 min-w-[100px]'>
                      <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                        Max Size
                      </Label>
                      <Input
                        type='number'
                        min='2'
                        max='10'
                        value={template.maxGroupSize}
                        onChange={(e) =>
                          updateTemplateState({
                            ...template,
                            maxGroupSize: parseInt(e.target.value) || 2,
                          })
                        }
                        className='h-8 text-sm bg-white'
                      />
                    </div>

                    {template.groupFormation === "teacher" && (
                      <div className='flex items-end pb-[2px]'>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 text-xs'
                              disabled={template.sections.length === 0}
                            >
                              👥 Matchmaking
                            </Button>
                          </SheetTrigger>
                          <SheetContent
                            side='bottom'
                            className='max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white z-[100]'
                          >
                            <div className='max-w-6xl mx-auto py-6 space-y-6'>
                              <SheetHeader className='mb-6'>
                                <SheetTitle className='text-2xl'>
                                  Adjust Lab Groups
                                </SheetTitle>
                              </SheetHeader>
                              <LabGroupManager
                                sections={template.sections}
                                template={template}
                                setTemplate={updateTemplateState}
                                experimentId={activeExperimentId}
                                assignmentId={template.assignmentId}
                                labSessionId={template.labSessionId}
                              />
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    )}
                  </div>

                  {/* Peer Eval Group */}
                  <div
                    data-tour='tour-teams-peer'
                    className='flex flex-col gap-2 min-w-[200px]'
                  >
                    <div className='flex items-center gap-2'>
                      <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                        Peer Evaluation
                      </Label>
                      <label className='flex items-center gap-1.5 cursor-pointer ml-2'>
                        <input
                          type='checkbox'
                          className='h-3 w-3'
                          checked={template.enablePeerEvaluation}
                          onChange={(e) =>
                            updateTemplateState({
                              ...template,
                              enablePeerEvaluation: e.target.checked,
                            })
                          }
                        />
                        <span className='text-xs font-medium'>Enable</span>
                      </label>
                    </div>

                    {template.enablePeerEvaluation && (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 text-xs w-full justify-start text-indigo-700 bg-indigo-50 border-indigo-200'
                          >
                            <SlidersHorizontal className='w-3 h-3 mr-2' /> Edit
                            Criteria ({template.peerEvaluationCriteria.length})
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side='bottom'
                          className='max-h-[85vh] sm:h-[85vh] overflow-y-auto rounded-t-xl bg-white z-[100]'
                        >
                          <div className='max-w-3xl mx-auto py-6 space-y-6'>
                            <SheetHeader>
                              <SheetTitle className='text-2xl'>
                                Peer Evaluation Criteria
                              </SheetTitle>
                            </SheetHeader>
                            <div className='space-y-4 pb-20'>
                              {template.peerEvaluationCriteria.map(
                                (criterion, index) => (
                                  <div
                                    key={index}
                                    className='flex gap-4 items-start bg-slate-50 p-4 rounded-lg border'
                                  >
                                    <div className='flex-1 space-y-3'>
                                      <div className='flex gap-4'>
                                        <div className='flex-1'>
                                          <Label className='text-xs'>
                                            Name
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
                                            className='mt-1 bg-white'
                                          />
                                        </div>
                                        <div className='w-24'>
                                          <Label className='text-xs'>
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
                                                parseInt(e.target.value) || 1,
                                              )
                                            }
                                            className='mt-1 bg-white'
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label className='text-xs'>
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
                                      disabled={
                                        template.peerEvaluationCriteria
                                          .length <= 1
                                      }
                                      className='text-red-500'
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
                                + Add Criterion
                              </Button>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* --- TAB: INVENTORY --- */}
          {activeTab === "materials" && (
            <div
              data-tour='tour-materials-list'
              className='flex gap-6 h-full items-start w-full'
            >
              <div className='flex flex-col gap-2 w-full max-w-4xl'>
                <div className='flex items-center justify-between'>
                  <Label className='text-[10px] uppercase text-slate-500 font-bold'>
                    Required Equipment & Materials
                  </Label>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={addMaterial}
                    className='h-6 px-2 text-xs text-indigo-600 hover:bg-indigo-50'
                  >
                    + Add Item
                  </Button>
                </div>

                <div className='flex flex-wrap gap-2 items-center bg-white p-2 border border-slate-200 rounded-md max-h-24 overflow-y-auto'>
                  {template.materials.length === 0 && (
                    <span className='text-xs text-slate-400 p-1 px-2'>
                      No materials added.
                    </span>
                  )}
                  {template.materials.map((material, index) => {
                    const selectedItem =
                      inventoryList.find(
                        (item) => item.id === material.inventoryId,
                      ) || null;
                    return (
                      <div
                        key={index}
                        className='flex items-center gap-1.5 bg-slate-50 border rounded p-1 pl-2'
                      >
                        <Combobox
                          items={inventoryList}
                          value={selectedItem ? selectedItem.name : ""}
                          onValueChange={(selectedValue) => {
                            const foundItem = inventoryList.find(
                              (i) => i.name === selectedValue,
                            );
                            if (foundItem)
                              handleMaterialSelect(index, foundItem.id);
                          }}
                          itemToStringValue={(item) =>
                            !item
                              ? ""
                              : typeof item === "string"
                                ? item
                                : item.name
                          }
                          className='h-7 w-[160px] text-xs border-none shadow-none bg-transparent focus-within:ring-0 px-0'
                        >
                          <ComboboxInput
                            placeholder='Select item...'
                            className='h-7 text-xs border border-slate-200 px-2 rounded bg-white'
                          />
                          <ComboboxContent>
                            <ComboboxEmpty>No items found.</ComboboxEmpty>
                            <ComboboxList>
                              {(item) => (
                                <ComboboxItem
                                  key={item.id}
                                  value={item.name}
                                  className='text-xs'
                                >
                                  {item.name}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>

                        <span className='text-xs text-slate-400'>×</span>

                        <Input
                          type='number'
                          min='1'
                          placeholder='Qty'
                          className='w-12 h-7 text-xs px-1 text-center bg-white'
                          value={material.numberOfItems}
                          onChange={(e) => {
                            const newMaterials = [...template.materials];
                            newMaterials[index].numberOfItems = e.target.value;
                            updateTemplateState({
                              ...template,
                              materials: newMaterials,
                            });
                          }}
                        />

                        <button
                          onClick={() => removeMaterial(index)}
                          disabled={template.materials.length === 1}
                          className='text-slate-400 hover:text-red-500 p-1 disabled:opacity-30'
                        >
                          <Trash2 className='w-3 h-3' />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BLOCKNOTE EDITOR WORKSPACE */}
      <div className='flex-1 overflow-y-auto bg-[#e5e7eb] flex justify-center py-8 px-4 relative z-0'>
        {isUploading && (
          <div className='fixed top-0 left-0 w-full h-1 bg-muted z-50'>
            <div
              className='h-full bg-indigo-600 transition-all duration-300 ease-out'
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* The Paper Sheet */}
        <div
          data-tour='tour-exp-editor'
          className='w-full max-w-[850px] bg-white min-h-[1100px] h-fit shadow-lg border border-slate-200 rounded-sm p-10 md:p-16 mb-20 relative'
        >
          <BlockNoteView
            editor={editor}
            theme='light'
            onChange={() => {
              // Only triggers the auto-save, does not set isDirty to true
              setEditorInteraction(Date.now());
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// LOCALIZED GUIDED TOUR FOR EXPERIMENT BUILDER
// ==========================================

const EXPERIMENT_TOUR_STEPS = [
  {
    target: "tour-exp-header",
    title: "Document Controls",
    description:
      "Save your progress, delete the template, or import an existing lab PDF or Word Document.",
  },
  {
    target: "tour-exp-ribbon",
    title: "Configuration Ribbon",
    description:
      "Use these tabs to switch between document settings, rubrics, team limits, and inventory.",
  },

  // SETUP TAB
  {
    target: "tour-setup-title",
    tab: "setup",
    title: "Experiment Title",
    description:
      "Name your experiment. This will be visible to all assigned students.",
  },
  {
    target: "tour-setup-subject",
    tab: "setup",
    title: "Course Details",
    description:
      "Select the subject and target date for this laboratory activity.",
  },
  {
    target: "tour-setup-sections",
    tab: "setup",
    title: "Target Sections",
    description: "Choose which sections will receive this assignment.",
  },

  // GRADING TAB
  {
    target: "tour-grading-rubric",
    tab: "grading",
    title: "Grading Rubric",
    description:
      "Attach or create a custom grading rubric to evaluate student submissions.",
  },
  {
    target: "tour-grading-safety",
    tab: "grading",
    title: "Safety Gate",
    description:
      "Enforce safety by requiring students to pass a customized AI-generated quiz before starting.",
  },

  // TEAMS TAB
  {
    target: "tour-teams-mode",
    tab: "teams",
    title: "Submission Mode",
    description:
      "Decide whether this is an individual or group laboratory experiment.",
  },
  {
    target: "tour-teams-matchmaking",
    tab: "teams",
    title: "Group Formation",
    description:
      "Let students pick teams, or let the AI build optimal groups using BKT scores.",
  },
  {
    target: "tour-teams-peer",
    tab: "teams",
    title: "Peer Evaluation",
    description:
      "Enable and configure peer evaluations for group accountability.",
  },

  // MATERIALS TAB
  {
    target: "tour-materials-list",
    tab: "materials",
    title: "Required Materials",
    description:
      "Select the equipment and chemicals needed from your inventory.",
  },

  // CANVAS
  {
    target: "tour-exp-editor",
    tab: "setup",
    title: "The Canvas",
    description:
      "Write your lab procedure here. Type '/' to insert tables, images, and other blocks.",
  },
];

const getVisibleTarget = (target) =>
  [...document.querySelectorAll(`[data-tour="${target}"]`)].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

const ExperimentBuilderTour = ({ user, setActiveTab }) => {
  const storageKey = `alab-exp-builder-tour-seen-${user?.id || "guest"}`;
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    try {
      setIsOpen(localStorage.getItem(storageKey) !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [storageKey]);

  const finish = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setIsOpen(false);
    setTargetRect(null);
  };

  useEffect(() => {
    if (!isOpen || !EXPERIMENT_TOUR_STEPS[stepIndex]) return;
    const step = EXPERIMENT_TOUR_STEPS[stepIndex];

    // Automatically switch tabs if this step requires a specific tab to be visible
    if (step.tab) {
      setActiveTab(step.tab);
    }

    let frameId;
    const locateTarget = () => {
      const target = getVisibleTarget(step.target);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        return;
      }
      frameId = requestAnimationFrame(locateTarget);
    };
    frameId = requestAnimationFrame(locateTarget);

    const updateTarget = () => {
      const target = getVisibleTarget(step.target);
      if (target) setTargetRect(target.getBoundingClientRect());
    };
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [isOpen, stepIndex, setActiveTab]);

  if (!isOpen || !EXPERIMENT_TOUR_STEPS[stepIndex] || !targetRect) return null;

  const step = EXPERIMENT_TOUR_STEPS[stepIndex];
  const isLast = stepIndex === EXPERIMENT_TOUR_STEPS.length - 1;
  const popoverTop = targetRect.bottom + 14;
  const popoverLeft = Math.min(
    Math.max(16, targetRect.left),
    window.innerWidth - 352,
  );

  return (
    <div className='fixed inset-0 z-[200] pointer-events-none'>
      <div
        className='absolute rounded-lg ring-2 ring-white transition-all duration-300 pointer-events-none'
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)",
        }}
      />

      <div
        role='dialog'
        aria-label='Experiment Builder Tour'
        className='absolute w-[min(336px,calc(100vw-32px))] rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl pointer-events-auto transition-all duration-300'
        style={{
          top: Math.min(popoverTop, window.innerHeight - 250),
          left: popoverLeft,
        }}
      >
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <FlaskConical className='h-4 w-4' />
            </span>
            <span className='text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600'>
              Quick tour
            </span>
          </div>
          <button
            type='button'
            onClick={finish}
            aria-label='Close tour'
            className='rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
        <p className='mt-4 text-xs font-semibold text-slate-400'>
          {stepIndex + 1} of {EXPERIMENT_TOUR_STEPS.length}
        </p>
        <h2 className='mt-1 text-lg font-bold'>{step.title}</h2>
        <p className='mt-2 text-sm leading-5 text-slate-600'>
          {step.description}
        </p>
        <div className='mt-5 flex items-center justify-between'>
          <button
            type='button'
            onClick={finish}
            className='text-xs font-semibold text-slate-500 hover:text-slate-900'
          >
            Skip tour
          </button>
          <div className='flex gap-2'>
            {stepIndex > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setStepIndex(stepIndex - 1)}
              >
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' /> Back
              </Button>
            )}
            <Button
              size='sm'
              onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}
              className='bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              {isLast ? "Done" : "Next"}
              {isLast ? (
                <Check className='ml-1.5 h-3.5 w-3.5' />
              ) : (
                <ArrowRight className='ml-1.5 h-3.5 w-3.5' />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateExperiment;
