import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const Quiz = () => {
  const { skillId } = useParams();
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchQuestion = async () => {
    const res = await fetch(
      `${API_URL}/api/quiz/question/${skillId}`,
      { credentials: "include" },
    );
    const data = await res.json();
    setQuestion(data);
  };

  useEffect(() => {
    fetchQuestion();
  }, [skillId]);

  const handleSubmit = async () => {
    const res = await fetch(`${API_URL}/api/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ questionId: question.id, userAnswer: selected }),
    });
    const result = await res.json();

    if (result.isMastered) {
      alert("Mastery achieved! Lab access unlocked.");
      navigate("/student-dashboard");
    } else {
      alert(result.isCorrect ? "Correct!" : "Incorrect.");
      fetchQuestion(); // Get next adaptive question
    }
  };

  if (!question) return <div>Loading Safety Question...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-20 p-8 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-md shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h2 className="text-xl font-semibold text-white mb-8 leading-relaxed">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 border ${
                  selected === opt
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-white/5 border-transparent hover:bg-white/5 text-white/70 hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selected || isSubmitting}
            className="mt-8 w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            {isSubmitting ? "Processing..." : "Submit Answer"}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Quiz;
