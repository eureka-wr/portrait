# Privacy and Security

Customer portraits are sensitive private assets.

## Data principles

- Use photos only for the current order.
- Never use customer photos for training.
- Never build face recognition templates or a face database.
- Never infer personality, ability, role, class, wealth, health, religion, politics or sexual orientation.
- Let the customer/operator choose a style; never recommend a career from a face.

## Storage

R2 keys are server-only. State APIs expose asset ids, dimensions, MIME and retention metadata, not storage keys. Read routes require an authenticated admin session or a short-lived HMAC path. Responses are `private, no-store` with MIME sniffing disabled.

Uploads accept JPEG, PNG and WebP only, verify magic bytes, reject SVG/scripts, enforce size and basic dimension limits, and use random storage names.

## Retention

Default unfinished retention is 14 days and completed retention is 7 days. Physical object deletion is paired with a soft-deleted metadata record and an audit entry. Required business statistics can remain after images are deleted.

## Audit

The audit log records who viewed, generated, reviewed, downloaded, selected, exported, completed or deleted. It never records image bytes, full private URLs, keys, secrets or complete Prompts.

