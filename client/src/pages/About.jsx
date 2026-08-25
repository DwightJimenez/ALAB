import React from "react";

const About = () => {
  const teamMembers = [
    { name: "Bea Antoneth M. Llames", image: "/Bea.jpg" },
    { name: "Frances Nicah G. Saet", image: "/Frances.jpg" },
    { name: "Leahcim A. Mostasa", image: "/Leahcim.jpg" },
    { name: "Lillard T. Sabalboro", image: "/Lillard.jpg" },
    { name: "Allan O. Madronero", image: "/Allan.jpg" },
    { name: "Arnaud ", image: "/Arnaud.jpg" },
  ];
  return (
    <div>
      {/* Team Members Section */}
      <div className='pt-12 pb-8 relative z-10'>
        <div className='text-center mb-10'>
          <h2 className='text-2xl md:text-3xl font-bold text-slate-800 drop-shadow-sm'>
            Meet the Team
          </h2>
          <p className='text-slate-500 mt-2 font-medium'>
            The minds behind the Laboratory Manager
          </p>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto'>
          {teamMembers.map((member, idx) => (
            <div
              key={idx}
              className='flex flex-col items-center p-6 bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1'
            >
              <div className='w-20 h-20 mb-4 rounded-full bg-slate-100 overflow-hidden border-4 border-white shadow-sm'>
                <img
                  src={member.image}
                  alt={member.name}
                  className='w-full h-full object-cover'
                />
              </div>
              <h3 className='font-bold text-slate-800 text-lg'>
                {member.name}
              </h3>
              <p className='text-sm text-pink-600 font-semibold mt-1'>
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;
