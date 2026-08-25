import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { FlaskConical, Users, LineChart, BookOpen } from "lucide-react";
import { useSelector } from "react-redux";
import bg17 from "../../assets/17.png";
import bg18 from "../../assets/18.png";
import StudentPerformanceProfile from "./StudentPerformanceChart";

const Home = ({ setSelectedPage }) => {
  const user = useSelector((state) => state.auth.user);



  return (
    <div className='flex-1 w-full overflow-x-clip' data-tour='student-home'>
      <div className='relative p-4 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700'>
        {/* Background Decorative Images Wrapper */}
        <div className='absolute inset-0 z-0 pointer-events-none'>
          <img
            src={bg17}
            alt=''
            className='absolute -rotate-30 -top-20 -left-50 opacity-80'
          />
          <img
            src={bg18}
            alt=''
            className='absolute -right-25 -bottom-30 opacity-80'
          />
        </div>
        <StudentPerformanceProfile/>
      </div>
    </div>
  );
};

export default Home;
