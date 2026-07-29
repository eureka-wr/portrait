# Phase 2 Roadmap

Recommended order:

1. Calibrate automated Pose, Gaze, Presence and Hair scoring against the v2 human-review data while retaining human approval.
2. Move preview/final derivation to an asynchronous image worker and store derived assets privately.
3. Add user-owned orders and self-service deletion.
4. Add authenticated public upload with consent and source-quality guidance.
5. Add online payment, paid-state webhooks and idempotent fulfillment.
6. Add email/in-app delivery notifications and time-limited downloads.
7. Introduce a managed queue/Workflow provider.

Phase 3 can then add provider routing, cost telemetry, automatic candidate rejection, A/B assignment, DNA experiments, team portrait batches, multilingual copy and an external API.

The current schema already reserves experiment id/variant on orders and keeps Provider, Queue, Analyzer, Judge and Asset services behind interfaces.
