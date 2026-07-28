# Phase 2 Roadmap

Recommended order:

1. Move preview/final derivation to an asynchronous image worker and store derived assets privately.
2. Add user-owned orders and self-service deletion.
3. Add authenticated public upload with consent and source-quality guidance.
4. Add online payment, paid-state webhooks and idempotent fulfillment.
5. Add automatic technical quality checks while retaining human approval.
6. Add email/in-app delivery notifications and time-limited downloads.
7. Introduce a managed queue/Workflow provider.

Phase 3 can then add provider routing, cost telemetry, automatic candidate rejection, A/B assignment, DNA experiments, team portrait batches, multilingual copy and an external API.

The current schema already reserves experiment id/variant on orders and keeps Provider, Queue, Analyzer, Judge and Asset services behind interfaces.

