const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'dpg-d8a04brbc2fs73fkqu0g-a',
    user: process.env.DB_USER || 'movilchia_user',
    password: process.env.DB_PASSWORD || 'qSSkdQ0dILRS4h4ZiYhJwrb5e6jYen8z',
    database: process.env.DB_NAME || 'movilidad_chia',
    port: process.env.DB_PORT || 5432,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'
});

/**
 * Ejecuta una query con prepared statements
 * @param {string} sql - Query SQL con placeholders (?)
 * @param {array} values - Valores para reemplazar placeholders
 * @returns {Promise<array>} - Resultados de la query
 * 
 * EJEMPLO:
 * const [result] = await executeQuery(
 *   'SELECT * FROM usuarios WHERE email = ?',
 *   ['user@example.com']
 * );
 */
async function executeQuery(sql, values = []) {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.execute(sql, values);
        return results;
    } catch (error) {
        console.error('❌ Error en query:', sql, error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Ejecuta una query que devuelve una sola fila
 * @param {string} sql 
 * @param {array} values 
 * @returns {Promise<object|null>}
 */
async function executeQueryOne(sql, values = []) {
    const results = await executeQuery(sql, values);
    return results.length > 0 ? results[0] : null;
}

async function startTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    return {
        execute: (sql, values) => connection.execute(sql, values),
        commit: () => connection.commit(),
        rollback: () => connection.rollback(),
        release: () => connection.release()
    };
}

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ Conexión a base de datos: OK');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a base de datos:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    executeQuery,
    executeQueryOne,
    startTransaction,
    testConnection
};
