import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  LineChart,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Run experiments",
    description:
      "Find procedures, materials, and laboratory activities in one workspace.",
    icon: FlaskConical,
    color: "text-indigo-600 bg-indigo-50",
    page: "assignments",
  },
  {
    title: "Learn together",
    description:
      "Join your group, share a PIN, and collaborate on submissions in real time.",
    icon: Users,
    color: "text-sky-600 bg-sky-50",
    page: "assignments",
  },
  {
    title: "Build your skills",
    description:
      "Track your progress and see which practical skills are ready for mastery.",
    icon: LineChart,
    color: "text-emerald-600 bg-emerald-50",
    page: "stats",
  },
  {
    title: "Keep your labbook",
    description:
      "Record observations, upload files, and submit your work with confidence.",
    icon: BookOpen,
    color: "text-amber-600 bg-amber-50",
    page: "logbook",
  },
];

const IntroductionModal = ({ user, onNavigate }) => {
  const [open, setOpen] = useState(false);

  const storageKey = user
    ? `alab-introduction-seen-${user.id || user.email}`
    : null;

  useEffect(() => {
    if (!storageKey) return;

    try {
      setOpen(localStorage.getItem(storageKey) !== "true");
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  const closeModal = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {}
    }
    setOpen(false);
  };

  const explore = (page) => {
    closeModal();
    onNavigate(page);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeModal()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto border-0 bg-white p-0 shadow-2xl sm:max-w-2xl'>
        <div className='bg-[linear-gradient(135deg,#312e81_0%,#4f46e5_55%,#0ea5e9_100%)] px-6 pb-7 pt-8 text-white sm:px-10'>
          <DialogHeader className='text-left'>
            <div className='mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25'>
              <FlaskConical className='h-6 w-6' />
            </div>
            <DialogTitle className='text-2xl font-bold tracking-tight sm:text-3xl'>
              Welcome to ALAB, {user?.name?.split(" ")[0] || "student"}.
            </DialogTitle>
            <DialogDescription className='mt-2 max-w-lg text-sm leading-6 text-indigo-100 sm:text-base'>
              Your digital laboratory for learning, experimenting, and showing
              what you can do.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className='grid gap-3 px-6 py-6 sm:grid-cols-2 sm:px-10'>
          {features.map(({ title, description, icon: Icon, color, page }) => (
            <button
              key={title}
              type='button'
              onClick={() => explore(page)}
              className='group flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
              >
                <Icon className='h-5 w-5' />
              </span>
              <span className='min-w-0'>
                <span className='flex items-center gap-1 text-sm font-semibold text-slate-900'>
                  {title}
                  <ArrowRight className='h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100' />
                </span>
                <span className='mt-1 block text-xs leading-5 text-slate-500'>
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>

        <DialogFooter className='flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10'>
          <p className='flex items-center gap-2 text-xs text-slate-500'>
            <CheckCircle2 className='h-4 w-4 text-emerald-500' />
            You can revisit these tools anytime from the menu.
          </p>
          <Button
            type='button'
            onClick={closeModal}
            className='w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto'
          >
            Start exploring
            <ArrowRight className='ml-2 h-4 w-4' />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntroductionModal;
