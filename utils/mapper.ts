import { GuqinNote, HandTechnique, LeftHand, ParsedNote, RightHand } from '../types';
import { TUNINGS } from '../constants';

const HUI_OFFSETS: Record<number, string> = {
  0: '散', 2: '十三', 3: '十二', 4: '十一', 5: '十', 6: '九', 7: '九', 8: '八', 9: '八',
  10: '七.六', 11: '七.三', 12: '七', 14: '六.四', 15: '六.二', 16: '六', 
  17: '五.九', 19: '五', 21: '四.五', 24: '四',
};

// Standard Solfege map for comparison (1, 2, 3, 4, 5, 6, 7)
// We treat string matching loosely based on scale degree
const SOLFEGE_TO_STRING_INDICES: Record<string, number[]> = {
    // Tuning is 5 6 1 2 3 5 6
    // So:
    '5': [1, 6], // Strings 1 and 6 are Sol
    '6': [2, 7], // Strings 2 and 7 are La
    '1': [3],    // String 3 is Do
    '2': [4],    // String 4 is Re
    '3': [5],    // String 5 is Mi
};

interface Position {
  string: number;
  hui: string;
  technique: HandTechnique;
  score: number; // Lower is better
}

export const mapNotesToGuqin = (notes: ParsedNote[], tuningPitches: number[]): GuqinNote[] => {
  let lastString = 7; // Default start hint

  // Get current tuning solfege map from the standard constant 
  // (Assuming standard tuning for this logic, implies 5 6 1 2 3 5 6)
  // In a robust app, we would parse the tuning solfege string dynamically.

  return notes.map((note) => {
    // 1. Pass through structural items
    if (note.isBarline || note.isDash || note.isRest) {
        return {
            originalNote: note,
            string: 0, hui: '', technique: HandTechnique.Empty,
            rightHand: RightHand.None, leftHand: LeftHand.None, isValid: true
        };
    }

    const candidates: Position[] = [];
    const midi = note.absolutePitch;
    const jianpuNum = note.jianpu.number; // "1", "2", "3"...

    // --- STRATEGY A: Exact/Octave Open String Match (San Yin) ---
    // Heavily prioritize Open Strings if the pitch class matches, regardless of Octave.
    // This fixes issues where XML is written in Octave 4 but Guqin plays Octave 2/3.
    
    // Check which strings match this solfege number
    const openStringIndices = SOLFEGE_TO_STRING_INDICES[jianpuNum];
    
    if (openStringIndices) {
        openStringIndices.forEach(strIdx => {
             // Heuristic: Prefer strings closer to the last used string to minimize jumps
             const dist = Math.abs(strIdx - lastString);
             candidates.push({
                 string: strIdx,
                 hui: '',
                 technique: HandTechnique.San,
                 score: 0 + (dist * 0.1) // Base score 0 (Excellent)
             });
        });
    }

    // --- STRATEGY B: Absolute Pitch Match (Stopped Strings) ---
    tuningPitches.forEach((openMidi, index) => {
        const stringNum = index + 1;
        
        // Exact Open String (Backup to Strategy A)
        if (midi === openMidi) {
             candidates.push({ string: stringNum, hui: '', technique: HandTechnique.San, score: 0 });
        }
        
        // Stopped positions
        const diff = midi - openMidi;
        if (diff > 0 && diff <= 24) {
             // Find Hui
             let matchedHui = '';
             let scorePenalty = 10; // Stopped notes are "more work" than open strings for beginner pieces
             
             if (HUI_OFFSETS[diff]) {
                 matchedHui = HUI_OFFSETS[diff];
             } else {
                 // Fuzzy match closest hui
                 // This allows mapping pitches that are slightly off
                 const offsets = Object.keys(HUI_OFFSETS).map(Number);
                 const closest = offsets.reduce((prev, curr) => Math.abs(curr - diff) < Math.abs(prev - diff) ? curr : prev);
                 if (Math.abs(closest - diff) <= 1) {
                     matchedHui = HUI_OFFSETS[closest];
                     scorePenalty += 2; // Slight penalty for fuzzy match
                 }
             }

             if (matchedHui) {
                 candidates.push({
                     string: stringNum,
                     hui: matchedHui,
                     technique: HandTechnique.An,
                     score: scorePenalty
                 });
             }
        }
    });

    // --- SELECTION ---
    // Sort by Score
    candidates.sort((a, b) => a.score - b.score);

    // If no candidate (weird pitch), fallback to a dummy "An" on string 7 or 1
    if (candidates.length === 0) {
        // Fallback: Try to map to String 7
        candidates.push({ string: 7, hui: '外', technique: HandTechnique.An, score: 999 });
    }

    const selected = candidates[0];
    lastString = selected.string;

    // --- HAND LOGIC ---
    let rh = RightHand.Tiao;
    // Rule: Strings 1-5 usually Gou (inward), Strings 6-7 usually Tiao (outward) for melody, 
    // but context matters. For "Xian Weng Cao", it alternates.
    // Simple heuristic: 
    if (selected.string <= 5) rh = RightHand.Gou;
    else rh = RightHand.Tiao;
    
    let lh = LeftHand.None;
    if (selected.technique === HandTechnique.An) {
        if (selected.hui.includes('十') || selected.hui === '九') {
            lh = LeftHand.Da; // Thumb for lower positions
        } else {
            lh = LeftHand.Ming; // Ring finger for upper positions
        }
    }

    return {
      originalNote: note,
      string: selected.string,
      hui: selected.hui,
      technique: selected.technique,
      rightHand: rh,
      leftHand: lh,
      isValid: true
    };
  });
};