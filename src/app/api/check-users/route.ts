import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    // Vérifier que DATABASE_URL est définie
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'DATABASE_URL is not defined' 
      }, { status: 500 });
    }

    // Se connecter à la base Neon
    const sql = neon(process.env.DATABASE_URL);
    
    // Compter les utilisateurs
    const result = await sql`SELECT count(*)::int as total FROM users;`;
    
    return NextResponse.json({ 
      success: true, 
      users: result[0].total,
      message: 'Connexion à la base Neon réussie !',
      database: 'Neon PostgreSQL'
    });
  } catch (error) {
  const message = error instanceof Error 
    ? error.message 
    : 'Erreur inconnue';

  const details =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : 'Aucun détail supplémentaire';

  return NextResponse.json(
    {
      success: false,
      error: message,
      details
    },
    { status: 500 }
  );
}
}