import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_STEPS = {
  STUDENT: [
    {
      target: "student-home",
      title: "Your lab home",
      description:
        "Start here to see what is happening in your laboratory and jump into your next activity.",
    },
    {
      target: "student-assignments",
      page: "assignments",
      title: "Find your experiments",
      description:
        "Open Assignments to read procedures, check required materials, and submit your work.",
    },
    {
      target: "student-logbook",
      page: "logbook",
      title: "Keep a digital logbook",
      description:
        "Record observations and upload evidence while your experiment is still fresh.",
    },
    {
      target: "student-stats",
      page: "stats",
      title: "Watch your skills grow",
      description:
        "Stats shows your progress toward practical skill mastery over time.",
    },
  ],
  FACULTY: [
    {
      target: "faculty-dashboard",
      title: "Your teaching dashboard",
      description:
        "See upcoming lab sessions, student progress, and the actions that need your attention.",
    },
    {
      target: "faculty-experiments",
      page: "experiments",
      title: "Build experiments",
      description:
        "Create reusable experiment templates, attach materials, and assign them to sections.",
    },
    {
      target: "faculty-grading",
      page: "grading",
      title: "Review submissions",
      description:
        "Grade individual or group work and keep feedback in one place.",
    },
    {
      target: "faculty-safegate",
      page: "safegate",
      title: "Manage the safety gate",
      description:
        "Set the skills students need to demonstrate before entering a lab session.",
    },
  ],
  ADMIN: [
    {
      target: "admin-dashboard",
      title: "Your admin dashboard",
      description:
        "Monitor the laboratory system and access the tools you manage most often.",
    },
    {
      target: "admin-users",
      page: "users",
      title: "Manage users",
      description:
        "Create accounts and keep student, faculty, and staff access up to date.",
    },
    {
      target: "admin-inventory",
      page: "inventory",
      title: "Manage inventory",
      description:
        "Track available equipment, chemicals, quantities, and item status.",
    },
    {
      target: "admin-booking",
      page: "booking",
      title: "Schedule lab access",
      description:
        "Review and manage laboratory session bookings from one calendar.",
    },
  ],
};

const getVisibleTarget = (target) =>
  [...document.querySelectorAll(`[data-tour="${target}"]`)].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

const GuidedTour = ({ user, onNavigate }) => {
  const role = user?.role === "TECHNICIAN" ? "ADMIN" : user?.role;
  const steps = TOUR_STEPS[role] || [];
  const storageKey = user
    ? `alab-guided-tour-seen-${user.id || user.email}`
    : null;
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!storageKey || steps.length === 0) return;
    try {
      setIsOpen(localStorage.getItem(storageKey) !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [storageKey, steps.length]);

  const finish = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {}
    }
    setIsOpen(false);
    setTargetRect(null);
  };

  useEffect(() => {
    if (!isOpen || !steps[stepIndex]) return;
    const step = steps[stepIndex];
    if (step.page) onNavigate(step.page);

    let frameId;
    const locateTarget = () => {
      const target = getVisibleTarget(step.target);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        return;
      }
      frameId = requestAnimationFrame(locateTarget);
    };
    frameId = requestAnimationFrame(locateTarget);

    const updateTarget = () => {
      const target = getVisibleTarget(step.target);
      if (target) setTargetRect(target.getBoundingClientRect());
    };
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [isOpen, onNavigate, stepIndex, steps]);

  if (!isOpen || !steps[stepIndex] || !targetRect) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const popoverTop = targetRect.bottom + 14;
  const popoverLeft = Math.min(
    Math.max(16, targetRect.left),
    window.innerWidth - 352,
  );

  return (
    <div className='fixed inset-0 z-[200]'>
      <div
        className='absolute rounded-lg ring-2 ring-white transition-all duration-200'
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)",
        }}
      />

      <div
        role='dialog'
        aria-label='Getting started tour'
        className='absolute w-[min(336px,calc(100vw-32px))] rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl'
        style={{
          top: Math.min(popoverTop, window.innerHeight - 250),
          left: popoverLeft,
        }}
      >
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
              <FlaskConical className='h-4 w-4' />
            </span>
            <span className='text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600'>
              Quick tour
            </span>
          </div>
          <button
            type='button'
            onClick={finish}
            aria-label='Close tour'
            className='rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
        <p className='mt-4 text-xs font-semibold text-slate-400'>
          {stepIndex + 1} of {steps.length}
        </p>
        <h2 className='mt-1 text-lg font-bold'>{step.title}</h2>
        <p className='mt-2 text-sm leading-5 text-slate-600'>
          {step.description}
        </p>
        <div className='mt-5 flex items-center justify-between'>
          <button
            type='button'
            onClick={finish}
            className='text-xs font-semibold text-slate-500 hover:text-slate-900'
          >
            Skip tour
          </button>
          <div className='flex gap-2'>
            {stepIndex > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setStepIndex(stepIndex - 1)}
              >
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' /> Back
              </Button>
            )}
            <Button
              size='sm'
              onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}
            >
              {isLast ? "Done" : "Next"}
              {isLast ? (
                <Check className='ml-1.5 h-3.5 w-3.5' />
              ) : (
                <ArrowRight className='ml-1.5 h-3.5 w-3.5' />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
