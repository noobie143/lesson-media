import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : typeof process !== 'undefined' && process.env
    ? (process.env as Record<string, string | undefined>)
    : {};

const rawUrl = (env.VITE_SUPABASE_URL || 'https://eyzwedpnzowjxqypdjuo.supabase.co').trim();
const rawKey = (env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-jN3ki_Hk6R2t2DZntw1yg_qJB9CuWA').trim();

export const SUPABASE_STORAGE_BUCKET = 'lesson-media';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl !== 'https://your-project.supabase.co' &&
  rawKey !== 'your-public-anon-key' &&
  rawUrl.startsWith('http')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  client = createClient(rawUrl, rawKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
} else {
  console.info(
    '[Vidya Mithrudu] Supabase environment variables not configured. Running in offline/local storage mode.'
  );
}

export const supabase = client;

export interface SupabaseHealthStatus {
  isConfigured: boolean;
  projectUrl: string;
  hasLessonsTable: boolean;
  hasStorageBucket: boolean;
  errorMessage?: string;
}

/**
 * Diagnostic helper to check connection to Supabase database and storage
 */
export async function checkSupabaseStatus(): Promise<SupabaseHealthStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      projectUrl: '',
      hasLessonsTable: false,
      hasStorageBucket: false,
      errorMessage: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not configured.',
    };
  }

  let hasLessonsTable = false;
  let hasStorageBucket = false;
  let errorMessage: string | undefined;

  try {
    // 1. Check lessons table
    const { error: tableError } = await supabase
      .from('lessons')
      .select('count', { count: 'exact', head: true });

    if (!tableError) {
      hasLessonsTable = true;
    } else {
      errorMessage = `Database Table Error: ${tableError.message}`;
    }

    // 2. Check storage bucket accessibility
    const { error: bucketError } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).list('', { limit: 1 });
    if (!bucketError || !bucketError.message.includes('Bucket not found')) {
      hasStorageBucket = true;
    } else {
      const storageMsg = `Storage Bucket Error: ${bucketError.message}`;
      errorMessage = errorMessage ? `${errorMessage} | ${storageMsg}` : storageMsg;
    }
  } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  return {
    isConfigured: true,
    projectUrl: rawUrl,
    hasLessonsTable,
    hasStorageBucket,
    errorMessage,
  };
}
