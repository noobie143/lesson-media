import React, { useState } from 'react';
import { Sparkles, Play, Lock, CheckCircle, ChevronRight, Compass, GraduationCap, FileCheck } from 'lucide-react';
import { LessonNode, StudentProfile, Subject, TeacherAssignment } from '../types';
import { LESSON_NODES } from '../data/curriculumData';
import { soundEngine, speakText } from '../utils/audio';

interface LearnTabProps {
  profile: StudentProfile;
  customLessons: LessonNode[];
  assignments: TeacherAssignment[];
  onOpenLesson: (node: LessonNode) => void;
  onOpenTeacherPortal: () => void;
  onToggleAssignmentComplete: (asgId: string) => void;
}

export const LearnTab: React.FC<LearnTabProps> = ({
  profile,
  customLessons,
  assignments,
  onOpenLesson,
  onOpenTeacherPortal,
  onToggleAssignmentComplete,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');

  const combinedNodes = [...customLessons, ...LESSON_NODES];

  const filteredNodes = combinedNodes.filter((node) => {
    if (selectedSubject === 'all') return true;
    return node.subject === selectedSubject;
  });

  const subjectPills = [
    { id: 'all', labelTe: 'అన్నీ', labelEn: 'All', icon: '🌈' },
    { id: 'math', labelTe: 'గణితం', labelEn: 'Math', icon: '🔢' },
    { id: 'telugu', labelTe: 'తెలుగు', labelEn: 'Telugu', icon: '🪶' },
    { id: 'evs', labelTe: 'పరిసరాలు', labelEn: 'EVS', icon: '🌿' },
    { id: 'english', labelTe: 'ఆంగ్లం', labelEn: 'English', icon: '🅰️' },
  ];

  // Subject statistics
  const totalCompleted = profile.completedNodeIds.length;
  const progressPercent = Math.min(100, Math.round((totalCompleted / Math.max(1, combinedNodes.length)) * 100));

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Card: Today's Journey */}
      <div className="bg-gradient-to-br from-[#155D3B] to-[#10452F] rounded-3xl p-4 sm:p-5 text-white shadow-[0_6px_0_#002111] border border-[#004428] relative overflow-hidden">
        {/* Subtle decorative background topography */}
        <div className="absolute right-0 bottom-0 opacity-15 text-8xl select-none pointer-events-none translate-x-3 translate-y-3">
          🏫
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[#FFE08A] text-xs font-bold mb-2">
            <Compass className="w-3.5 h-3.5 text-[#F2CB55]" />
            <span>నేటి ప్రయాణం (Today's Quest)</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-telugu leading-tight">
            పాఠశాల ప్రాంగణం నుండి విజ్ఞాన శిఖరానికి!
          </h2>
          <p className="text-xs sm:text-sm text-[#8ED4A9] font-medium mt-1">
            {profile.schoolName} • Primary math, Telugu alphabet & nature science
          </p>

          {/* Progress bar */}
          <div className="mt-4 bg-black/20 rounded-full p-1 border border-white/10">
            <div className="flex items-center justify-between text-[11px] font-bold px-2 mb-1">
              <span>పూర్తయిన మైలురాళ్ళు (Milestones)</span>
              <span>{totalCompleted} / {combinedNodes.length}</span>
            </div>
            <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#F2CB55] h-full rounded-full transition-all duration-500 shadow-inner"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Next Lesson Quick Start */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-[#FFE08A] font-bold">తదుపరి అభ్యాసం: </span>
              <span className="font-semibold text-white">
                {customLessons.length > 0 ? customLessons[0].titleTe : 'బొర్రా రాతి గుహలు'}
              </span>
            </div>
            <button
              onClick={() => {
                soundEngine.playClick();
                const nextNode = combinedNodes.find((n) => !profile.completedNodeIds.includes(n.id)) || combinedNodes[0];
                onOpenLesson(nextNode);
              }}
              className="tactile-btn-gold px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-[0_3px_0_#CCA835] active:translate-y-0.5"
            >
              <Play className="w-3.5 h-3.5 fill-[#4F3E00]" />
              <span>ఆరంభించు</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Filter Chips */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-xs font-bold text-[#707971] uppercase tracking-wider">
            విషయాలు (Subjects):
          </h3>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {subjectPills.map((sub) => {
            const isSelected = selectedSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedSubject(sub.id as Subject | 'all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#155D3B] text-white border-[#10452F] shadow-[0_2px_0_#10452F]'
                    : 'bg-white text-[#404942] border-[#155D3B]/15 hover:bg-[#F2EEE2]'
                }`}
              >
                <span>{sub.icon}</span>
                <span className="font-telugu">{sub.labelTe}</span>
                <span className="opacity-70 text-[10px]">({sub.labelEn})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teacher Assigned Homework & Worksheets Card */}
      {assignments.length > 0 && (
        <div className="bg-[#FFFBEF] rounded-3xl p-4 sm:p-5 border-2 border-[#CCA835]/40 shadow-[0_4px_0_rgba(204,168,53,0.15)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <div>
                <h3 className="text-sm font-bold text-[#10452F] font-telugu leading-tight">
                  ఉపాధ్యాయుల హోంవర్క్ (Teacher's Assignments)
                </h3>
                <p className="text-[11px] text-[#707971]">
                  Complete daily tasks given by your school teacher
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFE08A] text-[#4F3E00] border border-[#CCA835]/40">
              {assignments.filter(a => a.isCompleted).length}/{assignments.length} పూర్తి
            </span>
          </div>

          <div className="space-y-2">
            {assignments.map((asg) => (
              <div
                key={asg.id}
                className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  asg.isCompleted
                    ? 'bg-[#DDF5E8]/60 border-[#155D3B]/30'
                    : 'bg-white border-[#155D3B]/15 shadow-xs'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#10452F] font-telugu">
                      {asg.titleTe}
                    </h4>
                    <span className="text-[10px] font-bold text-[#CCA835] bg-[#FFE08A]/40 px-1.5 py-0.2 rounded-md">
                      +{asg.points}★
                    </span>
                  </div>
                  <p className="text-[11px] text-[#404942] font-telugu mt-0.5">
                    {asg.instructionsTe}
                  </p>
                  <p className="text-[10px] text-[#707971] mt-1">
                    గడువు: {asg.dueDate} • కేటాయించిన వారు: {asg.assignedBy}
                  </p>
                </div>

                <button
                  onClick={() => {
                    soundEngine.playSuccessChime();
                    onToggleAssignmentComplete(asg.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-transform active:scale-95 ${
                    asg.isCompleted
                      ? 'bg-[#155D3B] text-white flex items-center gap-1'
                      : 'border border-[#155D3B] text-[#155D3B] bg-[#DDF5E8] hover:bg-[#DDF5E8]/80'
                  }`}
                >
                  {asg.isCompleted ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>పూర్తయింది</span>
                    </>
                  ) : (
                    <span>పూర్తి చేయండి</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Winding Adventure Trail Map */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#155D3B]/15 shadow-[0_4px_0_rgba(16,69,47,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#10452F] font-telugu">
              సాహస బాట (Adventure Trail)
            </h3>
            <p className="text-xs text-[#707971]">
              Tap an unlocked stop to begin learning
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#DDF5E8] text-[#155D3B]">
            {filteredNodes.length} మైలురాళ్ళు
          </span>
        </div>

        {/* Trail Nodes List with winding visual line */}
        <div className="relative space-y-4">
          {/* Connector Line */}
          <div className="absolute left-6 top-8 bottom-8 w-1 bg-gradient-to-b from-[#155D3B] via-[#287D78] to-[#CCA835] -z-0 rounded-full"></div>

          {filteredNodes.map((node, idx) => {
            const isCompleted = profile.completedNodeIds.includes(node.id);
            const isUnlocked = profile.stars >= node.starsRequired || isCompleted;

            return (
              <div key={node.id} className="relative z-10 flex items-start gap-3">
                {/* Node Status Circle Badge */}
                <button
                  onClick={() => {
                    if (isUnlocked) {
                      soundEngine.playClick();
                      onOpenLesson(node);
                    } else {
                      soundEngine.playErrorBoop();
                    }
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform active:scale-95 shadow-[0_3px_0_rgba(0,0,0,0.15)] ${
                    isCompleted
                      ? 'bg-[#155D3B] border-[#10452F] text-white shadow-[0_3px_0_#10452F]'
                      : isUnlocked
                      ? 'bg-[#FFE08A] border-[#CCA835] text-[#4F3E00] shadow-[0_3px_0_#CCA835] ring-4 ring-[#FFE08A]/40 animate-pulse'
                      : 'bg-[#ECE8DC] border-[#BFC9C0] text-[#707971]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-[#90D5AA]" />
                  ) : isUnlocked ? (
                    <span className="text-xl">{node.icon}</span>
                  ) : (
                    <Lock className="w-5 h-5 text-[#707971]" />
                  )}
                </button>

                {/* Node Content Card */}
                <div
                  onClick={() => {
                    if (isUnlocked) {
                      soundEngine.playClick();
                      onOpenLesson(node);
                    } else {
                      soundEngine.playErrorBoop();
                    }
                  }}
                  className={`flex-1 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-[#DDF5E8]/40 border-[#155D3B]/30 hover:bg-[#DDF5E8]/60 shadow-[0_2px_0_rgba(16,69,47,0.1)]'
                      : isUnlocked
                      ? 'bg-white border-[#155D3B]/30 hover:border-[#155D3B] shadow-[0_4px_0_rgba(16,69,47,0.12)]'
                      : 'bg-[#F7F3E8] border-[#BFC9C0]/50 opacity-70 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    {node.isTeacherUploaded ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#155D3B] text-white shadow-xs">
                        🧑‍🏫 గురువుల పాఠం ({node.uploadedBy})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#155D3B]/20 text-[#155D3B]">
                        మజిలీ {idx + 1} • {node.locationNameTe}
                      </span>
                    )}
                    <span className="text-xs font-bold text-[#745B00] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-[#F2CB55] text-[#CCA835]" />
                      {node.questions.length * 10}★
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#10452F] font-telugu mt-1 leading-snug">
                    {node.titleTe}
                  </h4>
                  <p className="text-xs text-[#404942] font-medium leading-tight">
                    {node.titleEn}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#155D3B]/10 text-xs">
                    <span className="text-[#666666] text-[11px]">
                      {node.questions.length} ప్రశ్నలు • {node.subtitleTe}
                    </span>
                    {isUnlocked ? (
                      <span className="font-bold text-[#155D3B] flex items-center text-[11px] hover:underline">
                        {isCompleted ? 'మళ్ళీ చేయండి' : 'ప్రారంభించండి'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#707971] flex items-center gap-0.5 font-medium">
                        <Lock className="w-3 h-3" /> {node.starsRequired}★ అవసరం
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Teacher Content Upload Callout Banner */}
      <div className="bg-gradient-to-r from-[#DDF5E8] to-[#FFFBEF] p-4 rounded-3xl border border-[#155D3B]/30 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#155D3B] text-white flex items-center justify-center text-xl shrink-0">
            🧑‍🏫
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10452F] font-telugu">
              మీరు తరగతి ఉపాధ్యాయులా? (Are you a Teacher?)
            </h4>
            <p className="text-[11px] text-[#404942]">
              Upload lessons & homework for your MPPS students
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            soundEngine.playClick();
            onOpenTeacherPortal();
          }}
          className="tactile-btn-green px-3.5 py-2 rounded-xl text-xs font-bold font-telugu shrink-0"
        >
          టీచర్ పోర్టల్
        </button>
      </div>
    </div>
  );
};

