import React from 'react';
import { GuqinNote, HandTechnique, LeftHand, RightHand } from '../types';

interface Props {
  note: GuqinNote;
}

const STRING_MAP = ['','一','二','三','四','五','六','七'];
const RH_DISPLAY_MAP: Record<string, string> = {
    [RightHand.Tiao]: '乚', [RightHand.Gou]: '勹', [RightHand.Mo]: '木',   
    [RightHand.Ti]: '尸', [RightHand.Da]: '丁', [RightHand.Zhai]: '⺮', [RightHand.None]: ''
};
const LH_DISPLAY_MAP: Record<string, string> = {
    [LeftHand.Da]: '大', [LeftHand.Shi]: '亻', [LeftHand.Zhong]: '中', [LeftHand.Ming]: '夕', [LeftHand.None]: ''
};

const getParts = (note: GuqinNote) => {
  let topLeft = '';
  let topRight = STRING_MAP[note.string] || '';
  let bottomContainer = RH_DISPLAY_MAP[note.rightHand] || '';
  let bottomContent = '';
  
  if (note.technique === HandTechnique.San) topLeft = '艹'; 
  else if (note.technique === HandTechnique.Fan) topLeft = '泛'; 
  else topLeft = LH_DISPLAY_MAP[note.leftHand] || '';

  if (note.technique !== HandTechnique.San) bottomContent = note.hui;

  return { topLeft, topRight, bottomContainer, bottomContent };
}

const OctaveDots: React.FC<{ count: number; position: 'top' | 'bottom' }> = ({ count, position }) => {
    if (!count) return null;
    return (
        <div className={`flex justify-center gap-[2px] leading-[0] ${position === 'top' ? 'mb-[1px]' : 'mt-[0px]'}`}>
            {Array.from({ length: Math.abs(count) }).map((_, i) => (
                <div key={i} className="w-[4px] h-[4px] bg-stone-900 rounded-full" />
            ))}
        </div>
    );
};

export const JianzipuChar: React.FC<Props> = ({ note }) => {
  // 1. Structural Elements
  if (note.originalNote.isBarline) {
      return (
          <div className="w-[1px] h-[7rem] bg-stone-800 mx-2 self-start mt-1" />
      );
  }

  if (note.originalNote.isDash) {
      return (
         <div className="inline-flex flex-col items-center justify-start w-[2.5rem] mx-1 relative top-[-4px]">
             {/* Match height of number container */}
             <div className="flex flex-col items-center justify-center h-[2.5rem] w-full">
                 <span className="text-xl font-bold text-stone-900 scale-x-150">—</span>
             </div>
             {/* Empty space below for alignment */}
             <div className="h-[4rem]" />
         </div>
      );
  }

  // 2. Rests
  if (note.originalNote.isRest) {
    const { jianpu } = note.originalNote;
    return (
        <div className="inline-flex flex-col items-center justify-start w-[3.5rem] relative">
             <div className="flex flex-col items-center justify-end h-[2.5rem] w-full pb-1">
                 <div className="relative">
                    <span className="text-[1.4rem] font-bold font-serif leading-none text-stone-900">0</span>
                    {jianpu.dot && <div className="absolute top-1 -right-2 w-[3.5px] h-[3.5px] bg-stone-900 rounded-full" />}
                 </div>
                 {/* Underlines for rest */}
                 {jianpu.underlineCount > 0 && (
                    <div className="flex flex-col gap-[3px] mt-[3px] w-[14px] items-center">
                        <div className="w-full h-[2px] bg-stone-900" />
                        {jianpu.underlineCount > 1 && <div className="w-full h-[2px] bg-stone-900" />}
                    </div>
                )}
             </div>
             <div className="h-[4rem]" />
        </div>
    ); 
  }

  // 3. Regular Notes
  const { topLeft, topRight, bottomContainer, bottomContent } = getParts(note);
  const { jianpu } = note.originalNote;
  
  const accidentalMap: Record<string, string> = { '#': '♯', 'b': '♭' };
  const displayAccidental = accidentalMap[jianpu.accidental] || jianpu.accidental;
  
  const isFractional = bottomContent.includes('.');
  const [mainHui, subHui] = isFractional ? bottomContent.split('.') : [bottomContent, ''];
  const containerScaleClass = bottomContent ? "scale-x-[1.6] scale-y-[0.9] origin-top" : "scale-100 origin-center";
  
  let contentOffsetClass = "mt-[2px]";
  if (note.rightHand === RightHand.Gou) contentOffsetClass = "mt-[5px]";
  if (note.rightHand === RightHand.Tiao) contentOffsetClass = "mt-[1px]";
  if (note.rightHand === RightHand.Ti) contentOffsetClass = "mt-[8px]";

  return (
    <div className="inline-flex flex-col items-center justify-start align-top relative px-2">
      
      {/* --- JIANPU Section --- */}
      {/* Container is fixed height to align dashes/rests, but flex allows content to stack */}
      <div className="flex flex-col items-center justify-end h-[2.5rem] w-full relative mb-1">
         
         {/* Top Dots (High Octave) */}
         <OctaveDots count={jianpu.octave > 0 ? jianpu.octave : 0} position="top" />

         {/* Number + Accidental + Rhythm Dot */}
         <div className="relative flex items-center justify-center leading-none">
             {displayAccidental && (
                 <span className="absolute -left-3 top-[2px] text-[10px] font-bold text-stone-700">
                     {displayAccidental}
                 </span>
             )}
             
             <span className="text-[1.5rem] font-extrabold font-serif text-stone-900">
                 {jianpu.number}
             </span>
             
             {/* Rhythm Dot - positioned relative to number, slightly raised */}
             {jianpu.dot && (
                <span className="absolute -right-3 top-[6px] w-[4px] h-[4px] bg-stone-900 rounded-full"></span>
             )}
         </div>

         {/* Bottom Dots (Low Octave) */}
         <OctaveDots count={jianpu.octave < 0 ? jianpu.octave : 0} position="bottom" />

         {/* Rhythm Underlines */}
         {jianpu.underlineCount > 0 && (
             <div className="flex flex-col gap-[3px] mt-[4px] w-[1.2rem] items-center">
                 <div className="w-full h-[2px] bg-stone-900" />
                 {jianpu.underlineCount > 1 && <div className="w-full h-[2px] bg-stone-900" />}
             </div>
         )}
      </div>

      {/* --- JIANZIPU Section --- */}
      {/* Tighten vertical spacing */}
      <div className="w-[3.5rem] h-[4rem] flex flex-col items-center relative text-stone-900 select-none">
        
        {/* Upper Part */}
        <div className="flex w-full h-[1.8rem] items-end justify-center gap-[0px] leading-none">
            <span className="text-[1.2rem] font-bold font-serif transform scale-y-110 tracking-tighter">
                {topLeft}
            </span>
            <span className="text-[1.2rem] font-bold font-serif transform scale-y-110 tracking-tighter">
                {topRight}
            </span>
        </div>

        {/* Lower Part */}
        <div className="relative w-full flex-1 flex justify-center items-start -mt-[2px]">
            <span className={`absolute top-0 left-1/2 -translate-x-1/2 text-[2.4rem] font-serif font-light leading-none text-stone-800 ${containerScaleClass}`}>
              {bottomContainer}
            </span>
            
            {bottomContent && (
                <div className={`relative z-10 flex flex-col items-center leading-none ${contentOffsetClass}`}>
                    <span className={`${subHui ? 'text-[11px]' : 'text-[13px]'} font-bold font-serif tracking-tighter`}>
                        {mainHui}
                    </span>
                    {subHui && (
                        <span className="text-[9px] font-serif font-bold -mt-[2px] transform scale-90 origin-top">
                        {subHui}
                        </span>
                    )}
                </div>
            )}
        </div>
      </div>

    </div>
  );
};