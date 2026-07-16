import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { TeacherQuizReview } from "./TeacherQuizReview";

const CreateExperiment = ({ templateToEdit, onBack }) => {
  const [inventoryList, setInventoryList] = useState([]);
  const [skillsList, setSkillsList] = useState([]); 

  const initialSkillIds = templateToEdit?.skillIds 
    ? templateToEdit.skillIds 
    : templateToEdit?.skillId 
      ? [templateToEdit.skillId.toString()] 
      : [""];
  
  const [template, setTemplate] = useState({
    title: templateToEdit?.title || "",
    skillIds: initialSkillIds, // Uses the smart fallback logic above
    materials: templateToEdit?.materials || [{ inventoryId: "", name: "" }],
  });

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const editor = useCreateBlockNote();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, skillsRes] = await Promise.all([
          fetch(`${API_URL}/api/inventory`, { credentials: "include" }),
          fetch(`${API_URL}/api/skills`, { credentials: "include" }) 
        ]);
        
        if (invRes.ok) setInventoryList(await invRes.json());
        if (skillsRes.ok) setSkillsList(await skillsRes.json());
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    fetchData();
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplate({ ...template, [name]: value });
  };

  // --- SKILL LIST HANDLERS ---
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

  // --- MATERIAL LIST HANDLERS ---
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
      materials: [...template.materials, { inventoryId: "", name: "" }],
    });
  };

  const removeMaterial = (index) => {
    const newMaterials = template.materials.filter((_, i) => i !== index);
    setTemplate({ ...template, materials: newMaterials });
  };

  const handleCreateSkill = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/admin/skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newSkillName, description: "Auto-created from Experiment setup" }),
      });
      
      if (response.ok) {
        const createdSkill = await response.json();
        setSkillsList([...skillsList, createdSkill]);
        
        // Auto-select the newly created skill into the list
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

  const handleSave = async () => {
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);
      
      // Clean up empty selections and parse to integers
      const validSkillIds = template.skillIds
        .filter((id) => id !== "")
        .map((id) => parseInt(id, 10));

      const payload = {
        title: template.title,
        skillIds: validSkillIds, // Sending an array now!
        materials: template.materials.filter((m) => m.inventoryId !== ""),
        instructionsHTML: htmlContent,
      };

      if (!payload.title || payload.skillIds.length === 0 || payload.materials.length === 0) {
        alert("Please provide a title, select at least one skill, and add at least one material.");
        return;
      }

      const isEditing = !!templateToEdit;
      const url = isEditing
        ? `${API_URL}/api/experiments/${templateToEdit.id}`
        : `${API_URL}/api/experiments/create`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Template ${isEditing ? "updated" : "saved"} successfully!`);
        if (onBack) onBack();
      } else {
        alert(data.error || "Failed to save template.");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("A network error occurred.");
    }
  };

  // Map the selected IDs back into their string names for Gemini
  const selectedSkillNames = template.skillIds
    .map(id => skillsList.find(s => s.id === parseInt(id))?.name)
    .filter(Boolean);

  return (
    <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 flex flex-col gap-6 h-[calc(100vh-2rem)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {templateToEdit ? "Edit Experiment" : "Create Experiment"}
          </h1>
        </div>
        <div className="flex gap-4 mt-4 sm:mt-0">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave}>
            {templateToEdit ? "Update Template" : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* --- LEFT SIDE: Metadata --- */}
        <Card className="w-full lg:w-1/3 flex flex-col shadow-sm border-muted overflow-hidden">
          <CardHeader className="bg-muted/30 border-b py-4 shrink-0">
            <CardTitle className="text-lg">Details & Requirements</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Experiment Title
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Effect of Light on Plant Growth"
                value={template.title}
                onChange={handleInputChange}
                className="bg-background font-medium text-md"
              />
            </div>

            <Separator />

            {/* MULTI-SELECT: BKT Skills List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Target BKT Skills
                </Label>
                <div className="flex items-center gap-2">
                  <Dialog open={isSkillModalOpen} onOpenChange={setIsSkillModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600">
                        + New Skill
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-black border-none sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Quick Add BKT Skill</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateSkill} className="space-y-4 pt-4">
                        <div>
                          <Label>Skill Name</Label>
                          <Input 
                            placeholder="e.g., Microscope Handling" 
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            required 
                          />
                          <p className="text-xs text-slate-500 mt-2">
                            Default probability parameters will be applied. You can fine-tune them later in Manage Skills.
                          </p>
                        </div>
                        <Button type="submit" className="w-full">Add & Select</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={addSkill}>
                    + Add Slot
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {template.skillIds.map((skillId, index) => (
                  <div key={`skill-${index}`} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={skillId}
                      onChange={(e) => handleSkillSelect(index, e.target.value)}
                    >
                      <option value="" disabled>Select a skill...</option>
                      {skillsList.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="w-10 h-10 shrink-0"
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

            {/* Materials List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Required Inventory
                </Label>
                <Button variant="outline" size="sm" onClick={addMaterial}>
                  + Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {template.materials.map((material, index) => (
                  <div key={`material-${index}`} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={material.inventoryId}
                      onChange={(e) => handleMaterialSelect(index, e.target.value)}
                    >
                      <option value="" disabled>Select item...</option>
                      {inventoryList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.category})
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="w-10 h-10 shrink-0"
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
        </Card>

        {/* --- RIGHT SIDE: Instruction Guide --- */}
        <div className="w-full lg:w-2/3 flex flex-col h-full overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-muted h-full">
            <CardHeader className="bg-muted/30 border-b shrink-0 py-4 flex flex-row justify-between items-center">
              <CardTitle className="text-lg">Instruction Guide</CardTitle>
              
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  Type '/' for commands
                </span>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary" size="sm" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                      ✨ AI Safety Gate
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Configure Safety Gate</SheetTitle>
                      <SheetDescription>
                        Use Gemini to generate a BKT assessment based on your drafted instructions.
                      </SheetDescription>
                    </SheetHeader>

                    {/* Passes the ARRAY of selected skill names to the AI */}
                    <TeacherQuizReview
                      lessonId={templateToEdit?.id || "new-experiment"}
                      editor={editor}
                      availableSkills={selectedSkillNames.length > 0 ? selectedSkillNames : ["General Lab Safety"]}
                    />
                  </SheetContent>
                </Sheet>
              </div>

            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 bg-background">
              <div className="h-full w-full p-6 md:p-10">
                <BlockNoteView editor={editor} theme="light" className="h-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateExperiment;