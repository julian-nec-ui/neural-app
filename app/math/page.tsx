"use client";

import { useState, useEffect, useRef, JSX, forwardRef } from 'react';

type MathOp = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'fractions';
type NumberType = 'integer' | 'float';

interface OperationConfig { id: MathOp; label: string; icon: string; color: string; }
interface DigitCounts { n1: number; n2: number; }
interface ResultDigit { value: number; id: string; }
interface NumberData { digits: number[]; decimalCount: number; sign: 1 | -1; }
interface FlightData { startX: number; startY: number; endX: number; endY: number; }

type CustomCSSProperties = React.CSSProperties & { [key: string]: string | number };

const OPERATIONS: OperationConfig[] = [
  { id: 'addition', label: 'Addition', icon: '+', color: 'from-cyan-500 to-blue-600' },
  { id: 'subtraction', label: 'Subtraction', icon: '-', color: 'from-orange-500 to-red-600' },
  { id: 'multiplication', label: 'Multiplication', icon: '×', color: 'from-purple-500 to-pink-600' },
  { id: 'division', label: 'Division', icon: '÷', color: 'from-emerald-500 to-teal-600' },
  { id: 'fractions', label: 'Fractions', icon: '/', color: 'from-amber-500 to-yellow-600' },
];
const computeNumber = (totalDigits: number, type: NumberType): NumberData => {
  const digits: number[] = [];
  
  for (let i = 0; i < totalDigits; i++) {
    if (i === 0 && totalDigits > 1) {
      // The first digit of a multi-digit number must be 1-9 to avoid leading zeros
      digits.push(Math.floor(Math.random() * 9) + 1);
    } else {
      // All other digits can be 0-9
      digits.push(Math.floor(Math.random() * 10));
    }
  }

  // To prevent leading zeros in floats (like .55), 
  // we ensure decimalCount never exceeds totalDigits - 1.
  // This guarantees at least one non-zero digit exists in the integer place.
  const maxAllowedDecimals = totalDigits > 0 ? totalDigits - 1 : 0;
  const decimalCount = type === 'float' ? Math.min(2, maxAllowedDecimals) : 0;

  return { digits, decimalCount, sign: 1 };
};


const getDigitStyle = (isHighlighted: boolean, isResult: boolean, isEditable: boolean, isNum1: boolean, wasComputed: boolean) => {
  if (isHighlighted) return 'bg-linear-to-br from-yellow-400 to-orange-500 text-zinc-900 scale-110 shadow-[0_0_20px_rgba(250,204,21,0.6)] z-30';
  if (isResult) return 'bg-linear-to-br from-cyan-400 to-blue-500 text-zinc-900 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)]';
  if (isEditable) {
    const base = 'bg-zinc-800 text-cyan-400 border-cyan-600 hover:scale-110 hover:text-zinc-900';
    const hover = isNum1 
      ? 'hover:border-cyan-300 hover:bg-[linear-gradient(135deg,#ecfeff_0%,#67e8f9_20%,#06b6d4_40%,#0e7490_55%,#06b6d4_70%,#67e8f9_85%,#ecfeff_100%)]'
      : 'hover:border-pink-300 hover:bg-[linear-gradient(135deg,#fdf2f8_0%,#f9a8d4_20%,#ec4899_40%,#9d174d_55%,#ec4899_70%,#f9a8d4_85%,#fdf2f8_100%)]';
    return `${base} ${hover}`;
  }
  if (wasComputed) return 'bg-linear-to-br from-slate-600 to-slate.800 text-slate-200 border-slate-500 shadow-inner';
  return 'bg-zinc-800 text-zinc-400 border-zinc-700';
};

const Digit = forwardRef<HTMLDivElement, {
  digit: number;
  isHighlighted?: boolean;
  isResult?: boolean;
  carryValue?: number;
  badgeType?: 'carry' | 'borrow';
  wasComputed?: boolean;
  isEditable?: boolean;
  isNum1?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  badgeRef?: React.RefObject<HTMLDivElement>;
}>(({
  digit, isHighlighted, isResult, carryValue, badgeType, wasComputed, isEditable, isNum1, onIncrement, onDecrement, badgeRef
}, ref) => {
  const style = getDigitStyle(isHighlighted || false, isResult || false, isEditable || false, isNum1 || false, wasComputed || false);
  
  return (
    <div ref={ref} className={`group w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-md border-2 font-bold text-xl transition-all duration-700 relative ${style}`}>
      {digit}
      {carryValue !== undefined && carryValue !== 0 && (
        <div 
          ref={badgeRef}
          className={`absolute -top-7.5 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center text-[11px] font-black text-white shadow-[0_0_10px_rgba(0,0,0,0.3)] border z-50 transition-all duration-500 ${badgeType === 'borrow' ? 'bg-red-600 border-red-400' : 'bg-green-600 border-green-400'} rounded-md`}
        >
          {carryValue}
        </div>
      )}
      {isEditable && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); onIncrement?.(); }} className="absolute -top-0.75 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 p-0 border-0 bg-transparent z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M12 2 L22 22 L13 22 L12 19 L11 22 L2 22 Z" fill="url(#upArrowGrad)" stroke="#15803d" strokeWidth="0.6" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDecrement?.(); }} className="absolute -bottom-0.75 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-5 p-0 border-0 bg-transparent z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M12 22 L22 2 L13 2 L12 5 L11 2 L2 2 Z" fill="url(#downArrowGrad)" stroke="#b91c1c" strokeWidth="0.6" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}
    </div >
  );
});
Digit.displayName = 'Digit';

const DecimalPoint = () => <div className="w-6 flex justify-center text-cyan-500 font-black text-3xl self-center">.</div>;
const CommaSeparator = () => <div className="w-5 flex justify-center text-zinc-600 font-black text-xl animate-pulse self-end">,</div>;

const cleanNumber = (data: NumberData): NumberData => {
  const { digits, decimalCount } = data;
  const integerLen = Math.max(1, digits.length - decimalCount);
  let firstNonZeroIdx = 0;
  for (let i = 0; i < integerLen; i++) {
    if (digits[i] !== 0) { firstNonZeroIdx = i; break; }
    if (i === integerLen - 1) firstNonZeroIdx = i;
  }
  return { ...data, digits: digits.slice(firstNonZeroIdx) };
};

export default function MathExplorer() {
  const [digitCounts, setDigitCounts] = useState<Record<MathOp, DigitCounts>>({
    addition: { n1: 3, n2: 3 }, subtraction: { n1: 3, n2: 3 }, multiplication: { n1: 3, n2: 3 }, division: { n1: 3, n2: 3 }, fractions: { n1: 3, n2: 3 },
  });
  const [numberTypes, setNumberTypes] = useState<Record<MathOp, NumberType>>({
    addition: 'integer', subtraction: 'integer', multiplication: 'integer', division: 'integer', fractions: 'integer',
  });
  const [activeOp, setActiveOp] = useState<MathOp>('addition');
  const [num1, setNum1] = useState<NumberData>({ digits: [], decimalCount: 0, sign: 1 });
  const [num2, setNum2] = useState<NumberData>({ digits: [], decimalCount: 0, sign: 1 });
  const [result, setResult] = useState<ResultDigit[]>([]); 
  const [resultDecimalCount, setResultDecimalCount] = useState(0);
  const [currentColumn, setCurrentColumn] = useState<number>(-1);
  const [carry, setCarry] = useState<number>(0);
  const [computedColumns, setComputedColumns] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [resultSign, setResultSign] = useState<number>(1);
  const [badgeTargetCol, setBadgeTargetCol] = useState<number>(-1);
  const [badgeType, setBadgeType] = useState<'carry' | 'borrow' | undefined>(undefined);

  const digitRefs = useRef<(HTMLDivElement | null)[]>([]);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const resultRowRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<FlightData | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setNum1(computeNumber(3, 'integer'));
      setNum2(computeNumber(3, 'integer'));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const regenerate = (n1: number, n2: number, type: NumberType) => {
    setNum1(computeNumber(n1, type));
    setNum2(computeNumber(n2, type));
    setResult([]); setResultDecimalCount(0); setCurrentColumn(-1); setCarry(0); setComputedColumns(new Set()); setBadgeTargetCol(-1); setBadgeType(undefined); setResultSign(1); setIsCleaning(false); setFlight(null);
  };

  const handleDigitCountChange = (op: MathOp, target: 'n1' | 'n2', val: number) => {
    setDigitCounts(prev => ({ ...prev, [op]: { ...prev[op], [target]: val } }));
    if (op === activeOp) regenerate(target === 'n1' ? val : digitCounts[op].n1, target === 'n2' ? val : digitCounts[op].n2, numberTypes[op]);
  };

  const toggleEditMode = () => {
    if (isAnimating) return;
    const next = !isEditing;
    setIsEditing(next);
    if (!next) {
      const cleanedNum1 = cleanNumber(num1);
      const cleanedNum2 = cleanNumber(num2);
      setNum1(cleanedNum1);
      setNum2(cleanedNum2);
      setDigitCounts(prev => ({ ...prev, [activeOp]: { n1: cleanedNum1.digits.length, n2: cleanedNum2.digits.length } }));
    }
  };

  const cycleDigit = (which: 'n1' | 'n2', index: number, direction: 1 | -1) => {
    if (!isEditing || isAnimating) return;
    const setter = which === 'n1' ? setNum1 : setNum2;
    setter(prev => {
      const newDigits = [...prev.digits];
      newDigits[index] = (newDigits[index] + direction + 10) % 10;
      return { ...prev, digits: newDigits };
    });
    setResult([]); setResultDecimalCount(0); setCurrentColumn(-1); setCarry(0); setComputedColumns(new Set());
  };

  const toggleSign = (which: 'n1' | 'n2') => {
    if (isAnimating) return;
    const setter = which === 'n1' ? setNum1 : setNum2;
    setter(prev => ({ ...prev, sign: prev.sign === 1 ? -1 : 1 }));
  };

  const startAnimation = async () => {
    if (isAnimating || num1.digits.length === 0 || num2.digits.length === 0) return;
    setIsEditing(false); setIsAnimating(true); setIsCleaning(false);
    setComputedColumns(new Set()); setResult([]); setResultDecimalCount(0);
    setCurrentColumn(-1); setCarry(0); setBadgeTargetCol(-1); setBadgeType(undefined);
    setResultSign(1); setFlight(null);

    await new Promise(r => window.setTimeout(r, 600));

    const maxDecimals = Math.max(num1.decimalCount, num2.decimalCount);
    const getPadded = (n: NumberData) => {
      const p = [...n.digits];
      for (let i = 0; i < maxDecimals - n.decimalCount; i++) p.push(0);
      return p;
    };

    const pad1 = getPadded(num1);
    const pad2 = getPadded(num2);
    const maxLen = Math.max(pad1.length, pad2.length);
    const finalP1 = Array(maxLen - pad1.length).fill(0).concat(pad1);
    const finalP2 = Array(maxLen - pad2.length).fill(0).concat(pad2);

    const toVal = (n: NumberData) => {
      const len = n.digits.length;
      const decIdx = len - n.decimalCount;
      const intPart = n.digits.slice(0, Math.max(0, decIdx)).join('');
      const decPart = n.digits.slice(Math.max(0, decIdx)).join('');
      let v = parseInt(intPart || '0');
      if (n.decimalCount > 0) v += parseInt(decPart || '0') / Math.pow(10, n.decimalCount);
      return v * n.sign;
    };

    const v1 = toVal(num1), v2 = toVal(num2);
    let isSubtractionMode = false;
    let finalSign = 1;

    if (activeOp === 'addition') {
      if (num1.sign === num2.sign) { isSubtractionMode = false; finalSign = num1.sign; }
      else { isSubtractionMode = true; finalSign = Math.abs(v1) > Math.abs(v2) ? num1.sign : num2.sign; }
    } else if (activeOp === 'subtraction') {
      if (num1.sign !== num2.sign) { isSubtractionMode = false; finalSign = num1.sign; }
      else { isSubtractionMode = true; finalSign = num1.sign; }
    }

    let workingP1 = [...finalP1], workingP2 = [...finalP2];
    if (isSubtractionMode && Math.abs(v2) > Math.abs(v1)) [workingP1, workingP2] = [workingP2, workingP1];

    let runningCarry = 0;
    const newResult: ResultDigit[] = [];

    for (let col = 0; col < maxLen; col++) {
      const idx = maxLen - 1 - col;
      setCurrentColumn(col);
      await new Promise(r => window.setTimeout(r, 1000));

      let digitResult = 0;
      let nextCarryValue = 0;

      if (!isSubtractionMode) {
        const sum = workingP1[idx] + workingP2[idx] + runningCarry;
        digitResult = sum % 10;
        nextCarryValue = sum >= 10 ? 1 : 0;
      } else {
        let sub = workingP1[idx] - workingP2[idx] - runningCarry;
        if (sub < 0) { sub += 10; nextCarryValue = 1; } else { nextCarryValue = 0; }
        digitResult = sub;
      }

      newResult.unshift({ value: digitResult, id: Math.random().toString(36).substr(2, 9) });
      setResult([...newResult]);
      await new Promise(r => window.setTimeout(r, 1000));

      runningCarry = nextCarryValue;
      if (runningCarry !== 0) {
        setBadgeTargetCol(col);
        setCarry(runningCarry);
        setBadgeType(isSubtractionMode ? 'borrow' : 'carry');
      } else {
        setBadgeTargetCol(-1);
        setCarry(0);
      }

      await new Promise(r => window.setTimeout(r, 1000));
      setComputedColumns(prev => new Set(prev).add(col));
      if (maxDecimals > 0 && col === maxDecimals - 1) setResultDecimalCount(maxDecimals);
      await new Promise(r => window.setTimeout(r, 600));
    }

    setResultSign(finalSign);

    if (!isSubtractionMode && runningCarry > 0) {
      const lastColIdx = maxLen - 1;
      const startEl = digitRefs.current[lastColIdx];
      const endEl = resultRowRef.current;

      if (startEl && endEl) {
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();

        setFlight({
          startX: startRect.left + (startRect.width / 2),
          startY: startRect.top - 30, 
          endX: endRect.left + (endRect.width / 2),
          endY: endRect.top + (endRect.height / 2)
        });
        await new Promise(r => window.setTimeout(r, 800));
      }

      newResult.unshift({ value: runningCarry, id: 'spillover-id' });
      setResult([...newResult]);
      setFlight(null);
      await new Promise(r => window.setTimeout(r, 1000));
    }

    setBadgeTargetCol(-1);
    setCarry(0);
    await new Promise(r => window.setTimeout(r, 800));
    setIsCleaning(true);
    await new Promise(r => window.setTimeout(r, 1000));

    const integerLen = Math.max(0, newResult.length - maxDecimals);
    let firstNonZeroIdx = -1;
    for (let i = 0; i < integerLen; i++) {
      if (newResult[i].value !== 0) { firstNonZeroIdx = i; break; }
      if (i === integerLen - 1) firstNonZeroIdx = i;
    }
    if (firstNonZeroIdx > 0) setResult(newResult.slice(firstNonZeroIdx));
    else setResult(newResult);

    setIsCleaning(false);
    setCurrentColumn(-2);
    setCarry(0);
    setBadgeTargetCol(-1);
    setBadgeType(undefined);
    setIsAnimating(false);
  };

  const renderDigitRow = (data: NumberData, isNum1: boolean) => {
    const elements: JSX.Element[] = [];
    const { digits, decimalCount, sign } = data;
    const integerLen = Math.max(0, digits.length - decimalCount);

    // 1. Add Sign Button (First in array)
    elements.push(
      <button
        key={`sign-${isNum1 ? 'n1' : 'n2'}`}
        onClick={() => toggleSign(isNum1 ? 'n1' : 'n2')}
        className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-all duration-500 mr-6 ${sign === 1 ? 'bg-zinc-900/40 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:bg-zinc-900/60' : 'bg-zinc-900/40 text-pink-400 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] hover:bg-zinc-900/60'
          }`}
      >
        <span className="text-xl font-black leading-none select-none">{sign === 1 ? '+' : '-'}</span>
      </button>
    );

    // 2. Add Digits (In order)
    digits.forEach((digit, i) => {
      const isDecimalPos = decimalCount > 0 && i === integerLen;
      const isHighlighted = (digits.length - 1 - i) === currentColumn;
      const wasComputed = computedColumns.has(digits.length - 1 - i);
      const isEditable = isEditing && !isAnimating;
      const isBadgeVisible = (digits.length - 1 - i) === badgeTargetCol && isNum1;

      if (isDecimalPos) elements.push(<DecimalPoint key={`dot-${i}`} />);

      elements.push(
        <div key={`digit-wrap-${i}`} ref={el => { if(isNum1 && isBadgeVisible) badgeRef.current = el; }}>
          <Digit
            digit={digit}
            isHighlighted={isHighlighted}
            isResult={false}
            carryValue={isBadgeVisible ? carry : undefined}
            badgeType={isBadgeVisible ? badgeType : undefined}
            wasComputed={wasComputed}
            isEditable={isEditable}
            isNum1={isNum1}
            onIncrement={isEditable ? () => cycleDigit(isNum1 ? 'n1' : 'n2', digits.length - 1 - i, 1) : undefined}
            onDecrement={isEditable ? () => cycleDigit(isNum1 ? 'n1' : 'n2', digits.length - 1 - i, -1) : undefined}
          />
        </div >
      );

      if (i < integerLen - 1) {
        const remaining = integerLen - 1 - i;
        if (remaining > 0 && remaining % 3 === 0) elements.push(<CommaSeparator key={`comma-${i}`} />);
      }
    });

    return elements;
  };

  const renderResultRow = () => {
    if (result.length === 0) return <div className="text-zinc-700 text-sm italic">Ready to explain...</div>;
    const elements: JSX.Element[] = [];
    const len = result.length;
    const integerLen = Math.max(0, len - resultDecimalCount);

    let firstNonZeroIdx = -1;
    for (let i = 0; i < integerLen; i++) {
      if (result[i].value !== 0) { firstNonZeroIdx = i; break; }
      if (i === integerLen - 1) firstNonZeroIdx = i;
    }

    // 1. Add Sign Div (First in array)
    elements.push(
      <div
        key="res-sign"
        className={`w-10 shrink-0 flex items-center justify-center text-2xl font-black transition-colors duration-700 mr-6 ${resultSign === 1 ? 'text-cyan-400' : 'text-pink-400'}`}
      >
        {resultSign === 1 ? '+' : '-'}
      </div >
    );

    // 2. Add Result Digits (In order)
    for (let i = 0; i < len; i++) {
      if (resultDecimalCount > 0 && i === integerLen) elements.push(<DecimalPoint key={`res-dot-${i}`} />);
      const isLeadingZero = isCleaning && firstNonZeroIdx > 0 && i < firstNonZeroIdx;

      elements.push(
        <div
          key={result[i].id} 
          className={`transition-all duration-1000 ease-out ${isLeadingZero ? 'opacity-0 scale-50' : 'opacity-100 scale-100'} animate-pop-in`}
        >
          <Digit digit={result[i].value} isResult={true} />
        </div >
      );

      if (i < integerLen - 1) {
        const remaining = integerLen - 1 - i;
        if (remaining > 0 && remaining % 3 === 0) elements.push(<CommaSeparator key={`res-comma-${i}`} />);
      }
    }
    return elements;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden font-sans">
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.3); }
          70% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes carryFlight {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1.5); opacity: 0; }
        }
        .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-carry-flight { animation: carryFlight 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>

      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="upArrowGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#ecfccb" /><stop offset="30%" stopColor="#86efac" /><stop offset="60%" stopColor="#22c55e" /><stop offset="100%" stopColor="#14532d" /></linearGradient>
          <linearGradient id="downArrowGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fee2e2" /><stop offset="30%" stopColor="#fca5a5" /><stop offset="60%" stopColor="#ef4444" /><stop offset="100%" stopColor="#7f1d1d" /></linearGradient>
        </defs>
      </svg>

      <aside className="w-72 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-6 shadow-2xl">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Operations</div>
        <nav className="flex flex-col gap-4">
          {OPERATIONS.map(op => (
            <button key={op.id} onClick={() => { setActiveOp(op.id); setIsEditing(false); regenerate(digitCounts[op.id].n1, digitCounts[op.id].n2, numberTypes[op.id]); }} className={`relative group flex items-center gap-4 p-4 rounded-2xl transition-all ${activeOp === op.id ? 'bg-zinc-800 scale-[1.02]' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
              {activeOp === op.id && <div className={`absolute inset-0 rounded-2xl bg-linear-to-br ${op.color} opacity-10`} />}
              <span className="text-2xl">{op.icon}</span>
              <span className="font-semibold">{op.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-12 flex flex-col items-center justify-center relative">
        <div className="z-10 w-full max-w-5xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-500">
              {OPERATIONS.find(o => o.id === activeOp)?.label.toUpperCase()}
            </h1>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 md:p-16 backdrop-blur-xl shadow-2xl relative">
            
            {flight && (
              <div 
                className="fixed z-100 pointer-events-none animate-carry-flight flex items-center justify-center w-6 h-6 text-[11px] font-black text-white shadow-[0_0_10px_rgba(0,0,0,0.3)] border bg-green-600 border-green-400 rounded-md"
                style={{
                  left: flight.startX,
                  top: flight.startY,
                  '--tx': `${flight.endX - flight.startX}px`,
                  '--ty': `${flight.endY - flight.startY}px`,
                } as CustomCSSProperties}
              >
                1
              </div>
            )}

            <div className="grid grid-cols-[min-content_auto_auto] justify-items-start items-center gap-x-4 gap-y-4 mt-10">
              <div />
              <div className="justify-self-end flex items-end gap-2">
                {renderDigitRow(num1, true)}
              </div>
              <span className="text-[8px] font-bold text-cyan-400 uppercase whitespace-nowrap">N1 Digits: {num1.digits.length}</span>

              <div className="text-4xl font-light text-cyan-500 flex justify-center">
                {OPERATIONS.find(o => o.id === activeOp)?.icon}
              </div>
              <div />
              <div />

              <div />
              <div className="justify-self-end flex items-end gap-2">
                {renderDigitRow(num2, false)}
              </div>
              <span className="text-[8px] font-bold text-pink-400 uppercase whitespace-nowrap">N2 Digits: {num2.digits.length}</span>

              <div className="col-span-3 h-1 bg-zinc-700 my-2 rounded-full" />

              <div />
              <div ref={resultRowRef} className="justify-self-end flex items-end gap-2">
                <div className="w-10 shrink-0" />
                {renderResultRow()}
              </div>
              <div />
            </div>

            <div className="mt-12 flex flex-col gap-3">
              <div className="flex items-center gap-2 pl-3">
                {(['integer', 'float'] as NumberType[]).map(t => (
                  <button
                    disabled={isAnimating}
                    key={t}
                    onClick={() => {
                      setNumberTypes(prev => ({ ...prev, [activeOp]: t }));
                      setIsEditing(false);
                      regenerate(digitCounts[activeOp].n1, digitCounts[activeOp].n2, t);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${numberTypes[activeOp] === t ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500' : 'border-zinc-800 text-zinc-500'}`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 bg-zinc-800/50 p-3 rounded-2xl border border-zinc-700">
                <div className="flex flex-col">
                  <label className="text-[8px] font-bold text-cyan-500 uppercase mb-1.5">N1 Digits: {digitCounts[activeOp].n1}</label>
                  <input
                    type="range" min="1" max="12"
                    value={digitCounts[activeOp].n1}
                    onChange={e => handleDigitCountChange(activeOp, 'n1', Number(e.target.value))}
                    disabled={isAnimating}
                    className="w-24 accent-cyan-500 h-1 bg-zinc-700 rounded-lg appearance-none"
                  />
                </div>

                <div className="w-px h-8 bg-zinc-700" />

                <div className="flex flex-col">
                  <label className="text-[8px] font-bold text-pink-500 uppercase mb-1.5">N2 Digits: {digitCounts[activeOp].n2}</label>
                  <input
                    type="range" min="1" max="12"
                    value={digitCounts[activeOp].n2}
                    onChange={e => handleDigitCountChange(activeOp, 'n2', Number(e.target.value))}
                    disabled={isAnimating}
                    className="w-24 accent-pink-500 h-1 bg-zinc-700 rounded-lg appearance-none"
                  />
                </div>

                <div className="w-px h-8 bg-zinc-700" />

                <button
                  onClick={toggleEditMode}
                  disabled={isAnimating}
                  className={`flex flex-row items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-colors ${isAnimating ? 'text-zinc-600' : isEditing ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'text-zinc-400 hover:text-green-500'}`}
                >
                  <span className="text-lg leading-none">{isEditing ? '✓' : '✎'}</span>
                  <span className="hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
                </button>

                <div className="w-px h-8 bg-zinc-700" />

                <button
                  onClick={startAnimation}
                  disabled={isAnimating}
                  className={`ml-2.5 px-5 py-2 rounded-xl text-[10px] font-bold transition-all ${isAnimating ? 'bg-zinc-700 text-zinc-500' : 'bg-linear-to-r from-cyan-600 to-blue-700 hover:scale-105'}`}
                >
                  {isAnimating ? 'Processing...' : 'Explain to Me'}
                </button>

                <button
                  disabled={isAnimating}
                  onClick={() => {
                    setIsEditing(false);
                    regenerate(digitCounts[activeOp].n1, digitCounts[activeOp].n2, numberTypes[activeOp]);
                  }}
                  className="px-5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-bold hover:bg-zinc-700"
                >
                  New Numbers
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
