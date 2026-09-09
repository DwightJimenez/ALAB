import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const Quiz = () => {
  const { skillId } = useParams();
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New states to handle inline feedback instead of alerts
  const [feedback, setFeedback] = useState(null);
  const [masteryAchieved, setMasteryAchieved] = useState(false);
  
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const fetchQuestion = async () => {
    setSelected("");
    setIsSubmitting(false);
    setFeedback(null); // Clear feedback for the new question

    try {
      const res = await fetch(
        `${API_URL}/api/quiz/question/${skillId}`,
        { credentials: "include" }
      );
      
      if (!res.ok) {
        // If they exhausted the pool, just route them back safely
        navigate("/student-dashboard");
        return;
      }
      
      const data = await res.json();
      setQuestion(data);
    } catch (error) {
      console.error("Failed to fetch question:", error);
    }
  };

  useEffect(() => {
    fetchQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${API_URL}/api/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionId: question.id, userAnswer: selected }),
      });
      const result = await res.json();

      setFeedback(result);

      if (result.isMastered) {
        setMasteryAchieved(true);
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Submit failed:", error);
      setIsSubmitting(false);
    }
  };

  if (!question) return <div className="text-center mt-20">Loading Safety Question...</div>;

  // --- SUCCESS SCREEN ---
  if (masteryAchieved) {
    return (
      <div className="max-w-3xl mx-auto mt-20 p-10 rounded-3xl bg-white border border-green-100 shadow-2xl text-center">
        <h2 className="text-3xl font-bold text-green-600 mb-4">Mastery Achieved!</h2>
        <p className="text-gray-600 mb-8 text-lg">
          You have demonstrated independent proficiency in these safety protocols. Lab access is now unlocked.
        </p>
        <button
          onClick={() => navigate("/student-dashboard")}
          className="px-8 py-4 rounded-xl bg-green-600 text-white font-bold transition-all hover:bg-green-700 shadow-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // --- QUIZ INTERFACE ---
  return (
    <div className="max-w-6xl mx-auto mt-20 p-8 rounded-3xl bg-white border border-white/10 backdrop-blur-md shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h2 className="text-xl font-semibold text-black mb-8 leading-relaxed">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map((opt) => {
              // Determine button styling based on feedback
              let buttonStyle = "bg-white/5 border-transparent hover:bg-white/5 text-navy hover:text-black";
              
              if (feedback) {
                if (opt === feedback.correctAnswer) {
                  buttonStyle = "bg-green-50 border-green-500 text-green-900 font-medium";
                } else if (opt === selected && !feedback.isCorrect) {
                  buttonStyle = "bg-red-50 border-red-500 text-red-900";
                } else {
                  buttonStyle = "bg-gray-50 border-transparent text-gray-400 opacity-50";
                }
              } else if (selected === opt) {
                buttonStyle = "bg-white/10 border-black/30 text-black";
              }

              return (
                <button
                  key={opt}
                  onClick={() => !feedback && setSelected(opt)}
                  disabled={feedback !== null}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 border ${buttonStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            {!feedback ? (
              <button
                onClick={handleSubmit}
                disabled={!selected || isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                {isSubmitting ? "Processing..." : "Submit Answer"}
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl text-sm font-medium border ${
                    feedback.isCorrect
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {feedback.isCorrect
                    ? "Correct! Safe procedure identified."
                    : `Incorrect. The safe procedure is: ${feedback.correctAnswer}`}
                </div>
                <button
                  onClick={fetchQuestion}
                  className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold transition-all hover:bg-gray-800"
                >
                  Next Question
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Quiz;