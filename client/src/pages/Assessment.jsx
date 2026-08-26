import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react"; // Optional: for nice UI feedback

const Assessment = () => {
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`${API_URL}/api/quiz/progress`, { 
          credentials: "include" 
        });
        
        // fetch doesn't automatically throw on HTTP errors (like 401 or 500)
        // so we need to check res.ok manually
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setSkills(data.progressData || []);
        
      } catch (err) {
        console.error("Error fetching lab progress:", err);
        setError("Failed to load lab access data. Please try refreshing.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [API_URL]);

  return (
    <div className="max-w-4xl mx-auto mt-20 p-8 text-white">
      <h1 className="text-4xl text-navy mb-8 tracking-tight">Lab Access</h1>

      {/* 1. Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
          <p>Loading your lab access...</p>
        </div>
      )}

      {/* 2. Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p>{error}</p>
        </div>
      )}

      {/* 3. Empty State (No errors, but no data returned) */}
      {!isLoading && !error && skills.length === 0 && (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-white/10 text-black">
          <p>No lab access data available right now.</p>
        </div>
      )}

      {/* 4. Success State */}
      {!isLoading && !error && skills.length > 0 && (
        <div className="grid gap-4">
          {skills.map((skill, index) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }} // Reduced delay so it doesn't take forever to load a long list
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
                    className={`text-sm mt-1 font-medium ${
                      skill.isMastered ? "text-emerald-400" : "text-slate-200"
                    }`}
                  >
                    {skill.isMastered
                      ? "✅ Access Granted"
                      : !skill.hasQuestions
                        ? "⚠️ Coming Soon"
                        : "🔒 Safety Gate Locked"}
                  </p>
                </div>

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
      )}
    </div>
  );
};

export default Assessment;