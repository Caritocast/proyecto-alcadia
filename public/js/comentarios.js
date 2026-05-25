/**
 * ============================================================================
 * COMENTARIOS/FORO - JAVASCRIPT
 * ============================================================================
 * Maneja la visualización, creación y votación de comentarios
 * ============================================================================
 */

const COMENTARIOS = {
    apiUrl: 'http://localhost:3000/api/comentarios',
    usuarioAutenticado: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    filtroActual: 'todos',

    async init() {
        console.log('🗣️ Iniciando foro de comentarios');
        this.actualizarMenuUsuario();
        this.registrarEventosUI();
        this.cargarComentarios();

        // Mostrar botón si está autenticado
        if (this.usuarioAutenticado) {
            const btn = document.getElementById('comentario-crear-btn');
            if (btn) btn.style.display = 'block';
        }
    },

    registrarEventosUI() {
        const btnNuevo = document.getElementById('comentario-crear-btn');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => this.mostrarFormularioComentario());
        }

        const btnCancelar = document.getElementById('comentario-cancelar-btn');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', (event) => {
                event.preventDefault();
                this.ocultarFormularioComentario();
            });
        }

        const btnPublicar = document.getElementById('comentario-publicar-btn');
        if (btnPublicar) {
            btnPublicar.addEventListener('click', async (event) => {
                event.preventDefault();
                await this.crearComentario();
            });
        }

        const btnUbicacion = document.getElementById('comentario-ubicacion-btn');
        if (btnUbicacion) {
            btnUbicacion.addEventListener('click', () => this.obtenerUbicacion());
        }

        document.querySelectorAll('.filtro-btn[data-filtro-tipo]').forEach((btn) => {
            btn.addEventListener('click', () => this.filtrarTipo(btn.dataset.filtroTipo, btn));
        });

        const lista = document.getElementById('comentarios-lista');
        if (lista) {
            lista.addEventListener('click', async (event) => {
                const botonVoto = event.target.closest('button[data-voto-comentario-id]');
                if (!botonVoto) {
                    return;
                }

                const comentarioId = botonVoto.dataset.votoComentarioId;
                const tipoVoto = botonVoto.dataset.votoTipo;
                if (!comentarioId || !tipoVoto) {
                    return;
                }

                await this.votarComentario(comentarioId, tipoVoto);
            });
        }
    },

    async cargarComentarios() {
        try {
            let url = `${this.apiUrl}?pagina=1&limite=12`;

            // Agregar filtro si no es "todos"
            if (this.filtroActual !== 'todos') {
                url += `&tipo=${this.filtroActual}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error al cargar comentarios');
            }

            const data = await response.json();
            this.mostrarComentarios(data.comentarios);

        } catch (error) {
            console.error('Error cargando comentarios:', error);
            const lista = document.getElementById('comentarios-lista');
            lista.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gris);">No pudimos cargar los comentarios. Intenta más tarde.</p>';
        }
    },

    mostrarComentarios(comentarios) {
        const lista = document.getElementById('comentarios-lista');

        if (!comentarios || comentarios.length === 0) {
            lista.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gris);">No hay comentarios aún. ¡Sé el primero en compartir!</p>';
            return;
        }

        lista.innerHTML = comentarios.map(comentario => `
            <div style="background: var(--crema); padding: 24px; border-radius: var(--radio); border-left: 4px solid var(--verde);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: var(--verde); font-size: 16px;">${this.escaparHTML(comentario.titulo)}</h3>
                        <span style="display: inline-block; background: var(--verde-claro); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px;">
                            ${this.obtenerEmojiTipo(comentario.tipo)} ${this.obtenerLabelTipo(comentario.tipo)}
                        </span>
                        ${comentario.zona ? `<span style="display: inline-block; color: var(--gris); font-size: 12px;">📍 ${this.escaparHTML(comentario.zona)}</span>` : ''}
                        ${comentario.latitud && comentario.longitud ? `<span style="display: inline-block; color: var(--gris); font-size: 12px; margin-left: 8px;">📌 ${parseFloat(comentario.latitud).toFixed(4)}, ${parseFloat(comentario.longitud).toFixed(4)}</span>` : ''}
                    </div>
                </div>
                
                <p style="margin: 12px 0; color: var(--texto); line-height: 1.5;">${this.escaparHTML(comentario.contenido).substring(0, 150)}${comentario.contenido.length > 150 ? '...' : ''}</p>
                
                ${comentario.imagen_url ? `
                    <img src="${comentario.imagen_url}" alt="Imagen del comentario" style="max-width: 100%; height: auto; max-height: 300px; border-radius: 8px; margin: 12px 0; object-fit: cover;">
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--crema-oscuro);">
                    <div style="font-size: 12px; color: var(--gris);">
                        📅 ${this.formatearFecha(comentario.fecha_creacion)}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button data-voto-comentario-id="${comentario.id}" data-voto-tipo="positivo" style="background: none; border: 1px solid var(--dorado); color: var(--dorado); padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            👍 ${comentario.votos_positivos}
                        </button>
                        <button data-voto-comentario-id="${comentario.id}" data-voto-tipo="negativo" style="background: none; border: 1px solid var(--gris); color: var(--gris); padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            👎 ${comentario.votos_negativos}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async crearComentario() {
        if (!this.usuarioAutenticado) {
            alert('Debes iniciar sesión para crear un comentario');
            window.location.href = '/views/login.html';
            return;
        }

        const titulo = document.getElementById('comentario-titulo').value.trim();
        const contenido = document.getElementById('comentario-contenido').value.trim();
        const zona = document.getElementById('comentario-zona').value.trim();
        const tipo = document.getElementById('comentario-tipo').value;
        const imagenInput = document.getElementById('comentario-imagen');
        const lat = document.getElementById('comentario-lat').value;
        const lng = document.getElementById('comentario-lng').value;

        // Validación
        if (titulo.length < 5) {
            alert('El título debe tener al menos 5 caracteres');
            return;
        }

        if (contenido.length < 20) {
            alert('El contenido debe tener al menos 20 caracteres');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('contenido', contenido);
            formData.append('zona', zona || 'Chía (General)');
            formData.append('tipo', tipo);
            if (lat && lng) {
                formData.append('latitud', lat);
                formData.append('longitud', lng);
            }

            // Agregar imagen si existe
            if (imagenInput.files && imagenInput.files.length > 0) {
                const file = imagenInput.files[0];

                // Validar tamaño (máx 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('La imagen no puede exceder 5MB');
                    return;
                }

                formData.append('imagen', file);
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear comentario');
            }

            alert('✅ Comentario publicado exitosamente');
            this.ocultarFormularioComentario();
            this.cargarComentarios(); // Recargar lista

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async votarComentario(id, tipo) {
        try {
            const response = await fetch(`${this.apiUrl}/${id}/voto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ tipo })
            });

            if (!response.ok) {
                throw new Error('Error al votar');
            }

            // Recargar comentarios
            this.cargarComentarios();

        } catch (error) {
            console.error('Error votando:', error);
        }
    },

    mostrarFormularioComentario() {
        document.getElementById('comentario-form').style.display = 'block';
        document.getElementById('comentario-titulo').focus();
    },

    ocultarFormularioComentario() {
        document.getElementById('comentario-form').style.display = 'none';
        document.getElementById('comentario-titulo').value = '';
        document.getElementById('comentario-contenido').value = '';
        document.getElementById('comentario-zona').value = '';
        document.getElementById('comentario-tipo').value = 'observacion';
        document.getElementById('comentario-imagen').value = '';
        document.getElementById('comentario-lat').value = '';
        document.getElementById('comentario-lng').value = '';
        document.getElementById('ubicacion-info').textContent = '';

        // Restaurar botón de ubicación
        const botonUbicacion = document.getElementById('comentario-ubicacion-btn');
        if (botonUbicacion) {
            botonUbicacion.disabled = false;
            botonUbicacion.textContent = '📍 Obtener mi ubicación';
            botonUbicacion.style.backgroundColor = '';
            botonUbicacion.style.color = '';
        }
    },

    async filtrarTipo(tipo, botonActivo = null) {
        this.filtroActual = tipo;

        // Actualizar botones de filtro
        document.querySelectorAll('.filtro-btn').forEach(btn => {
            btn.classList.remove('activo');
        });
        if (botonActivo) {
            botonActivo.classList.add('activo');
        }

        // Recargar comentarios
        this.cargarComentarios();
    },

    actualizarMenuUsuario() {
        const userActions = document.getElementById('usuario-actions');
        if (!userActions || !this.usuarioAutenticado) {
            return;
        }

        userActions.innerHTML = `
            <span style="color: white; font-size: 14px; font-weight: 500;">👤 ${this.escaparHTML(this.usuarioAutenticado.nombre || 'Usuario')}</span>
            <a href="/dashboard.html" class="btn btn-secondary" style="font-size: 12px;">Dashboard</a>
            <button class="btn btn-primary" id="foro-cerrar-sesion-btn" style="font-size: 12px;">Cerrar</button>
        `;

        const btnCerrar = document.getElementById('foro-cerrar-sesion-btn');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => this.cerrarSesion());
        }
    },

    cerrarSesion() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.reload();
    },

    obtenerUbicacion() {
        const infoEl = document.getElementById('ubicacion-info');
        const botonUbicacion = document.getElementById('comentario-ubicacion-btn');
        if (!infoEl || !botonUbicacion) {
            return;
        }

        if (!navigator.geolocation) {
            infoEl.textContent = '❌ Geolocalización no disponible en tu navegador';
            infoEl.style.color = '#d32f2f';
            return;
        }

        botonUbicacion.disabled = true;
        botonUbicacion.textContent = '⏳ Obteniendo ubicación...';
        infoEl.textContent = '';
        infoEl.style.color = '#1a5c3a';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                document.getElementById('comentario-lat').value = latitude;
                document.getElementById('comentario-lng').value = longitude;

                infoEl.textContent = `✅ Ubicación obtenida (Precisión: ${accuracy.toFixed(0)}m)`;
                infoEl.style.color = '#2d7a50';
                botonUbicacion.textContent = '✅ 📍 Ubicación obtenida';
                botonUbicacion.style.backgroundColor = '#2d7a50';
                botonUbicacion.style.color = 'white';
            },
            (error) => {
                let errorMsg = '❌ No se pudo obtener ubicación: ';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Permiso denegado. Habilita location en configuración del navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'Información de ubicación no disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'Tiempo agotado al obtener ubicación.';
                        break;
                    default:
                        errorMsg += error.message;
                }

                infoEl.textContent = errorMsg;
                infoEl.style.color = '#d32f2f';
                botonUbicacion.disabled = false;
                botonUbicacion.textContent = '📍 Obtener mi ubicación';
            },
            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0
            }
        );
    },

    obtenerEmojiTipo(tipo) {
        const emojis = {
            'observacion': '📌',
            'denuncia': '⚠️',
            'sugerencia': '💡',
            'experiencia': '📖'
        };
        return emojis[tipo] || '📝';
    },

    obtenerLabelTipo(tipo) {
        const labels = {
            'observacion': 'Observación',
            'denuncia': 'Denuncia',
            'sugerencia': 'Sugerencia',
            'experiencia': 'Experiencia'
        };
        return labels[tipo] || 'Comentario';
    },

    formatearFecha(fecha) {
        const date = new Date(fecha);
        const ahora = new Date();
        const diff = Math.floor((ahora - date) / 1000);

        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;

        return date.toLocaleDateString('es-CO');
    },

    escaparHTML(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
};

// ============================================================================
// FUNCIONES GLOBALES PARA HTML
// ============================================================================

function mostrarFormularioComentario() {
    COMENTARIOS.mostrarFormularioComentario();
}

function ocultarFormularioComentario() {
    COMENTARIOS.ocultarFormularioComentario();
}

async function crearComentario() {
    await COMENTARIOS.crearComentario();
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        COMENTARIOS.init();
    });
} else {
    COMENTARIOS.init();
}