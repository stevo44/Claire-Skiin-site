import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import dns from 'dns';

// On Windows, Node's libuv DNS resolver can hang on IPv6 lookups.
// Force IPv4-first resolution and use reliable public DNS servers.
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL is not set. All database operations will fail.');
  console.warn('    → Go to Supabase → Project Settings → Database → Connection string (URI)');
  console.warn('    → Use the Transaction Pooler URL (port 6543) for best reliability');
} else {
  if (databaseUrl.includes('[YOUR-PASSWORD]') || databaseUrl.includes('[password]')) {
    console.error("❌ DATABASE_URL still contains a placeholder password — replace it with the real one.");
  }
  if (databaseUrl.includes(' ') || databaseUrl.includes('\n') || databaseUrl.includes('\r')) {
    console.error("❌ DATABASE_URL contains whitespace or hidden characters — remove them.");
  }
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`📡 Database target: ${maskedUrl}`);
}

const pool = new Pool({
  connectionString: databaseUrl,
  // Supabase requires SSL; in dev we skip certificate validation
  ssl: { rejectUnauthorized: false },
  // Timeouts — prevent the server hanging for 30 s on startup when Supabase is paused
  connectionTimeoutMillis: 8_000,   // give up acquiring a connection after 8 s
  idleTimeoutMillis:       30_000,  // release idle clients after 30 s
  max: 10,                           // keep pool small to respect Supabase free-tier limits
});

// Test connection on startup — non-blocking, never crashes the process
pool.connect((err, client, release) => {
  if (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOTFOUND') {
      console.error('❌ Cannot reach the database host (ENOTFOUND).');
      console.error('   Most likely causes:');
      console.error('   1. Your Supabase project is PAUSED — resume it at https://supabase.com/dashboard');
      console.error('   2. You are using the direct host (db.xxx.supabase.co) instead of the pooler.');
      console.error('      → Use the Transaction Pooler URL from Supabase → Project Settings → Database.');
      console.error('      → Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    } else if (err.message.includes('password authentication failed')) {
      console.error('❌ Wrong database password. URL-encode any special chars (@ → %40, # → %23).');
    } else {
      console.error('❌ Database connection error:', err.message);
    }
    return;
  }
  console.log('✅ PostgreSQL connected successfully');
  release();
});

pool.on('error', (err) => {
  console.error('❌ Unexpected pg pool error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;

