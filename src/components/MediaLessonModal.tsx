import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  Sparkles,
  CheckCircle2,
  Download,
  FileText,
  Play,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { LessonNode, LanguageMode } from '../types';
import { soundEngine, speakText, stopSpeech } from '../utils/audio';
import { getYouTubeEmbedUrl } from '../utils/media';

interface MediaLessonModalProps {
  lesson: LessonNode;
  languageMode: LanguageMode;
  audioSpeed: number;
  onComplete: (earnedStars: number) => void;
  onClose: () => void;
}

export const MediaLessonModal: React.FC<MediaLessonModalProps> = ({
  lesson,
  languageMode,
  audioSpeed,
  onComplete,
  onClose,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const embedUrl = lesson.mediaType === 'youtube' && lesson.mediaUrl
    ? getYouTubeEmbedUrl(lesson.mediaUrl)
    : null;

  const handleSpeakInstructions = () => {
    soundEngine.playClick();
    setIsSpeaking(true);
    const text = lesson.mediaDescriptionTe || lesson.subtitleTe || lesson.titleTe;
    speakText(text, 'te-IN', audioSpeed, () => setIsSpeaking(false));
  };

  const handleMarkComplete = () => {
    soundEngine.playSuccessChime();
    soundEngine.playStarDing();
    setIsCompleted(true);

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

    const praise = 'శభాష్! ఉపాధ్యాయులు ఇచ్చిన ఈ డిజిటల్ పాఠాన్ని విజయవంతంగా పూర్తి చేశారు!';
    speakText(praise, 'te-IN', audioSpeed);
    onComplete(lesson.questions.length > 0 ? lesson.questions[0].points : 20);
  };

  const getMediaBadge = () => {
    switch (lesson.mediaType) {
      case 'youtube':
        return { label: 'యూట్యూబ్ వీడియో (YouTube)', icon: '▶️', color: 'bg-red-100 text-red-700 border-red-200' };
      case 'video':
        return { label: 'వీడియో పాఠం (Video)', icon: '🎥', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'image':
        return { label: 'చిత్రం / చార్ట్ (Image Chart)', icon: '🖼️', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'pdf':
        return { label: 'పిడిఎఫ్ వర్క్‌షీట్ (PDF)', icon: '📄', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: 'ప్రత్యేక పాఠం', icon: '📚', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const badgeInfo = getMediaBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#FFFBEF] rounded-3xl border-2 border-[#155D3B] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#155D3B] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#10452F]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{lesson.icon || badgeInfo.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-telugu leading-tight">
                  {lesson.titleTe}
                </h3>
              </div>
              <p className="text-[11px] text-[#8ED4A9] leading-none mt-0.5">
                {lesson.uploadedBy || 'వివేక్ గారు'} • {lesson.classLevel}వ తరగతి
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

        {/* Media Container & Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Media Header Tag */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeInfo.color} flex items-center gap-1.5`}>
              <span>{badgeInfo.icon}</span>
              <span>{badgeInfo.label}</span>
            </span>

            {/* Audio Voice Instruction Button */}
            <button
              onClick={handleSpeakInstructions}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                isSpeaking
                  ? 'bg-[#CCA835] text-[#4F3E00] ring-4 ring-[#CCA835]/30 animate-pulse'
                  : 'bg-[#287D78] text-white hover:bg-[#1E6763]'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span className="font-telugu">గురువుల మాట వినండి</span>
            </button>
          </div>

          {/* 1. YOUTUBE VIDEO PLAYER */}
          {lesson.mediaType === 'youtube' && (
            <div className="rounded-2xl overflow-hidden bg-black shadow-lg border-2 border-[#155D3B]/20 aspect-video relative">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={lesson.titleTe}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white">
                  <Play className="w-12 h-12 text-red-500 mb-2" />
                  <p className="text-xs">యూట్యూబ్ లింక్ సరిగ్గా లోడ్ కాలేదు.</p>
                  {lesson.mediaUrl && (
                    <a
                      href={lesson.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-xs font-bold text-[#FFE08A] underline flex items-center gap-1"
                    >
                      యూట్యూబ్‌లో చూడండి <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. DIRECT HTML5 VIDEO PLAYER */}
          {lesson.mediaType === 'video' && (
            <div className="rounded-2xl overflow-hidden bg-black shadow-lg border-2 border-[#155D3B]/20 aspect-video flex items-center justify-center">
              {lesson.mediaUrl ? (
                <video
                  src={lesson.mediaUrl}
                  controls
                  className="w-full h-full object-contain"
                  playsInline
                >
                  మీ బ్రౌజర్ వీడియో ప్లేయర్‌ను సపోర్ట్ చేయదు.
                </video>
              ) : (
                <div className="text-white text-xs text-center p-4">
                  వీడియో అందుబాటులో లేదు.
                </div>
              )}
            </div>
          )}

          {/* 3. IMAGE / DIAGRAM VIEWER */}
          {lesson.mediaType === 'image' && (
            <div className="rounded-2xl overflow-hidden bg-white shadow-md border-2 border-[#155D3B]/20 p-2 text-center">
              {lesson.mediaUrl ? (
                <img
                  src={lesson.mediaUrl}
                  alt={lesson.titleTe}
                  className="w-full max-h-72 object-contain rounded-xl mx-auto"
                />
              ) : (
                <div className="py-12 text-[#707971] text-xs">
                  చిత్రం అందుబాటులో లేదు.
                </div>
              )}
            </div>
          )}

          {/* 4. PDF DOCUMENT VIEWER */}
          {lesson.mediaType === 'pdf' && (
            <div className="rounded-2xl overflow-hidden bg-white shadow-md border-2 border-[#155D3B]/20 p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#FFFBEF] rounded-xl border border-[#CCA835]/40">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-2xl font-bold">
                  📄
                </div>
                <div className="flex-1 truncate">
                  <h4 className="text-sm font-bold text-[#10452F] font-telugu truncate">
                    {lesson.fileName || lesson.titleTe}
                  </h4>
                  <p className="text-xs text-[#707971]">
                    తరగతి వర్క్‌షీట్ పిడిఎఫ్ పత్రం
                  </p>
                </div>
                {lesson.mediaUrl && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={lesson.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-[#287D78] text-white text-xs font-bold font-telugu flex items-center gap-1 shadow-xs hover:bg-[#1E6763]"
                      title="పూర్తి స్క్రీన్‌లో పిడిఎఫ్ చూడండి"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>చూడండి</span>
                    </a>
                    <a
                      href={lesson.mediaUrl}
                      download={lesson.fileName || 'worksheet.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#155D3B] text-white flex items-center justify-center shadow-xs hover:bg-[#10452F]"
                      title="పిడిఎఫ్ డౌన్‌లోడ్ చేయండి"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Embedded PDF iframe / viewer */}
              {lesson.mediaUrl ? (
                <div className="w-full h-80 border rounded-2xl overflow-hidden bg-gray-50 flex flex-col">
                  <iframe
                    src={lesson.mediaUrl}
                    title="PDF Worksheet"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="p-4 bg-[#F7F3E8] rounded-xl text-center text-xs text-[#404942]">
                  <p className="font-telugu font-semibold">
                    ఈ వర్క్‌షీట్‌ను డౌన్‌లోడ్ చేసి లేదా పలకపై ప్రాక్టీస్ చేయండి.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Teacher's Note & Description Card */}
          <div className="bg-white p-4 rounded-2xl border border-[#155D3B]/15 shadow-xs space-y-1.5">
            <h4 className="text-xs font-bold text-[#10452F] font-telugu flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#287D78]" />
              <span>గురువుల వివరణ (Teacher's Instructions):</span>
            </h4>
            <p className="text-xs text-[#404942] font-telugu leading-relaxed">
              {lesson.mediaDescriptionTe || lesson.subtitleTe || 'ఈ పాఠాన్ని శ్రద్ధగా వీక్షించి, ముఖ్యమైన అంశాలను పలకపై రాసుకోండి.'}
            </p>
          </div>
        </div>

        {/* Modal Bottom CTA */}
        <div className="p-4 bg-white border-t border-[#10452F]/10">
          {!isCompleted ? (
            <button
              onClick={handleMarkComplete}
              className="w-full min-h-[52px] rounded-2xl tactile-btn-green font-bold text-sm font-telugu flex items-center justify-center gap-2 shadow-[0_4px_0_#10452F]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>పాఠం పూర్తి చేశాను (+20★ నక్షత్రాలు పొందండి)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#155D3B]">
                <CheckCircle2 className="w-5 h-5 text-[#155D3B]" />
                <span>పూర్తయింది! నక్షత్రాలు లభించాయి.</span>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                className="tactile-btn-gold px-4 py-2 rounded-xl text-xs font-bold font-telugu"
              >
                ముగించండి
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
