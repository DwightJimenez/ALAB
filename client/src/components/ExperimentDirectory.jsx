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
  // --- 1. ALL USESTATE HOOKS MUST BE AT THE TOP ---
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState(null);
  const [assignData, setAssignData] = useState({
    yearAndSection: "",
    dueDate: "",
  });
  const [availableSections, setAvailableSections] = useState([]);

  // --- 2. FUNCTIONS ---
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/experiments", {
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

  const handleAssignSubmit = async () => {
    if (!assignData.yearAndSection)
      return alert("Please enter a Year and Section.");

    // Create a safe payload that turns empty strings into actual nulls
    const payload = {
      yearAndSection: assignData.yearAndSection,
      dueDate: assignData.dueDate ? assignData.dueDate : null, // <-- THE FIX
    };

    try {
      const response = await fetch(
        `http://localhost:5000/api/experiments/${templateToAssign.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload), // Send the safe payload here
        },
      );

      if (response.ok) {
        alert("Experiment assigned to section successfully!");
        setAssignModalOpen(false);
        setAssignData({ yearAndSection: "", dueDate: "" });
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to assign.");
      }
    } catch (error) {
      console.error("Assignment failed", error);
    }
  };

  // Fetch Templates Effect
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch Sections Effect (MOVED UP HERE!)
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/users/sections",
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

  // --- 4. CONDITIONAL RETURNS ARE NOW SAFE ---

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

  // --- 5. MAIN RENDER ---
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
              <Label>Year and Section</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={assignData.yearAndSection}
                onChange={(e) =>
                  setAssignData({
                    ...assignData,
                    yearAndSection: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Select a section...
                </option>
                {availableSections.length > 0 ? (
                  availableSections.map((sectionName, index) => (
                    <option key={index} value={sectionName}>
                      {sectionName}
                    </option>
                  ))
                ) : (
                  <option disabled>Loading sections or none found...</option>
                )}
              </select>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>{}
    </div>
  );
};

export default ExperimentDirectory;
