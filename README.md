# 🚀 MóvilChía - Plataforma Ciudadana de Movilidad

**Solución Full Stack Profesional | Node.js + Express + MySQL | Producción-Ready**

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Instalación Paso a Paso](#instalación-paso-a-paso)
5. [Estructura de Carpetas](#estructura-de-carpetas)
6. [API Reference](#api-reference)
7. [Características de Seguridad](#características-de-seguridad)
8. [Explicación Educativa](#explicación-educativa)

---

## 🎯 VISIÓN GENERAL

**MóvilChía** es una plataforma moderna que centraliza información sobre la crisis de movilidad en Chía, Cundinamarca. Permite a ciudadanos:

✅ **Crear y gestionar reportes** sobre problemas de movilidad  
✅ **Comunicarse con administradores** mediante formularios de contacto  
✅ **Interactuar con un chatbot inteligente** para consultas sobre movilidad  
✅ **Visualizar diagnósticos** de la situación vial del municipio  
✅ **Participar activamente** en soluciones ciudadanas  

---

## 🏗️ ARQUITECTURA DEL PROYECTO

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (NAVEGADOR)                       │
│  HTML + CSS + JavaScript (Validación, UI, Interactividad)   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS + JSON
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              SERVIDOR EXPRESS (Node.js)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Middlewares (CORS, Helmet, Rate Limiting)          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Router /api/auth        - Autenticación            │   │
│  │  Router /api/reportes    - CRUD de Reportes         │   │
│  │  Router /api/contactos   - Formulario de Contacto   │   │
│  │  Router /api/usuarios    - Gestión de Usuarios      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL Queries (Parametrizadas)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│           BASE DE DATOS MySQL (Port 3306)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  usuarios         - Cuentas y autenticación         │   │
│  │  reportes         - Reportes de movilidad           │   │
│  │  contactos        - Mensajes de contacto            │   │
│  │  sesiones         - Sesiones de usuario             │   │
│  │  conversaciones_chatbot - Historial del chatbot    │   │
│  │  rutas_transporte - Información de transporte       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 Flujo de Datos Típico (Crear Reporte)

```
1. Usuario completa formulario en el navegador
                    ↓
2. JavaScript valida los datos (Frontend validation)
                    ↓
3. JavaScript envía POST /api/reportes + JWT token
                    ↓
4. Backend Express:
   - Middleware authenticateToken valida JWT
   - Middleware validateInput verifica datos
   - Sanitiza datos (escape SQL injection)
   - Inserta en BD con prepared statements
                    ↓
5. MySQL:
   - Verifica integridad referencial (usuario existe)
   - Almacena registro en tabla reportes
                    ↓
6. Backend retorna JSON con reporte creado
                    ↓
7. Frontend actualiza UI y muestra confirmación
```

---

## 🛠️ TECNOLOGÍAS UTILIZADAS

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|----------|
| **Frontend** | HTML5 | - | Estructura semántica |
| | CSS3 | - | Estilos y responsive design |
| | JavaScript (ES6+) | - | Lógica interactiva, AJAX |
| **Backend** | Node.js | 16+ | Runtime JavaScript |
| | Express.js | 4.18+ | Framework web minimalista |
| | bcryptjs | 2.4+ | Hash seguro de contraseñas |
| | jsonwebtoken | 9.1+ | Autenticación con JWT |
| | validator | 13.11+ | Validación y sanitización |
| | cors | 2.8+ | Cross-Origin Resource Sharing |
| | helmet | 7.1+ | Headers HTTP de seguridad |
| | express-rate-limit | 7.1+ | Rate limiting (anti-DDOS) |
| **Base de Datos** | MySQL | 5.7+ / 8.0+ | BD relacional |
| | mysql2/promise | 3.6+ | Driver asincrónico |
| **Desarrollo** | nodemon | 3.0+ | Auto-reload en desarrollo |

---

## 📦 INSTALACIÓN PASO A PASO

### **REQUISITOS PREVIOS**

✅ Node.js 16+ ([descargar](https://nodejs.org/))  
✅ MySQL 5.7+ ([descargar](https://dev.mysql.com/downloads/mysql/))  
✅ Git  
✅ Editor de código (VS Code recomendado)  
✅ Postman o Thunder Client (para probar API)  

---

### **PASO 1: Preparar la Base de Datos**

```bash
# 1. Abre MySQL Workbench o línea de comandos
mysql -u root -p

# 2. Crea la BD (en MySQL command line):
source database/setup.sql

# 3. Verifica que se creó:
SHOW DATABASES;
USE movilidad_chia;
SHOW TABLES;

# 4. Verifica el usuario admin (opcional):
SELECT id, email, rol FROM usuarios;
```

**Usuario de prueba creado automáticamente:**
- Email: `admin@movilidad-chia.local`
- Contraseña: `admin123`
- Rol: `admin`

---

### **PASO 2: Instalar Dependencias de Node.js**

```bash
# Abre terminal en la carpeta del proyecto
cd c:\Users\d1c4r\Proyecto

# Instala todas las dependencias
npm install

# Verifica que se instaló correctamente
npm list --depth=0
```

---

### **PASO 3: Configurar Variables de Entorno**

```bash
# El archivo .env ya existe, pero debes revisar/actualizar:

# Abre .env en tu editor
# Verifica estos valores según tu setup:

DB_HOST=localhost        # Si MySQL está en otra máquina, cambiar
DB_USER=root             # Tu usuario de MySQL
DB_PASSWORD=             # Tu contraseña de MySQL (si la tienes)
DB_NAME=movilidad_chia
DB_PORT=3306

PORT=3000
NODE_ENV=development

# IMPORTANTE: En producción, usar un gestor de secretos
```

---

### **PASO 4: Iniciar el Servidor**

```bash
# Opción A: Desarrollo (con hot-reload)
npm run dev

# Opción B: Producción
npm start

# Debería ver:
# ╔════════════════════════════════════════════════════════════╗
# ║  🚀 SERVIDOR MOVILIDAD CHÍA INICIADO                      ║
# ╠════════════════════════════════════════════════════════════╣
# ║  🌐 http://localhost:3000
# ║  📚 API:  http://localhost:3000/api/*
# ║  🛠️  Ambiente: development
# ║  🔒 CORS: localhost:3000
# ╚════════════════════════════════════════════════════════════╝
```

---

### **PASO 5: Probar Ruta Raíz**

```bash
# Abre navegador:
http://localhost:3000

# Deberías ver la página principal de MóvilChía
```

---

### **PASO 6: Probar API con Postman**

#### **Registro de usuario:**
```bash
POST http://localhost:3000/api/auth/registro

Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "MiPassword123",
  "telefono": "3101234567"
}

# Respuesta esperada (201 Created):
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 2,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "ciudadano",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### **Login:**
```bash
POST http://localhost:3000/api/auth/login

Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "MiPassword123"
}

# Respuesta esperada (200 OK):
# Guardar el TOKEN para los próximos requests
```

#### **Crear reporte (requiere autenticación):**
```bash
POST http://localhost:3000/api/reportes

Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

{
  "titulo": "Congestión Autopista Norte a las 8am",
  "descripcion": "Todos los días a las 8 de la mañana hay caos vehicular en la Autopista Norte. Los carros avanzan solo 1 km en 45 minutos.",
  "tipo": "congestión",
  "severidad": "crítica",
  "ubicacion": "Autopista Norte, Calle 193"
}

# Respuesta esperada (201 Created):
{
  "message": "Reporte creado exitosamente",
  "reporte": {
    "id": 1,
    "usuario_id": 2,
    "titulo": "Congestión Autopista Norte a las 8am",
    "estado": "nuevo",
    ...
  }
}
```

#### **Formulario de contacto (sin autenticación):**
```bash
POST http://localhost:3000/api/contactos

Content-Type: application/json

{
  "nombre": "María García",
  "email": "maria@example.com",
  "telefono": "3201234567",
  "asunto": "Pregunta sobre REGIOTRAM",
  "mensaje": "¿Cuándo entra en operación el REGIOTRAM del Norte? Necesito información para planificar mi transporte diario."
}

# Respuesta esperada (201 Created)
```

---

## 📁 ESTRUCTURA DE CARPETAS

```
Proyecto/
├── 📄 movilidad-chia.html          ← HTML principal (página pública)
├── 📄 package.json                 ← Dependencias de Node
├── 📄 .env                         ← Configuración de entorno
├── 📄 README.md                    ← Este archivo
│
├── backend/
│   ├── 📄 server.js                ← Servidor Express principal
│   ├── 📄 config.js                ← Conexión a BD
│   ├── 📄 auth.js                  ← Funciones de autenticación
│   │
│   └── routes/
│       ├── 📄 auth.js              ← /api/auth/* (registro, login)
│       ├── 📄 reportes.js          ← /api/reportes/* (CRUD)
│       ├── 📄 contactos.js         ← /api/contactos/* (mensajes)
│       └── 📄 usuarios.js          ← /api/usuarios/* (gestión)
│
├── public/
│   ├── 📄 dashboard.html           ← Panel de usuario autenticado
│   │
│   ├── css/
│   │   ├── 📄 auth.css             ← Estilos de login/registro
│   │   └── 📄 styles.css           ← Estilos generales
│   │
│   └── js/
│       ├── 📄 auth.js              ← Lógica de autenticación
│       ├── 📄 app.js               ← Lógica principal (chatbot, reportes)
│       └── 📄 utils.js             ← Funciones auxiliares
│
├── views/
│   ├── 📄 login.html               ← Página de login/registro
│   ├── 📄 reporte.html             ← Crear/editar reporte
│   └── 📄 contacto.html            ← Formulario de contacto
│
├── database/
│   └── 📄 setup.sql                ← Script SQL para crear BD
│
├── middleware/                      ← Middlewares Express (futuro)
└── css/                            ← CSS adicional (futuro)
```

---

## 🔌 API REFERENCE

### **Base URL**
```
http://localhost:3000/api
```

### **Autenticación**
Todos los endpoints protegidos requieren JWT en header:
```
Authorization: Bearer <token>
```

---

### **1. AUTENTICACIÓN**

#### `POST /auth/registro`
Crear nueva cuenta

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Password123",
  "telefono": "3101234567"
}
```

**Response:** `201 Created`
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 5,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "ciudadano",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

#### `POST /auth/login`
Iniciar sesión

**Request:**
```json
{
  "email": "juan@example.com",
  "password": "Password123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login exitoso",
  "user": {
    "userId": 5,
    "email": "juan@example.com",
    "nombre": "Juan Pérez",
    "rol": "ciudadano",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

#### `GET /auth/me`
Obtener datos del usuario autenticado

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "userId": 5,
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "rol": "ciudadano",
  "activo": true
}
```

---

### **2. REPORTES**

#### `GET /reportes`
Listar reportes con filtros

**Query Parameters:**
- `estado` - Filter por estado: nuevo, en_revisión, resuelto, rechazado
- `tipo` - Filter por tipo: congestión, infraestructura, etc.
- `severidad` - Filter por severidad: baja, media, alta, crítica
- `usuario_id` - Filter por usuario
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 10)

**Example:**
```
GET /reportes?tipo=congestión&severidad=crítica&page=1&limit=5
```

**Response:** `200 OK`
```json
{
  "total": 42,
  "page": 1,
  "limit": 5,
  "reportes": [
    {
      "id": 1,
      "usuario_id": 5,
      "titulo": "Congestión Autopista Norte",
      "descripcion": "...",
      "tipo": "congestión",
      "severidad": "crítica",
      "estado": "nuevo",
      "ubicacion": "Autopista Norte, Calle 193",
      "nombre_usuario": "Juan Pérez",
      "fecha_creacion": "2026-03-28T10:30:00Z"
    }
  ]
}
```

---

#### `GET /reportes/:id`
Obtener un reporte específico

**Response:** `200 OK`
```json
{
  "id": 1,
  "usuario_id": 5,
  "titulo": "Congestión Autopista Norte",
  "descripcion": "...",
  "tipo": "congestión",
  "severidad": "crítica",
  "estado": "nuevo",
  "respuesta_admin": null,
  ...
}
```

---

#### `POST /reportes`
Crear nuevo reporte (requiere autenticación)

**Request:**
```json
{
  "titulo": "Problema de transportes",
  "descripcion": "Descripción detallada del problema...",
  "tipo": "transporte_público",
  "severidad": "media",
  "ubicacion": "Centro de Chía",
  "latitud": 4.8597,
  "longitud": -74.0186
}
```

**Response:** `201 Created`

---

#### `PUT /reportes/:id`
Actualizar un reporte

- Usuario solo puede actualizar sus propios reportes
- Admin puede cambiar estado y agregar respuesta

**Request:**
```json
{
  "titulo": "Titulo actualizado",
  "descripcion": "Nueva descripción"
}
```

**Response:** `200 OK`

---

#### `DELETE /reportes/:id`
Eliminar un reporte

**Response:** `200 OK`
```json
{
  "message": "Reporte eliminado"
}
```

---

### **3. CONTACTOS**

#### `POST /contactos`
Enviar mensaje de contacto (sin autenticación)

**Request:**
```json
{
  "nombre": "María García",
  "email": "maria@example.com",
  "telefono": "3201234567",
  "asunto": "Pregunta sobre REGIOTRAM",
  "mensaje": "¿Cuándo entra en operación?"
}
```

**Response:** `201 Created`

---

#### `GET /contactos`
Listar contactos (solo admin)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:** `200 OK`

---

### **4. USUARIOS**

#### `GET /usuarios`
Listar usuarios (solo admin)

**Response:** `200 OK`
```json
{
  "total": 15,
  "page": 1,
  "limit": 20,
  "usuarios": [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "rol": "ciudadano",
      "total_reportes": 3,
      "fecha_registro": "2026-03-20T..."
    }
  ]
}
```

---

#### `GET /usuarios/:id`
Obtener datos de un usuario

- Usuario puede ver su propio perfil
- Admin puede ver cualquiera

---

#### `PUT /usuarios/:id`
Actualizar usuario

**Request:**
```json
{
  "nombre": "Juan Pérez García",
  "telefono": "3101234567"
}
```

---

#### `GET /usuarios/:id/reportes`
Obtener reportes de un usuario

---

---

## 🔐 CARACTERÍSTICAS DE SEGURIDAD

### **1. CONTRASEÑAS**
✅ **Hashing con bcrypt** - Algoritmo lento y seguro (10 rounds)  
✅ **Nunca almacenadas en plano** - Solo hash en BD  
✅ **Validación de fortaleza** - Mínimo 8 caracteres  

```javascript
// ❌ MALO - Nunca hacer esto:
password = "usuario123"

// ✅ BIEN - Usar bcrypt:
hash = await bcrypt.hash(password, 10)
// Resultado: $2b$10$SlY.jFAk.xCJZxTcZzE9...
```

---

### **2. SQL INJECTION**
✅ **Prepared Statements** - Parámetros separados de SQL  
✅ **Nunca concatenar strings en queries**  

```javascript
// ❌ VULNERABLE:
const query = `SELECT * FROM usuarios WHERE email = '${email}'`
// Si email = "admin'--", ¡el usuario se vuelve admin!

// ✅ SEGURO:
const [result] = await connection.execute(
  'SELECT * FROM usuarios WHERE email = ?',
  [email]
)
// El driver maneja el escaping automáticamente
```

---

### **3. AUTENTICACIÓN (JWT)**
✅ **Tokens con expiración** - Expiran en 7 días  
✅ **Firma digital** - No se puede falsificar sin SECRET  
✅ **Información encriptada** - Imposible leer sin claves  

```
Token JWT estructura:
header.payload.signature

header:   {"alg":"HS256","typ":"JWT"}
payload:  {"userId":5,"email":"juan@example.com","rol":"ciudadano"}
signature: HMACSHA256(header + payload + SECRET)

Si alguien intenta cambiar el payload:
- La firma no coincidirá
- Server rechaza el token
```

---

### **4. RATE LIMITING**
✅ **5 intentos de login** por 15 minutos  
✅ **100 requests** por 15 minutos (global)  
✅ **5 mensajes de contacto** por email en 24 horas  

Previene:
- Ataques de fuerza bruta (probar 10000 passwords/segundo)
- DDoS (flood de requests)
- Spam en formularios

---

### **5. CORS (Cross-Origin Resource Sharing)**
✅ **Origen permitido configurado** en .env  
✅ **Solo ciertos métodos** POST, GET, PUT, DELETE  
✅ **Headers específicos** Content-Type, Authorization  

```javascript
// Navegador BLOQUEA:
fetch('http://sitio-malicioso.com', {
  headers: { 'Authorization': 'Bearer token-secreto' }
})
// Error: CORS policy: blocked by browser

// Navegador PERMITE:
fetch('http://localhost:3000/api/reportes', {
  headers: { 'Authorization': 'Bearer token-secreto' }
})
// OK, origen es localhost:3000 (configurado en .env)
```

---

### **6. SANITIZACIÓN / ESCAPE**
✅ **validator.escape()** - Convierte `<script>` en `&lt;script&gt;`  
✅ **Previene XSS** (Cross-Site Scripting)  

```javascript
// ❌ VULNERABLE:
const titulo = "<img src=x onerror='alert(1)'>"
// El navegador ejecutaría el script

// ✅ SEGURO:
const titulo = validator.escape("<img src=x onerror='alert(1)'>")
// Resultado: &lt;img src=x onerror=&#x27;alert(1)&#x27;&gt;
// Se muestra como texto, no se ejecuta
```

---

### **7. VALIDACIÓN BACKEND**
✅ **Nunca confiar en frontend** - Validar siempre en backend  
✅ **Errores genéricos** - No revelar qué falló exactamente  

```javascript
// ❌ MAL - Revela información:
if (!user) throw new Error("Usuario no existe")
// Alguien puede saber qué emails están registrados

// ✅ BIEN - Genérico:
if (!user || !validPassword) throw new Error("Credenciales inválidas")
// No se sabe si fue email o password
```

---

### **8. HEADERS DE SEGURIDAD (Helmet)**
✅ **X-Frame-Options: DENY** - Previene clickjacking  
✅ **X-Content-Type-Options: nosniff** - Previene MIME sniffing  
✅ **Strict-Transport-Security** - Fuerza HTTPS  
✅ **Content-Security-Policy** - Control qué scripts se ejecutan  

---

### **9. VARIABLES DE ENTORNO**
✅ **.env nunca en Git** - Agregado a .gitignore  
✅ **JWT_SECRET** fuerte y aleatorio  
✅ **Contraseña BD** no en código  

```bash
# En .env (no versionado):
JWT_SECRET=1a2b3c4d5e6f7g8h9i0j_letras_numeros_aleatorios_largos

# En producción:
# Usar gestor de secretos (AWS Secrets Manager, HashiCorp Vault)
# Nunca hardcodear tokens o contraseñas
```

---

### ⚠️ **EN PRODUCCIÓN - AGREGAR:**

```javascript
// 1. HTTPS obligatorio (no HTTP)
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// 2. CSRF Protection (para formularios POST)
const csrf = require('csurf');
app.use(csrf());

// 3. Helmet con configuración estricta
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  }
}));

// 4. MongoDB injection prevention (si usas MongoDB)
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());

// 5. Logging y monitoreo
const winston = require('winston');
// Registrar todas las acciones importantes
```

---

## 📚 EXPLICACIÓN EDUCATIVA

### **¿QUÉ ES UNA API REST?**

API = **Application Programming Interface** (Interfaz de programación de aplicaciones)

Es un contrato entre cliente y servidor:

```
Cliente (navegador) dice:
"Quiero traer reportes de tipo 'congestión'"

GET /api/reportes?tipo=congestión

Servidor responde:
200 OK
[
  { id: 1, titulo: "...", tipo: "congestión" },
  { id: 3, titulo: "...", tipo: "congestión" }
]
```

**Principios REST:**
- **R**epresentational **S**tate **T**ransfer
- Usa métodos HTTP estándar: GET, POST, PUT, DELETE
- Recursos identificados por URLs
- Respuestas en formatos estándar (JSON, XML)

---

### **¿QUÉ ES JWT?**

JWT = **JSON Web Token**

Token de autenticación sin estado ("stateless"):

```
PASO 1: Usuario hace login
POST /auth/login
{ email: "juan@example.com", password: "..." }

PASO 2: Servidor valida y genera token
JWT = Header.Payload.Signature
Payload contiene: { userId: 5, email: "juan@example.com", rol: "ciudadano" }

PASO 3: Cliente guarda el token
localStorage.setItem('token', JWT)

PASO 4: Cliente lo envía en próximas peticiones
GET /api/reportes
Authorization: Bearer <JWT>

PASO 5: Servidor valida la firma del token
- Si es válido, continúa
- Si expirió o fue modificado, rechaza (401 Unauthorized)
```

**Ventajas:**
- Escalable (no requiere base de datos de sesiones)
- Móvil-friendly (sin cookies)
- CORS-friendly

**Desventajas:**
- Token grande (en comparación con session ID)
- No se puede revocar inmediatamente (hay que esperar expiración)

---

### **¿QUÉ ES BCRYPT?**

Algoritmo de hashing criptográfico diseñado para contraseñas:

```
Contraseña plana: "MiPassword123"

bcrypt (10 rounds) tarda ~100ms
Resultado: $2b$10$SlY.jFAk.xCJZxTcZzE9.ZxY.RI0Zx...

Propiedades:
1. UNIDIRECCIONAL: Imposible revertir (get original password)
2. DETERMINÍSTICO: Misma password = mismo result
3. LENTO: Tarda 100ms adrede (imposible fuerza bruta)
4. SALTED: Incluye "sal" aleatoria (dos iguales = diferentes hashes)

Flujo de login:
1. Usuario ingresa: "MiPassword123"
2. Server hashea: bcrypt("MiPassword123") = nuevo_hash
3. Server compara: nuevo_hash == hash_en_BD
4. Si son iguales, es correcto el password
```

**Por qué NO usar MD5 o SHA1:**
```javascript
// ❌ INSEGURO - MD5:
md5("password") = "5f4dcc3b5aa765d61d8327deb882cf99"
// Muy rápido, vulnerable a ataques de diccionario

// ✅ SEGURO - Bcrypt:
bcrypt("password", 10) = "$2b$10$SlY.jFAk.xCJZxTcZzE9..."
// Lento, imposible atacar por fuerza bruta
```

---

### **¿QUÉ ES PREPARED STATEMENTS?**

Prevención de SQL injection:

```sql
-- ❌ VULNERABLE:
SELECT * FROM usuarios WHERE email = 'admin@mail.com'

-- Si email = "admin'--", query se vuelve:
SELECT * FROM usuarios WHERE email = 'admin'--'
-- El -- comenta el resto, ¡cualquiera puede ser admin!

-- ✅ SEGURO - Prepared Statement:
SELECT * FROM usuarios WHERE email = ?

-- El "?" es un placeholder
-- Pasas datos por separado: [email]
-- El driver se encarga de escapar caracteres especiales
```

---

### **FLUJO COMPLETO: CREAR REPORTE**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO EN NAVEGADOR                                     │
└──┬────────────────────────────────────────────────────────┬─┘
   │ Usuario llena formulario:                               │
   │ Título: "Autopista Norte colapsada"                     │
   │ Descripción: "Hay caos vehicular..."                    │
   │ Tipo: "congestión"                                      │
   │ Severidad: "crítica"                                    │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VALIDACIÓN FRONTEND (JavaScript)                         │
└──┬────────────────────────────────────────────────────────┬─┘
   │ ✓ Título tiene min 5 caracteres                        │
   │ ✓ Descripción tiene min 20 caracteres                  │
   │ ✓ Tipo es válido (enum)                                │
   │ ✓ Severidad es válida (enum)                           │
   │                                                          │
   │ Si falla, mostrar error al usuario ← FIN               │
   │ Si pasa, continuar...                                  │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ENVÍO AL SERVIDOR                                        │
└──┬────────────────────────────────────────────────────────┬─┘
   │ POST http://localhost:3000/api/reportes                 │
   │ Headers:                                                 │
   │   Content-Type: application/json                        │
   │   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...         │
   │                                                          │
   │ Body:                                                    │
   │ {                                                        │
   │   "titulo": "Autopista Norte colapsada",               │
   │   "descripcion": "Hay caos vehicular...",              │
   │   "tipo": "congestión",                                │
   │   "severidad": "crítica"                               │
   │ }                                                        │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVIDOR EXPRESS - MIDDLEWARES                           │
└──┬────────────────────────────────────────────────────────┬─┘
   │ Helmet: Agrega headers de seguridad                     │
   │ CORS: Verifica origen (localhost:3000 ✓)               │
   │ Rate Limiter: Chequea IP (ok, menos de 100/15min)     │
   │ BodyParser: Convierte JSON string → objeto JS          │
   │                                                          │
   │ Si pasa todo, continua...                              │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. VALIDACIÓN BACKEND (server.js → routes/reportes.js)    │
└──┬────────────────────────────────────────────────────────┬─┘
   │ authenticateToken middleware:                           │
   │   - Extrae token del header Authorization              │
   │   - Verifica firma del JWT                              │
   │   - Extrae userId, email, rol                           │
   │   - Si es inválido: responde 401 Unauthorized ← FIN    │
   │                                                          │
   │ validateReporte():                                       │
   │   ✓ Título >= 5 caracteres                              │
   │   ✓ Descripción >= 20 caracteres                        │
   │   ✓ Tipo en enum válido                                 │
   │   ✓ Severidad en enum válido                            │
   │   Si falla: responde 400 Bad Request ← FIN             │
   │                                                          │
   │ Sanitización (validator.escape):                         │
   │   Convierte caracteres especiales                        │
   │   "<script>" → "&lt;script&gt;"                          │
   │   Previene XSS                                           │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. INSERCIÓN EN BASE DE DATOS                               │
└──┬────────────────────────────────────────────────────────┬─┘
   │ executeQuery (prepared statement):                       │
   │                                                          │
   │ INSERT INTO reportes                                    │
   │ (usuario_id, titulo, descripcion, tipo, severidad)     │
   │ VALUES (?, ?, ?, ?, ?)                                  │
   │                                                          │
   │ Parámetros: [5, "Autopista...", "Hay caos...", ...]   │
   │                                                          │
   │ MySQL valida:                                            │
   │   ✓ usuario_id 5 existe (FOREIGN KEY)                  │
   │   ✓ Tipos de datos son correctos                        │
   │   ✓ No hay duplicados (si hay UNIQUE)                   │
   │                                                          │
   │ Si pasa: inserta y retorna insertId = 42               │
   │ Si falla: rola atrás (ROLLBACK) y retorna error        │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. RESPUESTA AL CLIENTE                                     │
└──┬────────────────────────────────────────────────────────┬─┘
   │ HTTP 201 Created                                         │
   │                                                          │
   │ {                                                        │
   │   "message": "Reporte creado exitosamente",            │
   │   "reporte": {                                           │
   │     "id": 42,                                            │
   │     "usuario_id": 5,                                     │
   │     "titulo": "Autopista Norte colapsada",             │
   │     "descripcion": "Hay caos vehicular...",            │
   │     "tipo": "congestión",                               │
   │     "severidad": "crítica",                             │
   │     "estado": "nuevo",                                  │
   │     "fecha_creacion": "2026-03-28T14:22:00Z"          │
   │   }                                                      │
   │ }                                                        │
   ↓                                                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. ACTUALIZACIÓN DE UI (JavaScript frontend)                │
└──┬────────────────────────────────────────────────────────┬─┘
   │ Usuario ve: "✅ Reporte creado exitosamente"           │
   │ Reporte se agrega a lista de "mis reportes"            │
   │ Formulario se limpia                                    │
   │ Redirecciona a detalles del reporte                    │
   └────────────────────────────────────────────────────────┘
```

---

## 🚀 PRÓXIMOS PASOS (FUTURO)

- [ ] Panel administrativo completo
- [ ] Edición de perfil de usuario
- [ ] Sistema de puntos/badges por participación
- [ ] Mapas interactivos (Leaflet.js)
- [ ] Integración con redes sociales
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Reportes automáticos por email
- [ ] Versión móvil (React Native / Flutter)
- [ ] Integración con data pública del municipio
- [ ] Dashboard de estadísticas avanzadas
- [ ] Traducción a inglés/portugués

---

## 📞 SOPORTE

### **Documentación**
- [Express.js Docs](https://expressjs.com/)
- [MySQL Docs](https://dev.mysql.com/doc/)
- [JWT RFC](https://tools.ietf.org/html/rfc7519)
- [OWASP Security](https://owasp.org/)

### **Problemas Comunes**

**Error: `connect ECONNREFUSED 127.0.0.1:3306`**
> MySQL no está corriendo. Abre MySQL Workbench o inicia servicio:
> ```bash
> # Windows
> net start MySQL80
> 
> # macOS
> brew services start mysql-server
> ```

**Error: `ER_BAD_DB_ERROR`**
> Base de datos no existe. Corre: `source database/setup.sql`

**Error: `listen EADDRINUSE: address already in use :::3000`**
> Puerto 3000 ya está en uso. Cambia en .env:
> ```
> PORT=3001
> ```

---

## 📄 LICENCIA

Este proyecto es educativo y de código abierto. Úsalo libremente para aprender.

---

**Desarrollado con ❤️ para la comunidad de Chía**

*Última actualización: 28 de marzo de 2026*
