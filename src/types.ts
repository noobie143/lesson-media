export type Subject = 'math' | 'telugu' | 'evs' | 'english';

export type LanguageMode = 'bilingual' | 'telugu' | 'english';

export interface QuestionOption {
  id: string;
  textTe: string;
  textEn: string;
  isCorrect: boolean;
  visual?: string; // emoji or math symbol
}

export interface Question {
  id: string;
  subject: Subject;
  classLevel: number; // 1 to 5
  questionTe: string;
  questionEn: string;
  audioPromptTe: string;
  audioPromptEn: string;
  options: QuestionOption[];
  explanationTe: string;
  explanationEn: string;
  hintTe?: string;
  hintEn?: string;
  badgeReward?: string;
  points: number;
}

export type ContentMediaType = 'quiz' | 'youtube' | 'video' | 'image' | 'pdf';

export interface LessonNode {
  id: string;
  subject: Subject;
  titleTe: string;
  titleEn: string;
  subtitleTe: string;
  subtitleEn: string;
  locationNameTe: string;
  locationNameEn: string;
  icon: string;
  starsRequired: number;
  classLevel: number;
  questions: Question[];
  isTeacherUploaded?: boolean;
  uploadedBy?: string;
  uploadedAt?: string;
  mediaType?: ContentMediaType;
  mediaUrl?: string; // YouTube embed, Supabase Storage public URL, Video URL/Base64, Image URL, PDF URL
  storagePath?: string; // Supabase Storage file path in bucket
  mediaTitle?: string;
  mediaDescriptionTe?: string;
  mediaDescriptionEn?: string;
  fileName?: string;
}

export interface Badge {
  id: string;
  titleTe: string;
  titleEn: string;
  descTe: string;
  descEn: string;
  icon: string;
  category: Subject | 'general';
  starsNeeded: number;
  unlockedAt?: string;
}

export interface StudentProfile {
  studentId?: string;
  name: string;
  schoolName: string;
  villageName: string;
  classLevel: number; // 1 to 5
  stars: number;
  streakDays: number;
  lastActiveDate: string;
  completedNodeIds: string[];
  solvedQuestionCount: number;
  audioSpeed: number; // 0.8, 1.0, 1.2
  soundEnabled: boolean;
  languageMode: LanguageMode;
  avatarId: string;
}

export interface TeacherAccount {
  teacherId: string;
  name: string;
  role: string;
  schoolName: string;
  isLoggedIn: boolean;
}

export interface TeacherAssignment {
  id: string;
  titleTe: string;
  titleEn: string;
  instructionsTe: string;
  instructionsEn: string;
  subject: Subject;
  classLevel: number;
  dueDate: string;
  assignedBy: string;
  points: number;
  isCompleted?: boolean;
}

