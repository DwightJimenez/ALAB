import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Contact2, Folder, MoreVertical } from "lucide-react";

const classData = [
  {
    id: 1,
    title: "Bio Chemistry",
    section: "12 - STEM",
    teacher: "Aj-boy Langcauon",
    bgImage: "1.webp",
  },
  {
    id: 2,
    title: "Bio Chemistry",
    section: "12 - STEM",
    teacher: "Aj-boy LangcauonN",
    bgImage: "2.webp",
  },
  {
    id: 3,
    title: "Bio Chemistry",
    section: "12 - STEM",
    teacher: "Aj-boy Langcauon",
    bgImage: "3.webp",
  },
  {
    id: 4,
    title: "Bio Chemistry",
    section: "12 - STEM",
    teacher: "Aj-boy Langcauon",
    bgImage: "4.webp",
  },
  {
    id: 5,
    title: "Bio Chemistry",
    section: "12 - STEM",
    teacher: "Aj-boy Langcauon",
    bgImage: "5.webp",
  },
  {
    id: 6,
    title: "Bio Chemistry",
    section: "12 - STEM",
    teacher: "Aj-boy Langcauon",
    bgImage: "6.webp",
  },
  {
    id: 7,
    title: "Bio Chemistry",
    section: "12 - STEM", 
    teacher: "Aj-boy Langcauon",
    bgImage: "7.webp",
  },
];

export default function ClassroomGridPhotoBg() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {classData.map((course) => (
          <Card
            key={course.id}
            className="relative overflow-hidden h-72 flex flex-col justify-between shadow-sm border-gray-300/80 rounded-lg group"
          >
            {/* Full Card Background Image with Gradient Overlay */}
            <div className="absolute inset-0 z-0">
              <img
                src={`/${course.bgImage}`}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Dark gradient overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/60" />
            </div>

            {/* Header Content (Positioned over BG) */}
            <div className="relative z-10 h-28 p-4 text-white">
              <div className="w-[85%] space-y-0.5">
                <h2 className="text-xl font-medium truncate hover:underline cursor-pointer">
                  {course.title}
                </h2>
                {course.section && (
                  <p className="text-xs font-medium truncate hover:underline cursor-pointer opacity-90">
                    {course.section}
                  </p>
                )}
                <p className="text-[0.8rem] pt-1 opacity-90 truncate hover:underline cursor-pointer">
                  {course.teacher}
                </p>
              </div>
            </div>

            {/* Empty Body/Content Area */}
            <CardContent className="relative z-10 flex-grow p-4" />

            {/* Footer Section (Semi-transparent over BG) */}
            <CardFooter className="relative z-10 border-t border-white/10 p-3 pb-3 flex justify-end space-x-6 text-white/80 bg-black/20 backdrop-blur-sm">
              <button className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <Contact2 strokeWidth={1.5} className="h-[1.4rem] w-[1.4rem]" />
              </button>
              <button className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <Folder strokeWidth={1.5} className="h-[1.4rem] w-[1.4rem]" />
              </button>
              <button className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <MoreVertical
                  strokeWidth={1.5}
                  className="h-[1.4rem] w-[1.4rem]"
                />
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
