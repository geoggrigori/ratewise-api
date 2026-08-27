<!-- ══════════════════════════ TÍTULO ══════════════════════════ -->
<div align="center">
  <img src="docs/title-banner.svg" width="100%" alt="ratewise-api"/>
</div>

<br/>

<!-- ══════════════════════ IDIOMAS / LANGUAGES ══════════════════════ -->
<div align="center">
<a href="README.md"><img src="https://img.shields.io/badge/Português-1987F0?style=for-the-badge" alt="Português"/></a>
<a href="README.en.md"><img src="https://img.shields.io/badge/English-555555?style=for-the-badge" alt="English"/></a>
<a href="README.es.md"><img src="https://img.shields.io/badge/Español-555555?style=for-the-badge" alt="Español"/></a>
</div>

<br/>

<h1 align="center">ratewise-api</h1>
<p align="center"><em>Middleware Express de rate limiting (token bucket), com pegada de produção</em></p>
<p align="center"><strong>Bucket por cliente → refill lazy → headers padrão → 429 estruturado</strong></p>

<div align="center">
<a href="https://github.com/geoggrigori/ratewise-api/actions/workflows/ci.yml"><img src="https://github.com/geoggrigori/ratewise-api/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="ts"/>
<img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="express"/>
<img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="vitest"/>
<img src="https://img.shields.io/badge/License-MIT-2E7D32?style=flat-square" alt="license"/>
</div>

<div align="center">
<a href="#sobre"><img src="https://img.shields.io/badge/▸_SOBRE-1987F0?style=for-the-badge" alt="sobre"/></a>
<a href="#como-funciona"><img src="https://img.shields.io/badge/▸_COMO_FUNCIONA-000000?style=for-the-badge" alt="funciona"/></a>
<a href="#uso"><img src="https://img.shields.io/badge/▸_USO-1987F0?style=for-the-badge" alt="uso"/></a>
<a href="#configuração"><img src="https://img.shields.io/badge/▸_CONFIGURAÇÃO-000000?style=for-the-badge" alt="config"/></a>
</div>

<br/>

> ⚙️ **Sem timers em background.** O refill é calculado de forma preguiçosa (lazy) a cada requisição.

## Sobre

Uma API HTTP pequena, com pegada de produção, que demonstra um **rate limiter token-bucket** implementado como middleware Express reutilizável e estritamente tipado.

**Destaques:**
- **Algoritmo token-bucket** — suaviza rajadas até uma capacidade configurável, com taxa de refill constante.
- **Middleware reutilizável** — `tokenBucket()` plugável em qualquer app Express.
- **Buckets por cliente** — chaveado pelo header `x-api-key` quando presente, senão pelo IP.
- **Headers padrão** — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` em toda resposta; `Retry-After` + erro JSON estruturado no `429`.
- **TypeScript estrito** — modo `strict` com `noUncheckedIndexedAccess`.
- **Totalmente testado** — Vitest + supertest, com testes determinísticos de refill via clock injetável.

## Como Funciona

```mermaid
sequenceDiagram
    participant C as Cliente
    participant M as middleware tokenBucket
    participant H as Route handler

    C->>M: GET /api/quote
    M->>M: Resolve chave do cliente (x-api-key ou IP)
    M->>M: Refill do bucket pelo tempo decorrido

    alt tokens >= 1 (permitido)
        M->>M: Consome 1 token
        M-->>C: X-RateLimit-Limit / Remaining / Reset
        M->>H: next()
        H-->>C: 200 OK + JSON
    else bucket vazio (negado)
        M-->>C: 429 Too Many Requests
        Note over M,C: Retry-After + corpo de erro JSON
    end
```

## Uso

```bash
git clone https://github.com/geoggrigori/ratewise-api.git
cd ratewise-api
npm install
npm run dev      # modo watch
```

**Exemplo:**
```bash
curl -i http://localhost:3000/api/quote
```
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1750000000
```

Com bucket vazio, retorna `429` com `Retry-After` e corpo JSON estruturado. O endpoint `/health` nunca é rate-limited.

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor HTTP |
| `RATE_CAPACITY` | `10` | Máximo de tokens por bucket (maior rajada permitida) |
| `RATE_REFILL` | `1` | Tokens reabastecidos por segundo |

**Testes:**
```bash
npm test
npm run test:coverage   # relatório HTML em coverage/
```

## Licença

[MIT](LICENSE).

<div align="center">
  <img src="https://file.loading.io/color/feature/thumb/Blues-8.png?" width="100%" height="10px" alt="divider"/>
</div>

<p align="center"><sub>Desenvolvido por <strong><a href="https://github.com/geoggrigori">Grigori</a></strong> · 2026</sub></p>
