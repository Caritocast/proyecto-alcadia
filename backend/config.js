/**
 * ============================================================================
 * CONFIGURACIÓN DE BASE DE DATOS
 * ============================================================================
 * Este archivo configura la conexión a MySQL y exporta funciones para
 * ejecutar queries de forma segura (prepared statements).
 * 
 * PREVENCIÓN DE SQL INJECTION:
 * - Usamos mysql2/promise con prepared statements
 * - Nunca concatenamos strings en queries
 * - Usamos placeholders (?) para valores
 * ============================================================================
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones: reutiliza conexiones para mejor rendimiento
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movilidad_chia',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,  // máximo 10 conexiones simultáneas
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
        // Prepared statement: mysql2 previene SQL injection automáticamente
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

/**
 * Inicia una transacción (para operaciones múltiples)
 * Las transacciones garantizan que se ejecuten todas o ninguna
 * 
 * EJEMPLO:
 * const tx = await startTransaction();
 * try {
 *   await tx.execute('INSERT INTO usuarios...');
 *   await tx.execute('INSERT INTO reportes...');
 *   await tx.commit();
 * } catch (e) {
 *   await tx.rollback();
 * }
 */
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

/**
 * Verifica que la conexión funcione
 */
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

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿QUÉ ES UN POOL DE CONEXIONES?
 * - Una BD puede manejar múltiples conexiones simultáneas
 * - Crear una conexión es costoso
 * - Pool reutiliza conexiones existentes
 * - Mejor rendimiento y menos uso de memoria
 * 
 * ¿PREPARED STATEMENTS?
 * - Separamos la SQL del código de los datos
 * - SQL: 'SELECT * FROM usuarios WHERE email = ?'
 * - DATOS: ['user@example.com']
 * - database maneja la escaping automáticamente
 * - Imposible inyectar SQL malicioso
 * 
 * ¿TRANSACCIONES?
 * - Aseguran que múltiples operaciones se hagan juntas
 * - Si falla una, todas se revierten (rollback)
 * - Ejemplo: si agregas usuario y reporte juntos
 *   - No puedes tener reporte sin usuario
 * 
 * ALTERNATIVAS EN PRODUCCIÓN:
 * - ORM (Sequelize, TypeORM): más abstracto, menos SQL manual
 * - Bases de datos NoSQL (MongoDB): otra filosofía, más flexible
 * - Redis: caché en memoria para lecturas frecuentes
 */
