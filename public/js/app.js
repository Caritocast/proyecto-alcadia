/**
 * ============================================================================
 * APLICACIÓN PRINCIPAL - MOVILIDAD CHÍA
 * ============================================================================
 * - Chatbot mejorado con backend
 * - Formulario de contacto
 * - Panel de usuario
 * - Crear reportes
 * ============================================================================
 */

const APP = {
    apiUrl: 'http://localhost:3000/api',
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    conversationHistory: [],
    isLoading: false,

    /**
     * Inicializador principal
     */
    init() {
        console.log('🚀 Inicializando MóvilChía...');
        
        this.setupChatbot();
        this.setupForms();
        this.setupNavigation();
        this.checkAuth();
    },

    /**
     * ============================================================================
     * CHATBOT MEJORADO
     * ============================================================================
     */
    setupChatbot() {
        const sendBtn = document.getElementById('sendBtn');
        const userInput = document.getElementById('userInput');
        const sugButtons = document.querySelectorAll('.sug-btn');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (userInput) {
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        sugButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.sendSuggestion(btn.textContent);
            });
        });
    },

    /**
     * Enviar mensaje al chatbot
     */
    async sendMessage() {
        if (this.isLoading) return;

        const userInput = document.getElementById('userInput');
        const text = userInput.value.trim();

        if (!text) return;

        // Mostrar mensaje del usuario
        this.addMessage(text, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';

        // Agregar al historial
        this.conversationHistory.push({
            role: 'user',
            content: text
        });

        // Mostrar indicador de escritura
        this.showTypingIndicator();
        this.isLoading = true;

        try {
            // Usar respuestas locales inteligentes
            await this.generateLocalResponse(text);

        } catch (error) {
            console.error('Error enviando mensaje:', error);
            this.removeTypingIndicator();
            this.addMessage('Lo siento, ocurrió un error. Por favor intenta de nuevo.', 'bot');
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Generar respuesta local inteligente basada en palabras clave
     */
    async generateLocalResponse(question) {
        // Simular delay de procesamiento
        await new Promise(resolve => setTimeout(resolve, 800));

        const questionLower = question.toLowerCase();
        let reply = '';

        // Detectar palabras clave para tráfico
        const traficKeywords = ['tráfico', 'trafico', 'congestión', 'congestion', 'ruta', 'como llegar', 'cuanto tarda', 'hora', 'demora'];
        const isTraficQuestion = traficKeywords.some(keyword => questionLower.includes(keyword));

        try {
            if (isTraficQuestion) {
                // Consultar API de tráfico
                reply = await this.obtenerInfoTrafico(question);
            } else if (questionLower.includes('regiotram') || questionLower.includes('tren')) {
                reply = '🚆 El REGIOTRAM es un proyecto de transporte rápido para la región. Actualmente en fase de planificación y construcción. ¿Quieres reportar un problema relacionado con transporte?';
            } else if (questionLower.includes('bici') || questionLower.includes('ciclovía')) {
                reply = '🚴 En Chía estamos mejorando la infraestructura para bicicletas. Si detectaste una ciclovía en mal estado, puedes crear un **reporte** desde nuestro panel.';
            } else if (questionLower.includes('bus') || questionLower.includes('transporte público')) {
                reply = '🚌 El transporte público en Chía incluye buses urbanos. ¿Hay algún problema específico que quieras reportar? Puedes crear un reporte dando click en "Crear Reporte".';
            } else if (questionLower.includes('reportar') || questionLower.includes('crear reporte')) {
                reply = '📝 Para crear un reporte: ve a **Crear Reporte**, llena el formulario, selecciona el tipo de problema y la severidad. ¡Tu aporte es vital para mejorar la movilidad!';
            } else if (questionLower.includes('ayuda') || questionLower.includes('cómo')) {
                reply = '💡 Puedo ayudarte con: preguntas sobre REGIOTRAM, ciclovías, transporte, estado de tráfico en Chía, o cómo crear reportes. ¿Qué necesitas?';
            } else if (questionLower.includes('gracias')) {
                reply = '¡De nada! 😊 Seguimos trabajando por una mejor movilidad en Chía. ¿Hay algo más en lo que pueda ayudarte?';
            } else {
                // Respuesta genérica inteligente
                const responses = [
                    'Ese es un buen punto sobre movilidad en Chía. ¿Te gustaría crear un reporte al respecto?',
                    'Entiendo. La movilidad es clave. ¿Quieres reportar un problema específico?',
                    'Ese tema es importante. En MóvilChía puedes reportar problemas de transporte, ciclovías y más.'
                ];
                reply = responses[Math.floor(Math.random() * responses.length)];
            }
        } catch (error) {
            reply = 'Disculpa, no pude procesar tu pregunta. Intenta nuevamente.';
        }

        this.removeTypingIndicator();
        this.addMessage(reply, 'bot');

        this.conversationHistory.push({
            role: 'assistant',
            content: reply
        });
    },

    /**
     * Obtener información de tráfico en tiempo real
     */
    async obtenerInfoTrafico(question) {
        try {
            const response = await fetch(`${this.apiUrl}/trafico/estado`);
            
            if (!response.ok) {
                throw new Error('Error al obtener tráfico');
            }

            const datos = await response.json();
            const estimacion = datos.estimacion || datos;

            // Construir respuesta descriptiva
            let respuesta = `🗺️ **Estado de Tráfico en Chía**\n\n`;
            respuesta += `${estimacion.informacion || ''}\n\n`;
            
            if (estimacion.puntos) {
                respuesta += `📍 **Por zonas:**\n`;
                for (const [zona, info] of Object.entries(estimacion.puntos)) {
                    const emoji = info.nivel === 'congestionado' ? '🔴' : info.nivel === 'moderado' ? '🟡' : '🟢';
                    respuesta += `${emoji} ${zona}: ${info.nivel} (${info.estimado_velocidad_kmh} km/h)\n`;
                }
            }

            respuesta += `\n💡 ${estimacion.sugerencia || 'Consulta nuevamente para actualizaciones'}`;

            return respuesta;

        } catch (error) {
            console.error('Error con API de tráfico:', error);
            return '🗺️ Estado de tráfico: No disponible en este momento. Intenta en unos segundos.';
        }
    },

    /**
     * Guardar log de conversación (futuro: implementar en backend)
     */
    async saveChatLog(pregunta, respuesta) {
        // TODO: Implementar endpoint POST /api/chatbot/guardar en backend
        // Por ahora solo se guardan en memoria en conversationHistory
        console.log('Chat guardado en memoria:', { pregunta, respuesta });
    },

    /**
     * Agregar mensaje al chat
     */
    addMessage(content, role) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        const div = document.createElement('div');
        div.className = `msg ${role}`;

        const avatar = role === 'bot' ? '🗺️' : '👤';
        const formattedContent = content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        div.innerHTML = `
            <div class="msg-avatar">${avatar}</div>
            <div class="msg-bubble">${formattedContent}</div>
        `;

        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    /**
     * Mostrar indicador de escritura
     */
    showTypingIndicator() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        const div = document.createElement('div');
        div.className = 'msg bot';
        div.id = 'typing-msg';
        div.innerHTML = `
            <div class="msg-avatar">🗺️</div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    /**
     * Remover indicador de escritura
     */
    removeTypingIndicator() {
        const typingMsg = document.getElementById('typing-msg');
        if (typingMsg) typingMsg.remove();
    },

    /**
     * Enviar sugerencia predefinida
     */
    sendSuggestion(text) {
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.value = text;
            userInput.focus();
            this.sendMessage();
        }
    },

    /**
     * ============================================================================
     * FORMULARIO DE CONTACTO
     * ============================================================================
     */
    setupForms() {
        // Aquí irán los formularios adicionales
        // Por ahora, el contacto va en un modal o página separada
    },

    /**
     * Enviar formulario de contacto
     */
    async submitContactForm(formData) {
        try {
            const response = await fetch(`${this.apiUrl}/contactos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al enviar');
            }

            const data = await response.json();
            return { success: true, message: 'Mensaje enviado exitosamente' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * ============================================================================
     * REPORTES (CRUD)
     * ============================================================================
     */

    /**
     * Crear nuevo reporte
     */
    async crearReporte(reporteData) {
        if (!this.token) {
            return { success: false, error: 'Debes iniciar sesión' };
        }

        try {
            const response = await authenticatedFetch(`${this.apiUrl}/reportes`, {
                method: 'POST',
                body: JSON.stringify(reporteData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear reporte');
            }

            return { success: true, reporte: data.reporte };

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Listar reportes
     */
    async listarReportes(filtros = {}) {
        try {
            const params = new URLSearchParams(filtros);
            const response = await fetch(
                `${this.apiUrl}/reportes?${params}`,
                this.token ? {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                } : {}
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al listar reportes');
            }

            const data = await response.json();
            return { success: true, data };

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtener un reporte
     */
    async obtenerReporte(id) {
        try {
            const response = await fetch(`${this.apiUrl}/reportes/${id}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al obtener reporte');
            }

            const data = await response.json();
            return { success: true, reporte: data };

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Actualizar reporte
     */
    async actualizarReporte(id, datos) {
        if (!this.token) {
            return { success: false, error: 'Debes iniciar sesión' };
        }

        try {
            const response = await authenticatedFetch(`${this.apiUrl}/reportes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar');
            }

            return { success: true, reporte: data.reporte };

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Eliminar reporte
     */
    async eliminarReporte(id) {
        if (!this.token) {
            return { success: false, error: 'Debes iniciar sesión' };
        }

        try {
            const response = await authenticatedFetch(`${this.apiUrl}/reportes/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar');
            }

            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * ============================================================================
     * NAVEGACIÓN Y AUTENTICACIÓN
     * ============================================================================
     */

    /**
     * Verificar estado de autenticación
     */
    checkAuth() {
        if (this.user) {
            console.log('✅ Usuario autenticado:', this.user.email);
            // Aquí puedes actualizar UI para mostrar nombre del usuario
            this.updateUserUI();
        } else {
            console.log('⚠️ Usuario no autenticado');
        }
    },

    /**
     * Actualizar interfaz con datos del usuario
     */
    updateUserUI() {
        // Actualizar elementos que muestren nombre/email del usuario
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');

        userNameElements.forEach(el => {
            el.textContent = this.user.nombre;
        });

        userEmailElements.forEach(el => {
            el.textContent = this.user.email;
        });
    },

    /**
     * Setup de navegación
     */
    setupNavigation() {
        // Aquí van los event listeners de navegación
        // Por ejemplo, botones para crear reportes, perfil, etc.
    },

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/views/login.html';
    }
};

/**
 * ============================================================================
 * UTILIDADES GLOBALES
 * ============================================================================
 */

/**
 * Fetch autenticado (incluye token)
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * ============================================================================
 * INICIALIZACIÓN
 * ============================================================================
 */

// Cuando el DOM esté listo, inicializar app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        APP.init();
    });
} else {
    APP.init();
}

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿PATRÓN SINGLETON (APP object)?
 * - Objeto único que contiene toda la lógica
 * - Evita funciones globales (contaminar global scope)
 * - Fácil de mantener: APP.crearReporte(), APP.logout()
 * 
 * ¿ASYNC/AWAIT?
 * - Alternativa moderna a .then()
 * - Código más legible (parece sincrónico)
 * - Manejo de errores con try/catch
 * 
 * FLUJO DE CREAR REPORTE:
 * 1. Usuario llena formulario
 * 2. JavaScript valida
 * 3. Llamar APP.crearReporte(datos)
 * 4. Fetch POST /api/reportes + token
 * 5. Backend valida datos
 * 6. Backend almacena en BD
 * 7. Backend retorna reporte creado
 * 8. JavaScript actualiza UI
 * 9. Mostrar confirmación al usuario
 * 
 * ¿HISTORIAL DEL CHATBOT?
 * conversationHistory es array de mensajes
 * [
 *   { role: 'user', content: '¿Dónde está el REGIOTRAM?' },
 *   { role: 'assistant', content: '...' },
 *   ...
 * ]
 * 
 * Enviamos historial completo en cada request
 * Para que la IA tenga contexto de conversación anterior
 * 
 * ¿POR QUÉ SEPARAR EN MÓDULOS?
 * - setupChatbot(): lógica del chatbot
 * - setupForms(): lógica de formularios
 * - crearReporte(): CRUD reportes
 * 
 * Cada cosa en su función:
 * - Fácil de debugear
 * - Fácil de mantener
 * - Fácil de reutilizar
 * - Código más limpio
 */
