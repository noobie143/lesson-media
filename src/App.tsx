import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { LearnTab } from './components/LearnTab';
import { PlayTab } from './components/PlayTab';
import { RewardsTab } from './components/RewardsTab';
import { ProfileTab } from './components/ProfileTab';
import { QuizRunnerModal } from './components/QuizRunnerModal';
import { MediaLessonModal } from './components/MediaLessonModal';
import { TeacherPortalModal } from './components/TeacherPortalModal';
import { StudentProfile, LessonNode, TeacherAccount, TeacherAssignment } from './types';
import { INITIAL_PROFILE, INITIAL_TEACHER, INITIAL_ASSIGNMENTS } from './data/curriculumData';
import { soundEngine, stopSpeech, speakText } from './utils/audio';
import {
  getLessonsFromBackend,
  deleteLessonFromBackend,
  saveProgressToBackend,
  getAssignmentsFromBackend,
  getAuthenticatedAdminSession
} from './services/supabaseService';
import { X, Check } from 'lucide-react';

const PROFILE_STORAGE_KEY = 'vidya_nestham_student_profile_v3';
const TEACHER_STORAGE_KEY = 'vidya_nestham_teacher_profile_v3';
const CUSTOM_LESSONS_STORAGE_KEY = 'vidya_nestham_custom_lessons_v3';
const ASSIGNMENTS_STORAGE_KEY = 'vidya_nestham_assignments_v3';

const INITIAL_CUSTOM_LESSONS: LessonNode[] = [
  {
    id: 'teacher-node-yt-demo',
    subject: 'telugu',
    titleTe: 'తెలుగు వర్ణమాల & చిన్న గేయాలు',
    titleEn: 'Telugu Alphabet & Action Rhymes',
    subtitleTe: 'ఉపాధ్యాయులు ప్రచురించిన యూట్యూబ్ పాఠం',
    subtitleEn: 'YouTube video lesson by Teacher',
    locationNameTe: 'ఎం.పి.పి.ఎస్. పాఠశాల',
    locationNameEn: 'MPPS School',
    icon: '▶️',
    starsRequired: 0,
    classLevel: 3,
    questions: [],
    isTeacherUploaded: true,
    uploadedBy: 'ఉపాధ్యాయులు (Teacher)',
    uploadedAt: '2026-10-29',
    mediaType: 'youtube',
    mediaUrl: 'https://www.youtube.com/watch?v=k4x856V3e4E',
    mediaDescriptionTe: 'పిల్లలు, ఈ వీడియో గేయాన్ని శ్రద్ధగా విని అక్షరాలను పలకపై రాయండి!',
  },
  {
    id: 'teacher-node-img-demo',
    subject: 'evs',
    titleTe: 'మొక్కల భాగాలు & ప్రకృతి విజ్ఞానం (చార్ట్)',
    titleEn: 'Parts of a Plant Science Chart',
    subtitleTe: 'సైన్స్ చిత్ర పటం • ఉపాధ్యాయులు',
    subtitleEn: 'Science chart by Teacher',
    locationNameTe: 'ఎం.పి.పి.ఎస్. పాఠశాల',
    locationNameEn: 'MPPS School',
    icon: '🖼️',
    starsRequired: 0,
    classLevel: 3,
    questions: [],
    isTeacherUploaded: true,
    uploadedBy: 'ఉపాధ్యాయులు (Teacher)',
    uploadedAt: '2026-10-29',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    mediaDescriptionTe: 'మొక్కలలోని వేర్లు, కాండం, ఆకులు మరియు పువ్వుల భాగాలను గమనించండి.',
  },
];

export default function App() {
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_PROFILE;
  });

  const [teacher, setTeacher] = useState<TeacherAccount>(() => {
    try {
      const saved = localStorage.getItem(TEACHER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear out old hardcoded ID if present in localStorage
        if (parsed.teacherId === 'VIVEK@1409' || parsed.name === 'వివేక్ గారు (Vivek Sir)') {
          return INITIAL_TEACHER;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_TEACHER;
  });

  const [customLessons, setCustomLessons] = useState<LessonNode[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_LESSONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_CUSTOM_LESSONS;
  });

  const [assignments, setAssignments] = useState<TeacherAssignment[]>(() => {
    try {
      const saved = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_ASSIGNMENTS;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('learn');
  const [activeLessonNode, setActiveLessonNode] = useState<LessonNode | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(teacher));
    } catch {
      // ignore
    }
  }, [teacher]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_LESSONS_STORAGE_KEY, JSON.stringify(customLessons));
    } catch {
      // ignore
    }
  }, [customLessons]);

  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    } catch {
      // ignore
    }
  }, [assignments]);

  // Check active Supabase admin session on mount
  useEffect(() => {
    let isMounted = true;
    getAuthenticatedAdminSession().then((res) => {
      if (!isMounted) return;
      if (res.isAuthenticated && res.user && (res.role === 'admin' || res.role === 'teacher')) {
        setTeacher((prev) => ({
          ...prev,
          teacherId: res.user!.id,
          name: res.name || res.user!.email || 'అడ్మినిస్ట్రేటర్',
          role: res.role === 'admin' ? 'ప్రధానోపాధ్యాయులు (Admin)' : 'ఉపాధ్యాయులు (Teacher)',
          schoolName: res.schoolName || prev.schoolName,
          isLoggedIn: true,
        }));
      } else {
        setTeacher((prev) => {
          if (prev.isLoggedIn) {
            return {
              ...prev,
              teacherId: '',
              name: '',
              role: '',
              isLoggedIn: false,
            };
          }
          return prev;
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch remote lessons & assignments from Supabase on mount and class change
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const remoteLessons = await getLessonsFromBackend(profile.classLevel);
        if (remoteLessons && remoteLessons.length > 0 && isMounted) {
          setCustomLessons((prev) => {
            const merged = [...remoteLessons];
            prev.forEach((p) => {
              if (!merged.some((m) => m.id === p.id)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn('[App] Fetching remote lessons notice:', err);
      }

      try {
        const remoteAsgs = await getAssignmentsFromBackend(profile.classLevel);
        if (remoteAsgs && remoteAsgs.length > 0 && isMounted) {
          setAssignments((prev) => {
            const merged = [...remoteAsgs];
            prev.forEach((p) => {
              if (!merged.some((m) => m.id === p.id)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn('[App] Fetching remote assignments notice:', err);
      }
    }

    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, [profile.classLevel]);

  const updateProfile = (updater: (prev: StudentProfile) => StudentProfile) => {
    setProfile((prev) => updater(prev));
  };

  const handleLessonComplete = (earnedStars: number) => {
    if (!activeLessonNode) return;
    const nodeId = activeLessonNode.id;

    updateProfile((prev) => {
      const isNewCompletion = !prev.completedNodeIds.includes(nodeId);
      const updatedCompleted = isNewCompletion
        ? [...prev.completedNodeIds, nodeId]
        : prev.completedNodeIds;

      return {
        ...prev,
        stars: prev.stars + earnedStars,
        completedNodeIds: updatedCompleted,
        solvedQuestionCount: prev.solvedQuestionCount + (activeLessonNode.questions?.length || 1),
      };
    });

    // Save progress asynchronously to Supabase
    saveProgressToBackend(profile.studentId || 'demo-student', nodeId, earnedStars).catch((err) => {
      console.warn('[App] Save progress notice:', err);
    });
  };

  const handleAddCustomLesson = (newLesson: LessonNode) => {
    setCustomLessons((prev) => [newLesson, ...prev]);
  };

  const handleDeleteCustomLesson = async (lessonId: string, storagePath?: string) => {
    setCustomLessons((prev) => prev.filter((l) => l.id !== lessonId));
    try {
      await deleteLessonFromBackend(lessonId, storagePath);
    } catch (err) {
      console.warn('[App] Error deleting lesson from backend:', err);
    }
  };

  const handleAddAssignment = (newAsg: TeacherAssignment) => {
    setAssignments((prev) => [newAsg, ...prev]);
  };

  const handleToggleAssignmentComplete = (asgId: string) => {
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.id === asgId) {
          const nextState = !asg.isCompleted;
          if (nextState) {
            updateProfile((p) => ({ ...p, stars: p.stars + asg.points }));
          }
          return { ...asg, isCompleted: nextState };
        }
        return asg;
      })
    );
  };

  const handleAwardBonusStars = (bonusStars: number, reason: string) => {
    updateProfile((p) => ({ ...p, stars: p.stars + bonusStars }));
  };

  return (
    <div className="min-h-screen bg-[#FFFBEF] text-[#1C1C15] flex flex-col font-sans">
      {/* Header */}
      <Header
        profile={profile}
        teacher={teacher}
        onUpdateProfile={updateProfile}
        onOpenClassSelector={() => setShowClassModal(true)}
        onOpenTeacherPortal={() => setShowTeacherModal(true)}
      />

      {/* Main Screen Container - Max width 420px mobile-first centered column */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-8">
        {activeTab === 'learn' && (
          <LearnTab
            profile={profile}
            customLessons={customLessons}
            assignments={assignments}
            onOpenLesson={(node) => setActiveLessonNode(node)}
            onOpenTeacherPortal={() => setShowTeacherModal(true)}
            onToggleAssignmentComplete={handleToggleAssignmentComplete}
          />
        )}

        {activeTab === 'play' && <PlayTab />}

        {activeTab === 'rewards' && <RewardsTab profile={profile} />}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            teacher={teacher}
            onUpdateProfile={updateProfile}
            onOpenTeacherPortal={() => setShowTeacherModal(true)}
          />
        )}
      </main>

      {/* Fixed Tactile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Media Lesson Modal (YouTube video, MP4 Video, Image, PDF) */}
      {activeLessonNode && activeLessonNode.mediaType && activeLessonNode.mediaType !== 'quiz' && (
        <MediaLessonModal
          lesson={activeLessonNode}
          languageMode={profile.languageMode}
          audioSpeed={profile.audioSpeed}
          onComplete={handleLessonComplete}
          onClose={() => setActiveLessonNode(null)}
        />
      )}

      {/* Interactive Quiz Runner Modal (for quiz lessons and default question nodes) */}
      {activeLessonNode && (!activeLessonNode.mediaType || activeLessonNode.mediaType === 'quiz') && (
        <QuizRunnerModal
          lessonTitleTe={activeLessonNode.titleTe}
          lessonTitleEn={activeLessonNode.titleEn}
          questions={activeLessonNode.questions}
          languageMode={profile.languageMode}
          audioSpeed={profile.audioSpeed}
          onComplete={handleLessonComplete}
          onClose={() => setActiveLessonNode(null)}
        />
      )}

      {/* Teacher Portal Modal */}
      {showTeacherModal && (
        <TeacherPortalModal
          teacher={teacher}
          profile={profile}
          customLessons={customLessons}
          assignments={assignments}
          onUpdateTeacher={setTeacher}
          onAddCustomLesson={handleAddCustomLesson}
          onDeleteCustomLesson={handleDeleteCustomLesson}
          onAddAssignment={handleAddAssignment}
          onAwardBonusStars={handleAwardBonusStars}
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {/* Class Level Selector Quick Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border-2 border-[#155D3B] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#10452F] font-telugu">
                  తరగతి మార్చుకోండి
                </h3>
                <p className="text-xs text-[#707971]">Select your school grade</p>
              </div>
              <button
                onClick={() => setShowClassModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = profile.classLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      soundEngine.playClick();
                      updateProfile((prev) => ({ ...prev, classLevel: lvl }));
                      speakText(`${lvl}వ తరగతి ఎంపిక చేయబడింది`, 'te-IN');
                      setShowClassModal(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#DDF5E8] border-2 border-[#155D3B] text-[#155D3B] font-bold shadow-[0_3px_0_#155D3B]'
                        : 'bg-white border-gray-200 text-[#1C1C15] hover:bg-[#F7F3E8]'
                    }`}
                  >
                    <div>
                      <span className="font-telugu text-base font-bold">
                        {lvl}వ తరగతి (Class {lvl})
                      </span>
                      <p className="text-xs text-[#707971] font-medium">
                        {lvl <= 2 ? 'పునాది అక్షరాలు & అంకెలు (Foundational)' : 'కూడికలు, పదాలు & సైన్స్ (Primary)'}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-[#155D3B] stroke-[3px]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
