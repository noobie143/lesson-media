-- ==========================================================
-- VIDYA MITHRUDU / VIDYA NESTHAM - SUPABASE DATABASE & STORAGE SCHEMA
-- ==========================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query", paste this entire script, and click "Run".
-- 3. In the left menu, go to "Storage" and confirm that the bucket named 'lesson-media'
--    is listed with a "Public" badge. If not, click the three dots next to 'lesson-media'
--    and choose "Edit bucket" -> toggle "Public bucket" ON -> Save.
-- ==========================================================

-- ---------------------------------------------------------
-- 1. STORAGE: CREATE & CONFIGURE 'lesson-media' BUCKET
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  true,
  52428800, -- 50 MB limit
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Storage Policies for 'lesson-media' bucket
drop policy if exists "Public Access to lesson-media" on storage.objects;
create policy "Public Access to lesson-media"
  on storage.objects for select
  using (bucket_id = 'lesson-media');

drop policy if exists "Allow upload to lesson-media" on storage.objects;
create policy "Allow upload to lesson-media"
  on storage.objects for insert
  to authenticated, anon
  with check (bucket_id = 'lesson-media');

drop policy if exists "Allow update to lesson-media" on storage.objects;
create policy "Allow update to lesson-media"
  on storage.objects for update
  to authenticated, anon
  using (bucket_id = 'lesson-media');

drop policy if exists "Allow delete from lesson-media" on storage.objects;
create policy "Allow delete from lesson-media"
  on storage.objects for delete
  to authenticated, anon
  using (bucket_id = 'lesson-media');


-- ---------------------------------------------------------
-- 2. DATABASE: LESSONS TABLE (Curriculum & Teacher Content)
-- ---------------------------------------------------------
create table if not exists public.lessons (
  id text primary key,
  subject text not null check (subject in ('math', 'telugu', 'evs', 'english')),
  title_te text not null,
  title_en text not null,
  subtitle_te text,
  subtitle_en text,
  location_name_te text default 'ఎం.పి.పి.ఎస్. పాఠశాల',
  location_name_en text default 'MPPS School',
  icon text not null default '📚',
  stars_required integer not null default 0,
  class_level integer not null default 3 check (class_level between 1 and 5),
  is_teacher_uploaded boolean not null default false,
  uploaded_by text default 'వివేక్ గారు (Vivek Sir)',
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  media_type text default 'quiz' check (media_type in ('quiz', 'youtube', 'video', 'image', 'pdf')),
  media_url text,
  storage_path text,
  media_title text,
  media_description_te text,
  media_description_en text,
  file_name text
);

-- If table already existed previously without storage_path, ensure column is added
alter table public.lessons add column if not exists storage_path text;

-- Enable RLS on lessons
alter table public.lessons enable row level security;

-- Lessons Policies
drop policy if exists "Anyone can read published lessons" on public.lessons;
create policy "Anyone can read published lessons"
  on public.lessons for select
  using (true);

drop policy if exists "Allow lesson insert" on public.lessons;
create policy "Allow lesson insert"
  on public.lessons for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Allow lesson update" on public.lessons;
create policy "Allow lesson update"
  on public.lessons for update
  to authenticated, anon
  using (true);

drop policy if exists "Allow lesson delete" on public.lessons;
create policy "Allow lesson delete"
  on public.lessons for delete
  to authenticated, anon
  using (true);


-- ---------------------------------------------------------
-- 3. DATABASE: QUESTIONS TABLE (Interactive Quiz Exercises)
-- ---------------------------------------------------------
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

-- Enable RLS on questions
alter table public.questions enable row level security;

drop policy if exists "Anyone can view quiz questions" on public.questions;
create policy "Anyone can view quiz questions"
  on public.questions for select
  using (true);

drop policy if exists "Allow insert questions" on public.questions;
create policy "Allow insert questions"
  on public.questions for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Allow update questions" on public.questions;
create policy "Allow update questions"
  on public.questions for update
  to authenticated, anon
  using (true);

drop policy if exists "Allow delete questions" on public.questions;
create policy "Allow delete questions"
  on public.questions for delete
  to authenticated, anon
  using (true);


-- ---------------------------------------------------------
-- 4. DATABASE: ASSIGNMENTS TABLE (Teacher Homework & Tasks)
-- ---------------------------------------------------------
create table if not exists public.assignments (
  id text primary key,
  title_te text not null,
  title_en text not null,
  instructions_te text not null,
  instructions_en text,
  subject text not null check (subject in ('math', 'telugu', 'evs', 'english')),
  class_level integer not null check (class_level between 1 and 5),
  due_date text not null,
  assigned_by text not null default 'వివేక్ గారు (Vivek Sir)',
  points integer not null default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assignments enable row level security;

drop policy if exists "Anyone can read assignments" on public.assignments;
create policy "Anyone can read assignments"
  on public.assignments for select
  using (true);

drop policy if exists "Allow manage assignments" on public.assignments;
create policy "Allow manage assignments"
  on public.assignments for all
  to authenticated, anon
  using (true)
  with check (true);


-- ---------------------------------------------------------
-- 5. DATABASE: STUDENT PROGRESS & STARS
-- ---------------------------------------------------------
create table if not exists public.student_progress (
  id uuid default gen_random_uuid() primary key,
  student_id text not null,
  lesson_id text references public.lessons(id) on delete cascade not null,
  stars_earned integer not null default 10,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (student_id, lesson_id)
);

alter table public.student_progress enable row level security;

drop policy if exists "Allow read progress" on public.student_progress;
create policy "Allow read progress"
  on public.student_progress for select
  using (true);

drop policy if exists "Allow record progress" on public.student_progress;
create policy "Allow record progress"
  on public.student_progress for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Allow update progress" on public.student_progress;
create policy "Allow update progress"
  on public.student_progress for update
  to authenticated, anon
  using (true);


-- ---------------------------------------------------------
-- 6. DATABASE: PROFILES TABLE (User profiles & Roles)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id text primary key,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  name text not null,
  school_name text not null default 'ఎం.పి.ピ.ఎస్. పాఠశాల',
  village_name text not null default 'గ్రామ పంచాయతీ',
  class_level integer not null default 3 check (class_level between 1 and 5),
  stars integer not null default 0,
  streak_days integer not null default 1,
  language_mode text not null default 'bilingual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Allow select profiles" on public.profiles;
create policy "Allow select profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Allow upsert profiles" on public.profiles;
create policy "Allow upsert profiles"
  on public.profiles for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Allow update profiles" on public.profiles;
create policy "Allow update profiles"
  on public.profiles for update
  to authenticated, anon
  using (true);
