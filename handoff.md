# Handoff

## Status

CATV Portrait Studio Phase 1 now runs CATV Portrait Engine v2.0 in both the full Vinext/Next admin domain and the deployable Vercel production flow. Four active v2 DNA profiles compile a fixed 20-module prompt; v1 remains immutable and readable for old orders.

The Vercel production deployment still needs `OPENAI_API_KEY` and `PORTRAIT_ACCESS_KEY` configured by the repository owner before real photo generation can be smoke-tested in production. Never send either key in chat or commit it.

## Verified local flow

The following API flow was run successfully with a generated test JPEG:

1. Create order and private R2 upload.
2. Compile stable v2 Prompt with Identity first and Negative last.
3. Mock-generate four candidates.
4. Review Pose, Gaze, Presence and Hair; reject failures with structured reasons.
5. Approve two candidates.
6. Select exactly two previews.
7. Mark previews sent.
8. Record one customer-selected candidate and feedback.
9. Mark final export.
10. Complete order and set 7-day retention.
11. Physically delete private assets and confirm subsequent read returns 404.

## Important files

- Portrait DNA: `src/modules/portrait/domain/catalog.ts`
- Prompt Compiler: `src/modules/portrait/prompts/compiler.ts`
- D1 Repository/Seed: `src/modules/portrait/database/repository.ts`
- Provider adapters: `src/modules/portrait/providers/`
- Private assets: `src/modules/portrait/assets/storage.ts`
- Admin UI: `src/modules/portrait/ui/PortraitStudioApp.tsx`
- Operations: `docs/operations-manual.md`

## Production checklist

- Set a strong `ASSET_SIGNING_SECRET`.
- Configure the production host, D1/R2 bindings, the auth adapter and `PORTRAIT_ADMIN_EMAIL`.
- Add `OPENAI_API_KEY` (Vercel flow) or `PORTRAIT_PROVIDER_API_KEY` (Cloudflare flow) only through the host secret manager.
- Schedule authenticated retention maintenance.
- Confirm organization verification and current image-model availability.
- Run lint, typecheck, test and build before every version.

## Known next increments

Move Canvas-derived previews/finals to a background image worker if server-side stored derivatives are required. Add a managed queue, calibrated automatic v2 quality models, cost telemetry and user-owned self-service only in Phase 2. DNA draft editing, publish/testing/active lifecycle and v1/v2 comparison are already implemented.
