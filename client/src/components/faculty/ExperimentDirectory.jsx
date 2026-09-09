import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  MoreVertical, 
  Trash2, 
  BookOpen, 
  Upload, 
  CheckCircle2, 
  FileEdit, 
  FolderOpen,
  ArchiveX 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSelector } from "react-redux";
import CreateExperiment from "./CreateExperiment";
import AssignExperimentModal from "./AssignExperimentModal";
import LogoLoader from "../LogoLoader";

const ExperimentDirectory = () => {
  const [subjects, setSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [subjectsRes, templatesRes, sectionsRes] = await Promise.all([
        fetch(`${API_URL}/api/subjects`, { credentials: "include" }),
        fetch(`${API_URL}/api/experiments`, { credentials: "include" }),
        fetch(`${API_URL}/api/class-management/available-sections/${user.id}`, { credentials: "include" })
      ]);

      if (subjectsRes.ok && templatesRes.ok && sectionsRes.ok) {
        const subjectsData = await subjectsRes.json();
        const templatesData = await templatesRes.json();
        const sectionsData = await sectionsRes.json();

        setSubjects(subjectsData);
        setTemplates(templatesData);
        setAvailableSections(sectionsData);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (error) {
      console.error("Network error fetching data:", error);
      toast.error("Failed to load your experiment library.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!templateToDelete) return;
    try {
      const response = await fetch(
        `${API_URL}/api/experiments/${templateToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Experiment template deleted successfully.");
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete template.");
      }
    } catch (error) {
      console.error("Deletion failed", error);
      toast.error("Network error during deletion.");
    } finally {
      setDeleteAlertOpen(false);
      setTemplateToDelete(null);
    }
  };

  // --- NEW: UNPUBLISH LOGIC ---
  const handleUnpublish = async (templateId) => {
    try {
      const response = await fetch(`${API_URL}/api/experiments/${templateId}/unpublish`, {
        method: "PUT",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Experiment reverted to draft successfully.");
        fetchData(); // Refresh UI
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to unpublish template.");
      }
    } catch (error) {
      console.error("Unpublish failed", error);
      toast.error("Network error while unpublishing.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // --- OPTIMIZED GROUPING & SORTING LOGIC ---
  const groupedBySubject = useMemo(() => {
    const sortedSubjects = [...subjects].sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      
      const aYear = a.section?.year || "";
      const bYear = b.section?.year || "";
      if (aYear !== bYear) return aYear.localeCompare(bYear);

      const aSec = a.section?.section || "";
      const bSec = b.section?.section || "";
      return aSec.localeCompare(bSec);
    });

    const grouped = sortedSubjects.map((subject) => {
      const sectionLabel = subject.section 
        ? ` (${subject.section.year} - ${subject.section.section})` 
        : "";

      return {
        id: subject.id,
        name: `${subject.name}${sectionLabel}`,
        templates: templates.filter((t) => t.subjectId === subject.id),
      };
    });

    const uncategorized = templates.filter(
      (t) => !t.subjectId || !subjects.some((s) => s.id === t.subjectId)
    );

    if (uncategorized.length > 0) {
      grouped.push({
        id: "uncategorized",
        name: "Uncategorized",
        templates: uncategorized,
      });
    }

    return grouped;
  }, [subjects, templates]);

  // --- ROUTING ---
  if (editingTemplate) {
    return (
      <CreateExperiment
        templateToEdit={editingTemplate}
        onBack={() => {
          setEditingTemplate(null);
          fetchData();
        }}
      />
    );
  }

  if (isCreatingNew) {
    return (
      <CreateExperiment
        onBack={() => {
          setIsCreatingNew(false);
          fetchData();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center w-full min-h-[60vh]'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  return (
    <div className='w-full max-w-7xl mx-auto m-6 p-6 space-y-8'>
      {/* HEADER SECTION */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Experiment Library
          </h1>
          <p className='text-slate-500 mt-1'>
            Manage, organize, and assign your laboratory experiment templates.
          </p>
        </div>
        <Button
          onClick={() => setIsCreatingNew(true)}
          className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:shadow-md'
        >
          + Create Experiment
        </Button>
      </div>

      <Separator className="bg-slate-200" />

      {/* EMPTY STATE - NO SUBJECTS/TEMPLATES */}
      {groupedBySubject.length === 0 && templates.length === 0 ? (
        <div className='flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50'>
          <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No experiments found</h3>
          <p className='text-slate-500 mb-6 max-w-md text-center'>
            Get started by creating your first laboratory experiment template. You can assign it to your classes later.
          </p>
          <Button onClick={() => setIsCreatingNew(true)} className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className='space-y-12 pb-12'>
          {groupedBySubject.map((group) => (
            <div key={group.id} className='space-y-5'>
              {/* SUBJECT HEADER */}
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-slate-800 flex items-center gap-2'>
                  <BookOpen className='w-5 h-5 text-indigo-600' />
                  {group.name}
                </h2>
                <Badge
                  variant='secondary'
                  className='bg-slate-100 text-slate-600 border-slate-200 font-medium'
                >
                  {group.templates.length}
                </Badge>
              </div>
              
              <Separator className='bg-slate-100' />

              {/* TEMPLATES GRID */}
              {group.templates.length === 0 ? (
                <div className='text-sm text-slate-400 italic py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center'>
                  <FolderOpen className="h-6 w-6 text-slate-300 mb-2" />
                  No templates created for this subject yet.
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2'>
                  {group.templates.map((template) => (
                    <Card
                      key={template.id}
                      className='flex flex-col hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 transition-all duration-200 cursor-pointer relative group bg-white'
                      onClick={() => setEditingTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className='flex justify-between items-start gap-4'>
                          <div className="flex flex-col gap-2">
                            <CardTitle className='text-lg font-semibold line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors'>
                              {template.title}
                            </CardTitle>
                            
                            {/* STATUS BADGE */}
                            <div className="flex items-center">
                              {template.isPublished ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-none font-medium text-[10px] px-2 py-0.5 hover:bg-emerald-100">
                                  <CheckCircle2 className="w-3 h-3 mr-1.5" /> 
                                  Published
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 shadow-none font-medium text-[10px] px-2 py-0.5 hover:bg-amber-100">
                                  <FileEdit className="w-3 h-3 mr-1.5" /> 
                                  Draft
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* ACTION MENU */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={(e) => e.stopPropagation()}
                                className='-mt-2 -mr-2 text-slate-400 hover:text-slate-800 relative z-10 hover:bg-slate-100'
                              >
                                <MoreVertical className='h-5 w-5' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-48 shadow-lg rounded-xl border-slate-100'>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToAssign(template);
                                  setAssignModalOpen(true);
                                }}
                                className='cursor-pointer text-indigo-700 focus:bg-indigo-50 focus:text-indigo-800 font-medium py-2'
                              >
                                <Upload className='w-4 h-4 mr-2' /> Publish & Assign
                              </DropdownMenuItem>

                              {/* NEW: UNPUBLISH BUTTON */}
                              {template.isPublished && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnpublish(template.id);
                                  }}
                                  className='cursor-pointer text-amber-600 focus:bg-amber-50 focus:text-amber-700 font-medium py-2'
                                >
                                  <ArchiveX className='w-4 h-4 mr-2' /> Unpublish (Draft)
                                </DropdownMenuItem>
                              )}
                              
                              <Separator className="my-1 bg-slate-100" />
                              
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToDelete(template);
                                  setDeleteAlertOpen(true);
                                }}
                                className='cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium py-2'
                              >
                                <Trash2 className='w-4 h-4 mr-2' /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className='text-[11px] text-slate-400 mt-2 font-medium'>
                          Last modified: {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}
                        </p>
                      </CardHeader>

                      <CardContent className='flex-1 flex flex-col justify-end space-y-4 pt-0'>
                        <div className="pt-3 border-t border-slate-100 mt-2">
                          <p className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5'>
                            Materials Needed
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            {template.materials && template.materials.length > 0 ? (
                              <>
                                {template.materials.slice(0, 3).map((item, idx) => (
                                  <Badge
                                    key={idx}
                                    variant='secondary'
                                    className='bg-slate-100 font-medium text-slate-600 border-none'
                                  >
                                    {item.name}
                                  </Badge>
                                ))}
                                {template.materials.length > 3 && (
                                  <Badge
                                    variant='outline'
                                    className='text-slate-500 border-slate-200 bg-white'
                                  >
                                    +{template.materials.length - 3} more
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic bg-slate-50 px-2 py-1 rounded-md border border-slate-100">No materials specified</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DELETE ALERT DIALOG */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className='bg-white sm:rounded-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600 flex items-center gap-2 text-xl'>
              <Trash2 className='w-5 h-5' /> Delete Experiment
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600 pt-2'>
              Are you sure you want to delete{" "}
              <strong className='text-slate-900 font-semibold'>
                {templateToDelete?.title}
              </strong>
              ? This action cannot be undone and will permanently remove it from the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className='hover:bg-slate-100 border-slate-200'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSubmit();
              }}
              className='bg-red-600 hover:bg-red-700 text-white shadow-sm'
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ASSIGN MODAL */}
      {templateToAssign && (
        <AssignExperimentModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setTemplateToAssign(null);
          }}
          experimentId={templateToAssign.id}
          availableSections={availableSections}
          requireSafetyGate={templateToAssign.requireSafetyGate}
          
          initialSections={
            templateToAssign.assignments 
              ? templateToAssign.assignments.map(a => a.yearAndSection) 
              : []
          }
          
          initialDueDate={
            templateToAssign.assignments && templateToAssign.assignments.length > 0 
              ? templateToAssign.assignments[0].dueDate 
              : ""
          }
          
          onAssignSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default ExperimentDirectory;