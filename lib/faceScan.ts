// lib/faceScan.ts
// Turns the face outline from on-device face detection into:
//   - face shape (oval, round, square, heart, diamond, long)
//   - facial thirds (forehead / mid-face / lower face)
//   - the lines we draw over the photo
//
// Everything runs on the phone. The photo is never uploaded.
//
// HONEST LIMITS
// - The top of the detected outline is roughly the top of the forehead,
//   not the true hairline. So the upper third is an estimate.
// - The shape thresholds below are starting values. Test on 10 to 15 real
//   selfies (different face shapes and skin tones) and tune THRESHOLDS.

import type { Face, Point } from '@react-native-ml-kit/face-detection';

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'long';

export type ScanResult = {
  shape: FaceShape;
  thirds: { upper: number; middle: number; lower: number }; // percentages, add to 100
  widths: { forehead: number; cheekbones: number; jaw: number }; // pixels
  lengthToWidth: number;
  // Everything needed to draw the overlay, in image pixel coordinates
  overlay: {
    outline: Point[];
    topY: number;
    browY: number;
    noseY: number;
    chinY: number;
    foreheadLine: { y: number; x1: number; x2: number };
    cheekLine: { y: number; x1: number; x2: number };
    jawLine: { y: number; x1: number; x2: number };
  };
};

export type ScanProblem = 'no-face' | 'no-outline' | 'turned';

// All the tuning numbers in one place.
export const THRESHOLDS = {
  long: 1.5,            // length / cheekbone width at or above this = long
  shortFace: 1.35,      // below this the face counts as short (round or square)
  squareJaw: 0.9,       // jaw / cheekbones at or above this = strong jaw
  heartJaw: 0.8,        // jaw / forehead below this, with a wide forehead = heart
  wideForehead: 0.95,   // forehead / cheekbones at or above this = wide forehead
  diamondNarrow: 0.85,  // forehead and jaw both below this x cheekbones = diamond
  maxTurnDegrees: 12,   // head turned more than this = ask for a straight-on photo
};

// Left and right edge of the outline at height y (horizontal slice through the polygon).
function edgesAtY(outline: Point[], y: number): { x1: number; x2: number } | null {
  const xs: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
      const t = (y - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  if (xs.length < 2) return null;
  return { x1: Math.min(...xs), x2: Math.max(...xs) };
}

const avgY = (pts: Point[] = []) => pts.reduce((s, p) => s + p.y, 0) / Math.max(pts.length, 1);
const maxY = (pts: Point[] = []) => Math.max(...pts.map(p => p.y));

export function classifyShape(lengthToWidth: number, forehead: number, cheek: number, jaw: number): FaceShape {
  const T = THRESHOLDS;
  if (lengthToWidth >= T.long) return 'long';
  if (forehead < cheek * T.diamondNarrow && jaw < cheek * T.diamondNarrow) return 'diamond';
  if (forehead >= cheek * T.wideForehead && jaw < forehead * T.heartJaw) return 'heart';
  if (lengthToWidth < T.shortFace) return jaw >= cheek * T.squareJaw ? 'square' : 'round';
  return 'oval';
}

// Main entry: pass the faces returned by FaceDetection.detect(...)
export function analyseFace(faces: Face[]): ScanResult | ScanProblem {
  if (!faces.length) return 'no-face';
  // Biggest face in the photo is the person scanning
  const face = [...faces].sort((a, b) => b.frame.width * b.frame.height - a.frame.width * a.frame.height)[0];

  if (Math.abs(face.rotationY) > THRESHOLDS.maxTurnDegrees || Math.abs(face.rotationZ) > THRESHOLDS.maxTurnDegrees) {
    return 'turned';
  }

  const c = face.contours;
  const outline = c?.face?.points;
  if (!c || !outline || outline.length < 10) return 'no-outline';

  const topY = Math.min(...outline.map(p => p.y));
  const chinY = Math.max(...outline.map(p => p.y));
  const browY = (avgY(c.leftEyebrowTop?.points) + avgY(c.rightEyebrowTop?.points)) / 2;
  const noseY = maxY(c.noseBottom?.points);
  const length = chinY - topY;

  // Widest point between brows and nose = cheekbones
  let cheekLine = { y: browY, x1: 0, x2: 0 };
  for (let i = 0; i <= 10; i++) {
    const y = browY + ((noseY - browY) * i) / 10;
    const e = edgesAtY(outline, y);
    if (e && e.x2 - e.x1 > cheekLine.x2 - cheekLine.x1) cheekLine = { y, ...e };
  }

  const foreheadY = (topY + browY) / 2;
  const jawY = noseY + (chinY - noseY) * 0.55;
  const fe = edgesAtY(outline, foreheadY);
  const je = edgesAtY(outline, jawY);
  if (!fe || !je || cheekLine.x2 === 0) return 'no-outline';

  const forehead = fe.x2 - fe.x1;
  const cheekbones = cheekLine.x2 - cheekLine.x1;
  const jaw = je.x2 - je.x1;
  const lengthToWidth = length / cheekbones;

  const upper = browY - topY;
  const middle = noseY - browY;
  const lower = chinY - noseY;
  const total = upper + middle + lower;
  const pct = (n: number) => Math.round((n / total) * 100);
  const u = pct(upper);
  const m = pct(middle);

  return {
    shape: classifyShape(lengthToWidth, forehead, cheekbones, jaw),
    thirds: { upper: u, middle: m, lower: 100 - u - m },
    widths: { forehead, cheekbones, jaw },
    lengthToWidth,
    overlay: {
      outline,
      topY, browY, noseY, chinY,
      foreheadLine: { y: foreheadY, ...fe },
      cheekLine,
      jawLine: { y: jawY, ...je },
    },
  };
}

// ─── What we show for each result ──────────────────────────────────
// Styles cover every texture, not just straight and wavy hair.

export const SHAPE_INFO: Record<FaceShape, { name: string; line: string; styles: string[] }> = {
  oval: {
    name: 'Oval',
    line: 'Balanced proportions. Most cuts work, so go where your mood takes you.',
    styles: ['Blunt bob', 'Curtain fringe', 'Big defined curls', 'Box braids, any length', 'Sleek high ponytail'],
  },
  round: {
    name: 'Round',
    line: 'Soft curves and a fuller cheek line. Height and length add shape.',
    styles: ['Long layers past the chin', 'High puff or pineapple', 'Side-swept fringe', 'Knotless braids worn long', 'Tapered cut with height on top'],
  },
  square: {
    name: 'Square',
    line: 'A strong jaw and straight lines. Softness around the face works beautifully.',
    styles: ['Soft face-framing layers', 'Loose curls at the jaw', 'Wispy fringe', 'Twist-out with volume', 'Side part with movement'],
  },
  heart: {
    name: 'Heart',
    line: 'A wider forehead tapering to a delicate chin. Volume lower down balances it.',
    styles: ['Chin-length bob', 'Side-swept fringe', 'Curls that fill out at the jaw', 'Low bun with face-framing pieces', 'Shoulder-length locs'],
  },
  diamond: {
    name: 'Diamond',
    line: 'Cheekbones are your feature. Width at the forehead and chin shows them off.',
    styles: ['Full fringe', 'Chin-length curls', 'Tucked-behind-ear bob', 'Afro with even volume', 'Half-up braids'],
  },
  long: {
    name: 'Long',
    line: 'Length with elegance. Width at the sides keeps things in proportion.',
    styles: ['Full fringe', 'Shoulder-length waves', 'Wide twist-out', 'Layered lob', 'Braids with volume at the sides'],
  },
};

export type Undertone = 'warm' | 'cool' | 'neutral';

// The person picks their undertone. We don't guess skin tone from the photo:
// room lighting makes that unreliable, and it goes wrong most on darker skin.
export const COLOURS: Record<Undertone, { name: string; hex: string }[]> = {
  warm: [
    { name: 'Honey', hex: '#C68E3F' },
    { name: 'Copper', hex: '#B5562C' },
    { name: 'Caramel', hex: '#A0672F' },
    { name: 'Golden brown', hex: '#7A4A22' },
  ],
  cool: [
    { name: 'Ash brown', hex: '#6B5B4E' },
    { name: 'Burgundy', hex: '#6D1A2C' },
    { name: 'Plum', hex: '#4E2547' },
    { name: 'Blue black', hex: '#14161F' },
  ],
  neutral: [
    { name: 'Chestnut', hex: '#6E3B23' },
    { name: 'Soft auburn', hex: '#8A3E26' },
    { name: 'Mocha', hex: '#4F3326' },
    { name: 'Bronde', hex: '#9A7650' },
  ],
};
