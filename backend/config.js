const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'dpg-d8a04brbc2fs73fkqu0g-a',
    user: process.env.DB_USER || 'movilchia_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movilidad_chia',
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false } // Render/Postgres suele requerir SSL
});

/**
 * Ejecuta una query con parámetros seguros
 * @param {string} sql - Query SQL con placeholders ($1, $2, ...)
 * @param {array} values - Valores para reemplazar placeholders
 * @returns {Promise<array>} - Resultados de la query
 */
async function executeQuery(sql, values = []) {
    try {
        const result = await pool.query(sql, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error en query:', sql, error);
        throw error;
    }
}

/**
 * Ejecuta una query que devuelve una sola fila
 */
async function executeQueryOne(sql, values = []) {
    const result = await executeQuery(sql, values);
    return result.length > 0 ? result[0] : null;
}

/**
 * Inicia una transacción
 */
async function startTransaction() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        return {
            execute: (sql, values) => client.query(sql, values),
            commit: () => client.query('COMMIT').finally(() => client.release()),
            rollback: () => client.query('ROLLBACK').finally(() => client.release())
        };
    } catch (error) {
        client.release();
        throw error;
    }
}

/**
 * Verifica la conexión
 */
async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Conexión a base de datos: OK', result.rows[0]);
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
