import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const TeacherQuizReview = ({ lessonId, editor }) => {
  const [generatedSkills, setGeneratedSkills] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);

      // We no longer pass availableSkills. We ask the AI to invent them based on the text.
      const response = await fetch(`${API_URL}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonText: htmlContent,
        }),
      });
      const data = await response.json();
      
      // Expecting the API to return both skills and questions
      setGeneratedSkills(data.skills || []);
      setQuestions(data.questions || []);
    } catch (err) {
      console.error("Error fetching generated items:", err);
      alert("Failed to generate quiz and skills. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestionText = (index, val) => {
    const updated = [...questions];
    updated[index].questionText = val;
    setQuestions(updated);
  };

  const handleUpdateSkill = (index, field, val) => {
    const updated = [...generatedSkills];
    // Convert BKT string inputs to floats if they are numbers
    updated[index][field] = ["p_init", "p_transit", "p_slip", "p_guess"].includes(field) 
      ? parseFloat(val) 
      : val;
    setGeneratedSkills(updated);
  };

  const handleSaveQuizToDb = async () => {
    // PREVENT SAVING IF EXPERIMENT IS NOT SAVED YET
    if (lessonId === "new-experiment") {
      alert("Please save the Experiment Template first before locking in the quiz.");
      return;
    }

    try {
      // Send BOTH the generated skills and the questions to the backend
      const response = await fetch(`${API_URL}/api/experiments/${lessonId}/quiz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          skills: generatedSkills, 
          questions 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert("Safety Gate Quiz & Skills locked down successfully.");
      } else {
        alert(data.error || "Failed to save quiz.");
      }
    } catch (err) {
      console.error("Error saving quiz:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 pb-20">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Assignment Safety Gate
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            AI will analyze the document to extract required skills, recommend BKT parameters, and generate assessment questions.
          </p>
        </div>
        <Button onClick={handleGenerateQuiz} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
          {loading ? "Analyzing Document..." : "Generate Skills & Quiz"}
        </Button>
      </div>

      {/* GENERATED SKILLS SECTION */}
      {generatedSkills.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Extracted Skills & BKT Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedSkills.map((skill, sIdx) => (
              <Card key={sIdx} className="border-indigo-100 shadow-sm bg-indigo-50/30">
                <CardHeader className="pb-2">
                  <Label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Skill Name</Label>
                  <Input 
                    value={skill.name} 
                    onChange={(e) => handleUpdateSkill(sIdx, "name", e.target.value)}
                    className="font-semibold bg-white"
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">P(Init)</Label>
                      <Input 
                        type="number" step="0.01" min="0" max="1"
                        value={skill.p_init || 0} 
                        onChange={(e) => handleUpdateSkill(sIdx, "p_init", e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">P(Transit)</Label>
                      <Input 
                        type="number" step="0.01" min="0" max="1"
                        value={skill.p_transit || 0} 
                        onChange={(e) => handleUpdateSkill(sIdx, "p_transit", e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">P(Slip)</Label>
                      <Input 
                        type="number" step="0.01" min="0" max="1"
                        value={skill.p_slip || 0} 
                        onChange={(e) => handleUpdateSkill(sIdx, "p_slip", e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">P(Guess)</Label>
                      <Input 
                        type="number" step="0.01" min="0" max="1"
                        value={skill.p_guess || 0} 
                        onChange={(e) => handleUpdateSkill(sIdx, "p_guess", e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* GENERATED QUESTIONS SECTION */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-t pt-6">Assessment Questions</h3>
          {questions.map((q, qIdx) => (
            <Card key={qIdx} className="shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Targets Skill: <span className="text-indigo-600">{q.targetedSkill}</span>
                  </CardTitle>
                </div>
                <Input
                  className="text-sm font-medium mt-2"
                  value={q.questionText}
                  onChange={(e) =>
                    handleUpdateQuestionText(qIdx, e.target.value)
                  }
                />
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className={`p-2.5 rounded-md border text-sm transition-colors ${
                      oIdx === q.correctAnswerIndex
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium"
                        : "bg-white border-slate-100 text-slate-600"
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-end pt-6">
            <Button
              size="lg"
              onClick={handleSaveQuizToDb}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
            >
              Lock in Skills & Enable Gate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};