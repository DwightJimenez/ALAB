import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Users,
  LineChart,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useSelector } from "react-redux";

const Home = () => {
  const user = useSelector((state) => state.auth.user);

  const studentFeatures = [
    {
      title: "Interactive Experiments",
      description:
        "Access step-by-step laboratory instructions, required materials, and procedures directly from your workspace.",
      icon: <FlaskConical className="w-8 h-8 text-indigo-600" />,
      bgColor: "bg-indigo-50/80",
      borderColor: "border-indigo-300",
    },
    {
      title: "Group Collaboration",
      description:
        "Form lab groups, share a secure PIN, and lock in your team to work on group submissions in real-time.",
      icon: <Users className="w-8 h-8 text-blue-600" />,
      bgColor: "bg-blue-50/80",
      borderColor: "border-blue-300",
    },
    {
      title: "Skill Mastery Tracking",
      description:
        "Monitor your progress as the system tracks your learning, guessing, and slipping parameters to ensure mastery.",
      icon: <LineChart className="w-8 h-8 text-emerald-600" />,
      bgColor: "bg-emerald-50/80",
      borderColor: "border-emerald-300",
    },
    {
      title: "Digital Submissions",
      description:
        "Upload necessary files, write rich-text observations, and turn in your assignments with a single click.",
      icon: <BookOpen className="w-8 h-8 text-amber-600" />,
      bgColor: "bg-amber-50/80",
      borderColor: "border-amber-300",
    },
  ];

  return (
    <div className="relative max-w-7xl mx-auto p-6 md:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Decorative Images */}
      <img
        src="./src/assets/17.png"
        alt=""
        className="absolute z-0 -rotate-30 -top-20 -left-50 opacity-80"
      />
      <img
        src="./src/assets/18.png"
        alt=""
        className="absolute z-0 -right-25 -bottom-30 opacity-80"
      />

      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto mt-8 z-10 relative">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
          Welcome to your Laboratory Manager,
          <span className="text-pink-600"> {user.name}</span>
          <span className="text-slate-900">🐧</span>
        </h1>
        <p className="text-lg text-slate-600 font-medium">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Sed obcaecati
          libero, accusantium vel unde earum possimus ratione, quos repellendus
          ipsam blanditiis tempore, autem aliquam hic dolorem at laborum atque
          harum.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 relative z-10">
        {studentFeatures.map((feature, index) => (
          <Card
            key={index}
            className={`border shadow-lg hover:shadow-xl transition-all duration-300 bg-white/30 backdrop-blur-sm supports-[backdrop-filter]:bg-white/40 ${feature.borderColor}`}
          >
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div
                className={`p-3 rounded-2xl shadow-sm backdrop-blur-sm border border-white/50 ${feature.bgColor}`}
              >
                {feature.icon}
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base text-slate-700 font-medium leading-relaxed pl-[68px]">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;
