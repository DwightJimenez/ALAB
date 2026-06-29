import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

const StudentDashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const [skills, setSkills] = useState([]);
  
  // Real Quiz States
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);

  const fetchProgress = async () => {
    const response = await fetch('http://localhost:5000/api/quiz/progress', { credentials: 'include' });
    const data = await response.json();
    setSkills(data);
  };

  useEffect(() => { fetchProgress(); }, []);

  // 1. Fetch a real question from the database
  const handleStartQuiz = async (skillId) => {
    setFeedback(null);
    setSelectedAnswer("");
    const response = await fetch(`http://localhost:5000/api/quiz/question/${skillId}`, { credentials: 'include' });
    const data = await response.json();
    setActiveQuestion(data);
  };

  // 2. Submit the student's actual answer to the backend
  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) return;

    const response = await fetch('http://localhost:5000/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ questionId: activeQuestion.id, userAnswer: selectedAnswer }),
    });
    
    const result = await response.json();
    setFeedback(result); // Contains isCorrect, correctAnswer, etc.
    fetchProgress(); // Update the progress bars instantly!
  };

  const allMastered = skills.length > 0 && skills.every(skill => skill.isMastered);

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.name}</h1>
        
        {/* --- ACTIVE QUIZ MODAL/SECTION --- */}
        {activeQuestion && (
          <div className="mb-8 p-6 bg-white border border-pink-200 shadow-lg rounded-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{activeQuestion.text}</h2>
            
            {!feedback ? (
              // SHOW THE OPTIONS
              <div className="space-y-3">
                {activeQuestion.options.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedAnswer(opt)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all 
                      ${selectedAnswer === opt ? 'border-pink-500 bg-pink-50' : 'border-slate-200 hover:border-pink-300'}`}
                  >
                    {opt}
                  </button>
                ))}
                <div className="pt-4 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setActiveQuestion(null)}>Cancel</Button>
                  <Button className="bg-pink-600 hover:bg-pink-700 text-white" onClick={handleSubmitAnswer} disabled={!selectedAnswer}>
                    Submit Answer
                  </Button>
                </div>
              </div>
            ) : (
              // SHOW THE GRADING FEEDBACK
              <div className={`p-4 rounded-lg border ${feedback.isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <h3 className="font-bold text-lg mb-2">{feedback.isCorrect ? "Correct!" : "Incorrect."}</h3>
                {!feedback.isCorrect && <p className="mb-4">The correct answer was: <strong>{feedback.correctAnswer}</strong></p>}
                
                {feedback.isMastered ? (
                  <p className="font-bold text-pink-600">🎉 You have mastered this skill!</p>
                ) : (
                  <p className="text-sm">Your mastery probability updated to: {Math.round(feedback.currentPL * 100)}%</p>
                )}
                
                <Button className="mt-4" onClick={() => setActiveQuestion(null)}>Return to Dashboard</Button>
              </div>
            )}
          </div>
        )}

        {/* --- THE PROGRESS DASHBOARD --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => {
            const masteryPercentage = Math.round(skill.currentPL * 100);
            return (
              <Card key={skill.id} className={skill.isMastered ? "border-green-400 bg-green-50/30" : ""}>
                <CardHeader>
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className={skill.isMastered ? "text-green-600" : "text-slate-500"}>Mastery Probability</span>
                    <span className={skill.isMastered ? "text-green-600" : "text-pink-600"}>{masteryPercentage}%</span>
                  </div>
                  <Progress value={masteryPercentage} className={`h-3 ${skill.isMastered ? "bg-green-200" : "bg-slate-200"}`} indicatorColor={skill.isMastered ? "bg-green-500" : "bg-pink-500"} />
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t pt-4">
                  {skill.isMastered ? (
                    <div className="text-sm font-bold text-green-600 w-full text-center">✓ Skill Mastered</div>
                  ) : (
                    <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white" onClick={() => handleStartQuiz(skill.id)}>
                      Take Assessment
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;