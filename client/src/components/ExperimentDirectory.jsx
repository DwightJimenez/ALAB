import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import CreateExperiment from "./CreateExperiment";
import LogoLoader from "./LogoLoader";

const ExperimentDirectory = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState(null);

  // Delete State
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const [assignData, setAssignData] = useState({
    yearAndSections: [],
    dueDate: "",
    requireSafetyGate: true,
  });

  const [availableSections, setAvailableSections] = useState([]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/experiments`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (error) {
      console.error("Network error fetching templates:", error);
      toast.error("Failed to load experiment templates.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionName) => {
    setAssignData((prev) => {
      const isSelected = prev.yearAndSections.includes(sectionName);
      return {
        ...prev,
        yearAndSections: isSelected
          ? prev.yearAndSections.filter((s) => s !== sectionName)
          : [...prev.yearAndSections, sectionName],
      };
    });
  };

  const handleAssignSubmit = async () => {
    if (assignData.yearAndSections.length === 0) {
      toast.error("Please select at least one section to assign.");
      return;
    }

    const payload = {
      yearAndSections: assignData.yearAndSections,
      dueDate: assignData.dueDate ? assignData.dueDate : null,
      requireSafetyGate: assignData.requireSafetyGate,
    };

    try {
      const response = await fetch(
        `${API_URL}/api/experiments/${templateToAssign.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        toast.success("Experiment assigned successfully!");
        setAssignModalOpen(false);
        setAssignData({
          yearAndSections: [],
          dueDate: "",
          requireSafetyGate: true,
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to assign experiment.");
      }
    } catch (error) {
      console.error("Assignment failed", error);
      toast.error("Network error during assignment.");
    }
  };

  // Delete Logic
  const handleDeleteSubmit = async () => {
    if (!templateToDelete) return;
    try {
      const response = await fetch(
        `${API_URL}/api/experiments/${templateToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        toast.success("Experiment template deleted successfully.");
        fetchTemplates();
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
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/sections`);
        if (response.ok) {
          const data = await response.json();
          setAvailableSections(data);
        }
      } catch (error) {
        console.error("Failed to load sections", error);
        toast.error("Failed to load available sections.");
      }
    };
    fetchSections();
  }, []);

  useEffect(() => {
    if (templateToAssign) {
      const fetchCurrentAssignments = async () => {
        try {
          const response = await fetch(
            `${API_URL}/api/experiments/${templateToAssign.id}/assignments`,
            { credentials: "include" },
          );

          if (response.ok) {
            const currentAssignments = await response.json();

            if (currentAssignments.length > 0) {
              setAssignData({
                yearAndSections: currentAssignments.map(
                  (a) => a.yearAndSection,
                ),
                dueDate: currentAssignments[0].dueDate || "",
                requireSafetyGate:
                  currentAssignments[0].activeSafetyGate !== undefined
                    ? currentAssignments[0].activeSafetyGate
                    : true,
              });
            } else {
              setAssignData({
                yearAndSections: [],
                dueDate: "",
                requireSafetyGate: true,
              });
            }
          }
        } catch (error) {
          console.error("Failed to load existing assignments", error);
          toast.error("Failed to load existing assignments.");
        }
      };

      fetchCurrentAssignments();
    }
  }, [templateToAssign]);

  if (editingTemplate) {
    return (
      <CreateExperiment
        templateToEdit={editingTemplate}
        onBack={() => {
          setEditingTemplate(null);
          fetchTemplates();
        }}
      />
    );
  }

  if (isCreatingNew) {
    return (
      <CreateExperiment
        onBack={() => {
          setIsCreatingNew(false);
          fetchTemplates();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LogoLoader size="sm"/>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Experiment Library
          </h1>
        </div>
        <Button
          onClick={() => setIsCreatingNew(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Create
        </Button>
      </div>

      <Separator />

      {templates.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No templates found. Create your first one!
          </p>
          <Button onClick={() => setIsCreatingNew(true)}>
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="flex flex-col hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl line-clamp-2">
                    {template.title}
                  </CardTitle>

                  {/* --- 3-DOT MENU --- */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mt-2 -mr-2 text-slate-500 hover:text-slate-800"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => setEditingTemplate(template)}
                        className="cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" /> Edit Template
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setTemplateToDelete(template);
                          setDeleteAlertOpen(true);
                        }}
                        className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  By {template.faculty?.name || "Unknown Faculty"} •{" "}
                  {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">
                    Materials Needed:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.materials.slice(0, 3).map((item, idx) => (
                      <Badge key={idx} variant="secondary">
                        {item.name}
                      </Badge>
                    ))}
                    {template.materials.length > 3 && (
                      <Badge variant="outline">
                        +{template.materials.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setTemplateToAssign(template);
                    setAssignModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  Assign to Class
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Experiment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Sections</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 bg-white">
                {availableSections.length > 0 ? (
                  availableSections.map((sectionName, index) => (
                    <label
                      key={index}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={assignData.yearAndSections.includes(
                          sectionName,
                        )}
                        onChange={() => toggleSection(sectionName)}
                      />
                      <span className="text-sm font-medium">{sectionName}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Loading sections or none found...
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target / Due Date (Optional)</Label>
              <Input
                type="date"
                value={assignData.dueDate}
                onChange={(e) =>
                  setAssignData({ ...assignData, dueDate: e.target.value })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border">
              <input
                type="checkbox"
                id="requireSafetyGate"
                checked={assignData.requireSafetyGate}
                onChange={(e) =>
                  setAssignData({
                    ...assignData,
                    requireSafetyGate: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex flex-col">
                <Label
                  htmlFor="requireSafetyGate"
                  className="font-semibold cursor-pointer"
                >
                  Require Safety Gate Quiz
                </Label>
                <span className="text-xs text-muted-foreground">
                  Students must pass the BKT assessment before accessing this
                  lab.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete Template
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{templateToDelete?.title}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSubmit();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExperimentDirectory;
