// Next.js instrumentation hook — runs once on server startup.
// Ensures the SQLite DB is seeded before the first request hits.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: getDb } = await import('./lib/db');
    const db = getDb();

    // Check if already seeded
    const { count } = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    if (count > 0) return;

    // Lazy-import seed so it only runs when needed
    console.log('[TableSpace] Seeding database on first startup…');
    const { default: runSeed } = await import('./lib/seedRunner');
    runSeed(db);
    console.log('[TableSpace] Seed complete.');
  }
}
