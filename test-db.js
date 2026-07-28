// test-db.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function setupDatabase() {
    console.log('🔄 Vérification de la base de données...');

    const sql = neon(process.env.DATABASE_URL);

    // On ne masque pas l'URL dans la console pour cette exécution, mais on garde le log simple.
    console.log(`✅ URL Neon trouvée`);

    try {
        // Requête SQL pour créer la table "users" si elle n'existe pas
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;
        console.log('✅ Table "users" créée ou déjà existante.');

        // Vérification supplémentaire : compter les utilisateurs pour confirmer
        const result = await sql`SELECT count(*)::int as total FROM users;`;
        console.log(`✅ Vérification effectuée. Nombre d'utilisateurs actuel : ${result[0].total}`);

        console.log('\n🎉 Base de données prête ! Vous pouvez maintenant déployer votre site sur Netlify.');

    } catch (error) {
        console.error('❌ Une erreur est survenue lors de la configuration :');
        console.error('   Erreur:', error.message);
        if (error.cause) {
            console.error('   Cause:', error.cause.message);
        }
    }
}

setupDatabase();