import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, HelpCircle, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const RoleHelp = ({ title, subtitle, faqs }) => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [activeImagePreview, setActiveImagePreview] = useState(null);

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className='p-4 md:p-8 max-w-4xl mx-auto'>
      <div className='mb-8'>
        <h1 className='text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2'>
          {title}
        </h1>
        <p className='text-base md:text-lg text-slate-600 font-medium'>
          {subtitle}
        </p>
      </div>

      <div className='mb-8'>
        <h2 className='text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2'>
          <HelpCircle className='w-6 h-6 text-indigo-600' />
          Frequently Asked Questions
        </h2>

        <div className='space-y-4'>
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className='border border-slate-200 hover:border-slate-300 transition-all overflow-hidden shadow-sm'
            >
              <button
                onClick={() => toggleFAQ(index)}
                className='w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left'
              >
                <h3 className='font-semibold text-slate-900 text-base'>
                  {faq.question}
                </h3>
                {expandedFAQ === index ? (
                  <ChevronUp className='w-5 h-5 text-indigo-600 flex-shrink-0 ml-4' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-slate-400 flex-shrink-0 ml-4' />
                )}
              </button>

              {expandedFAQ === index && (
                <div className='px-6 py-5 border-t border-slate-100 bg-slate-50/50 text-slate-600 flex flex-col gap-4 animate-in fade-in duration-300'>
                  <p className='leading-relaxed text-sm md:text-base'>{faq.answer}</p>

                  {faq.images && faq.images.length > 0 && (
                    <div className='grid grid-cols-1 gap-4 mt-2'>
                      {faq.images.map((imgSrc, imgIndex) => (
                        <div
                          key={imgIndex}
                          className='bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-3 flex flex-col gap-2 group'
                        >
                          {faq.imageLabels && faq.imageLabels[imgIndex] && (
                            <span className='text-xs font-bold text-indigo-600 uppercase tracking-wide'>
                              {faq.imageLabels[imgIndex]}
                            </span>
                          )}
                          <div
                            onClick={() => setActiveImagePreview(imgSrc)}
                            className='relative cursor-pointer overflow-hidden rounded-lg border bg-slate-100 flex items-center justify-center'
                          >
                            <img
                              src={imgSrc}
                              alt={`Step illustration ${imgIndex + 1}`}
                              className='max-w-full h-auto object-contain max-h-[300px] group-hover:scale-[1.02] transition-transform duration-200'
                            />
                            <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100'>
                              <span className='bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5'>
                                <Maximize2 className='w-3.5 h-3.5' /> View Fullsize
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {activeImagePreview && (
        <div className='fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200'>
          <div className='flex items-center justify-between p-4 sm:px-8 border-b border-slate-800 shrink-0'>
            <span className='text-white text-base sm:text-lg font-semibold tracking-wide'>
              Instruction Image Preview
            </span>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setActiveImagePreview(null)}
              className='text-slate-400 hover:text-white hover:bg-slate-800 rounded-full h-10 w-10'
            >
              <X className='w-6 h-6' />
            </Button>
          </div>

          <div className='flex-1 w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-auto'>
            <img
              src={activeImagePreview}
              alt='Fullscreen instruction preview'
              className='max-w-none w-auto h-auto min-w-[70vw] object-contain select-none shadow-2xl rounded-lg'
              style={{ maxHeight: "85vh" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleHelp;
