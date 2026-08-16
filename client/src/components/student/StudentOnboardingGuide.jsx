import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, FlaskConical, Rocket, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const studentQuickStartCards = [
  {
    title: "1. Review your learning materials",
    description:
      "Start in Learning Materials to read the lab brief, safety guidance, and any notes your instructor has shared before you begin.",
    icon: BookOpen,
    page: "learning",
  },
  {
    title: "2. Check your assignments",
    description:
      "Open Assignments to see due dates, required files, and group tasks. Complete what is due before entering the lab workspace.",
    icon: Rocket,
    page: "assignments",
  },
  {
    title: "3. Join the lab workspace",
    description:
      "Collaborate with your group, access the sandbox, and submit group work once your team is ready to begin the practical exercise.",
    icon: Users,
    page: "sandbox",
  },
  {
    title: "4. Pass the safety gate",
    description:
      "Complete the required quizzes and review your mastery progress so you can unlock the safety gate and work safely in the lab.",
    icon: ShieldCheck,
    page: "stats",
  },
];

const studentChecklist = [
  "Confirm your group PIN and team setup before starting a lab task.",
  "Read all learning materials and safety instructions before you proceed.",
  "Use the logbook to document observations and keep evidence for each experiment.",
  "Submit assignments on time and review your performance stats to keep improving.",
];

const StudentOnboardingGuide = ({ setSelectedPage }) => {
  const navigate = useNavigate();

  const openPage = (page) => {
    if (setSelectedPage) {
      setSelectedPage(page);
      return;
    }
    navigate("/student-dashboard");
  };

  return (
    <div className='flex-1 w-full px-4 py-8 md:px-8 lg:px-12'>
      <div className='mx-auto max-w-6xl space-y-8'>
        <div className='rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-8 shadow-sm'>
          <div className='flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-700'>
            <FlaskConical className='h-5 w-5' />
            Student quick start guide
          </div>
          <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl'>
            Welcome to ALAB, {" "}
            <span className='text-violet-700'>student</span>
          </h1>
          <p className='mt-4 max-w-3xl text-base text-slate-600 md:text-lg'>
            This walkthrough introduces the fastest path to getting started: review the learning materials,
            complete your assignments, join your workspace, and pass the safety gate before using the lab.
          </p>
        </div>

        <div className='grid gap-5 md:grid-cols-2'>
          {studentQuickStartCards.map(({ title, description, icon: Icon, page }) => (
            <Card key={title} className='border border-slate-200 bg-white shadow-sm'>
              <CardHeader className='flex flex-row items-start gap-4'>
                <div className='rounded-2xl bg-violet-100 p-3 text-violet-700'>
                  <Icon className='h-6 w-6' />
                </div>
                <CardTitle className='text-xl font-bold text-slate-800'>{title}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <CardDescription className='text-base leading-relaxed text-slate-600'>
                  {description}
                </CardDescription>
                {setSelectedPage && (
                  <Button
                    onClick={() => openPage(page)}
                    className='w-full justify-between rounded-xl bg-violet-700 hover:bg-violet-800'
                  >
                    Open section
                    <ArrowRight className='h-4 w-4' />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className='border border-slate-200 bg-slate-50 shadow-sm'>
          <CardHeader>
            <CardTitle className='text-2xl font-bold text-slate-900'>Your first lab checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='space-y-3 text-base text-slate-700'>
              {studentChecklist.map((item) => (
                <li key={item} className='flex items-start gap-3'>
                  <span className='mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white'>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentOnboardingGuide;
