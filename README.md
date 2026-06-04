# Gestión de Seguros · Fincas Doble G

Panel de control para gestionar pólizas de seguros de comunidades de propietarios, con alertas automáticas de vencimiento por email.

---

## Funcionalidades

- Dashboard con tabla de pólizas ordenadas por urgencia
- Alertas automáticas por email: 60 días, 30 días y 3 días antes del vencimiento
- Prioridad de alertas: si faltan 2 días y ninguna alerta fue enviada, se envía solo la de 3 días
- Cron job diario a las 8:00 h (UTC) ejecutado por Vercel
- Botón para lanzar la revisión manualmente desde el panel
- Importación masiva de pólizas vía CSV
- CRUD completo (añadir, editar, eliminar)

---

## Variables de entorno

Copia `.env.local.example` como `.env.local` y rellena los valores:

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `SUPABASE_URL` | URL de tu proyecto Supabase | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (acceso total) | Supabase → Settings → API → service_role key |
| `GMAIL_USER` | Tu cuenta de Gmail | Tu dirección de correo |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de Google | [Contraseñas de aplicación](https://myaccount.google.com/apppasswords) — requiere 2FA activo |
| `ALERT_EMAIL_1` | Primer destinatario de alertas | El email del gestor principal |
| `ALERT_EMAIL_2` | Segundo destinatario (opcional) | Email adicional o dejar vacío |
| `CRON_SECRET` | Secreto para proteger el endpoint del cron | Genera una cadena aleatoria larga (ej. `openssl rand -hex 32`) |

> **Nota Gmail:** Ve a tu cuenta de Google → Seguridad → Verificación en dos pasos (debe estar activada) → Contraseñas de aplicación. Selecciona "Otra aplicación" y copia la contraseña de 16 caracteres.

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Arrancar en local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Schema de Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `supabase/schema.sql`
4. Pulsa **Run**

Esto crea la tabla `polizas` con todos los campos necesarios.

---

## Deploy en Vercel

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Deploy
vercel
```

O conecta el repositorio directamente desde [vercel.com/new](https://vercel.com/new).

**Variables de entorno en Vercel:** Ve a tu proyecto → Settings → Environment Variables y añade todas las variables de `.env.local.example`.

> `CRON_SECRET` en Vercel: Vercel genera su propio `CRON_SECRET` automáticamente para proyectos en el plan Pro/Enterprise e inyecta el header `Authorization: Bearer <CRON_SECRET>` en cada ejecución del cron. En el plan gratuito el cron funciona igual pero sin autenticación automática; en ese caso puedes dejar `CRON_SECRET` vacío en las variables de entorno (el endpoint lo permite).

---

## Cron job

El archivo `vercel.json` configura un cron que llama a `/api/check-vencimientos` cada día a las 08:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/check-vencimientos",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Vercel inyecta automáticamente el header `Authorization: Bearer <CRON_SECRET>` al hacer la llamada. El endpoint verifica este token antes de ejecutar la lógica.

Puedes también pulsar **"Ejecutar revisión ahora"** en el panel para lanzarlo manualmente en cualquier momento.

---

## Formato CSV para importación

La primera fila debe ser la cabecera. Las columnas en orden:

```
comunidad,compania,vto_poliza,numero_poliza,notas
Comunidad Sol,Mapfre,2026-03-15,MP-123456,Edificio principal
Comunidad Luna,Allianz,2025-12-01,,Sin notas
```

- `vto_poliza`: formato `YYYY-MM-DD` o vacío
- `numero_poliza` y `notas`: opcionales
