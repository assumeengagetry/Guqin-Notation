export interface ParsedNote {
  step: string;
  octave: number;
  alter: number;
  duration: number;
  type: string;
  isRest: boolean;
  voice: number;
  staff: number;
  chord: boolean;
  pitchName: string; // e.g., "C4", "F#3"
  absolutePitch: number; // MIDI number or similar linear scale
  startTime: number; // Absolute time in ticks
  jianpu: JianpuInfo;
}

export interface JianpuInfo {
  number: string; // "1", "2", "3", "0" for rest
  octave: number; // 0 = middle, >0 dots above, <0 dots below
  accidental: string; // "#", "b", ""
}

export enum HandTechnique {
  San = '散', // Open string
  An = '按',  // Stopped string
  Fan = '泛', // Harmonic
  Empty = ''
}

export enum RightHand {
  Tiao = '挑',
  Gou = '勾',
  Mo = '抹',
  Ti = '剔',
  Da = '打',
  Zhai = '摘',
  None = ''
}

export enum LeftHand {
  Da = '大', // Thumb
  Shi = '食', // Index
  Zhong = '中', // Middle
  Ming = '名', // Ring
  None = ''
}

export interface GuqinNote {
  originalNote: ParsedNote;
  string: number; // 1-7
  hui: string; // Position string, e.g., "七", "九", "十"
  huiDecimal?: number; // For calculation
  technique: HandTechnique;
  rightHand: RightHand;
  leftHand: LeftHand;
  isValid: boolean; // True if a mapping was found
}