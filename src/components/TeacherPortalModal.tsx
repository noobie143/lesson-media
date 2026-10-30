import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  X,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Award,
  FileText,
  LogOut,
  Youtube,
  Video,
  Image as ImageIcon,
  FileCheck,
  AlertCircle,
  Eye,
  Link as LinkIcon,
  Cloud,
  Loader2,
  Copy,
  Check,
  Database,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  TeacherAccount,
  LessonNode,
  Question,
  Subject,
  TeacherAssignment,
  StudentProfile,
  ContentMediaType
} from '../types';
import { soundEngine, speakText } from '../utils/audio';
import { getYouTubeEmbedUrl, readFileAsDataUrl } from '../utils/media';
import {
  uploadFileToStorage,
  saveLessonToBackend,
  saveAssignmentToBackend,
  signInTeacherSecurely,
  signInAdminWithSupabase,
  signOutAdminFromSupabase,
  getAuthenticatedAdminSession,
  getCurrentSupabaseUser
} from '../services/supabaseService';
import { isSupabaseConfigured, SUPABASE_STORAGE_BUCKET } from '../lib/supabase';

const SUPABASE_QUICK_SETUP_SQL = `-- ==========================================================
-- 1. Create Public Storage Bucket 'lesson-media'
-- ==========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  true,
  52428800,
  array['application/pdf','image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set public = true, file_size_limit = 52428800;

-- 2. Storage Policies (Allow read to public, allow uploads to authenticated & anon)
drop policy if exists "Public Access to lesson-media" on storage.objects;
create policy "Public Access to lesson-media"
  on storage.objects for select using (bucket_id = 'lesson-media');

drop policy if exists "Allow upload to lesson-media" on storage.objects;
create policy "Allow upload to lesson-media"
  on storage.objects for insert to authenticated, anon with check (bucket_id = 'lesson-media');

drop policy if exists "Allow update to lesson-media" on storage.objects;
create policy "Allow update to lesson-media"
  on storage.objects for update to authenticated, anon using (bucket_id = 'lesson-media');

drop policy if exists "Allow delete from lesson-media" on storage.objects;
create policy "Allow delete from lesson-media"
  on storage.objects for delete to authenticated, anon using (bucket_id = 'lesson-media');

-- 3. Lessons Table & Policies
create table if not exists public.lessons (
  id text primary key,
  subject text not null,
  title_te text not null,
  title_en text not null,
  subtitle_te text,
  subtitle_en text,
  location_name_te text default 'ఎం.పి.పి.ఎస్. పాఠశాల',
  location_name_en text default 'MPPS School',
  icon text not null default '📚',
  stars_required integer not null default 0,
  class_level integer not null default 3,
  is_teacher_uploaded boolean not null default false,
  uploaded_by text default 'అడ్మినిస్ట్రేటర్ (Admin)',
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  media_type text default 'quiz',
  media_url text,
  storage_path text,
  media_title text,
  media_description_te text,
  media_description_en text,
  file_name text
);

alter table public.lessons enable row level security;
drop policy if exists "Public read lessons" on public.lessons;
create policy "Public read lessons" on public.lessons for select using (true);
drop policy if exists "Allow write lessons" on public.lessons;
create policy "Allow write lessons" on public.lessons for all to authenticated, anon using (true) with check (true);

-- 4. Questions Table & Policies
create table if not exists public.questions (
  id text primary key,
  lesson_id text references public.lessons(id) on delete cascade not null,
  subject text not null,
  class_level integer not null,
  question_te text not null,
  question_en text not null,
  audio_prompt_te text,
  audio_prompt_en text,
  options jsonb not null default '[]'::jsonb,
  explanation_te text,
  explanation_en text,
  hint_te text,
  hint_en text,
  points integer not null default 15,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.questions enable row level security;
drop policy if exists "Public read questions" on public.questions;
create policy "Public read questions" on public.questions for select using (true);
drop policy if exists "Allow write questions" on public.questions;
create policy "Allow write questions" on public.questions for all to authenticated, anon using (true) with check (true);

-- 5. Assignments Table & Policies
create table if not exists public.assignments (
  id text primary key,
  title_te text not null,
  title_en text not null,
  instructions_te text not null,
  instructions_en text,
  subject text not null,
  class_level integer not null,
  due_date text not null,
  assigned_by text not null default 'అడ్మినిస్ట్రేటర్ (Admin)',
  points integer not null default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assignments enable row level security;
drop policy if exists "Public read assignments" on public.assignments;
create policy "Public read assignments" on public.assignments for select using (true);
drop policy if exists "Allow write assignments" on public.assignments;
create policy "Allow write assignments" on public.assignments for all to authenticated, anon using (true) with check (true);`;

interface TeacherPortalModalProps {
  teacher: TeacherAccount;
  profile: StudentProfile;
  customLessons: LessonNode[];
  assignments: TeacherAssignment[];
  onUpdateTeacher: (teacher: TeacherAccount) => void;
  onAddCustomLesson: (lesson: LessonNode) => void;
  onDeleteCustomLesson: (lessonId: string, storagePath?: string) => void;
  onAddAssignment: (assignment: TeacherAssignment) => void;
  onAwardBonusStars: (stars: number, teacherRemarkTe: string) => void;
  onClose: () => void;
}

export const TeacherPortalModal: React.FC<TeacherPortalModalProps> = ({
  teacher,
  profile,
  customLessons,
  assignments,
  onUpdateTeacher,
  onAddCustomLesson,
  onDeleteCustomLesson,
  onAddAssignment,
  onAwardBonusStars,
  onClose,
}) => {
  // Login form state - Email & Password for Supabase Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{
    uid: string;
    email: string;
    name: string;
    role: 'admin' | 'teacher';
    schoolName?: string;
  } | null>(null);

  // Check for active Supabase session on modal open
  React.useEffect(() => {
    let isMounted = true;
    getAuthenticatedAdminSession().then((res) => {
      if (!isMounted) return;
      if (res.isAuthenticated && res.user && (res.role === 'admin' || res.role === 'teacher')) {
        setAdminProfile({
          uid: res.user.id,
          email: res.user.email || '',
          name: res.name || res.user.email || 'అడ్మినిస్ట్రేటర్',
          role: res.role,
          schoolName: res.schoolName,
        });
        if (!teacher.isLoggedIn) {
          onUpdateTeacher({
            teacherId: res.user.id,
            name: res.name || res.user.email || 'అడ్మినిస్ట్రేటర్',
            role: res.role === 'admin' ? 'ప్రధానోపాధ్యాయులు (Admin)' : 'ఉపాధ్యాయులు (Teacher)',
            schoolName: res.schoolName || profile.schoolName,
            isLoggedIn: true,
          });
        }
      } else {
        // If session is expired or not authenticated, ensure portal is locked
        if (teacher.isLoggedIn) {
          onUpdateTeacher({
            teacherId: '',
            name: '',
            role: '',
            schoolName: profile.schoolName,
            isLoggedIn: false,
          });
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Dashboard active tab
  const [activeTab, setActiveTab] = useState<'upload' | 'homework' | 'manage' | 'students'>('upload');

  // Content Upload Type: YouTube, Video, Image, PDF, or Quiz
  const [mediaType, setMediaType] = useState<ContentMediaType>('youtube');

  // Common Meta
  const [lessonTitleTe, setLessonTitleTe] = useState('');
  const [lessonTitleEn, setLessonTitleEn] = useState('');
  const [lessonSubject, setLessonSubject] = useState<Subject>('telugu');
  const [lessonClass, setLessonClass] = useState<number>(profile.classLevel || 3);
  const [teacherInstructionsTe, setTeacherInstructionsTe] = useState('');

  // Media Specific States & File object for Supabase Storage
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Custom Quiz question builder state
  const [qTextTe, setQTextTe] = useState('');
  const [qTextEn, setQTextEn] = useState('');
  const [opt1Te, setOpt1Te] = useState('');
  const [opt2Te, setOpt2Te] = useState('');
  const [opt3Te, setOpt3Te] = useState('');
  const [opt4Te, setOpt4Te] = useState('');
  const [correctOptIdx, setCorrectOptIdx] = useState<number>(0);
  const [qExplanationTe, setQExplanationTe] = useState('');

  // Homework state
  const [hwTitleTe, setHwTitleTe] = useState('');
  const [hwSubject, setHwSubject] = useState<Subject>('math');
  const [hwDueDate, setHwDueDate] = useState('రేపు ఉదయం 9:00');
  const [hwInstructionsTe, setHwInstructionsTe] = useState('');
  const [hwPoints, setHwPoints] = useState<number>(20);

  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [storageNotice, setStorageNotice] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleCopySql = () => {
    soundEngine.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SUPABASE_QUICK_SETUP_SQL).then(() => {
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 3000);
      });
    }
  };

  // Administrator Authentication via Supabase Auth & public.profiles role verification
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      soundEngine.playErrorBoop();
      setLoginError('దయచేసి మీ అడ్మిన్ ఈమెయిల్ మరియు పాస్‌వర్డ్ నమోదు చేయండి (Please enter email & password).');
      setIsLoggingIn(false);
      return;
    }

    const authRes = await signInTeacherSecurely(cleanEmail, cleanPassword);
    setIsLoggingIn(false);

    if (authRes.success && authRes.user && authRes.role) {
      soundEngine.playSuccessChime();
      setAdminProfile({
        uid: authRes.user.id,
        email: authRes.user.email || cleanEmail,
        name: authRes.name || cleanEmail,
        role: authRes.role,
        schoolName: authRes.schoolName,
      });
      onUpdateTeacher({
        teacherId: authRes.user.id,
        name: authRes.name || cleanEmail,
        role: authRes.role === 'admin' ? 'ప్రధానోపాధ్యాయులు (Admin)' : 'ఉపాధ్యాయులు (Teacher)',
        schoolName: authRes.schoolName || profile.schoolName,
        isLoggedIn: true,
      });
      speakText(`నమస్కారం ${authRes.name || 'గురువులు'}, ఉపాధ్యాయుల వేదికకు స్వాగతం.`, 'te-IN');
    } else {
      soundEngine.playErrorBoop();
      setLoginError(authRes.error || 'లాగిన్ విఫలమైంది. దయచేసి వివరాలు సరిచూసుకోండి.');
    }
  };

  const handleLogout = async () => {
    soundEngine.playClick();
    await signOutAdminFromSupabase();
    setAdminProfile(null);
    setEmail('');
    setPassword('');
    onUpdateTeacher({
      teacherId: '',
      name: '',
      role: '',
      schoolName: profile.schoolName,
      isLoggedIn: false,
    });
    speakText('లాగౌట్ పూర్తయింది.', 'te-IN');
  };

  // File Upload Handlers (for Image, Video, PDF)
  // Stores raw File for direct Supabase Storage upload, and reads preview
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEngine.playClick();
    setSelectedFile(file);
    setUploadedFileName(file.name);
    setFormErrorMessage('');

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setMediaUrl(dataUrl);
      if (!lessonTitleTe) {
        setLessonTitleTe(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch {
      // preview error non-blocking
    }
  };

  // Sample Prefill for YouTube
  const handlePrefillYouTube = () => {
    soundEngine.playClick();
    setMediaType('youtube');
    setLessonTitleTe('తెలుగు అక్షరమాల & చిన్న పాటల వీడియో');
    setLessonTitleEn('Telugu Alphabet & Action Rhymes for Primary School');
    setLessonSubject('telugu');
    setYoutubeUrl('https://www.youtube.com/watch?v=k4x856V3e4E');
    setTeacherInstructionsTe('పిల్లలు, ఈ వీడియోను శ్రద్ధగా విని, అక్షరాలను పలకపై రాయండి!');
  };

  // Sample Prefill for Image
  const handlePrefillImage = () => {
    soundEngine.playClick();
    setMediaType('image');
    setLessonTitleTe('మొక్కల భాగాలు & వాటి విధులు (చార్ట్)');
    setLessonTitleEn('Parts of a Plant Science Chart');
    setLessonSubject('evs');
    setMediaUrl('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80');
    setUploadedFileName('parts_of_plant_chart.jpg');
    setTeacherInstructionsTe('ఈ చార్ట్ లోని వేరు, కాండం, ఆకులు మరియు పూలను పరిశీలించండి.');
  };

  // Sample Prefill for PDF
  const handlePrefillPdf = () => {
    soundEngine.playClick();
    setMediaType('pdf');
    setLessonTitleTe('గణిత గుణింతాల సాధన పత్రం (వర్క్‌షీట్)');
    setLessonTitleEn('Primary Math Worksheet');
    setLessonSubject('math');
    setMediaUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    setUploadedFileName('guninthalu_worksheet.pdf');
    setTeacherInstructionsTe('ఈ పిడిఎఫ్ లోని లెక్కలను చూసి మీ నోట్‌బుక్ లో చేయండి.');
  };

  // Sample Prefill for Quiz
  const handlePrefillQuiz = () => {
    soundEngine.playClick();
    setMediaType('quiz');
    setLessonTitleTe('అరకు పరిసరాల విజ్ఞానం - నదులు & కొండలు');
    setLessonTitleEn('Eastern Ghats Environment & Rivers');
    setLessonSubject('evs');
    setQTextTe('గోస్తని నది ప్రవహించే ప్రసిద్ధ సహజ గుహలు ఏవి?');
    setQTextEn('Which famous natural caves does the Gosthani river flow through?');
    setOpt1Te('బొర్రా గుహలు (Borra Caves)');
    setOpt2Te('బెలుం గుహలు (Belum Caves)');
    setOpt3Te('ఉండవల్లి గుహలు (Undavalli Caves)');
    setOpt4Te('మొగల్‌రాజపురం గుహలు (Mogalarajapuram)');
    setCorrectOptIdx(0);
    setQExplanationTe('బొర్రా గుహల గుండా గోస్తని నది ప్రవహిస్తుంది.');
    setTeacherInstructionsTe('క్విజ్ పూర్తి చేసి నక్షత్రాలు పొందండి.');
  };

  // Publish New Content to Supabase Storage & Database
  const handlePublishContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage('');
    setFormSuccessMessage('');

    if (!lessonTitleTe.trim()) {
      setFormErrorMessage('దయచేసి పాఠం శీర్షికను నమోదు చేయండి (Please enter lesson title).');
      return;
    }

    let finalMediaUrl = mediaUrl;
    let storagePath: string | undefined = undefined;
    let questionsList: Question[] = [];
    let isLocalFallback = false;
    let uploadWarning = '';

    if (mediaType === 'youtube') {
      if (!youtubeUrl.trim()) {
        setFormErrorMessage('దయచేసి యూట్యూబ్ లింక్ నమోదు చేయండి (Please enter YouTube URL).');
        return;
      }
      finalMediaUrl = youtubeUrl.trim();
    } else if (mediaType === 'quiz') {
      if (!qTextTe.trim() || !opt1Te.trim() || !opt2Te.trim()) {
        setFormErrorMessage('దయచేసి ప్రశ్న మరియు కనీసం రెండు సమాధానాలను నమోదు చేయండి (Please enter quiz question and at least 2 options).');
        return;
      }
      questionsList = [
        {
          id: `custom-q-${Date.now()}`,
          subject: lessonSubject,
          classLevel: lessonClass,
          questionTe: qTextTe,
          questionEn: qTextEn || qTextTe,
          audioPromptTe: `${qTextTe} సరైన సమాధానం ఎంచుకోండి.`,
          audioPromptEn: qTextEn || qTextTe,
          options: [
            { id: 'opt-1', textTe: opt1Te, textEn: opt1Te, isCorrect: correctOptIdx === 0, visual: '🌱' },
            { id: 'opt-2', textTe: opt2Te, textEn: opt2Te, isCorrect: correctOptIdx === 1, visual: '🍃' },
            ...(opt3Te ? [{ id: 'opt-3', textTe: opt3Te, textEn: opt3Te, isCorrect: correctOptIdx === 2, visual: '🌿' }] : []),
            ...(opt4Te ? [{ id: 'opt-4', textTe: opt4Te, textEn: opt4Te, isCorrect: correctOptIdx === 3, visual: '🍂' }] : []),
          ],
          explanationTe: qExplanationTe || 'సరియైన సమాధానం!',
          explanationEn: 'Correct answer!',
          points: 15,
        },
      ];
    } else if (mediaType === 'pdf' || mediaType === 'image' || mediaType === 'video') {
      // 1. If a physical file was selected, upload directly to Supabase Storage bucket 'lesson-media'
      if (selectedFile) {
        setIsUploadingFile(true);
        setUploadProgressText(`"${selectedFile.name}" సుపాబేస్ స్టోరేజ్ (${SUPABASE_STORAGE_BUCKET}) లోనికి అప్‌లోడ్ అవుతోంది...`);

        try {
          const uploadRes = await uploadFileToStorage(selectedFile, 'lessons');
          setIsUploadingFile(false);
          setUploadProgressText('');

          if (!uploadRes.success || !uploadRes.publicUrl) {
            soundEngine.playErrorBoop();
            setFormErrorMessage(`సుపాబేస్ స్టోరేజ్ అప్‌లోడ్ విఫలమైంది: ${uploadRes.error || 'ఫైల్ అప్‌లోడ్ కాలేదు.'}`);
            return;
          }

          finalMediaUrl = uploadRes.publicUrl;
          storagePath = uploadRes.storagePath;
        } catch (uploadErr: unknown) {
          setIsUploadingFile(false);
          setUploadProgressText('');
          const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          soundEngine.playErrorBoop();
          setFormErrorMessage(`ఫైల్ అప్‌లోడ్ లోపం: ${msg}`);
          return;
        }
      } else if (!finalMediaUrl.trim()) {
        setFormErrorMessage('దయచేసి ఫైల్ ఎంచుకోండి లేదా మీడియా URL నమోదు చేయండి (Please choose a file or URL).');
        return;
      }
    }

    const iconMap: Record<ContentMediaType, string> = {
      youtube: '▶️',
      video: '🎥',
      image: '🖼️',
      pdf: '📄',
      quiz: '📝',
    };

    // 0. Verify active authenticated admin session before proceeding
    const sessionCheck = await getAuthenticatedAdminSession();
    if (!sessionCheck.isAuthenticated || !sessionCheck.user) {
      soundEngine.playErrorBoop();
      setFormErrorMessage('మీ అడ్మిన్ లాగిన్ సెషన్ గడువు ముగిసింది లేదా చెల్లదు. దయచేసి మళ్ళీ లాగిన్ అవ్వండి.');
      await handleLogout();
      return;
    }

    const currentAdminName = adminProfile?.name || teacher.name || sessionCheck.user.email || 'అడ్మినిస్ట్రేటర్';

    const newLesson: LessonNode = {
      id: `lesson-${Date.now()}`,
      subject: lessonSubject,
      titleTe: lessonTitleTe,
      titleEn: lessonTitleEn || lessonTitleTe,
      subtitleTe: teacherInstructionsTe || `${currentAdminName} ప్రచురించిన పాఠం`,
      subtitleEn: `Uploaded by ${currentAdminName}`,
      locationNameTe: profile.schoolName,
      locationNameEn: profile.schoolName,
      icon: iconMap[mediaType] || '📚',
      starsRequired: 0,
      classLevel: lessonClass,
      questions: questionsList,
      isTeacherUploaded: true,
      uploadedBy: currentAdminName,
      uploadedAt: new Date().toLocaleDateString('te-IN'),
      mediaType: mediaType,
      mediaUrl: finalMediaUrl,
      storagePath: storagePath,
      mediaDescriptionTe: teacherInstructionsTe,
      fileName: uploadedFileName || selectedFile?.name,
    };

    // 2. Save metadata to Supabase 'lessons' table (and 'questions' if quiz)
    setUploadProgressText('పాఠం సమాచారం సుపాబేస్ డేటాబేస్ లో సేవ్ చేయబడుతోంది...');
    const dbRes = await saveLessonToBackend(newLesson);
    setUploadProgressText('');

    if (!dbRes.success) {
      soundEngine.playErrorBoop();
      setFormErrorMessage(`సుపాబేస్ డేటాబేస్ లోపం: ${dbRes.error || 'పాఠం సేవ్ కాలేదు.'}`);
      return;
    }

    // Both Storage and Database succeeded!
    onAddCustomLesson(newLesson);
    setFormSuccessMessage(
      mediaType === 'pdf'
        ? `📄 PDF వర్క్‌షీట్ సుపాబేస్ స్టోరేజ్ (${SUPABASE_STORAGE_BUCKET}) మరియు డేటాబేస్‌లో విజయవంతంగా ప్రచురించబడింది!`
        : `"${lessonTitleTe}" పాఠం సుపాబేస్ లో విజయవంతంగా ప్రచురించబడింది! విద్యార్థుల అభ్యాస బాటలో చేరింది.`
    );
    setStorageNotice('');

    soundEngine.playSuccessChime();
    soundEngine.playStarDing();

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#155D3B', '#F2CB55', '#287D78'],
      });
    } catch {
      // ignore
    }

    speakText('పాఠం విజయవంతంగా ప్రచురించబడింది.', 'te-IN');

    // Reset fields
    setLessonTitleTe('');
    setLessonTitleEn('');
    setYoutubeUrl('');
    setMediaUrl('');
    setSelectedFile(null);
    setUploadedFileName('');
    setTeacherInstructionsTe('');
    setQTextTe('');
    setOpt1Te('');
    setOpt2Te('');
    setOpt3Te('');
    setOpt4Te('');

    setTimeout(() => setFormSuccessMessage(''), 6000);
  };

  // Publish Homework
  const handlePublishHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage('');
    setFormSuccessMessage('');
    if (!hwTitleTe.trim()) {
      setFormErrorMessage('దయచేసి హోంవర్క్ శీర్షికను నమోదు చేయండి.');
      return;
    }

    const sessionCheck = await getAuthenticatedAdminSession();
    if (!sessionCheck.isAuthenticated || !sessionCheck.user) {
      soundEngine.playErrorBoop();
      setFormErrorMessage('మీ అడ్మిన్ లాగిన్ సెషన్ గడువు ముగిసింది. దయచేసి మళ్ళీ లాగిన్ అవ్వండి.');
      await handleLogout();
      return;
    }

    const currentAdminName = adminProfile?.name || teacher.name || 'అడ్మినిస్ట్రేటర్';

    const newAsg: TeacherAssignment = {
      id: `asg-${Date.now()}`,
      titleTe: hwTitleTe,
      titleEn: hwTitleTe,
      instructionsTe: hwInstructionsTe || 'తరగతి పాఠ్యపుస్తకం ఆధారంగా పూర్తి చేయండి.',
      instructionsEn: 'Complete as guided in class.',
      subject: hwSubject,
      classLevel: profile.classLevel,
      dueDate: hwDueDate,
      assignedBy: currentAdminName,
      points: hwPoints,
      isCompleted: false,
    };

    const asgRes = await saveAssignmentToBackend(newAsg);
    if (!asgRes.success) {
      soundEngine.playErrorBoop();
      setFormErrorMessage(`సుపాబేస్ హోంవర్క్ సేవ్ లోపం: ${asgRes.error || 'సేవ్ కాలేదు.'}`);
      return;
    }

    onAddAssignment(newAsg);
    soundEngine.playSuccessChime();
    setFormSuccessMessage('హోంవర్క్ వర్క్‌షీట్ Supabase లో విజయవంతంగా సేవ్ చేయబడింది!');
    setHwTitleTe('');
    setHwInstructionsTe('');

    setTimeout(() => setFormSuccessMessage(''), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#FFFBEF] rounded-3xl border-2 border-[#155D3B] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-[#155D3B] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#10452F]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl">
              🧑‍🏫
            </div>
            <div>
              <h2 className="text-base font-bold font-telugu leading-tight">
                ఉపాధ్యాయుల వేదిక (Teacher Portal)
              </h2>
              <p className="text-[11px] text-[#8ED4A9] leading-none">
                {teacher.isLoggedIn ? (adminProfile?.name || teacher.name || 'అడ్మినిస్ట్రేటర్') : 'సుపాబేస్ అడ్మిన్ లాగిన్'} • {adminProfile?.schoolName || teacher.schoolName || profile.schoolName}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {formSuccessMessage && (
          <div className="bg-[#DDF5E8] border-b border-[#155D3B]/20 px-4 py-2.5 text-xs font-bold text-[#155D3B] flex items-center gap-2 font-telugu animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#155D3B] shrink-0" />
            <span>{formSuccessMessage}</span>
          </div>
        )}

        {/* Error Alert Banner with Real Supabase Error */}
        {formErrorMessage && (
          <div className="bg-[#FFDAD6] border-b border-[#BA1A1A]/30 px-4 py-2.5 text-xs font-bold text-[#93000A] flex items-start gap-2 font-telugu animate-in slide-in-from-top duration-200">
            <AlertCircle className="w-4 h-4 text-[#BA1A1A] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{formErrorMessage}</span>
            </div>
            <button
              onClick={() => setFormErrorMessage('')}
              className="text-[#BA1A1A] hover:bg-black/5 rounded p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Informational Storage/Cloud Notice Banner */}
        {storageNotice && (
          <div className="bg-[#FFF4E5] border-b border-[#F59E0B]/30 px-4 py-2.5 text-xs text-[#92400E] flex items-start gap-2 font-telugu animate-in slide-in-from-top duration-200">
            <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block leading-snug">{storageNotice}</span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowSetupGuide(true);
                }}
                className="text-[11px] text-[#155D3B] font-bold underline mt-1 inline-flex items-center gap-1 hover:text-[#0F3F28]"
              >
                <span>🛠️ సుపాబేస్ స్టోరేజ్ సెటప్ గైడ్ & 1-క్లిక్ SQL చూడండి</span>
              </button>
            </div>
            <button
              onClick={() => setStorageNotice('')}
              className="text-[#92400E] hover:bg-black/5 rounded p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Upload Progress Banner */}
        {isUploadingFile && uploadProgressText && (
          <div className="bg-[#E0F2FE] border-b border-[#0284C7]/20 px-4 py-2 text-xs font-bold text-[#0369A1] flex items-center gap-2 font-telugu animate-pulse">
            <Loader2 className="w-4 h-4 text-[#0284C7] shrink-0 animate-spin" />
            <span>{uploadProgressText}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!teacher.isLoggedIn ? (
            /* ================= DEDICATED TEACHER LOGIN WITH SECURE SUPABASE AUTH ================= */
            <div className="space-y-4 max-w-sm mx-auto py-4">
              <div className="text-center space-y-1">
                <div className="w-16 h-16 rounded-3xl bg-[#DDF5E8] border-2 border-[#155D3B] text-3xl flex items-center justify-center mx-auto shadow-[0_4px_0_#155D3B]">
                  🧑‍🏫
                </div>
                <h3 className="text-xl font-bold text-[#10452F] font-telugu mt-2">
                  ఉపాధ్యాయుల లాగిన్ (Teacher Login)
                </h3>
                <p className="text-xs text-[#707971]">
                  Sign in to Teacher Portal using your registered credentials
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-[#FFDAD6] border border-[#BA1A1A] rounded-xl text-xs text-[#93000A] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5 bg-white p-5 rounded-3xl border border-[#155D3B]/20 shadow-sm">
                <div>
                  <label className="text-xs font-bold text-[#10452F] block mb-1">
                    ఉపాధ్యాయుల ఈమెయిల్ (Teacher Email):
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:border-[#155D3B] outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    నమోదైన ఉపాధ్యాయుల అధికారిక ఈమెయిల్
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#10452F] block mb-1">
                    పాస్‌వర్డ్ (Password):
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-[#155D3B] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-2xl tactile-btn-green font-bold text-sm font-telugu flex items-center justify-center gap-1.5 mt-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ధృవీకరిస్తోంది (Verifying Role)...</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      <span>లాగిన్ అవ్వండి (Login to Teacher Portal)</span>
                    </>
                  )}
                </button>
              </form>

              <div className="bg-[#FFF4E5] p-3 rounded-2xl border border-[#F59E0B]/30 text-[11px] text-[#92400E] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                  <span>సురక్షిత సర్వర్ ధృవీకరణ & Supabase Auth సెషన్</span>
                </div>
                <p className="leading-snug">
                  ఈమెయిల్ మరియు పాస్‌వర్డ్ సర్వర్-సైడ్ సెక్రెట్స్ ద్వారా ధృవీకరించబడి, నిజమైన Supabase Auth సెషన్ ప్రారంభించబడుతుంది. దీని ద్వారా స్టోరేజ్ అప్‌లోడ్లు, పాఠాలు మరియు అసైన్‌మెంట్లు భద్రంగా నిర్వహించబడతాయి.
                </p>
              </div>
            </div>
          ) : (
            /* ================= LOGGED IN TEACHER DASHBOARD ================= */
            <div className="space-y-4">
              {/* Teacher Info Card with Logout */}
              <div className="bg-white p-4 rounded-2xl border border-[#155D3B]/20 shadow-[0_3px_0_rgba(16,69,47,0.08)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#DDF5E8] border border-[#155D3B]/30 flex items-center justify-center text-2xl">
                    👨‍🏫
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#10452F] font-telugu">
                        {adminProfile?.name || teacher.name || 'అడ్మినిస్ట్రేటర్'}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#155D3B] text-white">
                        {adminProfile?.role === 'admin' ? 'ప్రధానోపాధ్యాయులు (Admin)' : 'ఉపాధ్యాయులు (Teacher)'}
                      </span>
                    </div>
                    <p className="text-xs text-[#707971]">
                      🏫 {adminProfile?.schoolName || profile.schoolName} {adminProfile?.email ? `• ${adminProfile.email}` : ''}
                    </p>
                    {adminProfile?.uid && (
                      <p className="text-[10px] text-gray-400 font-mono">
                        UID: {adminProfile.uid.slice(0, 8)}...{adminProfile.uid.slice(-4)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setShowSetupGuide(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#BAE6FD] active:translate-y-0.5"
                    title="Supabase Storage & DB Setup Guide"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span className="font-telugu text-[11px] hidden sm:inline">క్లౌడ్ సెటప్</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-[#BA1A1A] hover:bg-[#FFDAD6] transition-colors"
                    title="లాగౌట్ (Logout)"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs for Teacher Features */}
              <div className="grid grid-cols-4 gap-1.5 bg-[#E6E2D7] p-1.5 rounded-2xl">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('upload');
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'upload'
                      ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
                      : 'text-[#404942] hover:bg-white/60'
                  }`}
                >
                  <span className="font-telugu block">అప్‌లోడ్</span>
                  <span className="text-[10px] opacity-80">(Content)</span>
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('homework');
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'homework'
                      ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
                      : 'text-[#404942] hover:bg-white/60'
                  }`}
                >
                  <span className="font-telugu block">హోంవర్క్</span>
                  <span className="text-[10px] opacity-80">({assignments.length})</span>
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('manage');
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'manage'
                      ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
                      : 'text-[#404942] hover:bg-white/60'
                  }`}
                >
                  <span className="font-telugu block">నిర్వహణ</span>
                  <span className="text-[10px] opacity-80">({customLessons.length})</span>
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('students');
                  }}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'students'
                      ? 'bg-[#155D3B] text-white shadow-[0_2px_0_#10452F]'
                      : 'text-[#404942] hover:bg-white/60'
                  }`}
                >
                  <span className="font-telugu block">నక్షత్రాలు</span>
                  <span className="text-[10px] opacity-80">(Reward)</span>
                </button>
              </div>

              {/* ================= TAB 1: MULTI-FORMAT CONTENT UPLOADER ================= */}
              {activeTab === 'upload' && (
                <div className="bg-white p-5 rounded-3xl border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.08)] space-y-4">
                  {/* Select Upload Content Type */}
                  <div>
                    <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1.5">
                      అంశం రకాన్ని ఎంచుకోండి (Select Content Type to Upload):
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { type: 'youtube' as ContentMediaType, label: 'యూట్యూబ్', sub: 'YouTube', icon: '▶️' },
                        { type: 'image' as ContentMediaType, label: 'చిత్రం', sub: 'Image', icon: '🖼️' },
                        { type: 'pdf' as ContentMediaType, label: 'పిడిఎఫ్', sub: 'PDF', icon: '📄' },
                        { type: 'video' as ContentMediaType, label: 'వీడియో', sub: 'Video', icon: '🎥' },
                        { type: 'quiz' as ContentMediaType, label: 'క్విజ్', sub: 'Quiz', icon: '📝' },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setMediaType(item.type);
                          }}
                          className={`py-2 px-1 text-center rounded-xl border transition-all ${
                            mediaType === item.type
                              ? 'bg-[#155D3B] text-white border-[#10452F] shadow-[0_2px_0_#10452F] font-bold'
                              : 'bg-[#FFFBEF] border-gray-200 text-[#404942] hover:bg-[#F2EEE2]'
                          }`}
                        >
                          <span className="text-base block leading-none mb-0.5">{item.icon}</span>
                          <span className="text-[11px] font-telugu block leading-tight">{item.label}</span>
                          <span className="text-[9px] opacity-70 block">{item.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sample auto-fill buttons */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] font-bold text-[#707971]">త్వరిత నమూనా (Quick Sample):</span>
                    {mediaType === 'youtube' && (
                      <button
                        type="button"
                        onClick={handlePrefillYouTube}
                        className="text-[11px] text-[#155D3B] font-bold underline"
                      >
                        + నమూనా యూట్యూబ్ లింక్ నింపండి
                      </button>
                    )}
                    {mediaType === 'image' && (
                      <button
                        type="button"
                        onClick={handlePrefillImage}
                        className="text-[11px] text-[#155D3B] font-bold underline"
                      >
                        + నమూనా సైన్స్ చార్ట్ నింపండి
                      </button>
                    )}
                    {mediaType === 'pdf' && (
                      <button
                        type="button"
                        onClick={handlePrefillPdf}
                        className="text-[11px] text-[#155D3B] font-bold underline"
                      >
                        + నమూనా పిడిఎఫ్ లింక్ నింపండి
                      </button>
                    )}
                    {mediaType === 'quiz' && (
                      <button
                        type="button"
                        onClick={handlePrefillQuiz}
                        className="text-[11px] text-[#155D3B] font-bold underline"
                      >
                        + నమూనా క్విజ్ ప్రశ్న నింపండి
                      </button>
                    )}
                  </div>

                  <form onSubmit={handlePublishContent} className="space-y-3.5">
                    {/* Class & Subject */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                          తరగతి (Class):
                        </label>
                        <select
                          value={lessonClass}
                          onChange={(e) => setLessonClass(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold font-telugu bg-white"
                        >
                          <option value={1}>1వ తరగతి (Class 1)</option>
                          <option value={2}>2వ తరగతి (Class 2)</option>
                          <option value={3}>3వ తరగతి (Class 3)</option>
                          <option value={4}>4వ తరగతి (Class 4)</option>
                          <option value={5}>5వ తరగతి (Class 5)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                          విషయం (Subject):
                        </label>
                        <select
                          value={lessonSubject}
                          onChange={(e) => setLessonSubject(e.target.value as Subject)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold font-telugu bg-white"
                        >
                          <option value="telugu">తెలుగు (Telugu)</option>
                          <option value="math">గణితం (Mathematics)</option>
                          <option value="evs">పరిసరాల విజ్ఞానం (EVS)</option>
                          <option value="english">ఆంగ్లం (English)</option>
                        </select>
                      </div>
                    </div>

                    {/* Lesson Title */}
                    <div>
                      <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                        పాఠం శీర్షిక (Lesson Title in Telugu):
                      </label>
                      <input
                        type="text"
                        value={lessonTitleTe}
                        onChange={(e) => setLessonTitleTe(e.target.value)}
                        required
                        placeholder="ఉదా: తెలుగు అక్షరమాల & చిన్న పాటలు"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-telugu focus:border-[#155D3B] outline-none"
                      />
                    </div>

                    {/* 1. YOUTUBE VIDEO LINK INPUT & DIRECT PREVIEW */}
                    {mediaType === 'youtube' && (
                      <div className="space-y-2 p-3 bg-red-50 rounded-2xl border border-red-200">
                        <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                          <Youtube className="w-4 h-4 text-red-600" />
                          <span>యూట్యూబ్ వీడియో లింక్ (YouTube Video URL):</span>
                        </label>
                        <input
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... లేదా https://youtu.be/..."
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white outline-none"
                        />

                        {/* Live YouTube Embed Preview */}
                        {youtubeUrl && getYouTubeEmbedUrl(youtubeUrl) && (
                          <div className="mt-2 rounded-xl overflow-hidden aspect-video border shadow-sm">
                            <iframe
                              src={getYouTubeEmbedUrl(youtubeUrl)!}
                              title="YouTube Preview"
                              className="w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        )}
                        <p className="text-[10px] text-red-700">
                          విద్యార్థులు ఈ వీడియోను యాప్ లోనే నేరుగా చూడగలరు.
                        </p>
                      </div>
                    )}

                    {/* 2. IMAGE UPLOAD & PREVIEW */}
                    {mediaType === 'image' && (
                      <div className="space-y-2 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                        <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-blue-600" />
                          <span>చిత్రం ఫైల్ ఎంచుకోండి లేదా లింక్ ఇవ్వండి (Image File / URL):</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#155D3B] file:text-white"
                        />
                        <input
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="లేదా ఇమేజ్ URL ఇక్కడ పేస్ట్ చేయండి"
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs bg-white outline-none"
                        />
                        {mediaUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border p-1 bg-white text-center">
                            <img src={mediaUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. PDF UPLOAD & PREVIEW */}
                    {mediaType === 'pdf' && (
                      <div className="space-y-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                        <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <span>పిడిఎఫ్ వర్క్‌షీట్ ఫైల్ (PDF Document):</span>
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileUpload}
                          className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#155D3B] file:text-white"
                        />
                        <input
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="లేదా PDF URL ఇక్కడ పేస్ట్ చేయండి"
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs bg-white outline-none"
                        />
                        {uploadedFileName && (
                          <p className="text-xs font-bold text-amber-800">
                            ఎంచుకున్న ఫైల్: 📄 {uploadedFileName}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 4. VIDEO FILE UPLOAD */}
                    {mediaType === 'video' && (
                      <div className="space-y-2 p-3 bg-purple-50 rounded-2xl border border-purple-200">
                        <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-purple-600" />
                          <span>వీడియో ఫైల్ (MP4 Video File / URL):</span>
                        </label>
                        <input
                          type="file"
                          accept="video/mp4,video/*"
                          onChange={handleFileUpload}
                          className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#155D3B] file:text-white"
                        />
                        <input
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="లేదా డైరెక్ట్ MP4 వీడియో URL ఇక్కడ ఇవ్వండి"
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs bg-white outline-none"
                        />
                        {mediaUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden aspect-video border bg-black">
                            <video src={mediaUrl} controls className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. CUSTOM QUIZ BUILDER */}
                    {mediaType === 'quiz' && (
                      <div className="pt-2 border-t border-[#155D3B]/10 space-y-3">
                        <label className="text-xs font-bold text-[#155D3B] font-telugu block">
                          క్విజ్ ప్రశ్న (Interactive Question):
                        </label>
                        <textarea
                          value={qTextTe}
                          onChange={(e) => setQTextTe(e.target.value)}
                          rows={2}
                          placeholder="ప్రశ్నను తెలుగులో నమోదు చేయండి..."
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-telugu outline-none resize-none"
                        />

                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-[#404942] block">
                            సమాధాన ఎంపికలు (సరియైన సమాధానానికి రేడియో బటన్ క్లిక్ చేయండి):
                          </span>
                          {[
                            { val: opt1Te, set: setOpt1Te, idx: 0, label: 'A' },
                            { val: opt2Te, set: setOpt2Te, idx: 1, label: 'B' },
                            { val: opt3Te, set: setOpt3Te, idx: 2, label: 'C' },
                            { val: opt4Te, set: setOpt4Te, idx: 3, label: 'D' },
                          ].map((opt) => (
                            <div key={opt.idx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correctOpt"
                                checked={correctOptIdx === opt.idx}
                                onChange={() => setCorrectOptIdx(opt.idx)}
                                className="w-4 h-4 text-[#155D3B] accent-[#155D3B] cursor-pointer"
                              />
                              <span className="w-5 text-xs font-bold text-[#707971]">{opt.label}.</span>
                              <input
                                type="text"
                                value={opt.val}
                                onChange={(e) => opt.set(e.target.value)}
                                placeholder={`ఎంపిక ${opt.label}...`}
                                className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-telugu outline-none ${
                                  correctOptIdx === opt.idx ? 'border-[#155D3B] bg-[#DDF5E8]/40 font-bold' : 'border-gray-200'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teacher's Voice Instruction Note */}
                    <div>
                      <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                        ఉపాధ్యాయుల సందేశం / సూచనలు (Teacher's Instruction Note):
                      </label>
                      <input
                        type="text"
                        value={teacherInstructionsTe}
                        onChange={(e) => setTeacherInstructionsTe(e.target.value)}
                        placeholder="ఉదా: పిల్లలు, ఈ పాఠాన్ని చూసి పలకపై ముఖ్యమైన పదాలు రాయండి."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-telugu outline-none"
                      />
                    </div>

                    {/* Publish Button */}
                    <button
                      type="submit"
                      disabled={isUploadingFile}
                      className="w-full py-3.5 rounded-2xl tactile-btn-green font-bold text-sm font-telugu flex items-center justify-center gap-2 shadow-[0_4px_0_#10452F] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>సుపాబేస్ స్టోరేజ్‌కి అప్‌లోడ్ అవుతోంది...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>విద్యార్థుల కోసం ప్రచురించండి (Publish Lesson)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ================= TAB 2: HOMEWORK & WORKSHEETS ================= */}
              {activeTab === 'homework' && (
                <div className="bg-white p-5 rounded-3xl border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.08)] space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[#10452F] font-telugu">
                      తరగతి హోంవర్క్ & వర్క్‌షీట్ కేటాయింపు
                    </h3>
                    <p className="text-xs text-[#707971]">
                      Assign daily homework by Vivek Sir
                    </p>
                  </div>

                  <form onSubmit={handlePublishHomework} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                        వర్క్‌షీట్ శీర్షిక (Assignment Title):
                      </label>
                      <input
                        type="text"
                        value={hwTitleTe}
                        onChange={(e) => setHwTitleTe(e.target.value)}
                        required
                        placeholder="ఉదా: 5వ ఎక్కం మరియు గుణింతాలు"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-telugu outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                          విషయం:
                        </label>
                        <select
                          value={hwSubject}
                          onChange={(e) => setHwSubject(e.target.value as Subject)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-telugu bg-white"
                        >
                          <option value="math">గణితం</option>
                          <option value="telugu">తెలుగు</option>
                          <option value="evs">పరిసరాల విజ్ఞానం</option>
                          <option value="english">ఆంగ్లం</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                          సమయం:
                        </label>
                        <input
                          type="text"
                          value={hwDueDate}
                          onChange={(e) => setHwDueDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#10452F] font-telugu block mb-1">
                        సూచనలు:
                      </label>
                      <textarea
                        value={hwInstructionsTe}
                        onChange={(e) => setHwInstructionsTe(e.target.value)}
                        rows={3}
                        placeholder="డిజిటల్ పలకపై 5 సార్లు రాసి చూపించాలి..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-telugu outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-2xl tactile-btn-green font-bold text-xs font-telugu flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>హోంవర్క్ కేటాయించండి (Assign)</span>
                    </button>
                  </form>
                </div>
              )}

              {/* ================= TAB 3: MANAGE UPLOADED CONTENT ================= */}
              {activeTab === 'manage' && (
                <div className="bg-white p-5 rounded-3xl border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#10452F] font-telugu">
                      అప్‌లోడ్ చేసిన పాఠాల జాబితా ({customLessons.length})
                    </h3>
                  </div>

                  {customLessons.length === 0 ? (
                    <div className="p-6 text-center text-[#707971] text-xs space-y-2">
                      <BookOpen className="w-8 h-8 mx-auto text-[#155D3B]/40" />
                      <p>ఇంకా పాఠాలు అప్‌లోడ్ చేయలేదు.</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="text-[#155D3B] font-bold underline"
                      >
                        యూట్యూబ్, చిత్రం, లేదా పిడిఎఫ్ పాఠాన్ని అప్‌లోడ్ చేయండి
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customLessons.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl border border-[#155D3B]/20 bg-[#FFFBEF] flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl shrink-0">{item.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-bold text-[#10452F] font-telugu truncate">
                                  {item.titleTe}
                                </h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#155D3B] text-white">
                                  {item.mediaType ? item.mediaType.toUpperCase() : 'QUIZ'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#707971] truncate">
                                {item.uploadedBy} • {item.uploadedAt}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              soundEngine.playClick();
                              onDeleteCustomLesson(item.id, item.storagePath);
                            }}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 shrink-0"
                            title="తొలగించండి (Delete Lesson)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 4: STUDENT PROGRESS & AWARD STARS ================= */}
              {activeTab === 'students' && (
                <div className="bg-white p-5 rounded-3xl border border-[#155D3B]/20 shadow-[0_4px_0_rgba(16,69,47,0.08)] space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[#10452F] font-telugu">
                      విద్యార్థి పురోగతి & నక్షత్రాల బహుమతి
                    </h3>
                    <p className="text-xs text-[#707971]">
                      Encourage rural students by rewarding them with teacher bonus stars
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#DDF5E8]/60 border border-[#155D3B]/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#155D3B]/20 flex items-center justify-center text-3xl shadow-xs">
                        👦🏽
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#10452F] font-telugu">
                          {profile.name}
                        </h4>
                        <p className="text-xs text-[#404942]">
                          {profile.classLevel}వ తరగతి • {profile.schoolName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#FFE08A] text-[#4F3E00] font-bold text-xs border border-[#CCA835]">
                        <Sparkles className="w-3.5 h-3.5 fill-[#CCA835]" />
                        <span>{profile.stars}★</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-[#10452F] font-telugu block">
                      {adminProfile?.name || teacher.name || 'ఉపాధ్యాయుల'} ప్రత్యేక నక్షత్రాల బహుమతి:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { count: 10, labelTe: '+10 నక్షత్రాలు', reason: 'మంచి చేతిరాత' },
                        { count: 25, labelTe: '+25 నక్షత్రాలు', reason: 'క్రమం తప్పకుండా బడికి' },
                        { count: 50, labelTe: '+50 నక్షత్రాలు', reason: 'వీడియో పాఠం వీక్షణ' },
                      ].map((star) => (
                        <button
                          key={star.count}
                          onClick={() => {
                            soundEngine.playSuccessChime();
                            soundEngine.playStarDing();
                            onAwardBonusStars(star.count, star.reason);
                            setFormSuccessMessage(`${profile.name} కు +${star.count} నక్షత్రాలు బహూకరించబడ్డాయి!`);
                            speakText(`శభాష్! ${adminProfile?.name || teacher.name || 'గురువులు'} నీకు ${star.count} నక్షత్రాలు బహుమతిగా ఇచ్చారు!`, 'te-IN');
                            try {
                              confetti({
                                particleCount: 40,
                                spread: 50,
                                origin: { y: 0.6 },
                                colors: ['#CCA835', '#155D3B', '#FFE08A'],
                              });
                            } catch {
                              // ignore
                            }
                          }}
                          className="py-3 px-2 rounded-2xl bg-[#FFFBEF] border-2 border-[#CCA835] hover:bg-[#FFE08A]/40 text-center transition-all shadow-[0_3px_0_#CCA835] active:translate-y-0.5"
                        >
                          <span className="text-sm font-extrabold text-[#745B00] block">
                            {star.labelTe}
                          </span>
                          <span className="text-[10px] text-[#707971] font-telugu block mt-0.5">
                            {star.reason}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-white border-t border-[#10452F]/10 flex items-center justify-between text-xs text-[#707971]">
          <span>విద్యా నేస్తం • ఉపాధ్యాయుల వేదిక {teacher.isLoggedIn && adminProfile?.email ? `(${adminProfile.email})` : ''}</span>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#1C1C15] font-bold"
          >
            మూసివేయండి (Close)
          </button>
        </div>

        {/* Supabase Storage & DB Setup Guide Modal */}
        {showSetupGuide && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#155D3B] shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#10452F] font-telugu">
                      సుపాబేస్ స్టోరేజ్ & DB సెటప్ (Setup)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Configure &lsquo;{SUPABASE_STORAGE_BUCKET}&rsquo; Bucket in Supabase
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status pills */}
              <div className="bg-[#F8FAF9] p-3 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Supabase ప్రాజెక్ట్:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      isSupabaseConfigured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isSupabaseConfigured ? 'కనెక్ట్ అయింది (Configured)' : 'ఆఫ్‌లైన్ మోడ్ (Offline)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">స్టోరేజ్ బకెట్ పేరు:</span>
                  <span className="font-mono font-bold text-[11px] text-[#155D3B]">
                    {SUPABASE_STORAGE_BUCKET} (Public)
                  </span>
                </div>
              </div>

              {/* Step by step instructions */}
              <div className="space-y-2 text-xs font-telugu text-[#404942]">
                <h4 className="font-bold text-[#10452F]">స్టోరేజ్ ప్రారంభించడానికి మార్గాలు:</h4>
                <div className="bg-[#FFFBEF] p-3 rounded-xl border border-[#CCA835]/40 space-y-2">
                  <p className="font-bold text-[#745B00]">మార్రం 1: 1-క్లిక్ SQL రన్ చేయండి (సిఫార్సు చేయబడింది)</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-gray-700">
                    <li>క్రింది బటన్ నొక్కి <strong>SQL కాపీ</strong> చేయండి.</li>
                    <li>
                      మీ Supabase Dashboard &rarr; <strong>SQL Editor</strong> తెరవండి.
                    </li>
                    <li>పేస్ట్ చేసి <strong>Run</strong> క్లిక్ చేయండి. (బకెట్ & పాలసీలు స్వయంచాలకంగా సిద్ధమవుతాయి).</li>
                  </ol>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1 text-[11px] text-gray-600">
                  <p className="font-bold text-gray-800">మార్రం 2: Dashboard UI నుండి</p>
                  <p>
                    Supabase &rarr; Storage &rarr; <strong>New bucket</strong> క్లిక్ చేసి, పేరు: <code>lesson-media</code> ఇచ్చి, <strong>Public bucket: ON</strong> పెట్టి Save చేయండి.
                  </p>
                </div>
              </div>

              {/* 1-Click Copy SQL button */}
              <button
                type="button"
                onClick={handleCopySql}
                className="w-full py-3 rounded-2xl tactile-btn-green font-bold text-xs font-telugu flex items-center justify-center gap-2 shadow-[0_3px_0_#10452F]"
              >
                {sqlCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[#8ED4A9]" />
                    <span>✓ SQL కాపీ అయింది! (Copied)</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>📋 Supabase SQL కాపీ చేయండి (Copy 1-Click SQL)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 text-center"
              >
                పూర్తయింది (Done)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
