import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../ui/card";
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
import CreateExperiment from "./CreateExperiment";
import LogoLoader from "../LogoLoader";

const ExperimentDirectory = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

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
      <div className="flex justify-center items-center w-full">
        <LogoLoader size="sm" />
      </div>
    );
  }

  return (
    <div className="w-full m-6 p-6 space-y-6">
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
              // Make the card clickable and visually responsive
              className="flex flex-col hover:shadow-lg transition-shadow pb-4 cursor-pointer"
              onClick={() => setEditingTemplate(template)}
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
                        // Prevent clicking the 3 dots from opening the edit screen
                        onClick={(e) => e.stopPropagation()} 
                        className="-mt-2 -mr-2 text-slate-500 hover:text-slate-800 relative z-10"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation(); // Also prevent bubbling here
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
            </Card>
          ))}
        </div>
      )}

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