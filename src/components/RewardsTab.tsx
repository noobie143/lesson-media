import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, Sparkles, Printer, CheckCircle2, Lock, Share2 } from 'lucide-react';
import { StudentProfile } from '../types';
import { BADGES_LIST } from '../data/curriculumData';
import { soundEngine } from '../utils/audio';

interface RewardsTabProps {
  profile: StudentProfile;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({ profile }) => {
  const [showCertificate, setShowCertificate] = useState(false);

  // Tree growth level based on stars
  const treeLevel = Math.min(4, Math.max(1, Math.floor(profile.stars / 30) + 1));
  const treeStages = [
    { level: 1, nameTe: 'చిన్న మొలక', nameEn: 'Sprout', desc: 'మొదటి ఆకులు విరిశాయి' },
    { level: 2, nameTe: 'చిగురించిన మొక్క', nameEn: 'Sapling', desc: 'కొత్త కొమ్మలు వచ్చాయి' },
    { level: 3, nameTe: 'పూల వృక్షం', nameEn: 'Blossoming Tree', desc: 'సువాసన పూలు వికసించాయి' },
    { level: 4, nameTe: 'మహావృక్షం', nameEn: 'Mighty Banyan', desc: 'తీపి పండ్లు, పక్షుల గూళ్ళు చేరాయి' },
  ];
  const currentStage = treeStages[treeLevel - 1];

  const handlePrintCertificate = () => {
    soundEngine.playFanfare();
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#155D3B', '#F2CB55', '#287D78'],
      });
    } catch {
      // ignore
    }
    window.print();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Interactive Learning Banyan Tree (విద్యా వృక్షం) */}
      <div className="bg-gradient-to-b from-[#A1F1EA]/30 via-white to-[#F7F3E8] rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] text-center relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="text-left">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#155D3B] text-white">
              దశ {treeLevel} / 4
            </span>
            <h3 className="text-lg font-bold text-[#10452F] font-telugu mt-1 leading-tight">
              నా విద్యా వృక్షం (Learning Tree)
            </h3>
            <p className="text-xs text-[#666666]">
              {currentStage.nameTe} • {currentStage.desc}
            </p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFE08A] text-[#4F3E00] text-xs font-bold border border-[#CCA835]">
              <Sparkles className="w-3.5 h-3.5 fill-[#CCA835]" />
              <span>{profile.stars}★</span>
            </div>
          </div>
        </div>

        {/* Tree Visual SVG Canvas */}
        <div className="my-2 relative flex items-center justify-center h-48 sm:h-56">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full max-w-[240px] drop-shadow-md select-none"
          >
            {/* Ground mound */}
            <ellipse cx="100" cy="180" rx="80" ry="14" fill="#C8A165" />
            <ellipse cx="100" cy="178" rx="72" ry="10" fill="#155D3B" opacity="0.8" />

            {/* Tree Trunk */}
            <path
              d="M 94,180 Q 92,130 85,110 Q 95,90 100,75 Q 105,90 115,110 Q 108,130 106,180 Z"
              fill="#5C3A1E"
            />
            {/* Trunk roots */}
            <path d="M 88,175 Q 75,182 65,183" stroke="#5C3A1E" strokeWidth="3" fill="none" />
            <path d="M 112,175 Q 125,182 135,183" stroke="#5C3A1E" strokeWidth="3" fill="none" />

            {/* Stage 1: Basic Sprout Leaves */}
            {treeLevel >= 1 && (
              <g className="animate-in zoom-in duration-300">
                <circle cx="100" cy="70" r="28" fill="#266A47" />
                <circle cx="85" cy="80" r="22" fill="#155D3B" />
                <circle cx="115" cy="80" r="22" fill="#155D3B" />
              </g>
            )}

            {/* Stage 2: Sapling Canopy */}
            {treeLevel >= 2 && (
              <g className="animate-in zoom-in duration-400">
                <circle cx="70" cy="95" r="24" fill="#287D78" />
                <circle cx="130" cy="95" r="24" fill="#287D78" />
                <circle cx="100" cy="55" r="26" fill="#8ED4A9" />
              </g>
            )}

            {/* Stage 3: Blossoming Flowers */}
            {treeLevel >= 3 && (
              <g className="animate-in zoom-in duration-500">
                {/* Yellow blossoms */}
                <circle cx="80" cy="65" r="5" fill="#F2CB55" />
                <circle cx="120" cy="65" r="5" fill="#F2CB55" />
                <circle cx="100" cy="85" r="5" fill="#F2CB55" />
                <circle cx="65" cy="100" r="4" fill="#FFE08A" />
                <circle cx="135" cy="100" r="4" fill="#FFE08A" />
              </g>
            )}

            {/* Stage 4: Mighty Banyan with Mangoes & Singing Bird */}
            {treeLevel >= 4 && (
              <g className="animate-in zoom-in duration-700">
                {/* Golden Mangoes */}
                <text x="75" y="90" fontSize="12">🥭</text>
                <text x="115" y="90" fontSize="12">🥭</text>
                <text x="95" y="60" fontSize="12">🥭</text>
                {/* Singing hornbill bird */}
                <text x="120" y="55" fontSize="14">🦜</text>
                {/* Village swing */}
                <line x1="88" y1="105" x2="88" y2="140" stroke="#707971" strokeWidth="1.5" />
                <line x1="112" y1="105" x2="112" y2="140" stroke="#707971" strokeWidth="1.5" />
                <rect x="85" y="140" width="30" height="4" rx="2" fill="#CCA835" />
              </g>
            )}
          </svg>
        </div>

        <p className="text-xs text-[#155D3B] font-bold">
          {treeLevel === 4
            ? '🌳 మీ విద్యా వృక్షం పూర్తి పచ్చదనంతో నిండింది! అద్భుతం!'
            : `ఇంకో ${(treeLevel * 30) - profile.stars > 0 ? (treeLevel * 30) - profile.stars : 15} నక్షత్రాలతో మీ వృక్షం తదుపరి దశకు చేరుతుంది!`}
        </p>
      </div>

      {/* Badges Cabinet (పతకాలు) */}
      <div className="bg-white rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-[#10452F] font-telugu">
              సాధించిన పతకాలు (Earned Badges)
            </h3>
            <p className="text-xs text-[#707971]">
              Every badge celebrates a learning milestone
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFE08A] text-[#4F3E00]">
            {BADGES_LIST.filter((b) => profile.stars >= b.starsNeeded).length} / {BADGES_LIST.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {BADGES_LIST.map((badge) => {
            const isUnlocked = profile.stars >= badge.starsNeeded;
            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-2xl border transition-all text-center ${
                  isUnlocked
                    ? 'bg-[#DDF5E8]/30 border-[#155D3B]/30 shadow-[0_3px_0_rgba(16,69,47,0.1)]'
                    : 'bg-[#F7F3E8] border-[#BFC9C0]/40 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-1.5 border-2 shadow-xs ${
                    isUnlocked
                      ? 'bg-[#FFE08A] border-[#CCA835] text-[#4F3E00]'
                      : 'bg-gray-200 border-gray-300 text-gray-400'
                  }`}
                >
                  {isUnlocked ? badge.icon : <Lock className="w-5 h-5 text-[#707971]" />}
                </div>

                <h4 className="text-sm font-bold text-[#10452F] font-telugu leading-snug">
                  {badge.titleTe}
                </h4>
                <p className="text-[11px] text-[#404942] font-medium leading-none mt-0.5">
                  {badge.titleEn}
                </p>

                <div className="mt-2 text-[10px] text-[#707971]">
                  {isUnlocked ? (
                    <span className="text-[#155D3B] font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> సాధించారు
                    </span>
                  ) : (
                    <span>{badge.starsNeeded}★ అవసరం</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Village School Certificate Button & Modal */}
      <div className="bg-[#FFFBEF] p-4 rounded-3xl border-2 border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[#10452F] font-telugu">
            గ్రామ బడి ధృవీకరణ పత్రం (School Certificate)
          </h4>
          <p className="text-xs text-[#666666]">
            View and download your official achievement certificate
          </p>
        </div>
        <button
          onClick={() => {
            soundEngine.playClick();
            setShowCertificate(true);
          }}
          className="tactile-btn-green px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5"
        >
          <Award className="w-4 h-4" />
          <span>చూడండి</span>
        </button>
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#FFFBEF] p-6 rounded-3xl border-4 border-[#155D3B] shadow-2xl relative">
            <button
              onClick={() => setShowCertificate(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#155D3B] text-white flex items-center justify-center font-bold"
            >
              ✕
            </button>

            {/* Certificate Border Style */}
            <div className="border-2 border-dashed border-[#CCA835] p-5 rounded-2xl bg-white text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#155D3B] text-white mx-auto flex items-center justify-center text-3xl font-bold shadow-md">
                వి
              </div>

              <div>
                <span className="text-xs font-bold text-[#287D78] uppercase tracking-widest">
                  ఆంధ్రప్రదేశ్ ప్రభుత్వం • పాఠశాల విద్యాశాఖ
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#10452F] font-telugu mt-1">
                  విద్యా నేస్తం ప్రతిభా పురస్కారం
                </h2>
                <p className="text-xs text-[#707971]">
                  Vidya Nestham Rural EdTech Learning Award
                </p>
              </div>

              <div className="py-2 border-y border-[#155D3B]/20">
                <p className="text-xs text-[#666666]">ఈ ధృవీకరణ పత్రం సమర్పించబడుతోంది:</p>
                <p className="text-xl font-extrabold text-[#155D3B] font-telugu my-1">
                  {profile.name}
                </p>
                <p className="text-xs text-[#404942] font-semibold">
                  {profile.classLevel}వ తరగతి • {profile.schoolName}
                </p>
              </div>

              <p className="text-xs text-[#404942] font-telugu leading-relaxed">
                {profile.schoolName} లో ప్రాథమిక విద్యలో గణితం, తెలుగు మరియు పర్యావరణ అంశాలలో విశేష ప్రతిభ కనబరిచినందుకు {profile.stars} బంగారు నక్షత్రాలతో ఈ ప్రశంసా పత్రం ప్రదానం చేయబడింది.
              </p>

              <div className="flex items-center justify-between pt-3 text-[11px] text-[#707971]">
                <div>
                  <p className="font-bold text-[#10452F]">తేదీ: {profile.lastActiveDate}</p>
                  <p>{profile.schoolName}</p>
                </div>
                <div>
                  <div className="font-bold text-lg font-telugu text-[#155D3B]">శ్రీ విద్యా నేస్తం</div>
                  <p className="border-t border-gray-400">ప్రధానోపాధ్యాయులు</p>
                </div>
              </div>
            </div>

            {/* Print & Share Actions */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={handlePrintCertificate}
                className="tactile-btn-green px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>ప్రింట్ చేయండి (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
