const { Pool } = require("pg");

const pool = new Pool({
    user: "bugbee",
    host: "localhost",
    database: "bugbee",
    password: "1234",
    port: 5432,
});

pool.connect()
    .then(() => {
        console.log("Postgres connected chal teri bkc");
    })
    .catch((err) => {
        console.log("Connection failed: ", err);
    });

module.exports = pool;
