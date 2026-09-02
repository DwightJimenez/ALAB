import React from "react";
import RoleHelp from "@/components/help/RoleHelp";

const facultyFAQs = [
  {
    question: "How do I manage my class record?",
    answer:
      "Open the Class Record page from the sidebar to view students, monitor performance, export records, and update section-related academic details for your course.",
  },
  {
    question: "How do I take attendance?",
    answer:
      "Use the Class Attendance page to mark students present, late, or absent, then review records to ensure compliance with class participation requirements.",
  },
  {
    question: "How do I create or update experiments?",
    answer:
      "Go to Experiments and use the directory tools to add new laboratory activities, update procedures, assign materials, and publish them to students for the section.",
  },
  {
    question: "How do I grade lab work?",
    answer:
      "Open the Grading section to view submissions, evaluate team performance, and compare results across groups before finalizing scores.",
  },
  {
    question: "How do I share learning materials?",
    answer:
      "Use Learning Materials to upload notes, documents, or references that students in your class can access from their dashboard.",
  },
  {
    question: "How do I review request submissions?",
    answer:
      "The Requests page lets you review special lab requests and determine which are approved, pending, or need follow-up with the admin team.",
  },
  {
    question: "What is the Gate Passed List?",
    answer:
      "This list shows students who have passed all required safety gate checks and are eligible to begin or continue lab activities according to policy.",
  },
];

const FacultyHelp = () => (
  <RoleHelp
    title='Faculty Help & Support'
    subtitle='Find quick guidance for managing class records, experiments, grading, attendance, and student access.'
    faqs={facultyFAQs}
  />
);

export default FacultyHelp;
