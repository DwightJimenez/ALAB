import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  BookOpen,
  FlaskConical,
  Users,
  BarChart3,
  Lightbulb,
} from "lucide-react";

const Overview = ({ setSelectedPage }) => {
  const features = [
    {
      title: "Getting Started",
      description: "Start your chemistry lab journey with guided experiments",
      icon: <BookOpen className='w-6 h-6 text-indigo-600' />,
      bgColor: "bg-indigo-50/80",
      borderColor: "border-indigo-300",
    },
    {
      title: "Labs & Experiments",
      description:
        "Conduct virtual chemistry experiments in a safe environment",
      icon: <FlaskConical className='w-6 h-6 text-blue-600' />,
      bgColor: "bg-blue-50/80",
      borderColor: "border-blue-300",
    },
    {
      title: "Collaboration",
      description: "Work with classmates in lab groups and share results",
      icon: <Users className='w-6 h-6 text-emerald-600' />,
      bgColor: "bg-emerald-50/80",
      borderColor: "border-emerald-300",
    },
    {
      title: "Progress Tracking",
      description: "Monitor your learning and skill mastery over time",
      icon: <BarChart3 className='w-6 h-6 text-purple-600' />,
      bgColor: "bg-purple-50/80",
      borderColor: "border-purple-300",
    },
    {
      title: "Learning Resources",
      description: "Access materials, references, and foundational concepts",
      icon: <Lightbulb className='w-6 h-6 text-amber-600' />,
      bgColor: "bg-amber-50/80",
      borderColor: "border-amber-300",
    },
  ];

  return (
    <div className='p-4 md:p-8 max-w-6xl mx-auto'>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold text-gray-900 mb-2'>
          Welcome to the Chemistry Lab
        </h1>
        <p className='text-lg text-gray-600'>
          Your interactive platform for learning chemistry through virtual
          experiments
        </p>
      </div>

      {/* Features Grid */}
      <div className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6'>Key Features</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`border-l-4 ${feature.borderColor} ${feature.bgColor} hover:shadow-lg transition-shadow`}
            >
              <CardHeader className='pb-3'>
                <div className='flex items-start gap-3'>
                  <div className='mt-1'>{feature.icon}</div>
                  <CardTitle className='text-lg'>{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600'>{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <Card className='border-l-4 border-indigo-300 bg-indigo-50/80 mb-8'>
        <CardHeader>
          <CardTitle>How the System Works</CardTitle>
          <CardDescription>
            A step-by-step guide to using the chemistry lab platform
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-3'>
            <div className='flex gap-4'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'>
                1
              </div>
              <div>
                <h4 className='font-semibold text-gray-900'>
                  Explore Experiments
                </h4>
                <p className='text-sm text-gray-600'>
                  Browse available experiments and select one to start
                </p>
              </div>
            </div>
            <div className='flex gap-4'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'>
                2
              </div>
              <div>
                <h4 className='font-semibold text-gray-900'>
                  Form Your Lab Group
                </h4>
                <p className='text-sm text-gray-600'>
                  Join or create a group with your classmates
                </p>
              </div>
            </div>
            <div className='flex gap-4'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'>
                3
              </div>
              <div>
                <h4 className='font-semibold text-gray-900'>
                  Conduct the Experiment
                </h4>
                <p className='text-sm text-gray-600'>
                  Follow the steps and record your findings
                </p>
              </div>
            </div>
            <div className='flex gap-4'>
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'>
                4
              </div>
              <div>
                <h4 className='font-semibold text-gray-900'>
                  Submit & Track Progress
                </h4>
                <p className='text-sm text-gray-600'>
                  Submit results and monitor your skill mastery
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
