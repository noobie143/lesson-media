import React from 'react';
import { Volume2, VolumeX, Sparkles, Flame, Globe, GraduationCap } from 'lucide-react';
import { StudentProfile, LanguageMode, TeacherAccount } from '../types';
import { soundEngine } from '../utils/audio';

interface HeaderProps {
  profile: StudentProfile;
  teacher: TeacherAccount;
  onUpdateProfile: (updater: (prev: StudentProfile) => StudentProfile) => void;
  onOpenClassSelector: () => void;
  onOpenTeacherPortal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  teacher,
  onUpdateProfile,
  onOpenClassSelector,
  onOpenTeacherPortal,
}) => {
  const toggleSound = () => {
    soundEngine.playClick();
    onUpdateProfile((prev) => {
      const nextSound = !prev.soundEnabled;
      soundEngine.enabled = nextSound;
      return { ...prev, soundEnabled: nextSound };
    });
  };

  const cycleLanguage = () => {
    soundEngine.playClick();
    onUpdateProfile((prev) => {
      const modes: LanguageMode[] = ['bilingual', 'telugu', 'english'];
      const nextIdx = (modes.indexOf(prev.languageMode) + 1) % modes.length;
      return { ...prev, languageMode: modes[nextIdx] };
    });
  };

  const getLangLabel = () => {
    if (profile.languageMode === 'bilingual') return 'ద్విభాష (Te+En)';
    if (profile.languageMode === 'telugu') return 'తెలుగు (Telugu)';
    return 'English';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFBEF] border-b-2 border-[#155D3B]/15 px-3 sm:px-4 py-2.5 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand & Crest */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#155D3B] text-white flex items-center justify-center font-bold text-xl shadow-[0_3px_0_#10452F] border border-[#10452F]">
            వి
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold text-[#10452F] leading-tight font-telugu">
                విద్యా నేస్తం
              </h1>
            </div>
            <p className="text-[11px] text-[#666666] font-medium leading-none">
              Vidya Nestham • Primary EdTech
            </p>
          </div>
        </div>

        {/* Gamification Pills & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Class Level Pill */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenClassSelector();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white border border-[#155D3B]/20 text-[#155D3B] text-xs font-bold shadow-[0_2px_0_rgba(16,69,47,0.15)] active:translate-y-0.5"
            title="తరగతి మార్చుకోండి (Change Class)"
          >
            <span>{profile.classLevel}వ తరగతి</span>
          </button>

          {/* Stars Pill */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFE08A] border border-[#CCA835] text-[#4F3E00] text-xs font-bold shadow-[0_2px_0_#CCA835]"
            title="నక్షత్రాలు (Stars)"
          >
            <Sparkles className="w-3.5 h-3.5 fill-[#CCA835] text-[#745B00]" />
            <span>{profile.stars}</span>
          </div>

          {/* Streak Flame */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[#93000A] text-xs font-bold shadow-[0_2px_0_rgba(186,26,26,0.3)]"
            title="వరుస అభ్యాస రోజులు (Streak)"
          >
            <Flame className="w-3.5 h-3.5 fill-[#BA1A1A] text-[#BA1A1A]" />
            <span>{profile.streakDays}</span>
          </div>

          {/* Audio Toggle */}
          <button
            onClick={toggleSound}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-[0_2px_0_rgba(16,69,47,0.15)] active:translate-y-0.5 ${
              profile.soundEnabled
                ? 'bg-[#287D78] text-white'
                : 'bg-white border border-[#707971]/30 text-[#707971]'
            }`}
            title={profile.soundEnabled ? 'శబ్దం ఆన్ లో ఉంది (Sound On)' : 'శబ్దం మ్యూట్ చేయబడింది (Sound Muted)'}
          >
            {profile.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Teacher Portal Trigger Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenTeacherPortal();
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold shadow-[0_2px_0_rgba(16,69,47,0.15)] active:translate-y-0.5 ${
              teacher.isLoggedIn
                ? 'bg-[#155D3B] text-white border border-[#10452F]'
                : 'bg-[#FFFBEF] border border-[#CCA835] text-[#745B00] hover:bg-[#FFE08A]/40'
            }`}
            title={teacher.isLoggedIn ? 'ఉపాధ్యాయుల వేదిక (Teacher Portal)' : 'ఉపాధ్యాయుల లాగిన్ (Teacher Login)'}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="text-[11px] font-telugu">
              {teacher.isLoggedIn ? 'గురువులు' : 'టీచర్ లాగిన్'}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={cycleLanguage}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-white border border-[#155D3B]/20 text-[#155D3B] text-xs font-semibold shadow-[0_2px_0_rgba(16,69,47,0.15)] active:translate-y-0.5"
            title="భాష మార్చుకోండి (Cycle Language)"
          >
            <Globe className="w-3 h-3 text-[#287D78]" />
            <span className="text-[11px]">{getLangLabel()}</span>
          </button>
        </div>
      </div>

      {/* Sub-strip for rural school status: Offline Ready & MPPS School Name */}
      <div className="max-w-md mx-auto mt-1 flex items-center justify-between text-[11px] text-[#404942] px-0.5">
        <div className="flex items-center gap-1.5 font-medium truncate max-w-[280px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="text-emerald-800 font-semibold shrink-0">ఆఫ్‌లైన్ సిద్ధం</span>
          <span className="text-[#10452F] font-semibold truncate font-telugu">
            • {profile.schoolName}
          </span>
        </div>
        <button
          onClick={cycleLanguage}
          className="sm:hidden text-[11px] text-[#287D78] font-bold underline"
        >
          {getLangLabel()}
        </button>
      </div>
    </header>
  );
};
