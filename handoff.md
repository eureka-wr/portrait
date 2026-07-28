# Handoff

## Status

CATV Portrait Studio Phase 1 is implemented as a standalone Vinext/Next application with a public product page and an authenticated production admin.

## Verified local flow

The following API flow was run successfully with a generated test JPEG:

1. Create order and private R2 upload.
2. Compile stable Prompt.
3. Mock-generate four candidates.
4. Approve two candidates.
5. Select exactly two previews.
6. Mark previews sent.
7. Record one customer-selected candidate and feedback.
8. Mark final export.
9. Complete order and set 7-day retention.
10. Physically delete five R2 assets and confirm subsequent read returns 404.

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
- Add `PORTRAIT_PROVIDER_API_KEY` only if real OpenAI editing should be enabled.
- Schedule authenticated retention maintenance.
- Confirm organization verification and current image-model availability.
- Run lint, typecheck, test and build before every version.

## Known next increments

Move Canvas-derived previews/finals to a background image worker if server-side stored derivatives are required. Add full DNA draft editing/publish approval, a managed queue, and user-owned self-service only in Phase 2.
