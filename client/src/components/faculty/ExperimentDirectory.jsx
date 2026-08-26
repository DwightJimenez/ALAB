import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { MoreVertical, Trash2, BookOpen, Upload } from "lucide-react";
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

  // New states for the Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch subjects, templates, and available sections simultaneously
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

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // --- GROUPING & SORTING LOGIC ---
  
  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    
    const aYear = a.section?.year || "";
    const bYear = b.section?.year || "";
    if (aYear !== bYear) return aYear.localeCompare(bYear);

    const aSec = a.section?.section || "";
    const bSec = b.section?.section || "";
    return aSec.localeCompare(bSec);
  });

  const groupedBySubject = sortedSubjects.map((subject) => {
    const sectionLabel = subject.section 
      ? ` (${subject.section.year} - ${subject.section.section})` 
      : "";

    return {
      id: subject.id,
      name: `${subject.name}${sectionLabel}`,
      templates: templates.filter((t) => t.subjectId === subject.id),
    };
  });

  const uncategorizedTemplates = templates.filter(
    (t) => !t.subjectId || !subjects.some((s) => s.id === t.subjectId)
  );

  if (uncategorizedTemplates.length > 0) {
    groupedBySubject.push({
      id: "uncategorized",
      name: "Uncategorized",
      templates: uncategorizedTemplates,
    });
  }

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
    <div className='w-full m-6 p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Experiment Library
          </h1>
          <p className='text-muted-foreground mt-1'>
            Manage and organize your laboratory experiment templates.
          </p>
        </div>
        <Button
          onClick={() => setIsCreatingNew(true)}
          className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
        >
          + Create Experiment
        </Button>
      </div>

      <Separator />

      {groupedBySubject.length === 0 && templates.length === 0 ? (
        <div className='text-center p-12 border-2 border-dashed rounded-lg bg-slate-50/50'>
          <p className='text-muted-foreground mb-4'>
            You haven't set up any subjects or templates yet.
          </p>
          <Button onClick={() => setIsCreatingNew(true)}>
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className='space-y-10'>
          {groupedBySubject.map((group) => (
            <div key={group.id} className='space-y-4'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-slate-800 flex items-center gap-2'>
                  <BookOpen className='w-5 h-5 text-indigo-600' />
                  {group.name}
                </h2>
                <Badge
                  variant='secondary'
                  className='bg-slate-100 text-slate-600'
                >
                  {group.templates.length}
                </Badge>
              </div>
              <Separator className='bg-slate-200' />

              {group.templates.length === 0 ? (
                <div className='text-sm text-slate-400 italic py-4 bg-slate-50 rounded-md border border-dashed border-slate-200 text-center'>
                  No templates created for this subject yet.
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2'>
                  {group.templates.map((template) => (
                    <Card
                      key={template.id}
                      className='flex flex-col hover:shadow-md hover:border-indigo-200 transition-all pb-4 cursor-pointer relative item-group'
                      onClick={() => setEditingTemplate(template)}
                    >
                      <CardHeader>
                        <div className='flex justify-between items-start gap-4'>
                          <CardTitle className='text-lg line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors'>
                            {template.title}
                          </CardTitle>

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
                            <DropdownMenuContent align='end' className='w-48'>
                              {/* New Assign/Upload Button */}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToAssign(template);
                                  setAssignModalOpen(true);
                                }}
                                className='cursor-pointer text-indigo-600 focus:bg-indigo-50 focus:text-indigo-700 font-medium'
                              >
                                <Upload className='w-4 h-4 mr-2' /> Assign / Publish
                              </DropdownMenuItem>
                              
                              <Separator className="my-1" />
                              
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToDelete(template);
                                  setDeleteAlertOpen(true);
                                }}
                                className='cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium'
                              >
                                <Trash2 className='w-4 h-4 mr-2' /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className='text-xs text-muted-foreground mt-1.5 font-medium'>
                          Created on {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </CardHeader>

                      <CardContent className='flex-1 space-y-4'>
                        <div>
                          <p className='text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2'>
                            Materials Needed
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            {template.materials && template.materials.length > 0 ? (
                              <>
                                {template.materials.slice(0, 3).map((item, idx) => (
                                  <Badge
                                    key={idx}
                                    variant='secondary'
                                    className='bg-slate-100 font-medium text-slate-700 hover:bg-slate-200'
                                  >
                                    {item.name}
                                  </Badge>
                                ))}
                                {template.materials.length > 3 && (
                                  <Badge
                                    variant='outline'
                                    className='text-slate-500 border-slate-200'
                                  >
                                    +{template.materials.length - 3} more
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None specified</span>
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

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className='bg-white'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600 flex items-center gap-2'>
              <Trash2 className='w-5 h-5' /> Delete Experiment
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600'>
              Are you sure you want to delete{" "}
              <strong className='text-slate-900'>
                {templateToDelete?.title}
              </strong>
              ? This action cannot be undone and will remove it from the
              library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='hover:bg-slate-100'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSubmit();
              }}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Modal */}
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
          initialSections={templateToAssign.sections || []}
          initialDueDate={templateToAssign.dueDate || ""}
          onAssignSuccess={() => {
            fetchData(); // Refresh UI after assigning
          }}
        />
      )}
    </div>
  );
};

export default ExperimentDirectory;