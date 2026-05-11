/**
 * Dashboard principal
 * Carga perfil y reportes del usuario autenticado.
 */

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');
const userId = user?.userId || user?.id;

// Si no está autenticado, redirigir
if (!token || !user || !userId) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/views/login.html';
}

// Mostrar nombre del usuario
const userNameEl = document.querySelector('.user-name');
if (userNameEl) {
    userNameEl.textContent = user?.nombre || 'Usuario';
}

// Cargar contenido del dashboard
async function loadDashboard() {
    const apiUrl = 'http://localhost:3000/api';

    try {
        // Obtener datos del usuario
        const userRes = await fetch(`${apiUrl}/usuarios/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userRes.ok) {
            throw new Error('No se pudieron cargar los datos del usuario');
        }

        const userData = await userRes.json();

        // Obtener reportes del usuario
        const reportesRes = await fetch(`${apiUrl}/usuarios/${userId}/reportes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!reportesRes.ok) {
            throw new Error('No se pudieron cargar los reportes');
        }

        const reportesData = await reportesRes.json();

        // Renderizar contenido
        let html = `
            <h2>Tu Perfil</h2>
            <div class="card">
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Rol:</strong> ${userData.rol}</p>
                <p><strong>Registrado:</strong> ${new Date(userData.fecha_registro).toLocaleDateString('es-CO')}</p>
                <p><strong>Total de reportes:</strong> ${userData.total_reportes}</p>
            </div>

            <h2 style="margin-top: 32px;">Tus Reportes</h2>
            <div class="card-grid">
        `;

        if (!reportesData.reportes || reportesData.reportes.length === 0) {
            html += `
                <div class="card">
                    <p>No has creado reportes aún.</p>
                    <button class="card-btn" onclick="crearReporte()">
                        Crear Reporte
                    </button>
                </div>
            `;
        } else {
            reportesData.reportes.forEach((reporte) => {
                html += `
                    <div class="card">
                        <h2>${reporte.titulo}</h2>
                        <p>${reporte.descripcion?.substring(0, 100)}...</p>
                        <p><strong>Estado:</strong> ${reporte.estado}</p>
                        <p><strong>Severidad:</strong> ${reporte.severidad}</p>
                        <button class="card-btn" onclick="verReporte(${reporte.id})">
                            Ver Detalles
                        </button>
                    </div>
                `;
            });
        }

        html += `
                <div class="card" style="display: flex; align-items: center; justify-content: center;">
                    <button class="card-btn" style="width: 100%;" onclick="crearReporte()">
                        + Crear Nuevo Reporte
                    </button>
                </div>
            </div>

            <div style="margin-top: 48px;">
                <h2>Opciones Adicionales</h2>
                <div class="card-grid">
                    <div class="card">
                        <h2>Estadisticas</h2>
                        <p>Ver estadisticas de movilidad en Chia</p>
                        <button class="card-btn">Ver Estadisticas</button>
                    </div>
                    <div class="card">
                        <h2>Configuracion</h2>
                        <p>Actualiza tu perfil y preferencias</p>
                        <button class="card-btn">Editar Perfil</button>
                    </div>
                </div>
            </div>
        `;

        const contentEl = document.getElementById('content');
        if (contentEl) {
            contentEl.innerHTML = html;
        }

    } catch (error) {
        console.error('Error cargando dashboard:', error);
        const contentEl = document.getElementById('content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="card">
                    <p>Error cargando datos. Por favor recarga la pagina.</p>
                </div>
            `;
        }
    }
}

function crearReporte() {
    window.location.href = '/views/reporte.html';
}

function verReporte(id) {
    alert(`Ver reporte ${id} - proximamente implementado`);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/views/login.html';
}

window.crearReporte = crearReporte;
window.verReporte = verReporte;
window.logout = logout;

loadDashboard();
