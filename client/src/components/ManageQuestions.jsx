import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  SheetTrigger,
} from "@/components/ui/sheet";

const ManageQuestions = () => {
  const [skills, setSkills] = useState([]);
  const [questions, setQuestions] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  const [selectedSkill, setSelectedSkill] = useState("");
  const [formData, setFormData] = useState({
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
  });

  // Fetch Skills and Questions on Load
  useEffect(() => {
    fetchSkills();
    fetchQuestions();
  }, []);

  const fetchSkills = async () => {
    const res = await fetch(`${API_URL}/api/quiz/skills`, { credentials: "include" });
    if (res.ok) setSkills(await res.json());
  };

  const fetchQuestions = async () => {
    const res = await fetch(`${API_URL}/api/quiz/admin/questions`, { credentials: "include" });
    if (res.ok) setQuestions(await res.json());
  };

  // --- FORM HANDLING (CREATE OR UPDATE) ---
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedSkill) return alert("Please select a skill.");

    const optionsArray = [formData.optionA, formData.optionB, formData.optionC, formData.optionD];
    const answerMap = { A: 0, B: 1, C: 2, D: 3 };
    const actualCorrectText = optionsArray[answerMap[formData.correctAnswer]];

    // Determine URL and Method based on Create vs Edit mode
    const url = editingId 
      ? `${API_URL}/api/quiz/admin/question/${editingId}`
      : `${API_URL}/api/quiz/admin/question`;
      
    const method = editingId ? "PUT" : "POST";

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
      alert(editingId ? "Question updated!" : "Question added!");
      setIsOpen(false);
      fetchQuestions(); // Refresh the list
    } else {
      alert("Failed to save question.");
    }
  };

  // --- DELETE HANDLING ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;

    const res = await fetch(`${API_URL}/api/quiz/admin/question/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      fetchQuestions(); // Refresh list after deleting
    }
  };

  // --- EDIT PRE-FILL ---
  const openEditPanel = (q) => {
    setEditingId(q.id);
    setSelectedSkill(q.skillId.toString());
    
    // Figure out which letter was correct based on the text match
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

  // --- ADD PRE-FILL (Clears form) ---
  const openAddPanel = () => {
    setEditingId(null);
    setSelectedSkill("");
    setFormData({
      text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A"
    });
    setIsOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-4 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold text-black">Question Bank</h1>
          <p className="text-gray-600">Manage laboratory assessment questions for the Safety Gate.</p>
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <Button onClick={openAddPanel} className="bg-navy hover:bg-cold text-white">
            + Add New Question
          </Button>

          {/* ADD / EDIT SLIDE-UP PANEL */}
          <SheetContent 
            side="bottom" 
            className="bg-white/95 backdrop-blur-xl border-t border-white/20 p-6 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-3xl sm:mx-auto"
          >
            <SheetHeader className="mb-6">
              <SheetTitle className="text-black text-2xl">
                {editingId ? "Edit Question" : "Add New Question"}
              </SheetTitle>
            </SheetHeader>
            
            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-black">Select Laboratory Skill</Label>
                <Select onValueChange={setSelectedSkill} value={selectedSkill}>
                  <SelectTrigger className="bg-white/5 border-black/20 text-black">
                    <SelectValue placeholder="-- Select a Skill --" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 border-black/10 text-black">
                    {skills.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-black">Question Text</Label>
                <Input
                  className="bg-white/5 border-black/20 text-black"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Option A", key: "optionA" },
                  { label: "Option B", key: "optionB" },
                  { label: "Option C", key: "optionC" },
                  { label: "Option D", key: "optionD" },
                ].map((opt) => (
                  <div key={opt.key} className="space-y-2">
                    <Label className="text-black uppercase">{opt.label}</Label>
                    <Input
                      className="bg-white/5 border-black/20 text-black"
                      value={formData[opt.key]}
                      onChange={(e) => setFormData({ ...formData, [opt.key]: e.target.value })}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-black">Correct Answer</Label>
                <Select
                  onValueChange={(val) => setFormData({ ...formData, correctAnswer: val })}
                  value={formData.correctAnswer}
                >
                  <SelectTrigger className="bg-white/5 border-black/20 text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 border-black/10 text-black">
                    {["A", "B", "C", "D"].map((v) => (
                      <SelectItem key={v} value={v}>Option {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full bg-navy hover:bg-cold mt-4">
                {editingId ? "Save Changes" : "Create Question"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* QUESTION LIST DISPLAY */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center p-10 bg-white/10 rounded-xl">
            <p className="text-gray-500">No questions found. Click 'Add New Question' to get started.</p>
          </div>
        ) : (
          questions.map((q) => (
            <Card key={q.id} className="bg-white border shadow-sm">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {q.skillName}
                    </Badge>
                    <h3 className="text-lg font-semibold text-gray-900">{q.text}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditPanel(q)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(q.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {q.options.map((opt, idx) => {
                    const isCorrect = opt === q.correctAnswer;
                    const letter = ["A", "B", "C", "D"][idx];
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-md text-sm border ${
                          isCorrect ? "bg-green-50 border-green-300 text-green-900 font-medium" : "bg-gray-50 border-gray-200 text-gray-700"
                        }`}
                      >
                        <span className="mr-2 font-bold opacity-50">{letter}.</span>
                        {opt}
                        {isCorrect && <span className="ml-2 text-green-600">✓ Correct</span>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageQuestions;