# 🍽️ Restaurante API — Backend

Este es el backend del sistema de gestión de un restaurante, diseñado con un enfoque robusto en seguridad, auditoría, transaccionalidad y alto rendimiento. Está construido utilizando **Node.js**, **Express**, **TypeScript**, y **Prisma ORM** con una base de datos **MySQL/MariaDB**.

---

## 📋 Tabla de Contenidos
- [🚀 Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [📋 Requisitos Previos](#-requisitos-previos)
- [⚙️ Instalación y Configuración](#️-instalación-y-configuración)
- [🗄️ Base de Datos (Prisma)](#️-base-de-datos-prisma)
- [🏃 Ejecución de la Aplicación](#-ejecución-de-la-aplicación)
- [🧪 Pruebas Unitarias y de Integración](#-pruebas-unitarias-y-de-integración)
- [📖 Documentación de la API (Swagger)](#-documentación-de-la-api-swagger)
- [⏰ Tareas en Segundo Plano (Jobs)](#-tareas-en-segundo-plano-jobs)
- [⚡ WebSocket (Socket.io)](#-websocket-socketio)

---

## 🚀 Características Principales

1. **Seguridad Avanzada**:
   - Cabeceras de seguridad HTTP configuradas mediante **Helmet**.
   - Protección contra abusos y ataques de fuerza bruta mediante **Rate Limiting**.
     - Límite global: Máximo 1,000 peticiones cada 15 minutos.
     - Límite de Autenticación: Límite estricto por combinación de `IP + Usuario` (30 intentos cada 15 minutos) para evitar bloqueos masivos en redes compartidas.
     - Todos los bloqueos de seguridad se registran en la tabla `dt_bloqueo_seguridad`.
2. **Sistema de Auditoría Automático**:
   - Middleware de auditoría integrado que inyecta contexto de usuario e IP en las consultas de Prisma, permitiendo un seguimiento riguroso de quién crea o modifica cada registro.
3. **Procesamiento de Pagos y Webhooks**:
   - Integración con **Stripe API** para cobros de reservaciones.
   - Manejo seguro de firmas HMAC mediante un endpoint especial que lee el buffer en crudo de la petición antes del parser JSON global.
4. **Validación Declarativa**:
   - Esquemas de validación estrictos y tipado estático unificado con **Zod**.
   - Validación temprana de variables de entorno al iniciar la aplicación.
5. **Tareas Programadas (Jobs)**:
   - Limpieza periódica automática de tokens JWT de refresh expirados (cada 24 horas).
   - Procesamiento de clientes "No-Show" para cobro de penalizaciones en reservaciones confirmadas que expiraron (cada hora).
6. **Tiempo Real**:
   - Sockets implementados con **Socket.io** para actualizaciones y notificaciones bidireccionales en tiempo real.

---

## 🛠️ Stack Tecnológico

- **Entorno**: [Node.js (v18+)](https://nodejs.org/) con [TypeScript](https://www.typescriptlang.org/)
- **Framework Web**: [Express (v5)](https://expressjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Base de Datos**: MySQL o MariaDB
- **Gestor de Paquetes**: [pnpm](https://pnpm.io/)
- **Validación**: [Zod](https://zod.dev/)
- **Pruebas**: [Vitest](https://vitest.dev/) & [Supertest](https://github.com/ladjs/supertest)
- **Documentación**: [Swagger UI Express](https://github.com/scottie198x/swagger-ui-express) & [@asteasolutions/zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi)
- **Pasarela de Pagos**: [Stripe](https://stripe.com/)

---

## 📁 Estructura del Proyecto

La estructura del directorio `src` sigue un diseño modular y limpio:

```text
Backend/
├── prisma/                  # Esquema de Prisma, migraciones y seeders
│   ├── schema.prisma        # Modelo de datos de la base de datos
│   └── seed.ts              # Semilla de datos iniciales
├── src/
│   ├── app.ts               # Punto de entrada principal (inicio del servidor)
│   ├── setup.ts             # Configuración de Express, middlewares y rutas globales
│   ├── config/              # Configuraciones tipadas de base de datos, servidor, stripe, mail, etc.
│   ├── controllers/         # Controladores de la API (manejo de req y res)
│   ├── docs/                # Generación automática de OpenAPI/Swagger
│   ├── jobs/                # Tareas programadas en segundo plano (No-shows, tokens)
│   ├── middlewares/         # Middlewares de Express (errores, auditoría, auth, subida de archivos)
│   ├── routes/              # Definición y enrutamiento de endpoints
│   ├── schemas/             # Validaciones de esquemas Zod (entorno, modelos)
│   ├── services/            # Lógica de negocio de la aplicación (Stripe, DB, etc.)
│   ├── types/               # Definición de tipos TypeScript personalizados
│   ├── utils/               # Funciones utilitarias (logger Winston, helpers)
│   └── zod-extended.ts      # Extensión personalizada de Zod
└── tests/                   # Pruebas automatizadas (unitarias e integración)
```

---

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu máquina local:
1. **Node.js** (v18.0.0 o superior)
2. **pnpm** (Gestor de dependencias predeterminado en el proyecto)
3. **MySQL** o **MariaDB** ejecutándose localmente o en un contenedor Docker (se incluye un archivo `docker-compose.yml` para facilitar esto).

---

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio e Instalar dependencias
Desde la raíz del backend, ejecuta el siguiente comando para instalar todos los paquetes usando `pnpm`:

```bash
pnpm install
```

### 2. Configurar las Variables de Entorno
Copia el archivo `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Abre `.env` y configura las variables según tu entorno local:

```ini
NODE_ENV=development
PORT=3000

# CORS — orígenes permitidos (separar con coma si hay más de uno)
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000

# Base de datos (Reemplazar con tus credenciales locales)
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/restaurante"

# JWT (Claves secretas seguras para autenticación)
JWT_SECRET=cambia_esto_por_un_secreto_seguro_de_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=otro_secreto_diferente_para_refresh
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt (Rondas de encriptación de contraseñas)
BCRYPT_ROUNDS=12

# Stripe (Claves de prueba obtenidas del dashboard de Stripe)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Opcional — Configuración de SMTP para el envío de correos)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=tu_usuario_de_mailtrap
MAIL_PASS=tu_clave_de_mailtrap
MAIL_FROM="Restaurante <noreply@restaurante.com>"
```

---

## 🗄️ Base de Datos (Prisma)

El proyecto utiliza Prisma ORM para interactuar con la base de datos MySQL.

### Sincronizar el esquema de la base de datos
Si realizaste cambios en el archivo `prisma/schema.prisma` o estás configurando la base de datos por primera vez en local, sincroniza tu base de datos con:

```bash
pnpm run db:push
```

### Aplicar Migraciones
En entornos que requieren mantener un historial de migraciones SQL:

```bash
pnpm run db:migrate
```

### Poblar la Base de Datos (Seeding)
Para llenar la base de datos con datos de prueba iniciales (platillos, mesas, categorías, roles y usuarios iniciales como administradores/meseros):

```bash
pnpm run db:seed
```

### Abrir Prisma Studio
Prisma ofrece una interfaz gráfica web muy intuitiva para ver y editar los datos de las tablas. Ejecuta:

```bash
pnpm run db:studio
```
Esto abrirá la consola interactiva en `http://localhost:5555`.

---

## 🏃 Ejecución de la Aplicación

### Modo Desarrollo
Inicia el servidor en modo desarrollo con recarga automática al cambiar el código (nodemon + tsx):

```bash
pnpm run dev
```
El servidor estará escuchando en `http://localhost:3000` (o el puerto configurado en tu `.env`).

### Construcción para Producción
Compila el código TypeScript a JavaScript de producción (los archivos se generarán en la carpeta `dist/`):

```bash
pnpm run build
```

### Iniciar en Producción
Una vez compilado el proyecto, puedes iniciar la aplicación optimizada:

```bash
pnpm run start
```

---

## 🧪 Pruebas Unitarias y de Integración

El backend cuenta con una suite completa de pruebas utilizando **Vitest** y **Supertest**. Las pruebas levantan una instancia de prueba y validan tanto la lógica interna como las respuestas HTTP de los endpoints de la API.

### Requisito para Pruebas
Dado que la aplicación valida la presencia de variables de entorno al iniciar, asegúrate de tener definidos los valores mínimos de JWT y Stripe en tu `.env` (pueden ser valores mockeados para los tests locales).

### Ejecutar todas las pruebas una vez
```bash
pnpm run test:run
```

### Ejecutar pruebas en modo observador (Watch Mode)
```bash
pnpm run test
```

### Generar reporte de cobertura de código (Coverage)
```bash
pnpm run test:coverage
```

---

## 📖 Documentación de la API (Swagger)

La API cuenta con documentación automatizada interactiva generada a través de OpenAPI 3.0 basada en las validaciones de Zod.

Cuando el servidor esté corriendo, puedes acceder a la documentación interactiva desde tu navegador en la siguiente URL:

- **Swagger UI**: `http://localhost:3000/docs`
- **JSON de OpenAPI**: `http://localhost:3000/docs-json`

### Módulos principales expuestos en la API:
- **Autenticación (`/api/auth`)**: Iniciar sesión, renovar tokens (refresh), cerrar sesión.
- **Reservaciones (`/api/reservaciones`)**: Creación de reservaciones, validación de fechas/horarios, cancelación, pagos Stripe asociados.
- **Platillos (`/api/platillos`)**: CRUD de platillos del menú, control de ingredientes, precios y disponibilidad.
- **Categorías (`/api/categorias`)**: Clasificación de platillos.
- **Órdenes (`/api/ordenes`)**: Control de comandas por mesa, cambio de estados (Pendiente, En Preparación, Entregado, Pagado).
- **Reportes (`/api/reportes`, `/api/pdf`, `/api/excel`)**: Exportación y análisis de ventas, reservaciones y comandas.
- **Usuarios (`/api/usuarios`) & Clientes (`/api/clientes`)**: Gestión de personal interno (Administrador, Mesero, Cocinero) y base de datos de clientes.
- **Mesas (`/api/mesas`)**: Estado de las mesas físicas en el restaurante (Libre, Ocupada, Reservada).

---

## ⏰ Tareas en Segundo Plano (Jobs)

El backend maneja de forma asíncrona la limpieza y mantenimiento del sistema mediante procesos en segundo plano configurados en `src/app.ts`:
- **Procesador de No-Shows**: Cada hora, el sistema busca reservaciones que pasaron de su horario programado sin presentarse y automáticamente ejecuta la captura del cobro de penalización retenido en Stripe.
- **Limpieza de Tokens**: Cada 24 horas, limpia la base de datos de registros expirados de tokens de refresh inactivos para optimizar el tamaño de la base de datos.

---

## ⚡ WebSocket (Socket.io)

El backend expone un canal WebSocket que permite:
- Notificar instantáneamente a cocina cuando hay una nueva comanda (`/api/ordenes`).
- Actualizar en tiempo real el mapa de mesas del restaurante para los meseros y la administración.
- Notificar cambios en el estado de las reservaciones.

El servicio está integrado en el servidor HTTP principal e inicializa tras el arranque exitoso de Express.
