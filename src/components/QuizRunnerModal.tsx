import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, CheckCircle2, XCircle, ArrowRight, Sparkles, X, Lightbulb } from 'lucide-react';
import { Question, QuestionOption, LanguageMode } from '../types';
import { soundEngine, speakText, stopSpeech } from '../utils/audio';

interface QuizRunnerModalProps {
  lessonTitleTe: string;
  lessonTitleEn: string;
  questions: Question[];
  languageMode: LanguageMode;
  audioSpeed: number;
  onComplete: (earnedStars: number) => void;
  onClose: () => void;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({
  lessonTitleTe,
  lessonTitleEn,
  questions,
  languageMode,
  audioSpeed,
  onComplete,
  onClose,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [totalEarnedStars, setTotalEarnedStars] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIdx];
  const selectedOption = currentQ.options.find((opt) => opt.id === selectedOptionId);
  const isCorrect = selectedOption?.isCorrect ?? false;

  const handleSpeak = (textTe: string, textEn: string) => {
    soundEngine.playClick();
    setIsSpeaking(true);
    const textToSpeak = languageMode === 'english' ? textEn : textTe;
    const lang = languageMode === 'english' ? 'en-IN' : 'te-IN';
    speakText(textToSpeak, lang, audioSpeed, () => {
      setIsSpeaking(false);
    });
  };

  const handleSelectOption = (opt: QuestionOption) => {
    if (isSubmitted && isCorrect) return; // Prevent changing after correct submission
    soundEngine.playClick();
    setSelectedOptionId(opt.id);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);

    if (selectedOption.isCorrect) {
      soundEngine.playSuccessChime();
      soundEngine.playStarDing();
      setTotalEarnedStars((prev) => prev + currentQ.points);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#155D3B', '#F2CB55', '#287D78', '#DDF5E8'],
        });
      } catch {
        // ignore
      }

      // Voice encouraging praise in Telugu/English
      const praise = languageMode === 'english' ? 'Excellent! That is correct!' : 'శభాష్! అద్భుతం, సరైన సమాధానం!';
      speakText(praise, languageMode === 'english' ? 'en-IN' : 'te-IN', audioSpeed);
    } else {
      soundEngine.playErrorBoop();
      const retryVoice = languageMode === 'english' ? 'Nice try! Check again.' : 'పర్వాలేదు! మరొక్కసారి ప్రయత్నించండి.';
      speakText(retryVoice, languageMode === 'english' ? 'en-IN' : 'te-IN', audioSpeed);
    }
  };

  const handleNext = () => {
    soundEngine.playClick();
    stopSpeech();
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
      setShowHint(false);
    } else {
      setIsFinished(true);
      soundEngine.playFanfare();
      onComplete(totalEarnedStars + (isCorrect ? currentQ.points : 0));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#FFFBEF] rounded-3xl border-2 border-[#155D3B]/20 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#155D3B] text-white px-4 py-3 flex items-center justify-between border-b border-[#10452F]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎒</span>
            <div>
              <h2 className="text-sm font-bold font-telugu leading-tight">
                {lessonTitleTe}
              </h2>
              <p className="text-[11px] text-[#8ED4A9] leading-none">
                {lessonTitleEn} • ప్రశ్న {currentIdx + 1}/{questions.length}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeech();
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E6E2D7] h-2">
          <div
            className="bg-[#F2CB55] h-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isFinished ? (
            <>
              {/* Question Card */}
              <div className="bg-white rounded-2xl p-4 border border-[#155D3B]/15 shadow-[0_4px_0_rgba(16,69,47,0.08)]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    {languageMode !== 'english' && (
                      <h3 className="text-lg font-bold text-[#10452F] font-telugu leading-relaxed">
                        {currentQ.questionTe}
                      </h3>
                    )}
                    {languageMode !== 'telugu' && (
                      <p className="text-sm font-medium text-[#404942] mt-1">
                        {currentQ.questionEn}
                      </p>
                    )}
                  </div>

                  {/* Audio Pronounce Button (#287D78 Support Teal) */}
                  <button
                    onClick={() => handleSpeak(currentQ.audioPromptTe, currentQ.audioPromptEn)}
                    className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_3px_0_#14706B] active:translate-y-1 ${
                      isSpeaking
                        ? 'bg-[#CCA835] text-[#4F3E00] ring-4 ring-[#CCA835]/30 animate-pulse'
                        : 'bg-[#287D78] text-white hover:bg-[#1E6763]'
                    }`}
                    title="ప్రశ్నను వినండి (Listen to Question)"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="text-[8px] font-bold leading-none mt-0.5">వినండి</span>
                  </button>
                </div>

                {/* Reward Stars Tag */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE08A] text-[#4F3E00] text-xs font-bold border border-[#CCA835]/50">
                    <Sparkles className="w-3 h-3 fill-[#CCA835]" />
                    +{currentQ.points} నక్షత్రాలు (Stars)
                  </span>
                  {currentQ.hintTe && (
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs text-[#287D78] font-bold flex items-center gap-1 hover:underline ml-auto"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      సూచన (Hint)
                    </button>
                  )}
                </div>

                {showHint && currentQ.hintTe && (
                  <div className="mt-3 p-2.5 bg-[#FFFBEF] border border-[#CCA835]/40 rounded-xl text-xs text-[#574400]">
                    💡 {languageMode === 'english' ? currentQ.hintEn : currentQ.hintTe}
                  </div>
                )}
              </div>

              {/* Multiple Choice Selection Cards */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-[#707971] uppercase tracking-wider px-1">
                  సమాధానాన్ని ఎంచుకోండి (Choose an Answer):
                </p>

                {currentQ.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let cardStyle = 'bg-white border-[#155D3B]/20 text-[#1C1C15] shadow-[0_4px_0_rgba(16,69,47,0.08)]';

                  if (isSelected && !isSubmitted) {
                    cardStyle = 'bg-[#DDF5E8] border-2 border-[#155D3B] text-[#155D3B] shadow-[0_4px_0_#155D3B] font-bold';
                  } else if (isSubmitted) {
                    if (opt.isCorrect) {
                      cardStyle = 'bg-[#DDF5E8] border-2 border-[#155D3B] text-[#155D3B] shadow-[0_4px_0_#155D3B] font-bold';
                    } else if (isSelected && !opt.isCorrect) {
                      cardStyle = 'bg-[#FFDAD6] border-2 border-[#BA1A1A] text-[#93000A] shadow-[0_4px_0_#BA1A1A]';
                    } else {
                      cardStyle = 'bg-white/60 border-gray-200 text-gray-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full min-h-[56px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-transform active:translate-y-0.5 ${cardStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        {opt.visual && (
                          <span className="text-2xl w-8 text-center">{opt.visual}</span>
                        )}
                        <div>
                          {languageMode !== 'english' && (
                            <div className="text-base font-semibold font-telugu leading-snug">
                              {opt.textTe}
                            </div>
                          )}
                          {languageMode !== 'telugu' && (
                            <div className="text-xs font-medium opacity-80">
                              {opt.textEn}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* State Indicator */}
                      <div className="shrink-0">
                        {isSubmitted && opt.isCorrect && (
                          <CheckCircle2 className="w-6 h-6 text-[#155D3B] fill-[#DDF5E8]" />
                        )}
                        {isSubmitted && isSelected && !opt.isCorrect && (
                          <XCircle className="w-6 h-6 text-[#BA1A1A] fill-[#FFDAD6]" />
                        )}
                        {!isSubmitted && (
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-[#155D3B] bg-[#155D3B] text-white'
                                : 'border-[#BFC9C0] bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Drawer after submission */}
              {isSubmitted && (
                <div
                  className={`p-4 rounded-2xl border ${
                    isCorrect
                      ? 'bg-[#DDF5E8] border-[#155D3B]/40 text-[#10452F]'
                      : 'bg-[#FFDAD6] border-[#BA1A1A]/40 text-[#93000A]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-[#155D3B]" />
                        <span>శభాష్! సరైన సమాధానం! (Correct!)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-[#BA1A1A]" />
                        <span>మళ్ళీ ప్రయత్నించండి! (Try Again!)</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-telugu leading-relaxed">
                    {languageMode === 'english' ? currentQ.explanationEn : currentQ.explanationTe}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Lesson Finished Card */
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-[#FFE08A] text-[#745B00] border-2 border-[#CCA835] flex items-center justify-center text-4xl mx-auto shadow-[0_6px_0_#CCA835] animate-bounce">
                🌟
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#10452F] font-telugu">
                  అభినందనలు! (Congratulations!)
                </h3>
                <p className="text-sm text-[#404942] font-medium mt-1">
                  మీరు ఈ పాఠాన్ని విజయవంతంగా పూర్తి చేశారు!
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] inline-flex items-center gap-3">
                <Sparkles className="w-6 h-6 fill-[#F2CB55] text-[#CCA835]" />
                <span className="text-lg font-bold text-[#10452F]">
                  +{totalEarnedStars} నక్షత్రాలు లభించాయి!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA Bar */}
        <div className="p-4 bg-white border-t border-[#10452F]/10">
          {!isFinished ? (
            !isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOptionId}
                className={`w-full min-h-[56px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 font-telugu ${
                  selectedOptionId
                    ? 'tactile-btn-green'
                    : 'bg-[#E6E2D7] text-[#707971] cursor-not-allowed'
                }`}
              >
                <span>సమాధానాన్ని సరిచూడండి (Check Answer)</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full min-h-[56px] rounded-2xl font-bold text-base tactile-btn-green flex items-center justify-center gap-2 font-telugu"
              >
                <span>
                  {currentIdx < questions.length - 1 ? 'తదుపరి ప్రశ్న (Next Question)' : 'ముగించండి (Finish Lesson)'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )
          ) : (
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="w-full min-h-[56px] rounded-2xl font-bold text-base tactile-btn-gold flex items-center justify-center gap-2 font-telugu"
            >
              <span>ప్రయాణం కొనసాగించండి (Continue Journey)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
