# 🚀 QUICK START GUIDE - MóvilChía

## ⚡ 5 MINUTOS PARA ESTAR FUNCIONANDO

---

## PASO 1️⃣: Base de Datos (1 minuto)

### Opción A: Línea de comandos
```bash
mysql -u root -p
```

Pega esto en MySQL:
```sql
source c:\Users\d1c4r\Proyecto\database\setup.sql;
SHOW DATABASES;
USE movilidad_chia;
SHOW TABLES;
```

### Opción B: MySQL Workbench
1. Abre MySQL Workbench
2. Conecta a localhost
3. Abre archivo: `database/setup.sql`
4. Ejecuta (Ctrl+Enter)

**✅ Listo: BD creada con usuario admin**

---

## PASO 2️⃣: Node.js (2 minutos)

```bash
# Abre PowerShell como administrador
cd c:\Users\d1c4r\Proyecto

# Instala dependencias
npm install

# Espera a que termine...
# ✅ Listo
```

---

## PASO 3️⃣: Iniciar Servidor (1 minuto)

```bash
# Aún en la carpeta del proyecto:
npm run dev

# Deberías ver:
# 🚀 SERVIDOR MOVILIDAD CHÍA INICIADO
# 🌐 http://localhost:3000
```

---

## PASO 4️⃣: Probar (1 minuto)

Abre navegador:
```
http://localhost:3000
```

Deberías ver la página MóvilChía 🎉

---

## 📍 RUTAS PRINCIPALES

| Ruta | Qué es |
|------|--------|
| `http://localhost:3000` | 🏠 Página principal |
| `http://localhost:3000/views/login.html` | 🔐 Login/Registro |
| `http://localhost:3000/public/dashboard.html` | 📊 Panel de usuario |
| `http://localhost:3000/views/reporte.html` | 📝 Crear reporte |

---

## 🧪 PRUEBA RÁPIDA DE API

### Registrarse:
```bash
# PowerShell:
$body = @{
    nombre = "Test User"
    email = "test@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/auth/registro" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### O en navegador (más fácil):
1. Abre `http://localhost:3000/views/login.html`
2. Haz click en "Registrarse"
3. Llena el formulario
4. ¡Listo!

---

## 🔑 CREDENCIALES DE PRUEBA

Usuario admin creado automáticamente:
- Email: `admin@movilidad-chia.local`
- Password: `admin123`

---

## 📚 DOCUMENTACIÓN COMPLETA

Para detalles técnicos, ver:
- `README.md` - Documentación extendida
- `API_EXAMPLES.http` - Ejemplos de API
- `IMPLEMENTATION_CHECKLIST.md` - Lo que fue implementado

---

## ❌ ERRORES COMUNES

### "Error: connect ECONNREFUSED 127.0.0.1:3306"
```bash
# MySQL no está corriendo. Inicia en Windows:
net start MySQL80

# Si eso no funciona, abre MySQL Workbench manualmente
```

### "Error: EADDRINUSE :::3000"
```bash
# Puerto 3000 ya está en uso
# Opción 1: Mata el proceso en el puerto
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Opción 2: Cambia puerto en .env
# Cambiar: PORT=3000 → PORT=3001
```

### "Error: ER_BAD_DB_ERROR: Unknown database"
```bash
# Base de datos no existe
# Corre setup.sql de nuevo:
mysql -u root -p < database/setup.sql
```

---

## 🎬 FLOW COMPLETO PARA PROBAR

1. **Página Principal**
   ```
   http://localhost:3000
   ```

2. **Registrase**
   ```
   Haz click en "Registrarse" tab
   Completa formulario
   Click "Crear Cuenta"
   ```

3. **Login**
   ```
   Vuelve a tab "Iniciar Sesión"
   Ingresa mismo email y password
   Click "Iniciar Sesión"
   ```

4. **Dashboard**
   ```
   Se abre /public/dashboard.html automáticamente
   Ver datos del usuario
   Ver reportes (si tiene)
   ```

5. **Crear Reporte**
   ```
   Click "Crear Nuevo Reporte"
   Llena formulario
   Click "Enviar Reporte"
   El reporte aparece en lista
   ```

---

## 📡 ARQUITECTURA RESUMIDA

```
Navegador
   ↓ (HTTP POST JSON)
Node.js Express
   ↓ (Query SQL)
MySQL Database
   ↓ (Response JSON)
Navegador actualiza
```

---

## 🔐 SEGURIDAD (Lo importante)

✅ Contraseñas están hasheadas (bcrypt) - no recuperables
✅ Tokens JWT expiran en 7 días
✅ SQL injection es imposible (prepared statements)
✅ Rate limiting en login (máx 5 intentos/15min)
✅ Datos validados en backend (no confiar en frontend)

---

## 🐛 DEBUGGING

### Ver logs del servidor:
```bash
# El servidor imprime logs de todas las acciones
# Si ves:
✅ Login exitoso: usuario@email.com
📧 Nuevo contacto: ID 5
📝 Nuevo reporte: ID 42

# Significa que todo funciona
```

### Ver errores de la BD:
```bash
# En terminal donde corre npm run dev
# Los errores aparecen aquí
# Lee el mensaje de error para entender qué falló
```

### Ver errores del navegador:
```bash
# Abre navegador
# Presiona F12 (Developer Tools)
# Tab "Console" muestra errores JavaScript
# Tab "Network" muestra requests HTTP
```

---

## 📞 SOPORTE RÁPIDO

**Problema:**  El servidor no inicia
**Solución:** Verifica que MySQL está corriendo

**Problema:** Login falla  
**Solución:** Verifica email y password. Base de datos debe existir.

**Problema:** Reporte no se guarda
**Solución:** Verifica que estés autenticado (token válido)

**Problema:** Página en blanco
**Solución:** Abre DevTools (F12) → Console tab → ve los errores

---

## ✅ TODO LISTO

Si llegaste aquí sin errores:

```
✅ Base de datos configurada
✅ Node.js con dependencias instaladas
✅ Servidor Express corriendo
✅ API REST funcionando
✅ Frontend accesible
✅ Autenticación funcional
✅ CRUD de reportes operativo

🎉 ¡PROYECTO FUNCIONAL!
```

---

## 🎓 PRÓXIMO PASO

Ahora puedes:

1. **Explorar el código:**
   - `backend/server.js` - Cómo funcionan los middlewares
   - `backend/routes/reportes.js` - CRUD de reportes
   - `public/js/auth.js` - Lógica de autenticación
   - `database/setup.sql` - Estructura de BD

2. **Hacer cambios:**
   - Agregar nuevas tablas en BD
   - Crear nuevos endpoints
   - Mejorar el UI/UX
   - Agregar nuevas funcionalidades

3. **Llevar a producción:**
   - Ver sección "EN PRODUCCIÓN" de README.md
   - Cambiar NODE_ENV a production
   - Usar HTTPS (no HTTP)
   - Usar gestor de secretos

---

**¡Éxito! 🚀**

*Para más información, ver README.md*
