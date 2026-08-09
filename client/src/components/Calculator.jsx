import React from "react";
import { X } from "lucide-react";

const Calculator = ({ onClose }) => {
  return (
    <div className='w-[90vw] sm:w-[400px] max-w-lg bg-background rounded-xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col'>
      {/* Mobile-friendly header bar */}
      <div className='flex items-center justify-between px-4 py-2 bg-muted/40 border-b'>
        <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Scientific Calculator
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className='p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors'
            aria-label='Close Calculator'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* Iframe container */}
      <div className='w-full h-[450px] sm:h-[500px] relative'>
        <iframe
          src='https://www.desmos.com/scientific'
          width='100%'
          height='100%'
          style={{ border: "none" }}
          title='Desmos Scientific Calculator'
        />
      </div>
    </div>
  );
};

export default Calculator;
