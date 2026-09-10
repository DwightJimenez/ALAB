import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const TeacherQuizReview = ({ lessonId, editor, onQuizLocked }) => {
  const [generatedSkills, setGeneratedSkills] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const htmlContent = await editor.blocksToHTMLLossy(editor.document);

      const response = await fetch(`${API_URL}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonText: htmlContent,
        }),
      });
      const data = await response.json();

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
    updated[index][field] = [
      "p_init",
      "p_transit",
      "p_slip",
      "p_guess",
    ].includes(field)
      ? parseFloat(val)
      : val;
    setGeneratedSkills(updated);
  };

  const handleSaveQuizToDb = async () => {
    if (lessonId === "new-experiment") {
      alert(
        "Please save the Experiment Template first before locking in the quiz.",
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/experiments/${lessonId}/quiz`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            skills: generatedSkills,
            questions,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        alert("Safety Gate Quiz & Skills locked down successfully.");
        if (response.ok) {
          alert("Safety Gate Quiz & Skills locked down successfully.");

          if (onQuizLocked && data.addedSkills) {
            onQuizLocked(data.addedSkills);
          }
        }
      } else {
        alert(data.error || "Failed to save quiz.");
      }
    } catch (err) {
      console.error("Error saving quiz:", err);
    }
  };

  // Group questions by skill so the teacher can review them systematically
  const groupedQuestions = questions.reduce((group, q, idx) => {
    const skillName = q.targetedSkill || "Unassigned Skill";
    if (!group[skillName]) group[skillName] = [];
    // Save original index so the edit handler still updates the right item in the main array
    group[skillName].push({ ...q, originalIndex: idx });
    return group;
  }, {});

  return (
    <div className='space-y-10 max-w-5xl mx-auto p-4 pb-20'>
      <div className='flex justify-between items-center border-b pb-4'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Assignment Safety Gate
          </h2>
          <p className='text-sm text-slate-500 mt-1'>
            AI will analyze the document to extract required skills, recommend
            BKT parameters, and generate assessment questions.
          </p>
        </div>
        <Button
          onClick={handleGenerateQuiz}
          disabled={loading}
          className='bg-indigo-600 hover:bg-indigo-700 text-white shrink-0'
        >
          {loading ? "Analyzing Document..." : "Generate Skills & Quiz"}
        </Button>
      </div>

      {/* GENERATED SKILLS SECTION */}
      {generatedSkills.length > 0 && (
        <div className='space-y-4'>
          <h3 className='text-lg font-bold text-slate-800'>
            1. Review Extracted Skills
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {generatedSkills.map((skill, sIdx) => (
              <Card
                key={sIdx}
                className='border-indigo-100 shadow-sm bg-indigo-50/30'
              >
                <CardHeader className='pb-2'>
                  <Label className='text-xs font-bold text-indigo-500 uppercase tracking-wider'>
                    Skill Name
                  </Label>
                  <Input
                    value={skill.name}
                    onChange={(e) =>
                      handleUpdateSkill(sIdx, "name", e.target.value)
                    }
                    className='font-semibold bg-white'
                  />
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-4 gap-2'>
                    {["p_init", "p_transit", "p_slip", "p_guess"].map(
                      (param) => (
                        <div key={param} className='space-y-1'>
                          <Label className='text-[10px] text-slate-500 font-bold uppercase'>
                            {param.replace("p_", "")}
                          </Label>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            max='1'
                            value={skill[param] || 0}
                            onChange={(e) =>
                              handleUpdateSkill(sIdx, param, e.target.value)
                            }
                            className='h-8 text-xs bg-white px-2'
                          />
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* GENERATED QUESTIONS SECTION (GROUPED) */}
      {questions.length > 0 && (
        <div className='space-y-8 border-t pt-8'>
          <div className='flex justify-between items-center'>
            <h3 className='text-lg font-bold text-slate-800'>
              2. Review Assessment Questions
            </h3>
            <span className='text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full'>
              {questions.length} Total Questions
            </span>
          </div>

          <div className='space-y-10'>
            {Object.entries(groupedQuestions).map(
              ([skillName, skillQuestions]) => (
                <div key={skillName} className='space-y-4'>
                  {/* Visual Header for the Skill Group */}
                  <div className='flex items-center gap-3 border-b pb-2'>
                    <h4 className='text-md font-bold text-indigo-700'>
                      {skillName}
                    </h4>
                    <span className='text-xs font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md'>
                      {skillQuestions.length} Questions
                    </span>
                  </div>

                  {/* 2-Column Grid for Questions to save vertical space */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {skillQuestions.map((q) => (
                      <Card
                        key={q.originalIndex}
                        className='shadow-sm border-slate-200 flex flex-col h-full'
                      >
                        <CardHeader className='pb-3'>
                          <Input
                            className='text-sm font-medium'
                            value={q.questionText}
                            onChange={(e) =>
                              handleUpdateQuestionText(
                                q.originalIndex,
                                e.target.value,
                              )
                            }
                          />
                        </CardHeader>
                        <CardContent className='space-y-2 flex-grow'>
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-md border text-sm transition-colors ${
                                opt === q.correctAnswer
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                                  : "bg-slate-50 border-slate-100 text-slate-600"
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Sticky-ish Save Button at the bottom */}
          <div className='flex justify-end pt-8 border-t mt-8'>
            <Button
              size='lg'
              onClick={handleSaveQuizToDb}
              className='bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto shadow-lg'
            >
              Lock in Skills & Enable Gate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
