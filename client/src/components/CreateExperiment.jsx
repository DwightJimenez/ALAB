import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

const CreateExperiment = ({ templateToEdit, onBack }) => {
  const [inventoryList, setInventoryList] = useState([]);

  const [template, setTemplate] = useState({
    title: templateToEdit?.title || "",
    materials: templateToEdit?.materials || [{ inventoryId: "", name: "" }],
  });

  const editor = useCreateBlockNote();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/inventory", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setInventoryList(data);
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
      }
    };
    fetchInventory();
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

  const handleSave = async () => {
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);
      const payload = {
        title: template.title,
        materials: template.materials.filter((m) => m.inventoryId !== ""),
        instructionsHTML: htmlContent,
      };

      if (!payload.title || payload.materials.length === 0) {
        alert("Please provide a title and at least one material.");
        return;
      }

      const isEditing = !!templateToEdit;
      const url = isEditing
        ? `http://localhost:5000/api/experiments/${templateToEdit.id}`
        : "http://localhost:5000/api/experiments/create";

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

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 h-[calc(100vh-2rem)] flex flex-col gap-6">
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
        <Card className="w-full lg:w-1/3 flex flex-col overflow-hidden shadow-sm border-muted">
          <CardHeader className="bg-muted/30 border-b shrink-0 py-4">
            <CardTitle className="text-lg">Details & Materials</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-3">
              <Label
                htmlFor="title"
                className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
              >
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
                  <div
                    key={`material-${index}`}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>

                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={material.inventoryId}
                      onChange={(e) =>
                        handleMaterialSelect(index, e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select item...
                      </option>
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

        {/* --- RIGHT SIDE*/}
        <Card className="w-full lg:w-2/3 flex flex-col overflow-hidden shadow-sm border-muted">
          <CardHeader className="bg-muted/30 border-b shrink-0 py-4 flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Instruction Guide</CardTitle>
            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              Type '/' for commands
            </span>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0 bg-background">
            {/* The editor gets a nice clean canvas area without extra padding constraints */}
            <div className="max-w-4xl mx-auto p-6 md:p-10 min-h-[500px]">
              <BlockNoteView editor={editor} theme="light" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateExperiment;
