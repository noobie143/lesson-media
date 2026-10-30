import { supabase, isSupabaseConfigured, SUPABASE_STORAGE_BUCKET } from '../lib/supabase';
import { LessonNode, Question, StudentProfile, TeacherAssignment } from '../types';

export interface StorageUploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  error?: string;
  rawError?: unknown;
}

export interface BackendActionResult {
  success: boolean;
  error?: string;
}

export interface SupabaseAuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
  };
  role?: 'admin' | 'teacher';
  name?: string;
  schoolName?: string;
  error?: string;
}

/**
 * Normalizes file MIME type against allowed Supabase Storage bucket types
 */
function resolveMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 1. Upload File to Supabase Storage bucket 'lesson-media'
 * Genuinely uploads PDF, Image, or Video files to Supabase Storage using authenticated admin credentials.
 * Never masks errors or fakes success with local data URLs.
 */
export async function uploadFileToStorage(
  file: File,
  folderPrefix: string = 'lessons'
): Promise<StorageUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase URL లేదా Anon Key కాన్ఫిగర్ కాలేదు (.env లో VITE_SUPABASE_URL సరిచూడండి).',
    };
  }

  // Ensure active authenticated session exists before attempting storage upload
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return {
        success: false,
        error: 'స్టోరేజ్ అప్‌లోడ్ చేయడానికి ముందుగా మీ Supabase అడ్మినిస్ట్రేటర్ ఈమెయిల్ మరియు పాస్‌వర్డ్ తో లాగిన్ అవ్వండి (Active authenticated session required).',
      };
    }
  } catch (err) {
    return {
      success: false,
      error: 'సెషన్ ధృవీకరణ లోపం ఏర్పడింది. దయచేసి మళ్ళీ లాగిన్ అవ్వండి.',
    };
  }

  const mimeType = resolveMimeType(file);
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const filePath = `${folderPrefix}/${timestamp}_${sanitizedName}`;

  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType,
      });

    if (error) {
      console.error('[Supabase Storage Upload Error]', error);
      let userFriendlyMsg = error.message;

      if (error.message.includes('Bucket not found') || (error as { statusCode?: string | number })?.statusCode === 404) {
        userFriendlyMsg = `Supabase Storage బకెట్ '${SUPABASE_STORAGE_BUCKET}' కనుగొనబడలేదు. దయచేసి Supabase Dashboard -> Storage లో 'lesson-media' బకెట్ ను Public గా సృష్టించండి.`;
      } else if (
        error.message.includes('row-level security') ||
        error.message.includes('RLS') ||
        (error as { statusCode?: string | number })?.statusCode === 403 ||
        (error as { statusCode?: string | number })?.statusCode === '403'
      ) {
        userFriendlyMsg = `స్టోరేజ్ RLS అనుమతి లోపం: మీ అడ్మిన్ లాగిన్ సెషన్ ధృవీకరించబడింది కాని Supabase Storage 'lesson-media' బకెట్ INSERT పాలసీ అప్‌లోడ్‌ను నిరాకరిస్తోంది. దయచేసి SQL Editor లో storage.objects RLS పాలసీలను రన్ చేయండి. (${error.message})`;
      } else if (error.message.includes('mime type') || error.message.includes('not supported')) {
        userFriendlyMsg = `ఈ ఫైల్ రకం (${mimeType}) అనుమతించబడలేదు. కేవలం PDF, Images, MP4 వీడియోలు మాత్రమే అప్‌లోడ్ చేయండి.`;
      }

      return {
        success: false,
        error: userFriendlyMsg,
        rawError: error,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'ఫైల్ అప్‌లోడ్ అయింది కాని Supabase నుండి డేటా రాలేదు.',
      };
    }

    // Retrieve public URL from Supabase Storage
    const { data: urlData } = supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      storagePath: data.path,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Supabase Storage Upload Exception]', err);
    return {
      success: false,
      error: `నెట్‌వర్క్ లేదా స్టోరేజ్ లోపం: ${msg}`,
      rawError: err,
    };
  }
}

/**
 * 2. Save Lesson metadata to Supabase 'lessons' table
 * Also inserts quiz questions into 'questions' table if applicable.
 */
export async function saveLessonToBackend(lesson: LessonNode): Promise<BackendActionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase కాన్ఫిగర్ కాలేదు. VITE_SUPABASE_URL తనిఖీ చేయండి.',
    };
  }

  // Ensure active admin session before saving lesson
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return {
        success: false,
        error: 'పాఠం సేవ్ చేయడానికి ముందుగా మీ Supabase అడ్మిన్ ఈమెయిల్ మరియు పాస్‌వర్డ్ తో లాగిన్ అవ్వండి (Active session required).',
      };
    }
  } catch {
    return {
      success: false,
      error: 'సెషన్ ధృవీకరణ లోపం. దయచేసి మళ్ళీ లాగిన్ అవ్వండి.',
    };
  }

  try {
    const { error } = await supabase.from('lessons').upsert({
      id: lesson.id,
      subject: lesson.subject,
      title_te: lesson.titleTe,
      title_en: lesson.titleEn || lesson.titleTe,
      subtitle_te: lesson.subtitleTe || '',
      subtitle_en: lesson.subtitleEn || '',
      location_name_te: lesson.locationNameTe || 'ఎం.పి.పి.ఎస్. పాఠశాల',
      location_name_en: lesson.locationNameEn || 'MPPS School',
      icon: lesson.icon || '📚',
      stars_required: lesson.starsRequired || 0,
      class_level: lesson.classLevel || 3,
      is_teacher_uploaded: true,
      uploaded_by: lesson.uploadedBy || 'అడ్మినిస్ట్రేటర్ (Admin)',
      media_type: lesson.mediaType || 'quiz',
      media_url: lesson.mediaUrl || null,
      storage_path: lesson.storagePath || null,
      media_title: lesson.mediaTitle || lesson.titleTe,
      media_description_te: lesson.mediaDescriptionTe || '',
      media_description_en: lesson.mediaDescriptionEn || '',
      file_name: lesson.fileName || null,
    });

    if (error) {
      console.error('[Supabase Lessons Insert Error]', error);
      let userMsg = error.message;
      if (error.message.includes('relation "public.lessons" does not exist') || error.code === '42P01') {
        userMsg = "Supabase లో 'public.lessons' టేబుల్ లేదు. దయచేసి supabase/schema.sql ను SQL Editor లో రన్ చేయండి.";
      } else if (error.message.includes('row-level security') || error.code === '42501') {
        userMsg = `డేటాబేస్ RLS అనుమతి లోపం: మీ అడ్మిన్ లాగిన్ సెషన్ ధృవీకరించబడింది కాని lessons టేబుల్ INSERT/UPDATE పాలసీ అనుమతించలేదు. SQL Editor లో public.lessons పాలసీలను రన్ చేయండి. (${error.message})`;
      }
      return {
        success: false,
        error: userMsg,
      };
    }

    // Save questions if it's a quiz lesson
    if (lesson.questions && lesson.questions.length > 0) {
      const questionPayloads = lesson.questions.map((q) => ({
        id: q.id,
        lesson_id: lesson.id,
        subject: q.subject,
        class_level: q.classLevel,
        question_te: q.questionTe,
        question_en: q.questionEn || q.questionTe,
        audio_prompt_te: q.audioPromptTe || q.questionTe,
        audio_prompt_en: q.audioPromptEn || q.questionEn || q.questionTe,
        options: q.options,
        explanation_te: q.explanationTe || '',
        explanation_en: q.explanationEn || '',
        hint_te: q.hintTe || '',
        hint_en: q.hintEn || '',
        points: q.points || 15,
      }));

      const { error: qError } = await supabase.from('questions').upsert(questionPayloads);
      if (qError) {
        console.error('[Supabase Questions Insert Error]', qError);
        return {
          success: false,
          error: `పాఠం సేవ్ అయింది కాని క్విజ్ ప్రశ్నలలో లోపం ఏర్పడింది: ${qError.message}`,
        };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Supabase saveLessonToBackend Exception]', msg);
    return {
      success: false,
      error: `డేటాబేస్ లోపం: ${msg}`,
    };
  }
}

/**
 * 3. Fetch Lessons from Supabase
 */
export async function getLessonsFromBackend(classLevel?: number): Promise<LessonNode[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    let query = supabase.from('lessons').select('*').order('uploaded_at', { ascending: false });
    if (classLevel) {
      query = query.eq('class_level', classLevel);
    }

    const { data: lessonRows, error } = await query;
    if (error || !lessonRows) {
      console.warn('[Vidya Mithrudu] Fetch lessons notice:', error?.message);
      return null;
    }

    const nodes: LessonNode[] = lessonRows.map((row) => ({
      id: row.id,
      subject: row.subject,
      titleTe: row.title_te,
      titleEn: row.title_en,
      subtitleTe: row.subtitle_te || '',
      subtitleEn: row.subtitle_en || '',
      locationNameTe: row.location_name_te || 'ఎం.పి.పి.ఎస్. పాఠశాల',
      locationNameEn: row.location_name_en || 'MPPS School',
      icon: row.icon || '📚',
      starsRequired: row.stars_required || 0,
      classLevel: row.class_level,
      questions: [],
      isTeacherUploaded: Boolean(row.is_teacher_uploaded),
      uploadedBy: row.uploaded_by || 'ఉపాధ్యాయులు (Teacher)',
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString().split('T')[0] : undefined,
      mediaType: row.media_type,
      mediaUrl: row.media_url,
      storagePath: row.storage_path,
      mediaTitle: row.media_title,
      mediaDescriptionTe: row.media_description_te,
      mediaDescriptionEn: row.media_description_en,
      fileName: row.file_name,
    }));

    // If there are quiz lessons, load their questions
    const quizLessonIds = nodes.filter((n) => !n.mediaType || n.mediaType === 'quiz').map((n) => n.id);
    if (quizLessonIds.length > 0) {
      const { data: qRows } = await supabase
        .from('questions')
        .select('*')
        .in('lesson_id', quizLessonIds);

      if (qRows && qRows.length > 0) {
        qRows.forEach((q) => {
          const targetLesson = nodes.find((n) => n.id === q.lesson_id);
          if (targetLesson) {
            targetLesson.questions.push({
              id: q.id,
              subject: q.subject,
              classLevel: q.class_level,
              questionTe: q.question_te,
              questionEn: q.question_en,
              audioPromptTe: q.audio_prompt_te,
              audioPromptEn: q.audio_prompt_en,
              options: q.options || [],
              explanationTe: q.explanation_te,
              explanationEn: q.explanationEn || '',
              hintTe: q.hint_te,
              hintEn: q.hint_en,
              points: q.points || 15,
            });
          }
        });
      }
    }

    return nodes;
  } catch (err) {
    console.warn('[Vidya Mithrudu] Error fetching lessons from Supabase:', err);
    return null;
  }
}

/**
 * 4. Delete Lesson from Database and Storage
 */
export async function deleteLessonFromBackend(
  lessonId: string,
  storagePath?: string
): Promise<BackendActionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase కాన్ఫిగర్ కాలేదు.' };
  }

  try {
    // If it has a storage file, delete from bucket
    if (storagePath) {
      await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([storagePath]);
    }

    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 5. Save Student Progress
 */
export async function saveProgressToBackend(
  studentId: string,
  lessonId: string,
  earnedStars: number
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase.from('student_progress').upsert({
      student_id: studentId,
      lesson_id: lessonId,
      stars_earned: earnedStars,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 6. Save and Fetch Assignments
 */
export async function getAssignmentsFromBackend(classLevel?: number): Promise<TeacherAssignment[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    let query = supabase.from('assignments').select('*').order('created_at', { ascending: false });
    if (classLevel) {
      query = query.eq('class_level', classLevel);
    }
    const { data, error } = await query;
    if (error || !data) return null;

    return data.map((d) => ({
      id: d.id,
      titleTe: d.title_te,
      titleEn: d.title_en,
      instructionsTe: d.instructions_te,
      instructionsEn: d.instructions_en || '',
      subject: d.subject,
      classLevel: d.class_level,
      dueDate: d.due_date,
      assignedBy: d.assigned_by,
      points: d.points,
      isCompleted: false,
    }));
  } catch {
    return null;
  }
}

export async function saveAssignmentToBackend(asg: TeacherAssignment): Promise<BackendActionResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase కాన్ఫిగర్ కాలేదు' };
  }

  // Ensure active admin session before saving assignment
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return {
        success: false,
        error: 'హోంవర్క్ సేవ్ చేయడానికి ముందుగా మీ Supabase అడ్మిన్ ఈమెయిల్ మరియు పాస్‌వర్డ్ తో లాగిన్ అవ్వండి (Active session required).',
      };
    }
  } catch {
    return {
      success: false,
      error: 'సెషన్ ధృవీకరణ లోపం. దయచేసి మళ్ళీ లాగిన్ అవ్వండి.',
    };
  }

  try {
    const { error } = await supabase.from('assignments').upsert({
      id: asg.id,
      title_te: asg.titleTe,
      title_en: asg.titleEn || asg.titleTe,
      instructions_te: asg.instructionsTe,
      instructions_en: asg.instructionsEn || '',
      subject: asg.subject,
      class_level: asg.classLevel,
      due_date: asg.dueDate,
      assigned_by: asg.assignedBy || 'అడ్మినిస్ట్రేటర్ (Admin)',
      points: asg.points,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 7. Dedicated Teacher Authentication System
 * Verifies credentials against server-side secrets (TEACHER_LOGIN_EMAIL & TEACHER_LOGIN_PASSWORD)
 * using the Supabase Edge Function 'teacher-login' with server proxy fallback.
 * Upon verification, establishes a genuine Supabase Auth session via supabase.auth.setSession().
 * Never exposes credentials to frontend code.
 */
export async function signInTeacherSecurely(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase URL లేదా Anon Key కాన్ఫిగర్ కాలేదు (.env లో VITE_SUPABASE_URL సరిచూడండి).',
    };
  }

  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  if (!cleanEmail) {
    return {
      success: false,
      error: 'దయచేసి మీ ఈమెయిల్ నమోదు చేయండి (Email is required).',
    };
  }

  if (!cleanPassword) {
    return {
      success: false,
      error: 'దయచేసి పాస్‌వర్డ్ నమోదు చేయండి (Password is required).',
    };
  }

  try {
    let responseData: {
      success?: boolean;
      error?: string;
      message?: string;
      session?: { access_token: string; refresh_token: string };
      user?: { id: string; email?: string };
      role?: 'admin' | 'teacher';
      name?: string;
      schoolName?: string;
    } | null = null;
    let authErrorMsg: string | null = null;

    // 1. Primary Method: Invoke Supabase Edge Function 'teacher-login'
    try {
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('teacher-login', {
        body: { email: cleanEmail, password: cleanPassword },
      });

      if (!edgeErr && edgeData) {
        responseData = edgeData;
      } else if (edgeErr) {
        const contextErr = (edgeErr as unknown as { context?: { json: () => Promise<unknown> } })?.context;
        if (contextErr && typeof contextErr.json === 'function') {
          try {
            const parsed = (await contextErr.json()) as { error?: string; message?: string };
            if (parsed && (parsed.error === 'INCORRECT_EMAIL' || parsed.error === 'INCORRECT_PASSWORD')) {
              return { success: false, error: parsed.message || 'వివరాలు సరికాదు.' };
            }
          } catch {
            // ignore JSON parse
          }
        }
        console.info('[Supabase Edge Function] Remote invoke notice:', edgeErr.message);
      }
    } catch (edgeInvokeErr) {
      console.info('[Supabase Edge Function] Invocation fallback:', edgeInvokeErr);
    }

    // 2. Secondary/Local Dev Method: Call Server Proxy (/api/teacher-login)
    if (!responseData) {
      try {
        const serverRes = await fetch('/api/teacher-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });

        const serverData = await serverRes.json().catch(() => null);

        if (
          serverRes.status === 401 ||
          (serverData &&
            !serverData.success &&
            (serverData.error === 'INCORRECT_EMAIL' || serverData.error === 'INCORRECT_PASSWORD'))
        ) {
          return {
            success: false,
            error:
              serverData?.message ||
              (serverData?.error === 'INCORRECT_EMAIL'
                ? 'ఈమెయిల్ సరికాదు: దయచేసి సరైన ఉపాధ్యాయుల ఈమెయిల్ నమోదు చేయండి.'
                : 'పాస్‌వర్డ్ సరికాదు: దయచేసి సరైన పాస్‌వర్డ్ నమోదు చేయండి.'),
          };
        }

        if (serverRes.ok && serverData?.success) {
          responseData = serverData;
        } else if (serverData && !serverData.success) {
          authErrorMsg = serverData.message || serverData.error;
        }
      } catch (fetchErr) {
        console.warn('[Server Proxy] Teacher-login fetch notice:', fetchErr);
      }
    }

    // If verification failed or returned an error message
    if (!responseData) {
      if (authErrorMsg) {
        return { success: false, error: authErrorMsg };
      }
      return {
        success: false,
        error:
          'ఉపాధ్యాయుల లాగిన్ సర్వర్ ధృవీకరణ లోపం (Authentication failure). దయచేసి ఈమెయిల్ మరియు పాస్‌వర్డ్ సరిచూసుకోండి.',
      };
    }

    if (!responseData.success) {
      return {
        success: false,
        error: responseData.message || responseData.error || 'లాగిన్ విఫలమైంది.',
      };
    }

    // 3. Establish Genuine Supabase Auth Session in client SDK
    if (responseData.session?.access_token && responseData.session?.refresh_token) {
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: responseData.session.access_token,
        refresh_token: responseData.session.refresh_token,
      });

      if (sessionErr) {
        console.error('[Supabase setSession Error]', sessionErr);
        return {
          success: false,
          error: `సుపాబేస్ ఆథ్ సెషన్ సెట్ చేయడంలో లోపం: ${sessionErr.message}`,
        };
      }
    }

    // 4. Verify authenticated session is active in Supabase client
    const {
      data: { session: activeSession },
      error: verifyErr,
    } = await supabase.auth.getSession();

    if (verifyErr || !activeSession?.user) {
      return {
        success: false,
        error: 'సుపాబేస్ ఆథెంటికేషన్ సెషన్ ప్రారంభించడంలో లోపం ఏర్పడింది (Session activation failed).',
      };
    }

    const uid = activeSession.user.id;

    // 5. Ensure profile exists in public.profiles with admin/teacher role
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, role, name, school_name')
        .eq('id', uid)
        .maybeSingle();

      if (!profileRow) {
        await supabase.from('profiles').upsert({
          id: uid,
          role: 'admin',
          name: responseData.name || 'అడ్మినిస్ట్రేటర్',
          school_name: responseData.schoolName || 'ఎం.పి.పి.ఎస్. పాఠశాల',
        });
      }
    } catch (e) {
      console.warn('[Profiles Check Note]', e);
    }

    return {
      success: true,
      user: {
        id: uid,
        email: activeSession.user.email || cleanEmail,
      },
      role: 'admin',
      name: responseData.name || activeSession.user.email || 'అడ్మినిస్ట్రేటర్',
      schoolName: responseData.schoolName || 'ఎం.పి.పి.ఎస్. పాఠశాల',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Teacher Authentication Exception]', err);
    return {
      success: false,
      error: `లాగిన్ విఫలమైంది (Authentication failed): ${msg}`,
    };
  }
}

/**
 * Backward compatible alias for admin sign in
 */
export async function signInAdminWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  return signInTeacherSecurely(email, password);
}

/**
 * 8. Retrieve and verify the active authenticated administrator session
 * Checks supabase.auth.getSession(), extracts the user UID, and validates profile role.
 */
export async function getAuthenticatedAdminSession(): Promise<{
  isAuthenticated: boolean;
  user: { id: string; email?: string } | null;
  role?: 'admin' | 'teacher';
  name?: string;
  schoolName?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { isAuthenticated: false, user: null };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { isAuthenticated: false, user: null, error: sessionError?.message };
    }

    // Check expiration
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      await supabase.auth.signOut();
      return { isAuthenticated: false, user: null, error: 'సెషన్ గడువు ముగిసింది (Session expired).' };
    }

    const uid = session.user.id;

    // Query public.profiles using the session user's UID
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, name, school_name')
      .eq('id', uid)
      .maybeSingle();

    if (profileError || !profileRow) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'ప్రొఫైల్ కనుగొనబడలేదు లేదా అనుమతి లేదు.',
      };
    }

    // Role verification
    if (profileRow.role !== 'admin' && profileRow.role !== 'teacher') {
      await supabase.auth.signOut();
      return {
        isAuthenticated: false,
        user: null,
        error: 'ఈ ఖాతాకు అడ్మిన్ లేదా టీచర్ అనుమతులు లేవు.',
      };
    }

    return {
      isAuthenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      role: profileRow.role as 'admin' | 'teacher',
      name: profileRow.name || session.user.email || 'అడ్మినిస్ట్రేటర్',
      schoolName: profileRow.school_name,
    };
  } catch (err) {
    console.warn('[Vidya Mithrudu] Session check error:', err);
    return { isAuthenticated: false, user: null };
  }
}

/**
 * 9. Implement administrator logout using supabase.auth.signOut()
 */
export async function signOutAdminFromSupabase(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Vidya Mithrudu] SignOut error:', err);
    }
  }
}

/**
 * 10. Backward-compatible alias for getting current authenticated user
 */
export async function getCurrentSupabaseUser(): Promise<{
  isAuthenticated: boolean;
  user: { id: string; email?: string } | null;
  role: string;
  name: string;
  schoolName?: string;
}> {
  const adminAuth = await getAuthenticatedAdminSession();
  if (adminAuth.isAuthenticated && adminAuth.user) {
    return {
      isAuthenticated: true,
      user: adminAuth.user,
      role: adminAuth.role || 'admin',
      name: adminAuth.name || adminAuth.user.email || 'అడ్మినిస్ట్రేటర్',
      schoolName: adminAuth.schoolName,
    };
  }
  return {
    isAuthenticated: false,
    user: null,
    role: '',
    name: '',
  };
}
