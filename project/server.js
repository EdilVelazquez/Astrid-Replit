import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase configuration missing - API endpoints will not work');
}

const ALLOWED_TABLES = [
  'expedientes_servicio',
  'device_test_sessions',
  'user_profiles',
  'device_changes',
  'prefolio_data',
  'cierre_data',
  'test_services'
];

const EXPORT_TOKEN = process.env.USAGE_EXPORT_TOKEN;

function authenticateToken(req, res, next) {
  if (!EXPORT_TOKEN) {
    return res.status(500).json({ error: 'Export token not configured on server' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  if (token !== EXPORT_TOKEN) {
    return res.status(401).json({ error: 'Invalid authorization token' });
  }

  next();
}

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase_configured: !!supabase
  });
});

app.get('/api/tables', authenticateToken, (req, res) => {
  res.json({ tables: ALLOWED_TABLES });
});

app.get('/api/export/:table', authenticateToken, async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { table } = req.params;
  
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ 
      error: 'Invalid table name',
      allowed_tables: ALLOWED_TABLES
    });
  }

  try {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' });

    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      table,
      count: count || (data ? data.length : 0),
      timestamp: new Date().toISOString(),
      data: data || []
    });
  } catch (err) {
    console.error(`Exception fetching ${table}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/export/:table/count', authenticateToken, async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { table } = req.params;
  
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ 
      error: 'Invalid table name',
      allowed_tables: ALLOWED_TABLES
    });
  }

  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      table,
      count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  // Serve static assets (JS, CSS, images) normally
  app.use(express.static(distPath, {
    index: false // Don't serve index.html automatically
  }));
  
  // Read and cache index.html with runtime config injection
  const indexPath = join(distPath, 'index.html');
  let cachedHtml = null;
  
  const getInjectedHtml = () => {
    if (cachedHtml) return cachedHtml;
    
    try {
      const html = readFileSync(indexPath, 'utf8');
      const runtimeConfig = `
    <script>
      window.__RUNTIME_CONFIG__ = {
        VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
        VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}"
      };
    </script>`;
      cachedHtml = html.replace('</head>', `${runtimeConfig}\n  </head>`);
      return cachedHtml;
    } catch (err) {
      console.error('Error reading index.html:', err);
      return null;
    }
  };
  
  // Inject runtime config into index.html (catch-all for SPA routing)
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    const html = getInjectedHtml();
    if (!html) {
      return res.status(500).send('Error loading page');
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(html);
  });
  console.log('Serving static files from dist/ with runtime config injection');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at /api/*`);
  console.log(`Available tables: ${ALLOWED_TABLES.join(', ')}`);
});
