const { Client } = require("pg");

const client = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "Asher2025",
    database: "resto_db",
});

client.connect()
    .then(() => {
        console.log("✅ Connecté !");
        client.end();
    })
    .catch(err => {
        console.error("❌ Erreur :", err.message);
    });