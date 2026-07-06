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

// Import the Create component we just updated
import CreateExperiment from "./CreateExperiment"; 

const ExperimentDirectory = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // State to track if we are viewing the directory OR the editor
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // We wrap the fetch in a reusable function so we can re-run it after an edit
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

  useEffect(() => {
    fetchTemplates();
  }, []);

  // --- RENDERING ROUTER LOGIC ---

  // If user clicked "Edit", show the editor with existing data
  if (editingTemplate) {
    return (
      <CreateExperiment 
        templateToEdit={editingTemplate} 
        onBack={() => {
          setEditingTemplate(null);
          fetchTemplates(); // Refresh the list when they come back
        }} 
      />
    );
  }

  // If user clicked "+ Create New Template", show the editor blank
  if (isCreatingNew) {
    return (
      <CreateExperiment 
        onBack={() => {
          setIsCreatingNew(false);
          fetchTemplates(); // Refresh the list when they come back
        }} 
      />
    );
  }

  // --- DEFAULT VIEW: THE DIRECTORY GRID ---

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Experiment Library</h1>
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
          <p className="text-muted-foreground mb-4">No templates found. Create your first one!</p>
          <Button onClick={() => setIsCreatingNew(true)}>Create Template</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
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
                  <p className="text-sm font-semibold mb-2">Materials Needed:</p>
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
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExperimentDirectory;