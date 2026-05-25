class AuthManager {
    constructor() {
        this.apiUrl = 'https://movilchia.onrender.com/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.initializeEventListeners();
    }

    normalizeUserData(rawUser) {
        if (!rawUser || typeof rawUser !== 'object') return null;

        return {
            ...rawUser,
            userId: rawUser.userId || rawUser.id || null,
            nombre: rawUser.nombre || 'Usuario'
        };
    }

    initializeEventListeners() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target));
        });

        const loginForm = document.getElementById('loginForm');
        const registroForm = document.getElementById('registroForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registroForm) {
            registroForm.addEventListener('submit', (e) => this.handleRegistro(e));
        }

        this.setupRealtimeValidation();
    }

    switchTab(tabElement) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tabElement.classList.add('active');

        const tabName = tabElement.dataset.tab;
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.querySelector(`[data-form="${tabName}"]`).classList.add('active');

        this.clearMessages(tabName);
    }

    setupRealtimeValidation() {

        document.getElementById('loginEmail')?.addEventListener('blur', () => {
            this.validateEmail('loginEmail', 'loginEmailError');
        });

        document.getElementById('regNombre')?.addEventListener('blur', () => {
            this.validateName('regNombre', 'regNombreError');
        });

        document.getElementById('regEmail')?.addEventListener('blur', () => {
            this.validateEmail('regEmail', 'regEmailError');
        });

        document.getElementById('regPassword')?.addEventListener('blur', () => {
            this.validatePassword('regPassword', 'regPasswordError');
            // Revalidar confirmación si ya tiene valor
            if (document.getElementById('regPasswordConfirm')?.value) {
                this.validatePasswordMatch();
            }
        });

        document.getElementById('regPasswordConfirm')?.addEventListener('blur', () => {
            this.validatePasswordMatch();
        });

        document.getElementById('regPhone')?.addEventListener('blur', () => {
            this.validatePhone('regPhone', 'regPhoneError');
        });
    }

    validateEmail(inputId, errorId) {
        const email = document.getElementById(inputId).value.trim();
        const errorEl = document.getElementById(errorId);

        if (!email) {
            errorEl.textContent = 'Email es requerido';
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorEl.textContent = 'Email inválido';
            return false;
        }

        errorEl.textContent = '';
        return true;
    }

    validateName(inputId, errorId) {
        const name = document.getElementById(inputId).value.trim();
        const errorEl = document.getElementById(errorId);

        if (!name) {
            errorEl.textContent = 'Nombre es requerido';
            return false;
        }

        if (name.length < 3) {
            errorEl.textContent = 'Nombre debe tener al menos 3 caracteres';
            return false;
        }

        errorEl.textContent = '';
        return true;
    }

    validatePassword(inputId, errorId) {
        const password = document.getElementById(inputId).value;
        const errorEl = document.getElementById(errorId);

        if (!password) {
            errorEl.textContent = 'Contraseña es requerida';
            return false;
        }

        if (password.length < 8) {
            errorEl.textContent = 'Contraseña debe tener mínimo 8 caracteres';
            return false;
        }

        errorEl.textContent = '';
        return true;
    }

    validatePasswordMatch() {
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        const errorEl = document.getElementById('regPasswordConfirmError');

        if (password !== passwordConfirm) {
            errorEl.textContent = 'Las contraseñas no coinciden';
            return false;
        }

        errorEl.textContent = '';
        return true;
    }

    validatePhone(inputId, errorId) {
        const phone = document.getElementById(inputId).value.trim();
        const errorEl = document.getElementById(errorId);

        if (!phone) {
            errorEl.textContent = '';
            return true;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            errorEl.textContent = 'Teléfono debe tener al menos 10 dígitos';
            return false;
        }

        errorEl.textContent = '';
        return true;
    }

    async handleLogin(e) {
        e.preventDefault();

        if (!this.validateEmail('loginEmail', 'loginEmailError')) return;

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando sesión...';

        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en login');
            }

            const normalizedUser = this.normalizeUserData(data.user);
            localStorage.setItem('token', data.user.token);
            localStorage.setItem('user', JSON.stringify(normalizedUser));

            this.showMessage('loginSuccess', '✅ Login exitoso. Redirigiendo...');

            setTimeout(() => {
                window.location.href = '/';
            }, 1500);

        } catch (error) {
            console.error('Error en login:', error);
            this.showMessage('loginError', '❌ ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    }

    async handleRegistro(e) {
        e.preventDefault();

        const isNameValid = this.validateName('regNombre', 'regNombreError');
        const isEmailValid = this.validateEmail('regEmail', 'regEmailError');
        const isPasswordValid = this.validatePassword('regPassword', 'regPasswordError');
        const isPasswordMatchValid = this.validatePasswordMatch();
        const isPhoneValid = this.validatePhone('regPhone', 'regPhoneError');
        const isTermsValid = this.validateTerms();

        if (!isNameValid || !isEmailValid || !isPasswordValid ||
            !isPasswordMatchValid || !isPhoneValid || !isTermsValid) {
            return;
        }

        const nombre = document.getElementById('regNombre').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const telefono = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        try {
            const response = await fetch(`${this.apiUrl}/auth/registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre,
                    email,
                    telefono,
                    password
                })
            });

            const data = await response.json();
            console.log('Respuesta del servidor:', data);

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Error en registro');
            }

            if (data.user && data.user.token) {
                const normalizedUser = this.normalizeUserData(data.user);
                localStorage.setItem('token', data.user.token);
                localStorage.setItem('user', JSON.stringify(normalizedUser));

                this.showMessage('registroSuccess', '✅ Registro exitoso. Redirigiendo...');

                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                throw new Error('No se recibió token del servidor');
            }

        } catch (error) {
            console.error('Error en registro:', error);
            this.showMessage('registroError', '❌ ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Cuenta';
        }
    }

    validateTerms() {
        const terms = document.getElementById('regTerms');
        const errorEl = document.getElementById('regTermsError');

        if (!terms.checked) {
            errorEl.textContent = 'Debes aceptar los términos de servicio';
            return false;
        }

        errorEl.textContent = '';
        return true;
    }

    showMessage(elementId, message) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = message;
        element.classList.add('show');

        if (elementId.includes('Error')) {
            setTimeout(() => {
                element.classList.remove('show');
            }, 5000);
        }
    }

    clearMessages(tabName) {
        const prefix = tabName === 'login' ? 'login' : 'registro';
        const errorEl = document.getElementById(`${prefix}Error`);
        const successEl = document.getElementById(`${prefix}Success`);

        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.textContent = '';
        }
        if (successEl) {
            successEl.classList.remove('show');
            successEl.textContent = '';
        }
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

async function authenticatedFetch(url, options = {}) {
    const token = getToken();

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

function isAuthenticated() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/views/login.html';
}

if (window.location.pathname.includes('login') || window.location.href.includes('login')) {
    console.log('🔐 Inicializando AuthManager en:', window.location.pathname);
    const auth = new AuthManager();
}

