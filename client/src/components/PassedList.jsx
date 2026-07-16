import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, 
  Search, 
  SearchX, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Filter
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const PassedList = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // NEW: State for the filter
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL", "CLEARED", "PENDING"

  useEffect(() => {
    const fetchStudentStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/quiz/admin/passers`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setStudents(data);
        }
      } catch (error) {
        console.error("Failed to load student status", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentStatus();
  }, []);

  // Filter students based on BOTH the search bar and the status filter
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.section.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      statusFilter === "ALL" || 
      (statusFilter === "CLEARED" && student.isCleared) || 
      (statusFilter === "PENDING" && !student.isCleared);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 mt-10">
      
      {/* Header & Controls Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-md">
        <div className="shrink-0">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-navy h-8 w-8" />
            Safety Gate Clearance
          </h1>
          <p className="text-slate-500 mt-1">
            Track student mastery progress for laboratory access.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          
          {/* Status Filter Toggle */}
          <div className="flex items-center bg-slate-200/50 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                statusFilter === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("CLEARED")}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                statusFilter === "CLEARED" ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Cleared
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                statusFilter === "PENDING" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Pending
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="text"
              placeholder="Search student or section..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          Loading student records...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
          <Filter className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-medium text-slate-600">No students found</p>
          <p className="text-sm">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {filteredStudents.map((student) => {
            const passedSkills = student.skills.filter(s => s.isMastered);
            const pendingSkills = student.skills.filter(s => !s.isMastered);

            return (
              <AccordionItem 
                key={student.id} 
                value={student.id.toString()} 
                className="bg-white border border-slate-200 shadow-sm rounded-xl px-2 overflow-hidden"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-5">
                  <div className="flex justify-between items-center w-full pr-4">
                    
                    {/* Student Info */}
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-800 text-lg">{student.studentName}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                          {student.section}
                        </Badge>
                        <span className="text-xs text-slate-500">{student.email}</span>
                      </div>
                    </div>

                    {/* Clearance Badge */}
                    <div>
                      {student.isCleared ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none px-3 py-1 text-sm font-semibold flex items-center gap-1 shadow-none">
                          <CheckCircle2 size={16} /> Cleared
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3 py-1 text-sm font-semibold flex items-center gap-1 shadow-none">
                          <Clock size={16} /> Pending
                        </Badge>
                      )}
                    </div>

                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-6 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    
                    {/* Passed Skills Column */}
                    <div>
                      <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3 border-b border-green-100 pb-2">
                        <CheckCircle2 size={18} /> Passed Skills ({passedSkills.length})
                      </h4>
                      {passedSkills.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No skills passed yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {passedSkills.map(skill => (
                            <li key={skill.id} className="text-sm text-slate-700 flex items-center gap-2 bg-green-50/50 p-2 rounded-md border border-green-100/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              {skill.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Pending Skills Column */}
                    <div>
                      <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-3 border-b border-amber-100 pb-2">
                        <XCircle size={18} /> Pending Skills ({pendingSkills.length})
                      </h4>
                      {pendingSkills.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">All skills mastered!</p>
                      ) : (
                        <ul className="space-y-2">
                          {pendingSkills.map(skill => (
                            <li key={skill.id} className="text-sm text-slate-600 flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              {skill.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default PassedList;