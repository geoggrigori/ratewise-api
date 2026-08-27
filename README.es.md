<!-- ══════════════════════════ PORTADA ══════════════════════════ -->
<div align="center">
  <img src="docs/title-banner.svg" width="100%" alt="ratewise-api"/>
</div>

<br/>

<!-- ══════════════════════ IDIOMAS / LANGUAGES ══════════════════════ -->
<div align="center">
<a href="README.md"><img src="https://img.shields.io/badge/Português-555555?style=for-the-badge" alt="Português"/></a>
<a href="README.en.md"><img src="https://img.shields.io/badge/English-555555?style=for-the-badge" alt="English"/></a>
<a href="README.es.md"><img src="https://img.shields.io/badge/Español-1987F0?style=for-the-badge" alt="Español"/></a>
</div>

<br/>

<h1 align="center">ratewise-api</h1>
<p align="center"><em>Middleware Express de rate limiting (token bucket), de nivel producción</em></p>
<p align="center"><strong>Bucket por cliente → refill lazy → headers estándar → 429 estructurado</strong></p>

<div align="center">
<a href="https://github.com/geoggrigori/ratewise-api/actions/workflows/ci.yml"><img src="https://github.com/geoggrigori/ratewise-api/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="ts"/>
<img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="express"/>
<img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="vitest"/>
<img src="https://img.shields.io/badge/License-MIT-2E7D32?style=flat-square" alt="license"/>
</div>

<div align="center">
<a href="#acerca-de"><img src="https://img.shields.io/badge/▸_ACERCA_DE-1987F0?style=for-the-badge" alt="acerca"/></a>
<a href="#cómo-funciona"><img src="https://img.shields.io/badge/▸_CÓMO_FUNCIONA-000000?style=for-the-badge" alt="funciona"/></a>
<a href="#uso"><img src="https://img.shields.io/badge/▸_USO-1987F0?style=for-the-badge" alt="uso"/></a>
<a href="#configuración"><img src="https://img.shields.io/badge/▸_CONFIGURACIÓN-000000?style=for-the-badge" alt="config"/></a>
</div>

<br/>

> ⚙️ **Sin timers en background.** El refill se calcula de forma perezosa (lazy) en cada petición.

## Acerca de

Una API HTTP pequeña, de nivel producción, que demuestra un **rate limiter token-bucket** implementado como middleware Express reutilizable y estrictamente tipado.

**Destacados:**
- **Algoritmo token-bucket** — suaviza ráfagas hasta una capacidad configurable, con tasa de refill constante.
- **Middleware reutilizable** — `tokenBucket()` conectable en cualquier app Express.
- **Buckets por cliente** — indexado por el header `x-api-key` cuando está presente, si no por IP.
- **Headers estándar** — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` en cada respuesta; `Retry-After` + error JSON estructurado en `429`.
- **TypeScript estricto** — modo `strict` con `noUncheckedIndexedAccess`.
- **Totalmente probado** — Vitest + supertest, con pruebas determinísticas de refill vía reloj inyectable.

## Cómo funciona

```mermaid
sequenceDiagram
    participant C as Cliente
    participant M as middleware tokenBucket
    participant H as Route handler

    C->>M: GET /api/quote
    M->>M: Resuelve clave del cliente (x-api-key o IP)
    M->>M: Refill del bucket según tiempo transcurrido

    alt tokens >= 1 (permitido)
        M->>M: Consume 1 token
        M-->>C: X-RateLimit-Limit / Remaining / Reset
        M->>H: next()
        H-->>C: 200 OK + JSON
    else bucket vacío (denegado)
        M-->>C: 429 Too Many Requests
        Note over M,C: Retry-After + cuerpo de error JSON
    end
```

## Uso

```bash
git clone https://github.com/geoggrigori/ratewise-api.git
cd ratewise-api
npm install
npm run dev      # modo watch
```

**Ejemplo:**
```bash
curl -i http://localhost:3000/api/quote
```
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1750000000
```

Con el bucket vacío, devuelve `429` con `Retry-After` y cuerpo JSON estructurado. El endpoint `/health` nunca tiene rate limit.

## Configuración

| Variable | Predeterminado | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor HTTP |
| `RATE_CAPACITY` | `10` | Máximo de tokens por bucket (mayor ráfaga permitida) |
| `RATE_REFILL` | `1` | Tokens reabastecidos por segundo |

**Pruebas:**
```bash
npm test
npm run test:coverage   # reporte HTML en coverage/
```

## Licencia

[MIT](LICENSE).

<div align="center">
  <img src="https://file.loading.io/color/feature/thumb/Blues-8.png?" width="100%" height="10px" alt="divider"/>
</div>

<p align="center"><sub>Desarrollado por <strong><a href="https://github.com/geoggrigori">Grigori</a></strong> · 2026</sub></p>
