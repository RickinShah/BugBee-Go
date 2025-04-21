const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.BUGBEE_DB_DSN
});

pool.connect()
    .then(() => {
        console.log("Postgres connected chal teri bkc");
    })
    .catch((err) => {
        console.log("Connection failed: ", err);
    });

module.exports = pool;
