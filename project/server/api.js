import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ALLOWED_TABLES = [
  'expedientes_servicio',
  'device_test_sessions',
  'user_profiles',
  'device_changes',
  'prefolio_data',
  'cierre_data'
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/tables', authenticateToken, (req, res) => {
  res.json({ tables: ALLOWED_TABLES });
});

app.get('/api/export/:table', authenticateToken, async (req, res) => {
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
      count: count || data.length,
      timestamp: new Date().toISOString(),
      data
    });
  } catch (err) {
    console.error(`Exception fetching ${table}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/export/:table/count', authenticateToken, async (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Export API running on port ${PORT}`);
  console.log(`Available tables: ${ALLOWED_TABLES.join(', ')}`);
});
