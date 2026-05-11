/**
 * ============================================================================
 * RUTAS DE TRÁFICO - DETECCIÓN EN TIEMPO REAL
 * ============================================================================
 * Utiliza Google Maps API para obtener información de tráfico
 * Analiza congestión en Chía, Cundinamarca
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const https = require('https');

/**
 * Coordenadas de Chía, Cundinamarca
 */
const CHIA_COORDS = {
    center: { lat: 4.8570, lon: -74.0422 },
    // Puntos de interés principales en Chía
    puntos: {
        casco_urbano: { lat: 4.8570, lon: -74.0422 },
        regiotram_norte: { lat: 4.8600, lon: -74.0400 },
        regiotram_sur: { lat: 4.8500, lon: -74.0450 },
        zona_comercial: { lat: 4.8580, lon: -74.0380 },
        parque_central: { lat: 4.8560, lon: -74.0440 }
    }
};

/**
 * Obtener información de tráfico en tiempo real
 * GET /api/trafico/estado
 */
router.get('/estado', async (req, res) => {
    try {
        // Si tienes API Key de Google Maps, aquí se haría la llamada
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
            // Sin API Key: retornar datos simulados inteligentes
            return res.json(getEstimacionTraficoLocal());
        }

        // Con API Key: obtener datos reales de Google Maps
        const datosReales = await obtenerTraficoGoogle(apiKey);
        res.json(datosReales);

    } catch (error) {
        console.error('Error obteniendo tráfico:', error);
        res.status(500).json({ 
            error: 'No se pudo obtener información de tráfico',
            estimacion: getEstimacionTraficoLocal() // Fallback a datos locales
        });
    }
});

/**
 * Obtener información de ruta específica
 * GET /api/trafico/ruta/:desde/:hacia
 */
router.get('/ruta/:desde/:hacia', async (req, res) => {
    try {
        const { desde, hacia } = req.params;
        
        // Mapear nombres comunes a coordinadas
        const coordDesde = mapearPunto(desde);
        const coordHacia = mapearPunto(hacia);

        if (!coordDesde || !coordHacia) {
            return res.status(400).json({ 
                error: 'Punto de origen o destino no reconocido',
                puntosDisponibles: Object.keys(CHIA_COORDS.puntos)
            });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        let duracion, distancia, trafico;

        if (apiKey && apiKey !== 'TU_API_KEY_AQUI') {
            // Usar API real de Google
            const dataGoogle = await obtenerRutaGoogle(apiKey, coordDesde, coordHacia);
            duracion = dataGoogle.duracion;
            distancia = dataGoogle.distancia;
            trafico = dataGoogle.trafico;
        } else {
            // Estimar localmente
            const dataLocal = estimarRutaLocal(coordDesde, coordHacia);
            duracion = dataLocal.duracion;
            distancia = dataLocal.distancia;
            trafico = dataLocal.trafico;
        }

        res.json({
            desde,
            hacia,
            duracion,
            trafico,
            distancia,
            recomendacion: generarRecomendacion(trafico)
        });

    } catch (error) {
        console.error('Error obteniendo ruta:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Obtener alertas de tráfico activas
 * GET /api/trafico/alertas
 */
router.get('/alertas', async (req, res) => {
    try {
        const alertas = getAlertasTrafico();
        res.json({
            total: alertas.length,
            actualizacion: new Date().toISOString(),
            alertas
        });

    } catch (error) {
        console.error('Error obteniendo alertas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * ============================================================================
 * FUNCIONES AUXILIARES - DATOS LOCALES
 * ============================================================================
 */

/**
 * Estimar tráfico local sin API Key
 */
function getEstimacionTraficoLocal() {
    const hora = new Date().getHours();
    const esHorasPico = (hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 19);
    
    return {
        ciudad: 'Chía, Cundinamarca',
        tipo: 'estimacion_local',
        timestamp: new Date().toISOString(),
        nivel_general: esHorasPico ? 'congestionado' : 'fluido',
        color_google_maps: esHorasPico ? 'red' : 'green',
        informacion: esHorasPico 
            ? '🚴 Hora pico detectada. Tráfico congestionado en zonas principales.'
            : '✅ Tráfico fluido en Chía. Buenas condiciones para desplazarse.',
        puntos: {
            'Casco Urbano': {
                nivel: esHorasPico ? 'congestionado' : 'fluido',
                estimado_velocidad_kmh: esHorasPico ? 25 : 50,
                ocupacion: esHorasPico ? '80%' : '30%'
            },
            'Zona Comercial': {
                nivel: esHorasPico ? 'moderado' : 'fluido',
                estimado_velocidad_kmh: esHorasPico ? 35 : 55,
                ocupacion: esHorasPico ? '60%' : '25%'
            },
            'Acceso REGIOTRAM': {
                nivel: 'fluido',
                estimado_velocidad_kmh: 50,
                ocupacion: '40%'
            }
        },
        sugerencia: esHorasPico 
            ? 'Considera esperar o usar transporte público'
            : 'Hora buena para viajar'
    };
}

/**
 * Llama a Google Maps API (cuando esté configurado)
 */
async function obtenerTraficoGoogle(apiKey) {
    return new Promise((resolve, reject) => {
        // Formato de URL para Google Maps Traffic Layer
        // Especificación: https://developers.google.com/maps/documentation/roads
        
        const url = `https://maps.googleapis.com/maps/api/directions/json?` +
            `origin=${CHIA_COORDS.center.lat},${CHIA_COORDS.center.lon}` +
            `&destination=${CHIA_COORDS.center.lat},${CHIA_COORDS.center.lon}` +
            `&departure_time=now` +
            `&traffic_model=best_guess` +
            `&key=${apiKey}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status === 'OK') {
                        const route = response.routes[0];
                        const duracionTrafico = route.legs[0].duration_in_traffic;
                        resolve({
                            tipo: 'tiempo_real',
                            duracion_minutos: Math.round(duracionTrafico.value / 60),
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        reject(new Error(response.status));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Obtener ruta específica de Google Maps
 */
async function obtenerRutaGoogle(apiKey, desde, hacia) {
    return new Promise((resolve, reject) => {
        const url = `https://maps.googleapis.com/maps/api/directions/json?` +
            `origin=${desde.lat},${desde.lon}` +
            `&destination=${hacia.lat},${hacia.lon}` +
            `&departure_time=now` +
            `&traffic_model=best_guess` +
            `&key=${apiKey}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status === 'OK') {
                        const route = response.routes[0].legs[0];
                        const duracionTrafico = route.duration_in_traffic || route.duration;
                        
                        resolve({
                            duracion: Math.round(duracionTrafico.value / 60),
                            distancia: Math.round(route.distance.value / 1000, 2),
                            trafico: duracionTrafico.text
                        });
                    } else {
                        reject(new Error(response.status));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Estimar ruta localmente sin API
 */
function estimarRutaLocal(desde, hacia) {
    // Calcular distancia aproximada
    const distancia = calcularDistancia(desde, hacia);
    
    // Estimar tiempo según hora del día
    const hora = new Date().getHours();
    const esHorasPico = (hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 19);
    
    // Promedio: 40 km/h en fluido, 20 km/h en congestión
    const velocidad = esHorasPico ? 20 : 40;
    const duracion = Math.round((distancia / velocidad) * 60);
    
    return {
        duracion,
        distancia: distancia.toFixed(2),
        trafico: esHorasPico ? `${duracion} min (tráfico)` : `${duracion} min`
    };
}

/**
 * Mapear nombre de punto a coordenadas
 */
function mapearPunto(nombre) {
    const nombreLower = nombre.toLowerCase().replace(/\s+/g, '_');
    
    // Buscar en puntos conocidos
    if (CHIA_COORDS.puntos[nombreLower]) {
        return CHIA_COORDS.puntos[nombreLower];
    }
    
    // Buscar por similitud
    for (const [clave, coord] of Object.entries(CHIA_COORDS.puntos)) {
        if (clave.includes(nombreLower) || nombreLower.includes(clave)) {
            return coord;
        }
    }
    
    return null;
}

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
function calcularDistancia(desde, hacia) {
    const R = 6371; // Radio tierra en km
    const dLat = (hacia.lat - desde.lat) * Math.PI / 180;
    const dLon = (hacia.lon - desde.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(desde.lat * Math.PI / 180) * Math.cos(hacia.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Generar recomendación basada en tráfico
 */
function generarRecomendacion(trafico) {
    if (trafico.includes('congestion') || trafico.includes('tráfico')) {
        return '⚠️ Considera usar transporte público o esperar';
    } else if (trafico.includes('moderado')) {
        return '✅ Tráfico moderado, puedes viajar normalmente';
    } else {
        return '✅ Excelentes condiciones para viajar';
    }
}

/**
 * Obtener alertas activas de tráfico
 */
function getAlertasTrafico() {
    const hora = new Date().getHours();
    const alertas = [];
    
    if (hora >= 7 && hora <= 9) {
        alertas.push({
            tipo: 'congestión',
            ubicacion: 'Casco Urbano - Zona comercial',
            severidad: 'alta',
            causa: 'Hora pico matutina',
            consejo: 'Considera salir 15 minutos antes'
        });
    }
    
    if (hora >= 17 && hora <= 19) {
        alertas.push({
            tipo: 'congestión',
            ubicacion: 'Accesos a Bogotá',
            severidad: 'alta',
            causa: 'Hora pico vespertina',
            consejo: 'Usa alternativas viales o transporte público'
        });
    }
    
    // Siempre mencionar estado general
    alertas.push({
        tipo: 'información',
        ubicacion: 'Chía (General)',
        severidad: 'baja',
        causa: 'Actualización en tiempo real',
        consejo: `Tráfico ${hora >= 7 && hora <= 20 ? 'moderado a congestionado' : 'fluido'}`
    });
    
    return alertas;
}

module.exports = router;
