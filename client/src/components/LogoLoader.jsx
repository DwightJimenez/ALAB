import React from "react";

const LogoLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8">
      <div className="relative flex items-center justify-center w-64 h-32">
        <img
          src="/alab-icon.svg"
          alt="ALAB Logo Color"
          className="absolute w-20 h-20 object-contain swap-left"
          style={{ left: "15%" }}
        />
        <img
          src="/alab-icon.svg"
          alt="ALAB Logo Gray"
          className="absolute w-20 h-20 object-contain grayscale opacity-60 swap-right"
          style={{ right: "15%" }}
        />
      </div>

      <p className="text-md font-medium text-slate-500 animate-pulse">
        Loading...
      </p>
      <style>{`
        .swap-left {
          animation: orbitLeft 1.5s infinite ease-in-out;
        }
        .swap-right {
          animation: orbitRight 1.5s infinite ease-in-out;
        }

        /* Moves the Colored logo to the right, crossing IN FRONT */
        @keyframes orbitLeft {
          0%   { transform: translateX(0) scale(1); z-index: 10; }
          25%  { transform: translateX(70%) scale(1.15); z-index: 10; }
          50%  { transform: translateX(140%) scale(1); z-index: 1; }
          75%  { transform: translateX(70%) scale(0.85); z-index: 1; }
          100% { transform: translateX(0) scale(1); z-index: 10; }
        }

        /* Moves the Grayscale logo to the left, crossing BEHIND */
        @keyframes orbitRight {
          0%   { transform: translateX(0) scale(1); z-index: 1; }
          25%  { transform: translateX(-70%) scale(0.85); z-index: 1; }
          50%  { transform: translateX(-140%) scale(1); z-index: 10; }
          75%  { transform: translateX(-70%) scale(1.15); z-index: 10; }
          100% { transform: translateX(0) scale(1); z-index: 1; }
        }
      `}</style>
    </div>
  );
};

export default LogoLoader;
