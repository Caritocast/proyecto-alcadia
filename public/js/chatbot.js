const CHATBOT = {
    apiUrl: 'http://localhost:3000/api',
    conversationHistory: [],
    isLoading: false,
    formCollecting: false,
    formData: {},
    formType: null,
    reportMap: null,
    reportMarker: null,
    leafletLoader: null,

    init() {
        console.log('🚀 Chatbot MóvilChía iniciado');
        this.setupEventListeners();
    },

    setupEventListeners() {
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
                this.sendMessage(btn.textContent);
            });
        });

        const scrollLink = document.querySelector('.scroll-cta a');
        if (scrollLink) {
            scrollLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('chatbot-section').scrollIntoView({ behavior: 'smooth' });
            });
        }
    },

    async sendMessage(suggestedText = null) {
        if (this.isLoading) return;

        const input = document.getElementById('userInput');
        let text = suggestedText || input.value.trim();

        if (!text) return;

        if (!suggestedText) {
            input.value = '';
            input.style.height = 'auto';
        } else {
            input.value = text;
            input.style.height = 'auto';
        }

        this.addMessage(text, 'user');

        this.conversationHistory.push({
            role: 'user',
            content: text
        });

        this.showTyping();
        this.isLoading = true;

        try {
            const reply = await this.generateResponse(text);
            this.removeTyping();
            this.addMessage(reply, 'bot');

            this.conversationHistory.push({
                role: 'assistant',
                content: reply
            });

        } catch (error) {
            console.error('Error:', error);
            this.removeTyping();
            this.addMessage('Disculpa, ocurrió un error. Intenta de nuevo.', 'bot');
        } finally {
            this.isLoading = false;
            input.focus();
        }
    },

    async generateResponse(question) {
        const questionLower = question.toLowerCase();

        if (this.esConsultaLeyTransito(questionLower)) {
            return this.responderConsultaLeyTransito(question, questionLower);
        }

        const reportKeywords = ['reportar', 'crear reporte', 'problema', 'queja', 'denuncia', 'error', 'mal estado'];
        const wantsToReport = reportKeywords.some(keyword => questionLower.includes(keyword));

        if (wantsToReport) {
            this.mostrarFormularioReporte();
            return 'Perfecto. Te guiaré paso a paso para reportar el incidente:\n1) Tipo de incidente\n2) Descripción\n3) Imagen (opcional)\n4) Ubicación en mapa\n\nCuando revises el resumen, presiona Guardar Reporte.';
        }

        const suggestionKeywords = ['sugerencia', 'propuesta', 'comentario', 'idea', 'mejorar', 'opinión'];
        const wantsToSuggest = suggestionKeywords.some(keyword => questionLower.includes(keyword));

        if (wantsToSuggest) {
            this.mostrarFormularioComentario('sugerencia');
            return '¡Excelente! Tus ideas nos ayudan a mejorar. Cuéntanos tu sugerencia:';
        }

        const trafficKeywords = ['tráfico', 'trafico', 'congestión', 'congestion', 'ruta', 'como llegar', 'cuanto tarda', 'hora', 'demora', 'velocidad', 'estado vial', 'accidente', 'embotelamiento'];
        const isTrafficIssue = trafficKeywords.some(keyword => questionLower.includes(keyword));

        if (isTrafficIssue && questionLower.includes('problema')) {
            this.mostrarFormularioReporte('trafico');
            return 'Entendido. Vou a ayudarte a reportar el problema de tráfico. Por favor, cuéntame más:';
        }

        const denunciaKeywords = ['denuncia', 'denunciar', 'ilegal', 'violación', 'accidente grave', 'conductores irresponsables'];
        const isDenuncia = denunciaKeywords.some(keyword => questionLower.includes(keyword));

        if (isDenuncia) {
            this.mostrarFormularioComentario('denuncia');
            return '🚨 Lo siento saber eso. Tu denuncia es importante. Cuéntame qué sucedió:';
        }

        const traficKeywords = ['tráfico', 'trafico', 'congestión', 'congestion', 'ruta', 'como llegar', 'cuanto tarda', 'hora', 'demora', 'velocidad', 'estado vial'];
        const isTraficQuestion = traficKeywords.some(keyword => questionLower.includes(keyword));

        if (isTraficQuestion) {
            return await this.obtenerTraficoEnTiempoReal();
        }

        if (questionLower.includes('regiotram')) {
            return '🚆 El REGIOTRAM del Norte es un proyecto de transporte rápido que conectará Bogotá con Zipaquirá pasando por Chía. Actualmente en construcción, se espera que revolucione la movilidad en la región.\n\n¿Quieres reportar un problema relacionado?';
        }

        if (questionLower.includes('ciclovía') || questionLower.includes('bici')) {
            return '🚴 Chía está mejorando su infraestructura para biciclistas. Si encontraste un problema en una ciclovía, puedes crear un reporte desde nuestro chat.\n\n¿Necesitas hacerlo?';
        }

        if (questionLower.includes('buses') || questionLower.includes('transporte público')) {
            return '🚌 Chía cuenta con rutas de transporte público hacia Bogotá (Expreso del Norte y rutas municipales). Si tienes problemas con el servicio, puedo ayudarte a crearun reporte.\n\n¿Deseas reportar algo?';
        }

        if (questionLower.includes('derechos') || questionLower.includes('normatividad')) {
            return '📋 Derechos en movilidad (Ley 769 de 2002):\n✓ Acceso a transporte seguro\n✓ Infraestructura adecuada\n✓ Información clara sobre rutas\n✓ Trato digno\n\nPara denuncias, contacta la Alcaldía de Chía.';
        }

        if (questionLower.includes('autopista')) {
            return '🛣️ La Autopista Norte es crítica para Chía. Actualmente experimenta congestión crónica, especialmente en horas pico. El REGIOTRAM podría aliviar esta presión. ¿Hay algún problema específico?';
        }

        return '¡Excelente pregunta sobre movilidad en Chía! 🗺️\n\nPuedo ayudarte con:\n• Estado actual de tráfico 🚗\n• Crear reportes de problemas 📝\n• Hacer sugerencias de mejora 💡\n• Proyectos como REGIOTRAM 🚆\n\n¿Qué necesitas?';
    },

    esConsultaLeyTransito(questionLower) {
        const legalKeywords = [
            'ley 769', 'codigo nacional de transito', 'código nacional de tránsito',
            'comparendo', 'infraccion', 'infracción', 'multa', 'sancion', 'sanción',
            'licencia', 'soat', 'revision tecnico mecanica', 'revisión técnico mecánica',
            'senal', 'señal', 'semaforo', 'semáforo', 'peaton', 'peatón',
            'cinturon', 'cinturón', 'casco', 'autoridad de transito', 'autoridad de tránsito',
            'inmovilizacion', 'inmovilización', 'pico y placa', 'procedimiento de transito',
            'procedimiento de tránsito'
        ];

        return legalKeywords.some((keyword) => questionLower.includes(keyword));
    },

    responderConsultaLeyTransito(question, questionLower) {
        if (!this.esConsultaLeyTransito(questionLower)) {
            return 'Puedo orientarte únicamente en temas de tránsito y seguridad vial en Colombia (Ley 769 de 2002), como comparendos, señales, sanciones, documentación y deberes de conductores o peatones.';
        }

        if (questionLower.includes('sin licencia') || (questionLower.includes('licencia') && questionLower.includes('no tengo'))) {
            return 'Conducir sin licencia es una infracción de tránsito.\n\nFundamento legal:\n• Ley 769 de 2002: la conducción exige licencia vigente (régimen de licencias del Código).\n• Artículo 131: establece multas para las infracciones.\n\nConsecuencia habitual:\n• Tipo de infracción: conducir sin portar o sin tener licencia válida.\n• Sanción: multa y posible inmovilización del vehículo según el caso.\n\nOrientación práctica: si te imponen comparendo, revisa el código exacto de la infracción y verifica si procede inmovilización en el acto administrativo.';
        }

        if (questionLower.includes('soat')) {
            return 'El SOAT es obligatorio para circular en Colombia.\n\nFundamento legal:\n• Régimen de tránsito y seguros obligatorios en Colombia.\n• Artículo 131 de la Ley 769 de 2002: sanciona circular sin documentos obligatorios o incumplir deberes de tránsito.\n\nConsecuencia habitual:\n• Tipo de infracción: transitar sin SOAT vigente.\n• Sanción: multa y, en muchos casos, inmovilización del vehículo.\n\nRecomendación: valida vigencia del SOAT antes de circular y conserva soporte físico o digital.';
        }

        if (questionLower.includes('casco') || questionLower.includes('moto') || questionLower.includes('motocic')) {
            return 'Para motociclistas, el uso de casco es obligatorio.\n\nFundamento legal:\n• Artículo 94 de la Ley 769 de 2002: normas para motociclistas (incluye uso de casco para conductor y acompañante).\n• Artículo 131: multas por infracciones.\n\nConsecuencia habitual:\n• Tipo de infracción: no usar casco de seguridad.\n• Sanción: multa y posibles medidas adicionales de control.';
        }

        if (questionLower.includes('cinturon') || questionLower.includes('cinturón')) {
            return 'El uso del cinturón de seguridad es una obligación de seguridad vial para conductor y ocupantes cuando aplique.\n\nFundamento legal:\n• Código Nacional de Tránsito (Ley 769 de 2002) y normas reglamentarias de seguridad.\n• Artículo 131: multas por incumplimiento.\n\nConsecuencia habitual:\n• Tipo de infracción: no usar cinturón de seguridad.\n• Sanción: multa.';
        }

        if (questionLower.includes('senal') || questionLower.includes('señal') || questionLower.includes('semaforo') || questionLower.includes('semáforo')) {
            return 'Las señales y semáforos son de obligatorio cumplimiento.\n\nFundamento legal:\n• Artículo 109 de la Ley 769 de 2002: obligación de acatar señales de tránsito.\n• Artículo 131: multas por infringir señales o normas de circulación.\n\nConsecuencia habitual:\n• Tipo de infracción: desobedecer señales o semáforos.\n• Sanción: multa y, según gravedad, otras medidas administrativas.';
        }

        if (questionLower.includes('comparendo') || questionLower.includes('procedimiento')) {
            return 'El comparendo inicia un procedimiento administrativo contravencional, no una condena automática.\n\nFundamento legal:\n• Artículo 135 de la Ley 769 de 2002: orden de comparendo y procedimiento básico.\n• Artículo 136: opciones de pago y beneficios por pronto pago (cuando procedan).\n• Artículo 131: marco sancionatorio de multas.\n\nOrientación práctica:\n• Verifica datos del comparendo (hechos, fecha, placa, autoridad).\n• Respeta términos para audiencia o pago.\n• Conserva pruebas si deseas controvertir la infracción.';
        }

        if (questionLower.includes('peaton') || questionLower.includes('peatón')) {
            return 'Los peatones también tienen derechos y deberes en la vía.\n\nFundamento legal:\n• Ley 769 de 2002: reglas de comportamiento y prioridad vial para actores de la vía.\n• Artículo 131: sanciones por comportamientos contrarios a las normas de tránsito.\n\nOrientación práctica:\n• Cruza por zonas permitidas y respeta semáforos peatonales.\n• Conductores deben proteger al peatón y reducir riesgo en zonas de cruce.';
        }

        if (questionLower.includes('pico y placa')) {
            return 'El pico y placa es una medida administrativa local, no una regla única nacional de la Ley 769.\n\nFundamento legal:\n• Autoridades territoriales pueden regular la circulación por actos locales, dentro del marco del tránsito.\n\nConsecuencia habitual:\n• Tipo de infracción: incumplir restricción local de circulación.\n• Sanción: multa y posible inmovilización, según norma vigente en tu ciudad/municipio.\n\nSi quieres, te ayudo a interpretar una resolución local específica.';
        }

        return 'Puedo orientarte con base en la Ley 769 de 2002 en temas como comparendos, señales, sanciones, documentación obligatoria, derechos y deberes viales.\n\nPara darte una respuesta precisa, cuéntame el caso concreto (qué ocurrió, qué vehículo, qué autoridad intervino y qué documento recibiste). Si no tengo certeza en un punto, te lo indicaré claramente.';
    },

    mostrarFormularioReporte(tipo = null) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        this.formCollecting = true;
        this.formType = 'reporte';
        this.formData = { tipo: tipo || 'general' };

        const div = document.createElement('div');
        div.className = 'msg bot';
        div.id = 'form-msg';
        div.innerHTML = `
            <div class="msg-avatar">📝</div>
            <div class="msg-bubble">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">1) Tipo de incidente:</label>
                    <select id="form-tipo" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="accidente">🚗 Accidente</option>
                        <option value="trafico">🚦 Congestionamiento</option>
                        <option value="infraestructura">🛣️ Mala infraestructura</option>
                        <option value="transporte">🚌 Problema de transporte</option>
                        <option value="otro">❓ Otro</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">2) Ubicación de referencia:</label>
                    <input type="text" id="form-ubicacion" placeholder="Ej: Autopista Norte, cerca de Centro Comercial" 
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">3) Descripción (mínimo 20 caracteres):</label>
                    <textarea id="form-descripcion" placeholder="Cuéntanos qué viste..." rows="3"
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Severidad:</label>
                    <select id="form-severidad" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="baja">🟢 Baja</option>
                        <option value="media">🟡 Media</option>
                        <option value="alta">🔴 Alta</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">4) Imagen (opcional, JPG/PNG, máx 5MB):</label>
                    <input type="file" id="form-imagen" accept="image/jpeg,image/png" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: #fff;">
                    <div id="form-imagen-preview" style="margin-top: 10px; display: none;"></div>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">5) Comparte tu ubicación en tiempo real:</label>
                    <button type="button" id="form-geo-btn" style="background: #f1f7f3; color: #1a5c3a; border: 1px solid #9cc3aa; padding: 10px 12px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">
                        📍 Usar mi ubicación actual
                    </button>
                    <small id="form-geo-info" style="display: block; margin-top: 8px; color: #555;">Puedes ajustar la ubicación moviendo el marcador o haciendo clic en el mapa.</small>
                </div>
                <div style="margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <input type="number" step="0.000001" id="form-latitud" placeholder="Latitud" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <input type="number" step="0.000001" id="form-longitud" placeholder="Longitud" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div id="form-mapa" style="height: 220px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 12px; background: #f7f7f7;"></div>
                <div id="form-resumen" style="margin-bottom: 12px; padding: 10px; background: #f5f5f5; border-radius: 6px; font-size: 13px; color: #333;">
                    Antes de guardar, revisa los datos del reporte.
                </div>
                <button id="form-guardar-reporte" type="button" style="background: #1a5c3a; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; width: 100%;">
                    ✅ Guardar Reporte
                </button>
            </div>
        `;

        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.bindReporteFormEvents();

        this.ensureLeafletLoaded()
            .then(() => this.initializeReportMap())
            .catch((error) => {
                console.error('No se pudo cargar el mapa:', error);
                const geoInfo = document.getElementById('form-geo-info');
                if (geoInfo) geoInfo.textContent = 'No se pudo cargar el mapa. Puedes ingresar latitud y longitud manualmente.';
            });
    },

    bindReporteFormEvents() {
        const tipoEl = document.getElementById('form-tipo');
        const ubicacionEl = document.getElementById('form-ubicacion');
        const descripcionEl = document.getElementById('form-descripcion');
        const severidadEl = document.getElementById('form-severidad');
        const imagenEl = document.getElementById('form-imagen');
        const geoBtn = document.getElementById('form-geo-btn');
        const latEl = document.getElementById('form-latitud');
        const lngEl = document.getElementById('form-longitud');
        const guardarBtn = document.getElementById('form-guardar-reporte');

        if (tipoEl) {
            tipoEl.addEventListener('change', (e) => {
                this.formData.tipo = e.target.value;
            });
        }

        if (ubicacionEl) {
            ubicacionEl.addEventListener('input', (e) => {
                this.formData.ubicacion = e.target.value;
            });
        }

        if (descripcionEl) {
            descripcionEl.addEventListener('input', (e) => {
                this.formData.descripcion = e.target.value;
            });
        }

        if (severidadEl) {
            severidadEl.addEventListener('change', (e) => {
                this.formData.severidad = e.target.value;
            });
        }

        if (imagenEl) {
            imagenEl.addEventListener('change', (e) => this.previsualizarImagenReporte(e));
        }

        if (geoBtn) {
            geoBtn.addEventListener('click', () => this.usarMiUbicacionReporte());
        }

        if (latEl) {
            latEl.addEventListener('input', () => this.syncMapFromInputs());
        }

        if (lngEl) {
            lngEl.addEventListener('input', () => this.syncMapFromInputs());
        }

        if (guardarBtn) {
            guardarBtn.addEventListener('click', () => this.guardarFormulario());
        }
    },

    ensureLeafletLoaded() {
        if (window.L) return Promise.resolve();
        if (this.leafletLoader) return this.leafletLoader;

        this.leafletLoader = new Promise((resolve, reject) => {
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Error cargando Leaflet'));
            document.body.appendChild(script);
        });

        return this.leafletLoader;
    },

    initializeReportMap() {
        const mapContainer = document.getElementById('form-mapa');
        if (!mapContainer || !window.L) return;

        const defaultLat = 4.8638;
        const defaultLng = -74.0326;

        if (this.reportMap) {
            this.reportMap.remove();
            this.reportMap = null;
        }

        this.reportMap = window.L.map(mapContainer).setView([defaultLat, defaultLng], 14);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.reportMap);

        this.reportMarker = window.L.marker([defaultLat, defaultLng], { draggable: true }).addTo(this.reportMap);

        this.reportMarker.on('dragend', () => {
            const pos = this.reportMarker.getLatLng();
            this.setReportLocation(pos.lat, pos.lng, 'Ubicación ajustada desde el marcador.');
        });

        this.reportMap.on('click', (event) => {
            const { lat, lng } = event.latlng;
            this.reportMarker.setLatLng([lat, lng]);
            this.setReportLocation(lat, lng, 'Ubicación ajustada desde el mapa.');
        });

        this.setReportLocation(defaultLat, defaultLng, 'Ubicación inicial en Chía. Puedes mover el marcador.');

        setTimeout(() => {
            if (this.reportMap) this.reportMap.invalidateSize();
        }, 50);
    },

    setReportLocation(lat, lng, message = '') {
        const latInput = document.getElementById('form-latitud');
        const lngInput = document.getElementById('form-longitud');
        const geoInfo = document.getElementById('form-geo-info');

        if (latInput) latInput.value = Number(lat).toFixed(6);
        if (lngInput) lngInput.value = Number(lng).toFixed(6);
        if (geoInfo && message) geoInfo.textContent = message;
    },

    syncMapFromInputs() {
        const lat = parseFloat(document.getElementById('form-latitud')?.value);
        const lng = parseFloat(document.getElementById('form-longitud')?.value);

        if (Number.isNaN(lat) || Number.isNaN(lng) || !this.reportMap || !this.reportMarker) {
            return;
        }

        this.reportMarker.setLatLng([lat, lng]);
        this.reportMap.setView([lat, lng], Math.max(this.reportMap.getZoom(), 14));
    },

    usarMiUbicacionReporte() {
        const geoBtn = document.getElementById('form-geo-btn');
        const geoInfo = document.getElementById('form-geo-info');

        if (!navigator.geolocation) {
            if (geoInfo) geoInfo.textContent = 'Tu navegador no soporta geolocalización.';
            return;
        }

        if (geoBtn) {
            geoBtn.disabled = true;
            geoBtn.textContent = '📍 Obteniendo ubicación...';
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.setReportLocation(latitude, longitude, 'Ubicación obtenida correctamente. Puedes editarla si lo necesitas.');

                if (this.reportMap && this.reportMarker) {
                    this.reportMarker.setLatLng([latitude, longitude]);
                    this.reportMap.setView([latitude, longitude], 16);
                }

                if (geoBtn) {
                    geoBtn.disabled = false;
                    geoBtn.textContent = '📍 Actualizar mi ubicación';
                }
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                if (geoInfo) geoInfo.textContent = 'No se pudo obtener tu ubicación. Puedes escribir latitud/longitud manualmente.';
                if (geoBtn) {
                    geoBtn.disabled = false;
                    geoBtn.textContent = '📍 Reintentar ubicación';
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    },

    previsualizarImagenReporte(event) {
        const file = event?.target?.files?.[0];
        const preview = document.getElementById('form-imagen-preview');

        if (!preview) return;

        if (!file) {
            preview.style.display = 'none';
            preview.innerHTML = '';
            return;
        }

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            alert('Solo se permiten imágenes JPG o PNG');
            event.target.value = '';
            preview.style.display = 'none';
            preview.innerHTML = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede exceder 5MB');
            event.target.value = '';
            preview.style.display = 'none';
            preview.innerHTML = '';
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        preview.style.display = 'block';
        preview.innerHTML = `
            <div style="font-size: 12px; color: #444; margin-bottom: 6px;">Vista previa:</div>
            <img src="${objectUrl}" alt="Vista previa" style="max-width: 100%; max-height: 180px; border-radius: 6px; border: 1px solid #ccc;">
        `;
    },

    mostrarFormularioComentario(tipo = 'observacion') {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        this.formCollecting = true;
        this.formType = 'comentario';
        this.formData = { tipo };

        const tipoLabel = {
            'sugerencia': '💡 Sugerencia',
            'denuncia': '🚨 Denuncia',
            'observacion': '👁️ Observación',
            'experiencia': '📖 Experiencia'
        };

        const div = document.createElement('div');
        div.className = 'msg bot';
        div.id = 'form-msg';
        div.innerHTML = `
            <div class="msg-avatar">💬</div>
            <div class="msg-bubble">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Título:</label>
                    <input type="text" id="form-titulo" placeholder="Resumen breve" 
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Zona:</label>
                    <input type="text" id="form-zona" placeholder="Ej: Centro, Autopista Norte" 
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">Tu comentario:</label>
                    <textarea id="form-contenido" placeholder="Cuéntanos tu experiencia o idea..." rows="4"
                        style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <button id="form-guardar-comentario" type="button" style="background: #2d7a50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; width: 100%;">
                    ✅ Guardar ${tipoLabel[tipo] || 'Comentario'}
                </button>
            </div>
        `;

        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.bindComentarioFormEvents();
    },

    bindComentarioFormEvents() {
        const tituloEl = document.getElementById('form-titulo');
        const zonaEl = document.getElementById('form-zona');
        const contenidoEl = document.getElementById('form-contenido');
        const guardarBtn = document.getElementById('form-guardar-comentario');

        if (tituloEl) {
            tituloEl.addEventListener('input', (e) => {
                this.formData.titulo = e.target.value;
            });
        }

        if (zonaEl) {
            zonaEl.addEventListener('input', (e) => {
                this.formData.zona = e.target.value;
            });
        }

        if (contenidoEl) {
            contenidoEl.addEventListener('input', (e) => {
                this.formData.contenido = e.target.value;
            });
        }

        if (guardarBtn) {
            guardarBtn.addEventListener('click', () => this.guardarComentario());
        }
    },

    async guardarFormulario() {
        const tipo = document.getElementById('form-tipo')?.value?.trim();
        const ubicacion = document.getElementById('form-ubicacion')?.value?.trim();
        const descripcion = document.getElementById('form-descripcion')?.value?.trim();
        const severidad = document.getElementById('form-severidad')?.value?.trim();
        const latitud = document.getElementById('form-latitud')?.value?.trim();
        const longitud = document.getElementById('form-longitud')?.value?.trim();
        const imagen = document.getElementById('form-imagen')?.files?.[0] || null;

        if (!descripcion || !ubicacion || !tipo || !severidad) {
            alert('Por favor completa los campos requeridos');
            return;
        }

        if (descripcion.length < 20) {
            alert('La descripción debe tener al menos 20 caracteres');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Debes iniciar sesión para crear reportes');
            window.location.href = '/views/login.html';
            return;
        }

        const tipoApiMap = {
            accidente: 'seguridad_vial',
            trafico: 'congestión',
            infraestructura: 'infraestructura',
            transporte: 'transporte_público',
            otro: 'otro'
        };

        const tipoApi = tipoApiMap[tipo] || 'otro';
        const titulo = `Reporte ${tipoApi.replace('_', ' ')} - ${ubicacion}`.slice(0, 200);

        const resumen = document.getElementById('form-resumen');
        if (resumen) {
            resumen.innerHTML = `
                <strong>Resumen del reporte:</strong><br>
                • Tipo: ${tipo}<br>
                • Ubicación: ${ubicacion}<br>
                • Severidad: ${severidad}<br>
                • Imagen: ${imagen ? 'Sí' : 'No'}<br>
                • Coordenadas: ${latitud && longitud ? `${latitud}, ${longitud}` : 'No compartidas'}
            `;
        }

        try {
            const body = new FormData();
            body.append('titulo', titulo);
            body.append('descripcion', descripcion);
            body.append('tipo', tipoApi);
            body.append('severidad', severidad);
            body.append('ubicacion', ubicacion);

            if (latitud && longitud) {
                body.append('latitud', latitud);
                body.append('longitud', longitud);
            }

            if (imagen) {
                body.append('imagen', imagen);
            }

            const response = await fetch(`${this.apiUrl}/reportes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            let errorMessage = 'No se pudo guardar el reporte. Intenta nuevamente.';
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                        errorMessage = errorData.errors.join(' | ');
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                }
                throw new Error(errorMessage);
            }

            const formMsg = document.getElementById('form-msg');
            if (formMsg) formMsg.remove();

            this.addMessage(`✅ Reporte registrado:\n📍 ${ubicacion}\n📝 ${descripcion}\n🔴 Severidad: ${severidad}\n${latitud && longitud ? `🧭 Coordenadas: ${latitud}, ${longitud}\n` : ''}${imagen ? '📷 Imagen adjunta\n' : ''}\nTu reporte ya quedó disponible para la comunidad en el foro.`, 'bot');
        } catch (error) {
            console.error('Error guardando reporte:', error);
            this.addMessage(`❌ ${error.message || 'Error al guardar el reporte'}`, 'bot');
            return;
        }

        this.formCollecting = false;
        this.formData = {};
    },

    async guardarComentario() {
        const titulo = document.getElementById('form-titulo')?.value;
        const zona = document.getElementById('form-zona')?.value;
        const contenido = document.getElementById('form-contenido')?.value;

        if (!titulo || !contenido) {
            alert('Por favor completa los campos requeridos');
            return;
        }

        const token = localStorage.getItem('token');

        if (!token) {
            alert('Debes iniciar sesión para publicar comentarios');
            window.location.href = '/views/login.html';
            return;
        }

        try {
            const formMsg = document.getElementById('form-msg');
            if (formMsg) formMsg.remove();

            const response = await fetch(`${this.apiUrl}/comentarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    titulo,
                    contenido,
                    zona: zona || 'Chía (General)',
                    tipo: this.formData.tipo
                })
            });

            if (response.ok) {
                this.addMessage(`✅ ${this.formData.tipo === 'sugerencia' ? 'Sugerencia' : this.formData.tipo === 'denuncia' ? 'Denuncia' : 'Comentario'} publicado:\n\n"${titulo}"\n\nGracias por tu aporte a la comunidad de Chía.`, 'bot');
            } else {
                this.addMessage('Hubo un error al publicar. Intenta nuevamente.', 'bot');
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Error al publicar tu comentario. Intenta de nuevo.', 'bot');
        }

        this.formCollecting = false;
        this.formData = {};
    },

    async obtenerTraficoEnTiempoReal() {
        try {
            const response = await fetch(`${this.apiUrl}/trafico/estado`);

            if (!response.ok) {
                throw new Error('Error al obtener tráfico');
            }

            const datos = await response.json();
            const info = datos.estimacion || datos;

            let respuesta = `🗺️ **Estado de Tráfico en Chía**\n\n`;
            respuesta += `${info.informacion || 'Actualizando estado...'}\n\n`;

            if (info.puntos) {
                respuesta += `📍 **Por Zonas:**\n`;
                for (const [zona, detalle] of Object.entries(info.puntos)) {
                    const emoji = detalle.nivel === 'congestionado' ? '🔴' :
                        detalle.nivel === 'moderado' ? '🟡' : '🟢';
                    respuesta += `${emoji} ${zona}: ${detalle.nivel} (${detalle.estimado_velocidad_kmh} km/h)\n`;
                }
            }

            respuesta += `\n💡 ${info.sugerencia || 'Consulta nuevamente para actualizaciones'}`;

            return respuesta;

        } catch (error) {
            console.error('Error con API de tráfico:', error);
            return '🗺️ No pude obtener datos de tráfico en este momento.\n\nIntenta nuevamente o reporta un problema específico que hayas visto.';
        }
    },

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

    showTyping() {
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

    removeTyping() {
        const typingMsg = document.getElementById('typing-msg');
        if (typingMsg) typingMsg.remove();
    }
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CHATBOT.init();
    });
} else {
    CHATBOT.init();
}

function sendMessage(text) {
    CHATBOT.sendMessage(text);
}

function sendSuggestion(text) {
    const input = document.getElementById('userInput');
    input.value = text;
    CHATBOT.sendMessage(text);
}