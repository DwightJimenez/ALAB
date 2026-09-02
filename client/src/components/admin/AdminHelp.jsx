import React from "react";
import RoleHelp from "@/components/help/RoleHelp";

const adminFAQs = [
  {
    question: "How do I manage users?",
    answer:
      "Use the Users section to review registered accounts, manage roles, and maintain the system’s active student and faculty records.",
  },
  {
    question: "How do I manage lab inventory?",
    answer:
      "Open Inventory to add stock, update quantities, track materials, and monitor available equipment for lab operations.",
  },
  {
    question: "How do I manage lab bookings?",
    answer:
      "The Booking section allows you to organize session schedules, monitor room or time availability, and keep class activities aligned with lab capacity.",
  },
  {
    question: "How do I manage faculty sections?",
    answer:
      "Use Manage Faculty Sections to assign faculty to sections, maintain instructor coverage, and keep course structure organized.",
  },
  {
    question: "How do I process special requests?",
    answer:
      "Review the Special Requests page to verify student or faculty requests, coordinate follow-up actions, and approve necessary lab support.",
  },
  {
    question: "How do I monitor the dashboard overview?",
    answer:
      "The dashboard provides a quick high-level view of key administrative metrics, including active users, lab activity, and operational status across the system.",
  },
  {
    question: "What should I do if a section needs attention?",
    answer:
      "Check the dashboard and department management panels for section details, then review relevant records such as user access, inventory, and requests before taking action.",
  },
];

const AdminHelp = () => (
  <RoleHelp
    title='Admin Help & Support'
    subtitle='Access quick guidance for managing users, inventory, bookings, faculty sections, and operational requests.'
    faqs={adminFAQs}
  />
);

export default AdminHelp;
