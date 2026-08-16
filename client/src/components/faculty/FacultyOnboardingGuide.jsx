import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const facultyQuickStartCards = [
  {
    title: "1. Review your class record",
    description:
      "Open Class Record to check rosters, enrollment details, and the students assigned to your sections before planning work.",
    icon: ClipboardCheck,
    page: "roster",
  },
  {
    title: "2. Prepare learning materials",
    description:
      "Use Learning Materials to share notes, instructions, and lab briefs with your students so they know what to review before class.",
    icon: BookOpen,
    page: "learning-materials",
  },
  {
    title: "3. Create or assign experiments",
    description:
      "Build an experiment or review the directory so students have the right task-based activities and grading structure for the week.",
    icon: FlaskConical,
    page: "experiments",
  },
  {
    title: "4. Manage the safety gate",
    description:
      "Keep the safety gate aligned with student mastery by reviewing standards, managing BKT data, and checking passed entries in one place.",
    icon: ShieldCheck,
    page: "safegate",
  },
];

const facultyChecklist = [
  "Review this week’s roster and confirm each section is assigned and active.",
  "Upload or update the learning material students should complete before lab work starts.",
  "Create or verify experiments and grading criteria before students begin their activities.",
  "Use the scanner and passed list to monitor who has cleared the safety gate for lab access.",
];

const FacultyOnboardingGuide = ({ setSelectedPage }) => {
  const navigate = useNavigate();

  const openPage = (page) => {
    if (setSelectedPage) {
      setSelectedPage(page);
      return;
    }
    navigate("/faculty-dashboard");
  };

  return (
    <div className='flex-1 w-full px-4 py-8 md:px-8 lg:px-12'>
      <div className='mx-auto max-w-6xl space-y-8'>
        <div className='rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-8 shadow-sm'>
          <div className='flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700'>
            <Users className='h-5 w-5' />
            Faculty quick start guide
          </div>
          <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl'>
            Welcome back, <span className='text-emerald-700'>faculty</span>
          </h1>
          <p className='mt-4 max-w-3xl text-base text-slate-600 md:text-lg'>
            Use this guide to get up and running quickly: review your roster, prepare learning materials,
            manage experiments, and monitor lab access through the safety gate.
          </p>
        </div>

        <div className='grid gap-5 md:grid-cols-2'>
          {facultyQuickStartCards.map(({ title, description, icon: Icon, page }) => (
            <Card key={title} className='border border-slate-200 bg-white shadow-sm'>
              <CardHeader className='flex flex-row items-start gap-4'>
                <div className='rounded-2xl bg-emerald-100 p-3 text-emerald-700'>
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
                    className='w-full justify-between rounded-xl bg-emerald-700 hover:bg-emerald-800'
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
            <CardTitle className='text-2xl font-bold text-slate-900'>Faculty onboarding checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='space-y-3 text-base text-slate-700'>
              {facultyChecklist.map((item) => (
                <li key={item} className='flex items-start gap-3'>
                  <span className='mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white'>✓</span>
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

export default FacultyOnboardingGuide;
