import { GuqinNote, HandTechnique, LeftHand, RightHand } from '../types';

const CHINESE_NUM_MAP: Record<string, string> = {
  '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
  '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
  '十一': '11', '十二': '12', '十三': '13'
};

const RH_MAP: Record<string, string> = {
  [RightHand.Tiao]: 't',
  [RightHand.Gou]: 'g',
  [RightHand.Mo]: 'mo', 
  [RightHand.Ti]: 'ti', 
  [RightHand.Da]: 'd',
  [RightHand.Zhai]: 'z',
  [RightHand.None]: '',
};

const LH_MAP: Record<string, string> = {
  [LeftHand.Da]: 'da',
  [LeftHand.Shi]: 'sh', 
  [LeftHand.Zhong]: 'zh', 
  [LeftHand.Ming]: 'mi', 
  [LeftHand.None]: '',
};

export const generateFontString = (note: GuqinNote): string => {
  if (note.originalNote.isRest) return ''; 

  // 1. Determine Base (Right Hand + String)
  // Format is always: \ + String Number + Technique Code
  
  // Default to Tiao ('t') if technique is not standard or specified
  // Note: RH_MAP[None] is '', which is falsy, so it defaults to 't'
  const rhCode = RH_MAP[note.rightHand] || 't'; 
  const base = `\\${note.string}${rhCode}`;

  // 2. Modifiers
  let modifiers = '';

  // Left Hand Finger (Top Left)
  if (note.technique !== HandTechnique.San && note.leftHand !== LeftHand.None) {
    const lhCode = LH_MAP[note.leftHand];
    if (lhCode) {
      modifiers += `/${lhCode}`;
    }
  } else if (note.technique === HandTechnique.San) {
     // Explicitly mark San (Open String)
     // Changed from 'san' to 's' to avoid 'an' artifacts being left over
     modifiers += `/s`;
  }

  // Hui Position (Top Right)
  if (note.technique !== HandTechnique.San && note.hui) {
    // Parse "七.六" -> 7, 6
    const parts = note.hui.split('.');
    const mainCn = parts[0];
    const subCn = parts[1];

    const mainNum = CHINESE_NUM_MAP[mainCn];
    if (mainNum) {
      modifiers += `/${mainNum}`;
    }

    // Hui Fraction / Fen (Below Hui)
    if (subCn) {
      const subNum = CHINESE_NUM_MAP[subCn];
      if (subNum) {
        modifiers += `^${subNum}`;
      }
    }
  }

  return `${base}${modifiers}`;
};