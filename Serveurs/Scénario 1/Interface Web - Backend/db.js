const mysql = require('mysql2');
const DB_PASSWORD = require('./keys.json').DB_PASSWORD;
const config = {
    mysql_pool: mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: DB_PASSWORD,
        database: 'db_scenario_1',
        multipleStatements: true,
    })
};
module.exports = config;
