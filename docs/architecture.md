# Architecture

## Boundaries

CATV Portrait Studio is a modular application with four primary boundaries:

1. Domain: order and candidate state, DNA versions, feedback and experiments.
2. Production engine: prompt compilation, provider orchestration, quality checks and queue ports.
3. Asset service: validation, private storage, signed reads, export and retention.
4. Surfaces: public `/portrait`, authenticated `/admin/portrait`, and protected APIs.

The public surface never accepts photos. The admin surface never receives an R2 storage key.

## Runtime flow

```text
Admin UI
  → authenticated API
    → D1 repository (orders, versions, jobs, candidates, feedback, audit)
    → Prompt Compiler (immutable compiled prompt + checksum)
    → Provider port (Mock / Manual / OpenAI)
    → private R2 (source and master images)
    → human review
    → client-safe preview/final re-encoding
    → delivery + retention cleanup
```

Generation jobs have idempotency keys and persisted stages. The first-phase execution path is local, but `PortraitJobQueue` and `GenerationOrchestrator` prevent UI or provider code from becoming a queue implementation.

## Database

D1 tables cover users, styles, DNA versions, prompt modules, orders, assets, compiled prompts, generation jobs, candidates, feedback, refinements, audit logs and experiments. Drizzle defines migrations; raw prepared statements keep runtime initialization Worker-compatible.

## Deployment

Vinext produces a Cloudflare Worker-compatible ESM build. Sites owns real D1/R2 provisioning from `.openai/hosting.json`. The project can remain standalone or move into a CATV monorepo without changing domain ids or API payloads.

