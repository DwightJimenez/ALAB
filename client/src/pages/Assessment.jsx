import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const Assessment = () => {
  const [skills, setSkills] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/quiz/progress", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSkills(data));
  }, []);
  return (
    <div className="max-w-4xl mx-auto mt-20 p-8 text-white ">
      <h1 className="text-4xl text-black mb-8 tracking-tight">Lab Access</h1>

      <div className="grid gap-4">
        {skills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.5 }}
            className={`p-6 rounded-2xl border backdrop-blur-md transition-all ${
              skill.isMastered
                ? "bg-emerald-900/20 border-emerald-500/30"
                : "bg-slate-900/40 border-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{skill.name}</h2>
                <p
                  className={`text-sm mt-1 font-medium ${skill.isMastered ? "text-emerald-400" : "text-slate-200"}`}
                >
                  {skill.isMastered
                    ? "✅ Access Granted"
                    : !skill.hasQuestions
                      ? "⚠️ Coming Soon"
                      : "🔒 Safety Gate Locked"}
                </p>
              </div>

              {/* Only show the button if NOT mastered AND has questions */}
              {!skill.isMastered && skill.hasQuestions && (
                <button
                  onClick={() => navigate(`/quiz/${skill.id}`)}
                  className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                >
                  Start Quiz
                </button>
              )}
            </div>
          </motion.div>
        ))}
        
      </div>
    </div>
  );
};

export default Assessment;
