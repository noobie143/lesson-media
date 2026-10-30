import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Eraser, RotateCcw, Check, Sparkles, Plus, Minus } from 'lucide-react';
import { TRACING_ITEMS, TracingItem } from '../data/curriculumData';
import { soundEngine, speakText } from '../utils/audio';

export const PlayTab: React.FC = () => {
  const [activeGame, setActiveGame] = useState<'slate' | 'counter' | 'words'>('slate');

  // Digital Slate states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<TracingItem>(TRACING_ITEMS[0]);
  const [chalkColor, setChalkColor] = useState<string>('#FFFFFF');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Fruit counter state
  const [basketCount, setBasketCount] = useState(3);
  const targetCount = 7;
  const [counterSuccess, setCounterSuccess] = useState(false);

  // Word match game state
  const wordPairs = [
    { id: 'p-1', emoji: '🐘', te: 'ఏనుగు', en: 'Elephant', soundTe: 'ఏనుగు - అడవిలో నడిచే పెద్ద జంతువు' },
    { id: 'p-2', emoji: '🏡', te: 'ఇల్లు', en: 'House', soundTe: 'ఇల్లు - మన అందమైన ఇల్లు' },
    { id: 'p-3', emoji: '🦚', te: 'నెమలి', en: 'Peacock', soundTe: 'నెమలి - వర్షంలో ఆడే నెమలి' },
    { id: 'p-4', emoji: '🥭', te: 'మామిడి', en: 'Mango', soundTe: 'మామిడి - తియ్యని బంగినపల్లి మామిడి' },
  ];
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Initialize Canvas
  useEffect(() => {
    if (activeGame === 'slate' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High DPI canvas setup
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Fill blackboard slate color
        ctx.fillStyle = '#1D3B2F';
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    }
  }, [activeGame, selectedLetter]);

  const clearCanvas = () => {
    soundEngine.playChalkStroke();
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.fillStyle = '#1D3B2F';
        ctx.fillRect(0, 0, rect.width, rect.height);
        setHasDrawn(false);
      }
    }
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasDrawn(true);
    soundEngine.playChalkStroke();
    draw(e);
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = chalkColor;
    ctx.shadowBlur = 4;
    ctx.shadowColor = chalkColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const playPronunciation = (item: TracingItem) => {
    soundEngine.playClick();
    speakText(item.audioTe, 'te-IN', 0.85);
  };

  // Coffee Fruit counter interaction
  const handleAddBerry = () => {
    if (basketCount >= 10) return;
    soundEngine.playClick();
    const next = basketCount + 1;
    setBasketCount(next);
    if (next === targetCount) {
      soundEngine.playSuccessChime();
      soundEngine.playStarDing();
      setCounterSuccess(true);
      speakText('శభాష్! బుట్టలో సరిగ్గా ఏడు కాఫీ పండ్లు చేరాయి!', 'te-IN');
    }
  };

  const handleRemoveBerry = () => {
    if (basketCount <= 0) return;
    soundEngine.playClick();
    const next = basketCount - 1;
    setBasketCount(next);
    if (next === targetCount) {
      soundEngine.playSuccessChime();
      setCounterSuccess(true);
    } else {
      setCounterSuccess(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Activity Mode Switcher Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#155D3B]/20 shadow-[0_2px_0_rgba(16,69,47,0.08)] flex gap-1">
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveGame('slate');
          }}
          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeGame === 'slate'
              ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
              : 'text-[#404942] hover:bg-[#F2EEE2]'
          }`}
        >
          <span>🎨</span>
          <span className="font-telugu">డిజిటల్ పలక (Slate)</span>
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveGame('counter');
          }}
          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeGame === 'counter'
              ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
              : 'text-[#404942] hover:bg-[#F2EEE2]'
          }`}
        >
          <span>🍒</span>
          <span className="font-telugu">కాఫీ లెక్కింపు (Count)</span>
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveGame('words');
          }}
          className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeGame === 'words'
              ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
              : 'text-[#404942] hover:bg-[#F2EEE2]'
          }`}
        >
          <span>🧩</span>
          <span className="font-telugu">పదాల ఆట (Match)</span>
        </button>
      </div>

      {/* GAME 1: DIGITAL SLATE (పలక & బలపం) */}
      {activeGame === 'slate' && (
        <div className="space-y-3">
          {/* Letter / Numeral Ribbon */}
          <div className="bg-white rounded-2xl p-3 border border-[#155D3B]/20 shadow-[0_3px_0_rgba(16,69,47,0.08)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#10452F] font-telugu">
                దిద్దే అక్షరాన్ని ఎంచుకోండి (Select Letter to Trace):
              </span>
              <button
                onClick={() => playPronunciation(selectedLetter)}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-[#DDF5E8] text-[#155D3B] border border-[#155D3B]/20 hover:bg-[#8ED4A9]/40"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>వినండి</span>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {TRACING_ITEMS.map((item) => {
                const isSelected = selectedLetter.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedLetter(item);
                      clearCanvas();
                    }}
                    className={`w-12 h-12 rounded-xl text-lg font-bold flex flex-col items-center justify-center shrink-0 border-2 transition-transform active:scale-95 ${
                      isSelected
                        ? 'bg-[#155D3B] text-white border-[#10452F] shadow-[0_3px_0_#10452F]'
                        : 'bg-[#FFFBEF] text-[#10452F] border-[#155D3B]/20 hover:bg-[#DDF5E8]'
                    }`}
                  >
                    <span className="font-telugu leading-none">{item.char}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slate Canvas Container with wooden frame */}
          <div className="bg-[#8B5A2B] p-3 rounded-3xl shadow-[0_6px_0_#5C3A1E] border-2 border-[#5C3A1E]">
            <div className="relative rounded-2xl overflow-hidden bg-[#1D3B2F] border border-[#142A21] shadow-inner touch-none">
              {/* Slate guide background text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-25">
                <span className="text-8xl sm:text-9xl font-bold text-white font-telugu">
                  {selectedLetter.char.split(' ')[0]}
                </span>
              </div>

              {/* Slate Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={startDraw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onMouseMove={draw}
                onTouchStart={startDraw}
                onTouchEnd={stopDraw}
                onTouchMove={draw}
                className="w-full h-64 sm:h-72 cursor-crosshair block"
              />

              {/* Tracing guidance hint */}
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-[#8ED4A9] pointer-events-none select-none">
                <span>అక్షరం: {selectedLetter.wordTe}</span>
                <span className="opacity-80">వేలుతో దిద్దండి (Trace here)</span>
              </div>
            </div>

            {/* Slate Controls: Chalk Colors & Eraser */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white font-bold">బలపం (Chalk):</span>
                {[
                  { color: '#FFFFFF', name: 'తెలుపు' },
                  { color: '#FFE08A', name: 'పసుపు' },
                  { color: '#FFB4AB', name: 'గులాబీ' },
                  { color: '#A1F1EA', name: 'ఆకాశం' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => {
                      soundEngine.playClick();
                      setChalkColor(c.color);
                    }}
                    style={{ backgroundColor: c.color }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      chalkColor === c.color ? 'scale-125 border-white shadow-md' : 'border-black/30'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Eraser button */}
              <button
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-0.5"
              >
                <Eraser className="w-4 h-4" />
                <span>తుడవండి (Erase)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME 2: COFFEE BERRY COUNTER (అరకు కాఫీ గింజల లెక్క) */}
      {activeGame === 'counter' && (
        <div className="bg-white rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#10452F] font-telugu">
                అరకు కాఫీ గింజల కొలత బుట్ట
              </h3>
              <p className="text-xs text-[#707971]">
                Tap berries to add or remove them from the village basket
              </p>
            </div>
            <div className="px-3 py-1 rounded-xl bg-[#FFE08A] text-[#4F3E00] font-bold text-xs border border-[#CCA835]">
              లక్ష్యం: {targetCount} పండ్లు (Target)
            </div>
          </div>

          {/* Goal prompt */}
          <div className="p-3 bg-[#DDF5E8] rounded-2xl border border-[#155D3B]/30 flex items-center justify-between">
            <span className="text-sm font-bold text-[#155D3B] font-telugu">
              బుట్టలో సరిగ్గా {targetCount} కాఫీ పండ్లను ఉంచండి!
            </span>
            <button
              onClick={() => speakText(`బుట్టలో సరిగ్గా ${targetCount} కాఫీ పండ్లను ఉంచండి.`, 'te-IN')}
              className="w-8 h-8 rounded-full bg-[#155D3B] text-white flex items-center justify-center shrink-0"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bamboo Measuring Basket Visualization */}
          <div className="bg-[#F7F3E8] p-6 rounded-3xl border-2 border-dashed border-[#CCA835] text-center relative overflow-hidden min-h-[180px] flex flex-col items-center justify-center">
            {/* Basket graphics */}
            <div className="text-xs font-bold text-[#745B00] mb-2 uppercase tracking-wider">
              🧺 వెదురు బుట్ట (Bamboo Basket) — {basketCount} పండ్లు
            </div>

            {/* Berries inside basket */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-[240px] min-h-[70px]">
              {basketCount === 0 && (
                <span className="text-xs text-[#707971] italic">బుట్ట ఖాళీగా ఉంది (Basket is empty)</span>
              )}
              {Array.from({ length: basketCount }).map((_, idx) => (
                <span
                  key={idx}
                  className="text-3xl animate-in zoom-in duration-200 transition-transform hover:scale-125"
                >
                  🍒
                </span>
              ))}
            </div>

            {counterSuccess && (
              <div className="mt-3 px-3 py-1 rounded-full bg-[#155D3B] text-white text-xs font-bold flex items-center gap-1 shadow-md animate-bounce">
                <Check className="w-3.5 h-3.5" />
                <span>లక్ష్యం పూర్తయింది! శభాష్! (Target Reached!)</span>
              </div>
            )}
          </div>

          {/* Add / Remove Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRemoveBerry}
              disabled={basketCount <= 0}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-[0_4px_0_#CCA835] active:translate-y-1 ${
                basketCount > 0 ? 'bg-[#FFE08A] text-[#4F3E00] border border-[#CCA835]' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Minus className="w-6 h-6" />
            </button>

            <div className="text-center px-4">
              <span className="text-3xl font-extrabold text-[#10452F]">{basketCount}</span>
              <p className="text-[11px] text-[#707971] font-semibold">పండ్లు (Count)</p>
            </div>

            <button
              onClick={handleAddBerry}
              disabled={basketCount >= 10}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold tactile-btn-green active:translate-y-1 ${
                basketCount < 10 ? '' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* GAME 3: WORD AND PICTURE PUZZLE */}
      {activeGame === 'words' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-[#155D3B]/20 shadow-[0_3px_0_rgba(16,69,47,0.08)]">
            <h3 className="text-base font-bold text-[#10452F] font-telugu">
              పదాలు & బొమ్మల శబ్దాలు (Vocabulary Audio Cards)
            </h3>
            <p className="text-xs text-[#707971]">
              Tap any card to hear the Telugu pronunciation and meaning
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {wordPairs.map((pair) => {
              const isPlaying = activeCardId === pair.id;
              return (
                <button
                  key={pair.id}
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveCardId(pair.id);
                    speakText(pair.soundTe, 'te-IN', 0.85, () => setActiveCardId(null));
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all active:translate-y-1 ${
                    isPlaying
                      ? 'bg-[#DDF5E8] border-2 border-[#155D3B] shadow-[0_4px_0_#155D3B] scale-102'
                      : 'bg-white border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.08)] hover:bg-[#F7F3E8]'
                  }`}
                >
                  <span className="text-4xl block mb-2">{pair.emoji}</span>
                  <div className="text-lg font-bold text-[#10452F] font-telugu leading-snug">
                    {pair.te}
                  </div>
                  <div className="text-xs text-[#707971] font-semibold mt-0.5">
                    {pair.en}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#287D78]">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>వినండి</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
