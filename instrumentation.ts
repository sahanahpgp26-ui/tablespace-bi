// Next.js instrumentation hook — runs once on server startup.
// getDb() itself handles auto-seeding now, so just initialise the DB here
// to warm up the connection before the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: getDb } = await import('./lib/db');
    getDb(); // triggers schema init + auto-seed inside getDb()
  }
}
