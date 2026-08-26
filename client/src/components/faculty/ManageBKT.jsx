import React from "react";
import { HelpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ManageSkills from "@/components/faculty/ManageSkills";
import ManageQuestions from "@/components/faculty/ManageQuestions";

const ManageBKT = () => {
  return (
    <div className="h-screen w-full bg-white">
      {/* Container with top padding to account for fixed Navbar */}
      <div className="p-4">
        <Tabs defaultValue="skills" className="w-full">
          {/* Header Row: Tabs + Info Button */}
          <div className="flex items-center gap-3 mb-4 max-w-md">
            <TabsList className="grid w-full grid-cols-2 backdrop-blur border border-slate-200">
              <TabsTrigger value="skills">Manage Skills</TabsTrigger>
              <TabsTrigger value="questions">Manage Questions</TabsTrigger>
            </TabsList>

            <Dialog className="z-100 relative">
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0 h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  title="How BKT Works"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[700px] bg-white p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                  <DialogTitle className="text-xl font-bold text-slate-800">
                    How Bayesian Knowledge Tracing (BKT) Works
                  </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="max-h-[75vh] p-6 pt-2">
                  <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                    <p>
                      BKT is a mathematical algorithm that models a student's cognitive mastery over time. 
                      Instead of just calculating a percentage score, it updates the <strong>probability</strong> that a student truly understands a skill after every single question they answer.
                    </p>

                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-3">
                      <h3 className="font-semibold text-slate-800">The 4 Core Parameters</h3>
                      <ul className="space-y-2">
                        <li>
                          <span className="font-bold text-indigo-600">Prior <i>P(L<sub>0</sub>)</i>:</span> The baseline probability a student already knows the skill before answering any questions.
                        </li>
                        <li>
                          <span className="font-bold text-indigo-600">Learn <i>P(T)</i>:</span> The probability a student will transition from "not knowing" to "knowing" the skill after an attempt.
                        </li>
                        <li>
                          <span className="font-bold text-indigo-600">Guess <i>P(G)</i>:</span> The probability a student answers correctly simply by guessing, despite not knowing the skill.
                        </li>
                        <li>
                          <span className="font-bold text-indigo-600">Slip <i>P(S)</i>:</span> The probability a student answers incorrectly due to a careless mistake, despite actually knowing the skill.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-slate-800 border-b pb-2">The Mathematical Formulas (Bayes' Theorem)</h3>
                      <p>After a student submits an answer, the system updates their mastery probability <i>P(L)</i> using one of these two equations:</p>
                      
                      <div className="grid gap-4 font-mono text-[13px] mt-4">
                        {/* Correct Answer Formula */}
                        <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                          <p className="font-bold text-emerald-700 font-sans mb-3 text-xs uppercase tracking-wider">1. If Answered Correctly</p>
                          <div className="flex items-center flex-wrap gap-2 text-slate-800">
                            <span>P(L | Correct) =</span>
                            <div className="flex flex-col items-center text-center">
                              <span className="border-b border-slate-400 pb-1 px-2">P(L) × (1 - Slip)</span>
                              <span className="pt-1 px-2">P(L) × (1 - Slip) + (1 - P(L)) × Guess</span>
                            </div>
                          </div>
                        </div>

                        {/* Incorrect Answer Formula */}
                        <div className="bg-red-50/50 p-4 rounded-lg border border-red-100">
                          <p className="font-bold text-red-700 font-sans mb-3 text-xs uppercase tracking-wider">2. If Answered Incorrectly</p>
                          <div className="flex items-center flex-wrap gap-2 text-slate-800">
                            <span>P(L | Incorrect) =</span>
                            <div className="flex flex-col items-center text-center">
                              <span className="border-b border-slate-400 pb-1 px-2">P(L) × Slip</span>
                              <span className="pt-1 px-2">P(L) × Slip + (1 - P(L)) × (1 - Guess)</span>
                            </div>
                          </div>
                        </div>

                        {/* Learning Transition Formula */}
                        <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mt-2">
                          <p className="font-bold text-indigo-700 font-sans mb-3 text-xs uppercase tracking-wider">3. Applying the Learning Rate</p>
                          <p className="font-sans text-xs text-slate-600 mb-2">Regardless of whether they were right or wrong, the system then factors in the probability that they learned something from the attempt:</p>
                          <div className="text-slate-800 bg-white p-3 rounded border shadow-sm inline-block">
                            P(L<sub>next</sub>) = P(L | Answer) + (1 - P(L | Answer)) × Learn
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-800 font-medium mt-4">
                      🎯 Once P(L<sub>next</sub>) crosses your designated threshold (e.g., 0.95), the system officially registers that specific skill as <strong>Mastered</strong>.
                    </p>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="skills">
            <ManageSkills />
          </TabsContent>

          <TabsContent value="questions">
            <ManageQuestions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManageBKT;