import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ManageQuestions
 = () => {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [formData, setFormData] = useState({
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
  });

  useEffect(() => {
    const fetchSkills = async () => {
      const response = await fetch("http://localhost:5000/api/quiz/skills", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    };
    fetchSkills();
  }, []);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selectedSkill) return alert("Please select a skill.");

    const optionsArray = [
      formData.optionA,
      formData.optionB,
      formData.optionC,
      formData.optionD,
    ];
    const answerMap = { A: 0, B: 1, C: 2, D: 3 };
    const actualCorrectText = optionsArray[answerMap[formData.correctAnswer]];

    const response = await fetch(
      "http://localhost:5000/api/quiz/admin/question",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          skillId: selectedSkill,
          text: formData.text,
          options: optionsArray,
          correctAnswer: actualCorrectText,
        }),
      },
    );

    if (response.ok) {
      alert("Question successfully added!");
      setFormData({
        text: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "A",
      });
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-6 w-full h-fit max-w-3xl mx-auto mt-10">
      <CardHeader>
        <CardTitle className="text-black text-2xl">
          Add Lab Assessment Question
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black">Select Laboratory Skill</Label>
            <Select onValueChange={setSelectedSkill} value={selectedSkill}>
              <SelectTrigger className="bg-white/5 border-black text-black">
                <SelectValue placeholder="-- Select a Skill --" />
              </SelectTrigger>
              <SelectContent className="bg-gray-300 border-white/10 text-black">
                {skills.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-black">Question Text</Label>
            <Input
              className="bg-white/5 border-black text-black"
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Map over the keys, but use the correct formData property names */}
            {[
              { label: "Option A", key: "optionA" },
              { label: "Option B", key: "optionB" },
              { label: "Option C", key: "optionC" },
              { label: "Option D", key: "optionD" },
            ].map((opt) => (
              <div key={opt.key} className="space-y-2">
                <Label className="text-black uppercase">{opt.label}</Label>
                <Input
                  className="bg-white/5 border-black text-black"
                  // Use opt.key to access the correct state property
                  value={formData[opt.key] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [opt.key]: e.target.value })
                  }
                  required
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-black">Correct Answer</Label>
            <Select
              onValueChange={(val) =>
                setFormData({ ...formData, correctAnswer: val })
              }
              value={formData.correctAnswer}
            >
              <SelectTrigger className="bg-white/5 border-black text-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-300 border-white/10 text-black">
                {["A", "B", "C", "D"].map((v) => (
                  <SelectItem key={v} value={v}>
                    Option {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-navy hover:bg-cold"
          >
            Save Question
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ManageQuestions
;
