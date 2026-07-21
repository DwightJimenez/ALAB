import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const StudentAssignments = () => {
  const { user } = useSelector((state) => state.auth);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExperiment, setActiveExperiment] = useState(null);

  // New states for submission UI
  const [files, setFiles] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const editor = useCreateBlockNote();

  useEffect(() => {
    if (!user || !user.section || !user.year) {
      setLoading(false);
      return;
    }

    const yearAndSection = `${user.year} - ${user.section}`;

    const fetchAssignments = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/experiments/assignments/${yearAndSection}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const data = await response.json();
          setAssignments(data);
        }
      } catch (error) {
        console.error("Failed to load assignments", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  useEffect(() => {
    const loadRichText = async () => {
      if (activeExperiment && activeExperiment.template.instructionsHTML) {
        const blocks = await editor.tryParseHTMLToBlocks(
          activeExperiment.template.instructionsHTML,
        );
        editor.replaceBlocks(editor.document, blocks);
      }
    };
    loadRichText();

    // Reset submission states when switching assignments
    setFiles([]);
    setIsSubmitted(false);
  }, [activeExperiment, editor]);

  // Handlers for submission UI
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleTurnIn = () => {
    // Add your API call here to actually submit the assignment
    setIsSubmitted(true);
  };

  const handleUnsubmit = () => {
    // Add your API call here to unsubmit
    setIsSubmitted(false);
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading student profile...
      </div>
    );
  }

  if (activeExperiment) {
    const { template } = activeExperiment;
    const hasQuiz = true;
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setActiveExperiment(null)}
          className="-ml-4"
        >
          ← Back to Assignments
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT SIDE: Assignment Details (Takes up 2/3 of the space) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/10 pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-bold text-primary">
                    {template.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">
                    Due{" "}
                    {activeExperiment.dueDate
                      ? new Date(activeExperiment.dueDate).toLocaleDateString()
                      : "No deadline"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-8">
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">
                    Required Lab Materials
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {template.materials.map((m, idx) => (
                      <li key={idx} className="text-sm font-medium">
                        {m.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-bold mb-4">Instructions</h3>

                  {/* Read-Only BlockNote */}
                  <div className="border rounded-md bg-background shadow-sm p-4">
                    <BlockNoteView
                      editor={editor}
                      editable={false}
                      theme="light"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE: Submissions & Quizzes */}
          <div className="lg:col-span-1 space-y-6">
            {/* Your Work Card */}
            <Card className="shadow-sm border-muted">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 border-b">
                <CardTitle className="text-xl font-semibold">
                  Your work
                </CardTitle>
                <span
                  className={`text-sm font-medium ${isSubmitted ? "text-muted-foreground" : "text-green-600"}`}
                >
                  {isSubmitted ? "Turned in" : "Assigned"}
                </span>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                      >
                        <span className="text-sm truncate pr-2 font-medium">
                          {file.name}
                        </span>
                        {!isSubmitted && (
                          <button
                            onClick={() => removeFile(idx)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />

                {!isSubmitted ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-center font-semibold bg-background"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="mr-2 text-lg leading-none">+</span> Add
                      or create
                    </Button>
                    <Button
                      className="w-full font-semibold"
                      onClick={handleTurnIn}
                    >
                      {files.length > 0 ? "Turn in" : "Mark as done"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full font-semibold"
                    onClick={handleUnsubmit}
                  >
                    Unsubmit
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const displayYearSection =
    user.year && user.section ? `${user.year} - ${user.section}` : "Unassigned";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          My Assigned Experiments
        </h1>
        <p className="text-muted-foreground mt-1">
          Showing laboratory requirements for:{" "}
          <Badge variant="outline">{displayYearSection}</Badge>
        </p>
      </div>

      <Separator />

      {loading ? (
        <p>Loading your assignments...</p>
      ) : !user.section ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-destructive">
          <p>
            Your profile does not have a section assigned. Please contact your
            teacher.
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            No experiments assigned to {displayYearSection} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="flex flex-col hover:border-primary transition-colors cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => setActiveExperiment(assignment)}
            >
              <CardHeader>
                <CardTitle className="text-xl">
                  {assignment.template.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Due:{" "}
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString()
                    : "No deadline"}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <Badge variant="secondary">
                  {assignment.template.materials.length} Materials Required
                </Badge>
              </CardContent>
              <div className="p-4 border-t bg-muted/10 text-center text-sm font-medium text-primary">
                View Instructions →
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
