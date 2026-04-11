// Next.js instrumentation hook — runs once on server startup.
// Ensures the SQLite DB is seeded before the first request hits.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: getDb } = await import('./lib/db');
    const db = getDb();

    // Check if all tables are seeded (check leads AND competitors in case of partial seed)
    const { count: leadCount } = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    const { count: compCount } = db.prepare('SELECT COUNT(*) as count FROM competitors').get() as { count: number };
    if (leadCount > 0 && compCount > 0) return;

    // Lazy-import seed so it only runs when needed
    console.log('[TableSpace] Seeding database on first startup…');
    const { default: runSeed } = await import('./lib/seedRunner');
    runSeed(db);
    console.log('[TableSpace] Seed complete.');
  }
}
