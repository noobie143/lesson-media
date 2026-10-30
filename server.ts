import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Dedicated Teacher Authentication Endpoint
  // Verifies credentials using server-side secrets: TEACHER_LOGIN_EMAIL and TEACHER_LOGIN_PASSWORD
  app.post('/api/teacher-login', async (req, res) => {
    try {
      const { email, password } = req.body || {};

      const expectedEmail = (process.env.TEACHER_LOGIN_EMAIL || 'admin@gmail.com').trim();
      const expectedPassword = (process.env.TEACHER_LOGIN_PASSWORD || 'admin1234').trim();

      const inputEmail = (email || '').trim();
      const inputPassword = (password || '').trim();

      // 1. Validate email
      if (!inputEmail) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_EMAIL',
          message: 'దయచేసి మీ ఈమెయిల్ నమోదు చేయండి (Email is required).',
        });
      }

      if (inputEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: 'INCORRECT_EMAIL',
          message: 'ఈమెయిల్ సరికాదు: దయచేసి సరైన ఉపాధ్యాయుల ఈమెయిల్ నమోదు చేయండి (Incorrect email address).',
        });
      }

      // 2. Validate password
      if (!inputPassword) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PASSWORD',
          message: 'దయచేసి పాస్‌వర్డ్ నమోదు చేయండి (Password is required).',
        });
      }

      if (inputPassword !== expectedPassword) {
        return res.status(401).json({
          success: false,
          error: 'INCORRECT_PASSWORD',
          message: 'పాస్‌వర్డ్ సరికాదు: దయచేసి సరైన పాస్‌వర్డ్ నమోదు చేయండి (Incorrect password).',
        });
      }

      // 3. Establish genuine Supabase Auth session
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eyzwedpnzowjxqypdjuo.supabase.co';
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-jN3ki_Hk6R2t2DZntw1yg_qJB9CuWA';
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Optional: If service role key is configured, ensure account & profile exist
      if (serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const existing = usersData?.users?.find(
            (u) => u.email?.toLowerCase() === expectedEmail.toLowerCase()
          );

          let userId = existing?.id;
          if (!existing) {
            const { data: created } = await supabaseAdmin.auth.admin.createUser({
              email: expectedEmail,
              password: expectedPassword,
              email_confirm: true,
              user_metadata: { role: 'admin', name: 'అడ్మినిస్ట్రేటర్' },
            });
            userId = created?.user?.id;
          } else {
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password: expectedPassword,
              email_confirm: true,
            });
          }

          if (userId) {
            await supabaseAdmin.from('profiles').upsert(
              {
                id: userId,
                role: 'admin',
                name: 'అడ్మినిస్ట్రేటర్',
                school_name: 'ఎం.పి.పి.ఎస్. పాఠశాల',
              },
              { onConflict: 'id' }
            );
          }
        } catch (adminErr) {
          console.warn('[Server] Admin provisioning note:', adminErr);
        }
      }

      // Sign in to Supabase Auth to establish the authenticated session
      const authClient = createClient(supabaseUrl, anonKey);
      const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
        email: expectedEmail,
        password: expectedPassword,
      });

      if (authErr || !authData.session) {
        return res.status(400).json({
          success: false,
          error: 'AUTH_SESSION_FAILED',
          message: `Supabase Auth సెషన్ లోపం: ${authErr?.message || 'సెషన్ లభించలేదు'}. Supabase Authentication Users లో ${expectedEmail} ఖాతాను 'admin1234' పాస్‌వర్డ్‌తో నమోదు చేయండి.`,
        });
      }

      // Query profiles table to retrieve administrator role & details
      let profileRole = 'admin';
      let profileName = 'అడ్మినిస్ట్రేటర్';
      let schoolName = 'ఎం.పి.పి.ఎస్. పాఠశాల';

      try {
        const { data: profileRow } = await authClient
          .from('profiles')
          .select('id, role, name, school_name')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileRow) {
          profileRole = profileRow.role || 'admin';
          profileName = profileRow.name || 'అడ్మినిస్ట్రేటర్';
          schoolName = profileRow.school_name || schoolName;
        }
      } catch {
        // use default profile
      }

      return res.json({
        success: true,
        session: authData.session,
        user: authData.user,
        role: profileRole,
        name: profileName,
        schoolName,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: `సర్వర్ లోపం: ${msg}`,
      });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Vidya Nestham Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
