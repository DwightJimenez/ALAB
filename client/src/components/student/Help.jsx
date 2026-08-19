import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Mail,
  Phone,
  Clock,
} from "lucide-react";

const Help = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      question: "How do I start an experiment?",
      answer:
        "Navigate to Assignments from the sidebar menu and select an experiment. Read the introduction, materials list, and procedure carefully before beginning.",
    },
    {
      question: "How do I form a lab group?",
      answer:
        "In the Assignments section, look for the group creation option. You can create a new group or join an existing one using a PIN shared by your peers.",
    },
    {
      question: "What is skill mastery?",
      answer:
        "The system tracks your learning progress using the Bayesian Knowledge Tracing (BKT) model. As you complete experiments, your mastery of different skills increases. You can view your progress in the Stats section.",
    },
    {
      question: "How do I submit my experiment results?",
      answer:
        "After completing the experiment steps, you'll see a submission form. Fill in your findings, observations, and calculations, then click Submit. Your instructor will review and grade your work.",
    },
    {
      question: "How do I track my progress?",
      answer:
        "Visit the Stats section from the sidebar to view your performance charts, skill mastery levels, and learning progress over time.",
    },
    {
      question: "Where can I find learning materials?",
      answer:
        "Click on Learning Materials in the sidebar to access reference documents, foundational concepts, and additional resources to support your experiments.",
    },
    {
      question: "What is the Wiki for?",
      answer:
        "The Wiki section contains comprehensive information about chemicals, equipment, safety procedures, and common chemistry concepts relevant to your experiments.",
    },
    {
      question: "How do I submit a special request?",
      answer:
        "Use the Special Requests section to ask your instructor questions, request additional resources, or report technical issues.",
    },
  ];

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className='p-4 md:p-8 max-w-4xl mx-auto'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-4xl font-bold text-gray-900 mb-2'>
          Help & Support
        </h1>
        <p className='text-lg text-gray-600'>
          Find answers to common questions about using the Chemistry Lab
        </p>
      </div>

      {/* Frequently Asked Questions */}
      <div className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
          <HelpCircle className='w-6 h-6 text-indigo-600' />
          Frequently Asked Questions
        </h2>

        <div className='space-y-4'>
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className='border hover:shadow-md transition-shadow overflow-hidden'
            >
              <button
                onClick={() => toggleFAQ(index)}
                className='w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors'
              >
                <h3 className='text-left font-semibold text-gray-900'>
                  {faq.question}
                </h3>
                {expandedFAQ === index ? (
                  <ChevronUp className='w-5 h-5 text-indigo-600 flex-shrink-0 ml-4' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-gray-400 flex-shrink-0 ml-4' />
                )}
              </button>

              {expandedFAQ === index && (
                <div className='px-6 py-4 border-t bg-gray-50 text-gray-600 flex flex-col gap-4'>
                  {/* Text Answer */}
                  <p>{faq.answer}</p>
                  
                  {/* Screenshot Placeholder inside expanded card */}
                  <div className='w-full bg-white border-2 border-dashed border-gray-300 rounded-lg min-h-48 flex items-center justify-center mt-2'>
                    <div className='text-center text-gray-400'>
                      <p className='text-lg font-semibold'>Screenshot Placeholder</p>
                      <p className='text-sm mt-1'>Visual guide for: {faq.question}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Help;