import React from 'react';
import { GuqinNote, HandTechnique, LeftHand, RightHand } from '../types';

interface Props {
  note: GuqinNote;
}

const STRING_MAP = ['','一','二','三','四','五','六','七'];

const RH_DISPLAY_MAP: Record<string, string> = {
    [RightHand.Tiao]: '乚', 
    [RightHand.Gou]: '勹',  
    [RightHand.Mo]: '木',   
    [RightHand.Ti]: '尸',   
    [RightHand.Da]: '丁',   
    [RightHand.Zhai]: '⺮', 
    [RightHand.None]: ''
};

const LH_DISPLAY_MAP: Record<string, string> = {
    [LeftHand.Da]: '大',
    [LeftHand.Shi]: '亻',
    [LeftHand.Zhong]: '中',
    [LeftHand.Ming]: '夕',
    [LeftHand.None]: ''
};

const getParts = (note: GuqinNote) => {
  let topLeft = '';
  let topRight = STRING_MAP[note.string] || '';
  let bottomContainer = RH_DISPLAY_MAP[note.rightHand] || '';
  let bottomContent = '';
  
  // Upper Section Logic
  if (note.technique === HandTechnique.San) {
      topLeft = '艹'; 
  } else if (note.technique === HandTechnique.Fan) {
      topLeft = '泛'; 
  } else {
      // Stopped string (An)
      topLeft = LH_DISPLAY_MAP[note.leftHand] || '';
  }

  // Lower Section Logic
  if (note.technique !== HandTechnique.San) {
      bottomContent = note.hui;
  }

  return { topLeft, topRight, bottomContainer, bottomContent };
}

const OctaveDots: React.FC<{ count: number; position: 'top' | 'bottom' }> = ({ count, position }) => {
    if (!count) return null;
    return (
        <div className={`absolute left-0 right-0 flex justify-center gap-[3px] ${position === 'top' ? '-top-2.5' : '-bottom-2'}`}>
            {Array.from({ length: Math.abs(count) }).map((_, i) => (
                <div key={i} className="w-[3px] h-[3px] bg-stone-900 rounded-full" />
            ))}
        </div>
    );
};

export const JianzipuChar: React.FC<Props> = ({ note }) => {
  // 1. Handle Rests
  if (note.originalNote.isRest) {
    return (
        <div className="inline-flex flex-col w-[4.5rem] items-center justify-start align-top relative group">
             <div className="flex flex-col items-center justify-center h-12 w-full relative">
                 <span className="text-2xl font-bold font-serif leading-none text-stone-400">0</span>
             </div>
             {/* Visual placeholder for alignment */}
             <div className="w-full h-[6.5rem] flex items-center justify-center opacity-5">
                 <div className="w-1 h-1 bg-stone-500 rounded-full" />
             </div>
        </div>
    ); 
  }

  const { topLeft, topRight, bottomContainer, bottomContent } = getParts(note);
  const { jianpu } = note.originalNote;
  
  // Format Accidental
  const accidentalMap: Record<string, string> = { '#': '♯', 'b': '♭' };
  const displayAccidental = accidentalMap[jianpu.accidental] || jianpu.accidental;

  // Format Hui
  const isFractional = bottomContent.includes('.');
  const [mainHui, subHui] = isFractional ? bottomContent.split('.') : [bottomContent, ''];

  // Determine bottom scale based on content
  // If we have Hui numbers inside, we might need to stretch the container more
  const containerScaleClass = bottomContent 
    ? "scale-x-[1.6] scale-y-[0.9] origin-top" 
    : "scale-100 origin-center";

  // Vertical offset for Hui numbers depending on the container shape
  // '勹' (Gou) needs content lower. '乚' (Tiao) needs content higher/centered.
  let contentOffsetClass = "mt-[2px]";
  if (note.rightHand === RightHand.Gou) contentOffsetClass = "mt-[6px]";
  if (note.rightHand === RightHand.Tiao) contentOffsetClass = "mt-[0px]";
  if (note.rightHand === RightHand.Ti) contentOffsetClass = "mt-[8px]";

  return (
    <div className="inline-flex flex-col items-center justify-start align-top group relative">
      
      {/* --- JIANPU (Number) Section --- */}
      <div className="flex flex-col items-center justify-center h-12 w-full relative mb-1">
         
         <OctaveDots count={jianpu.octave > 0 ? jianpu.octave : 0} position="top" />
         
         <div className="relative flex items-center justify-center h-8">
            {/* Accidental: Positioned absolutely to the left to maintain rhythm of numbers */}
            {displayAccidental && (
                <span className="absolute right-[calc(50%+0.5rem)] text-xs font-serif text-stone-600 font-bold -translate-y-0.5">
                    {displayAccidental}
                </span>
            )}
            <span className="text-3xl font-bold font-serif leading-none text-stone-900 z-10">
                {jianpu.number}
            </span>
         </div>

         <OctaveDots count={jianpu.octave < 0 ? jianpu.octave : 0} position="bottom" />
      </div>

      {/* --- JIANZIPU (Guqin Char) Section --- */}
      <div className="inline-flex flex-col w-[4.5rem] h-[6.5rem] items-center justify-start text-stone-900 select-none border border-transparent group-hover:border-red-800/10 group-hover:bg-stone-50/50 rounded transition-colors relative">
        
        {/* Subtle Guidelines for hover */}
        <div className="absolute inset-0 border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity rounded pointer-events-none" />

        {/* Upper Part: Finger + String (Approx 50% height) */}
        <div className="flex w-full h-[3.2rem] items-end justify-center gap-[2px] pb-1 border-b border-transparent">
            {/* Left: Technique/Finger */}
            <span className="text-[1.8rem] font-serif font-bold leading-none tracking-tighter transform scale-y-110">
                {topLeft}
            </span>
            {/* Right: String Number */}
            <span className="text-[1.8rem] font-serif font-bold leading-none tracking-tighter transform scale-y-110">
                {topRight}
            </span>
        </div>

        {/* Lower Part: Technique + Hui (Approx 50% height) */}
        <div className="relative w-full flex-1 flex justify-center items-start pt-1 overflow-visible">
            
            {/* The "Container" Character (Right Hand Technique) */}
            <span className={`absolute top-0 left-1/2 -translate-x-1/2 text-[3.4rem] font-serif font-light leading-none text-stone-800 pointer-events-none ${containerScaleClass}`}>
              {bottomContainer}
            </span>
            
            {/* The Content (Hui Position) */}
            {bottomContent && (
                <div className={`relative z-10 flex flex-col items-center leading-none ${contentOffsetClass}`}>
                <span className={`${subHui ? 'text-[15px]' : 'text-[18px]'} font-bold font-serif tracking-tighter`}>
                    {mainHui}
                </span>
                {subHui && (
                    <span className="text-[11px] font-serif font-bold -mt-[2px] transform scale-90 origin-top">
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