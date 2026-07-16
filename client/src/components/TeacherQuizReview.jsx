// client/components/TeacherQuizReview.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const TeacherQuizReview = ({ lessonId, editor, availableSkills }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);

      const response = await fetch("http://localhost:5000/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonText: htmlContent,
          skills: availableSkills,
        }),
      });
      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error("Error fetching generated items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestionText = (index, val) => {
    const updated = [...questions];
    updated[index].questionText = val;
    setQuestions(updated);
  };

  const handleSaveQuizToDb = async () => {
    // PREVENT SAVING IF EXPERIMENT IS NOT SAVED YET
    if (lessonId === "new-experiment") {
      alert("Please save the Experiment Template first before locking in the quiz.");
      return;
    }

    try {
      // UPDATED TO MATCH EXPERIMENT ROUTER
      const response = await fetch(`http://localhost:5000/api/experiments/${lessonId}/quiz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questions }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert("Safety Gate Quiz locked down successfully.");
      } else {
        alert(data.error || "Failed to save quiz.");
      }
    } catch (err) {
      console.error("Error saving quiz:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Assignment Safety Gate
        </h2>
        <Button onClick={handleGenerateQuiz} disabled={loading}>
          {loading ? "Generating with Gemini..." : "Draft Quiz with AI"}
        </Button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q, qIdx) => (
            <Card key={qIdx}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
                    Skill: {q.targetedSkill}
                  </CardTitle>
                </div>
                <Input
                  className="text-base font-medium mt-2"
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
                    className={`p-3 rounded-lg border text-sm ${
                      oIdx === q.correctAnswerIndex
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium"
                        : "bg-background border-input"
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end pt-4">
            <Button
              variant="default"
              onClick={handleSaveQuizToDb}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Lock in Quiz & Enable Gate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};