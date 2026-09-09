import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ManageQuestions = () => {
  const [skills, setSkills] = useState([]);
  const [questions, setQuestions] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const [selectedSkill, setSelectedSkill] = useState("");
  const [formData, setFormData] = useState({
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
  });

  useEffect(() => {
    fetchSkills();
    fetchQuestions();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_URL}/api/quiz/skills`, {
        credentials: "include",
      });
      if (res.ok) setSkills(await res.json());
      else throw new Error("Failed to load skills");
    } catch (error) {
      toast.error("Failed to load skills from the server.");
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/quiz/admin/questions`, {
        credentials: "include",
      });
      if (res.ok) setQuestions(await res.json());
      else throw new Error("Failed to load questions");
    } catch (error) {
      toast.error("Failed to load questions from the server.");
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedSkill) {
      toast.error("Please select a skill before saving.");
      return;
    }

    const optionsArray = [
      formData.optionA,
      formData.optionB,
      formData.optionC,
      formData.optionD,
    ];
    const answerMap = { A: 0, B: 1, C: 2, D: 3 };
    const actualCorrectText = optionsArray[answerMap[formData.correctAnswer]];

    const url = editingId
      ? `${API_URL}/api/quiz/admin/question/${editingId}`
      : `${API_URL}/api/quiz/admin/question`;

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          skillId: selectedSkill,
          text: formData.text,
          options: optionsArray,
          correctAnswer: actualCorrectText,
        }),
      });

      if (response.ok) {
        toast.success(
          editingId
            ? "Question updated successfully!"
            : "Question added successfully!",
        );
        setIsOpen(false);
        fetchQuestions(); 
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save question.");
      }
    } catch (error) {
      toast.error("Network error. Failed to save question.");
    }
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;

    try {
      const res = await fetch(
        `${API_URL}/api/quiz/admin/question/${questionToDelete}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (res.ok) {
        toast.success("Question deleted successfully!");
        fetchQuestions(); 
      } else {
        toast.error("Failed to delete question.");
      }
    } catch (error) {
      toast.error("Network error. Failed to delete question.");
    } finally {
      setQuestionToDelete(null);
    }
  };

  const openEditPanel = (q) => {
    setEditingId(q.id);
    setSelectedSkill(q.skillId.toString());

    const correctIndex = q.options.indexOf(q.correctAnswer);
    const letter = ["A", "B", "C", "D"][correctIndex] || "A";

    setFormData({
      text: q.text,
      optionA: q.options[0] || "",
      optionB: q.options[1] || "",
      optionC: q.options[2] || "",
      optionD: q.options[3] || "",
      correctAnswer: letter,
    });
    setIsOpen(true);
  };

  const openAddPanel = () => {
    setEditingId(null);
    setSelectedSkill("");
    setFormData({
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
    });
    setIsOpen(true);
  };

  // Group questions by skill for better UX
  const groupedQuestions = questions.reduce((acc, q) => {
    const skillName = q.skillName || "Unassigned Skill";
    if (!acc[skillName]) acc[skillName] = [];
    acc[skillName].push(q);
    return acc;
  }, {});

  return (
    <div className="w-full p-4 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Question Bank</h1>
          <p className="text-gray-600 mt-1">
            Manage laboratory assessment questions for the Safety Gate.
          </p>
        </div>
        <Button
          onClick={openAddPanel}
          className="bg-navy hover:bg-cold text-white shadow-md shrink-0"
        >
          + Add New Question
        </Button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        {/* ADD / EDIT SLIDE-UP PANEL */}
        <SheetContent
          side="bottom"
          className="bg-white/95 backdrop-blur-xl border-t border-white/20 p-6 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-3xl sm:mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="text-black text-2xl">
              {editingId ? "Edit Question" : "Add New Question"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-black font-semibold">
                Select Laboratory Skill
              </Label>
              <Select onValueChange={setSelectedSkill} value={selectedSkill}>
                <SelectTrigger className="bg-white/50 border-gray-300 text-black">
                  <SelectValue placeholder="-- Select a Skill --" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-black">
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-black font-semibold">Question Text</Label>
              <Input
                className="bg-white/50 border-gray-300 text-black placeholder:text-gray-400"
                placeholder="Enter the question prompt..."
                value={formData.text}
                onChange={(e) =>
                  setFormData({ ...formData, text: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                { label: "Option A", key: "optionA" },
                { label: "Option B", key: "optionB" },
                { label: "Option C", key: "optionC" },
                { label: "Option D", key: "optionD" },
              ].map((opt) => (
                <div key={opt.key} className="space-y-2">
                  <Label className="text-black uppercase text-xs font-bold">
                    {opt.label}
                  </Label>
                  <Input
                    className="bg-white/50 border-gray-300 text-black"
                    value={formData[opt.key]}
                    onChange={(e) =>
                      setFormData({ ...formData, [opt.key]: e.target.value })
                    }
                    required
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-black font-semibold">Correct Answer</Label>
              <Select
                onValueChange={(val) =>
                  setFormData({ ...formData, correctAnswer: val })
                }
                value={formData.correctAnswer}
              >
                <SelectTrigger className="bg-white/50 border-gray-300 text-black font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-black">
                  {["A", "B", "C", "D"].map((v) => (
                    <SelectItem
                      key={v}
                      value={v}
                      className="font-bold text-green-700"
                    >
                      Option {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-navy hover:bg-cold mt-6 text-white h-12 text-lg"
            >
              {editingId ? "Save Changes" : "Create Question"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* GROUPED QUESTION LIST DISPLAY */}
      <div className="space-y-10 pt-4">
        {questions.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">
              No questions found. Click 'Add New Question' to get started.
            </p>
          </div>
        ) : (
          Object.entries(groupedQuestions).map(([skillName, qs]) => (
            <div key={skillName} className="space-y-4">
              {/* Skill Group Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                <h2 className="text-xl font-bold text-navy">{skillName}</h2>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {qs.length} {qs.length === 1 ? "Question" : "Questions"}
                </Badge>
              </div>

              {/* Questions within the Skill */}
              <div className="grid grid-cols-1 gap-4">
                {qs.map((q) => (
                  <Card
                    key={q.id}
                    className="bg-white border-gray-200 shadow-sm hover:shadow transition-shadow"
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2 max-w-[80%]">
                          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                            {q.text}
                          </h3>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPanel(q)}
                            className="border-gray-300"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setQuestionToDelete(q.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {q.options.map((opt, idx) => {
                          const isCorrect = opt === q.correctAnswer;
                          const letter = ["A", "B", "C", "D"][idx];
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg text-sm border ${
                                isCorrect
                                  ? "bg-green-50 border-green-300 text-green-900 font-medium"
                                  : "bg-gray-50 border-gray-200 text-gray-700"
                              }`}
                            >
                              <span className="mr-2 font-bold opacity-50">
                                {letter}.
                              </span>
                              {opt}
                              {isCorrect && (
                                <span className="ml-2 text-green-600 font-bold float-right">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog
        open={!!questionToDelete}
        onOpenChange={(open) => !open && setQuestionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete Question
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete this question? This action will
              permanently remove it from the question bank.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); 
                confirmDelete();
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

export default ManageQuestions;