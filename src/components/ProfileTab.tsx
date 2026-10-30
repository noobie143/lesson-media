import React, { useState } from 'react';
import { User, Volume2, Globe, Sparkles, BookOpen, Heart, HardDrive, Check } from 'lucide-react';
import { StudentProfile, LanguageMode, TeacherAccount } from '../types';
import { soundEngine, speakText } from '../utils/audio';

interface ProfileTabProps {
  profile: StudentProfile;
  teacher: TeacherAccount;
  onUpdateProfile: (updater: (prev: StudentProfile) => StudentProfile) => void;
  onOpenTeacherPortal: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  teacher,
  onUpdateProfile,
  onOpenTeacherPortal,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name);

  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [tempSchool, setTempSchool] = useState(profile.schoolName);

  const [showSavedToast, setShowSavedToast] = useState(false);

  const avatars = [
    { id: 'student-boy-1', label: 'రాము (Ramu)', emoji: '👦🏽' },
    { id: 'student-girl-1', label: 'చిన్ని (Chinni)', emoji: '👧🏽' },
    { id: 'student-girl-2', label: 'గౌరీ (Gowri)', emoji: '🧒🏽' },
    { id: 'student-boy-2', label: 'రాజూ (Raju)', emoji: '🧑🏽' },
  ];

  const handleSaveName = () => {
    soundEngine.playClick();
    onUpdateProfile((prev) => ({ ...prev, name: tempName }));
    setIsEditingName(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleSaveSchool = () => {
    soundEngine.playClick();
    onUpdateProfile((prev) => ({ ...prev, schoolName: tempSchool }));
    setIsEditingSchool(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleClassChange = (lvl: number) => {
    soundEngine.playClick();
    onUpdateProfile((prev) => ({ ...prev, classLevel: lvl }));
    speakText(`${lvl}వ తరగతి ఎంపిక చేయబడింది`, 'te-IN');
  };

  const handleSpeedChange = (spd: number) => {
    soundEngine.playClick();
    onUpdateProfile((prev) => ({ ...prev, audioSpeed: spd }));
    speakText('ధ్వని వేగం మార్చబడింది', 'te-IN', spd);
  };

  const handleLangChange = (mode: LanguageMode) => {
    soundEngine.playClick();
    onUpdateProfile((prev) => ({ ...prev, languageMode: mode }));
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notification */}
      {showSavedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#155D3B] text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-[#90D5AA]" />
          <span>వివరాలు భద్రపరచబడ్డాయి! (Saved Successfully)</span>
        </div>
      )}

      {/* Student Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] text-center relative">
        {/* Avatar Display */}
        <div className="w-20 h-20 rounded-3xl bg-[#DDF5E8] border-2 border-[#155D3B] text-4xl flex items-center justify-center mx-auto shadow-[0_4px_0_#155D3B]">
          {avatars.find((a) => a.id === profile.avatarId)?.emoji || '👦🏽'}
        </div>

        {/* Student Name with edit toggle */}
        <div className="mt-3">
          <span className="text-[10px] font-bold text-[#707971] uppercase tracking-wider block mb-0.5">
            విద్యార్థి పేరు (Student Name)
          </span>
          {isEditingName ? (
            <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="విద్యార్థి పేరు నమోదు చేయండి"
                className="px-3 py-1.5 rounded-xl border-2 border-[#155D3B] text-center font-bold text-base font-telugu text-[#10452F] outline-none w-full"
              />
              <button
                onClick={handleSaveName}
                className="tactile-btn-green px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
              >
                సరే
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-extrabold text-[#10452F] font-telugu">
                {profile.name}
              </h3>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsEditingName(true);
                }}
                className="text-xs text-[#287D78] font-bold underline"
              >
                మార్చండి
              </button>
            </div>
          )}
        </div>

        {/* MPPS School Name with manual edit toggle */}
        <div className="mt-3 pt-3 border-t border-[#155D3B]/10">
          <span className="text-[10px] font-bold text-[#707971] uppercase tracking-wider block mb-0.5">
            ఎం.పి.పి.ఎస్ పాఠశాల పేరు (MPPS School Name)
          </span>
          {isEditingSchool ? (
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  value={tempSchool}
                  onChange={(e) => setTempSchool(e.target.value)}
                  placeholder="ఉదా: ఎం.పి.పి.ఎస్. పాఠశాల, పాడేరు"
                  className="px-3 py-1.5 rounded-xl border-2 border-[#155D3B] text-center font-bold text-sm font-telugu text-[#10452F] outline-none w-full"
                />
                <button
                  onClick={handleSaveSchool}
                  className="tactile-btn-green px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
                >
                  భద్రపరచు
                </button>
              </div>

              {/* Quick suggestions for MPPS */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {[
                  'ఎం.పి.పి.ఎస్. పాఠశాల',
                  'ఎం.పి.పి.ఎస్. పాడేరు',
                  'ఎం.పి.పి.ఎస్. కొత్తూరు',
                  'ఎం.పి.పి.ఎస్. ప్రాథమిక పాఠశాల',
                ].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setTempSchool(sug)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[#DDF5E8] text-[#155D3B] border border-[#155D3B]/20 hover:bg-[#8ED4A9]/40"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-bold text-[#10452F] font-telugu">
                🏫 {profile.schoolName}
              </p>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsEditingSchool(true);
                }}
                className="text-xs text-[#287D78] font-bold underline"
              >
                మార్చండి
              </button>
            </div>
          )}
        </div>

        {/* Avatar Picker */}
        <div className="mt-4 pt-3 border-t border-[#155D3B]/10">
          <p className="text-xs font-bold text-[#707971] mb-2">బొమ్మను ఎంచుకోండి (Choose Avatar):</p>
          <div className="flex items-center justify-center gap-3">
            {avatars.map((av) => (
              <button
                key={av.id}
                onClick={() => {
                  soundEngine.playClick();
                  onUpdateProfile((prev) => ({ ...prev, avatarId: av.id }));
                }}
                className={`w-11 h-11 rounded-2xl text-2xl flex items-center justify-center border-2 transition-transform active:scale-95 ${
                  profile.avatarId === av.id
                    ? 'border-[#155D3B] bg-[#DDF5E8] shadow-[0_3px_0_#155D3B]'
                    : 'border-gray-200 bg-white hover:bg-[#F7F3E8]'
                }`}
                title={av.label}
              >
                {av.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Class Level Selector */}
      <div className="bg-white rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)]">
        <h4 className="text-sm font-bold text-[#10452F] font-telugu mb-1">
          తరగతి ఎంపిక (Select Class / Grade):
        </h4>
        <p className="text-xs text-[#707971] mb-3">
          Curriculum questions automatically adapt to the selected grade level
        </p>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const isSelected = profile.classLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => handleClassChange(lvl)}
                className={`py-3 rounded-2xl text-center font-bold transition-all ${
                  isSelected
                    ? 'tactile-btn-green'
                    : 'tactile-btn-white'
                }`}
              >
                <span className="text-lg block leading-none">{lvl}</span>
                <span className="text-[10px] font-telugu block mt-1">తరగతి</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Speech Audio Speed & Preferences */}
      <div className="bg-white rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] space-y-4">
        <div>
          <h4 className="text-sm font-bold text-[#10452F] font-telugu flex items-center gap-1.5 mb-1">
            <Volume2 className="w-4 h-4 text-[#287D78]" />
            <span>ధ్వని వేగం (Voice Pronunciation Speed):</span>
          </h4>
          <p className="text-xs text-[#707971] mb-2.5">
            Slow voice helps young learners hear Telugu consonant stacks clearly
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 0.8, labelTe: 'నిదానంగా', labelEn: 'Slow (0.8x)' },
              { val: 1.0, labelTe: 'సాధారణం', labelEn: 'Normal (1.0x)' },
              { val: 1.2, labelTe: 'వేగంగా', labelEn: 'Fast (1.2x)' },
            ].map((spd) => {
              const isSelected = profile.audioSpeed === spd.val;
              return (
                <button
                  key={spd.val}
                  onClick={() => handleSpeedChange(spd.val)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#287D78] text-white border-[#14706B] shadow-[0_2px_0_#14706B]'
                      : 'bg-white text-[#404942] border-[#155D3B]/20 hover:bg-[#F7F3E8]'
                  }`}
                >
                  <span className="font-telugu block">{spd.labelTe}</span>
                  <span className="text-[10px] opacity-80">{spd.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Mode Selector */}
        <div className="pt-3 border-t border-[#155D3B]/10">
          <h4 className="text-sm font-bold text-[#10452F] font-telugu flex items-center gap-1.5 mb-1">
            <Globe className="w-4 h-4 text-[#155D3B]" />
            <span>భాషా శైలి (Language Display Mode):</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { id: 'bilingual' as LanguageMode, labelTe: 'ద్విభాష', labelEn: 'Telugu + English' },
              { id: 'telugu' as LanguageMode, labelTe: 'కేవలం తెలుగు', labelEn: 'Telugu Only' },
              { id: 'english' as LanguageMode, labelTe: 'కేవలం ఆంగ్లం', labelEn: 'English Only' },
            ].map((lang) => {
              const isSelected = profile.languageMode === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => handleLangChange(lang.id)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#155D3B] text-white border-[#10452F] shadow-[0_2px_0_#10452F]'
                      : 'bg-white text-[#404942] border-[#155D3B]/20 hover:bg-[#F7F3E8]'
                  }`}
                >
                  <span className="font-telugu block">{lang.labelTe}</span>
                  <span className="text-[10px] opacity-80">{lang.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rural Connectivity & Offline Storage Status */}
      <div className="bg-[#DDF5E8]/60 rounded-3xl p-4 border border-[#155D3B]/30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#155D3B] text-white flex items-center justify-center shrink-0">
          <HardDrive className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h5 className="text-xs font-bold text-[#10452F] font-telugu leading-tight">
            ఆఫ్‌లైన్ డాటా రక్షణ (Local Offline Storage Active)
          </h5>
          <p className="text-[11px] text-[#404942] mt-0.5 leading-snug">
            All stars, badges, and progress are stored safely on this device. No high-speed internet required!
          </p>
        </div>
      </div>

      {/* Teacher Portal Section */}
      <div className="bg-gradient-to-br from-[#FFFBEF] to-[#DDF5E8] rounded-3xl p-5 border-2 border-[#155D3B]/30 shadow-[0_4px_0_rgba(16,69,47,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#155D3B] text-white flex items-center justify-center text-xl shadow-[0_3px_0_#10452F]">
              🧑‍🏫
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#155D3B] text-white">
                {teacher.isLoggedIn ? 'లాగిన్ అయ్యారు' : 'ఉపాధ్యాయుల విభాగం'}
              </span>
              <h4 className="text-base font-bold text-[#10452F] font-telugu mt-0.5">
                ఉపాధ్యాయుల వేదిక (Teacher Portal)
              </h4>
              <p className="text-xs text-[#404942]">
                {teacher.isLoggedIn ? teacher.name : 'Upload custom lessons, quiz questions & homework'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-[#155D3B]/15 flex items-center justify-between">
          <span className="text-[11px] text-[#707971]">
            పాఠాలు అప్‌లోడ్ చేయండి & నక్షత్రాలు బహూకరించండి
          </span>
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenTeacherPortal();
            }}
            className="tactile-btn-green px-4 py-2 rounded-xl text-xs font-bold font-telugu"
          >
            {teacher.isLoggedIn ? 'పోర్టల్ తెరవండి' : 'టీచర్ లాగిన్'}
          </button>
        </div>
      </div>

      {/* Teacher & Parent Guide */}
      <div className="bg-white rounded-3xl p-5 border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.1)] space-y-3">
        <h4 className="text-sm font-bold text-[#10452F] font-telugu flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-[#CCA835]" />
          <span>తల్లిదండ్రులు & ఉపాధ్యాయుల మార్గదర్శి (Teacher & Parent Guide)</span>
        </h4>
        <div className="text-xs text-[#404942] font-telugu leading-relaxed space-y-2">
          <p>
            • <strong>పునాది అక్షరాస్యత & సంఖ్యాజ్ఞానం (FLN):</strong> విద్యార్థులు అక్షరాలను డిజిటల్ పలకపై దిద్దడం ద్వారా చేతిరాత మరియు అక్షర గుర్తింపు మెరుగవుతుంది.
          </p>
          <p>
            • <strong>ధ్వని సహాయం (Audio Assist):</strong> ప్రతి ప్రశ్నకు ఆడియో బటన్ ఉంటుంది. చదవడంలో ఇబ్బంది పడే చిన్న పిల్లలు విని సమాధానం చెప్పవచ్చు.
          </p>
          <p>
            • <strong>స్థానిక ప్రాధాన్యత:</strong> అరకు కాఫీ తోటలు, బొర్రా గుహలు మరియు తూర్పు కనుమల ప్రకృతి ఆధారంగా లెక్కలు మరియు సైన్స్ పాఠాలు రూపొందించబడ్డాయి.
          </p>
        </div>
      </div>
    </div>
  );
};
