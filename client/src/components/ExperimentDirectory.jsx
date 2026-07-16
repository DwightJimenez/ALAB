import React, { useState, useEffect } from "react";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import CreateExperiment from "./CreateExperiment";

const ExperimentDirectory = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState(null);
  
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
      }
    } catch (error) {
      console.error("Network error fetching templates:", error);
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
        }
      );

      if (response.ok) {
        alert("Experiment assigned successfully!");
        setAssignModalOpen(false);
        setAssignData({ yearAndSections: [], dueDate: "", requireSafetyGate: true });
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to assign.");
      }
    } catch (error) {
      console.error("Assignment failed", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/users/sections`
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableSections(data);
        }
      } catch (error) {
        console.error("Failed to load sections", error);
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
            { credentials: "include" }
          );
          
          if (response.ok) {
            const currentAssignments = await response.json();
            
            // If assignments exist, pre-fill the form with their data
            if (currentAssignments.length > 0) {
              setAssignData({
                yearAndSections: currentAssignments.map((a) => a.yearAndSection),
                dueDate: currentAssignments[0].dueDate || "",
                requireSafetyGate: currentAssignments[0].activeSafetyGate !== undefined 
                                    ? currentAssignments[0].activeSafetyGate 
                                    : true,
              });
            } else {
              // Defaults if it has never been assigned
              setAssignData({ yearAndSections: [], dueDate: "", requireSafetyGate: true });
            }
          }
        } catch (error) {
          console.error("Failed to load existing assignments", error);
        }
      };

      fetchCurrentAssignments();
    }
  }, [templateToAssign]);
  // -------------------------------

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
        <p className="text-muted-foreground animate-pulse">
          Loading templates...
        </p>
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
          <p className="text-muted-foreground">
            Browse and manage your laboratory experiment templates.
          </p>
        </div>
        <Button onClick={() => setIsCreatingNew(true)}>
          + Create New Template
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
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTemplate(template)}
                >
                  Edit Template
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setTemplateToAssign(template);
                    setAssignModalOpen(true);
                  }}
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
                    <label key={index} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={assignData.yearAndSections.includes(sectionName)}
                        onChange={() => toggleSection(sectionName)}
                      />
                      <span className="text-sm font-medium">{sectionName}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Loading sections or none found...</p>
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
                <Label htmlFor="requireSafetyGate" className="font-semibold cursor-pointer">
                  Require Safety Gate Quiz
                </Label>
                <span className="text-xs text-muted-foreground">
                  Students must pass the BKT assessment before accessing this lab.
                </span>
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExperimentDirectory;