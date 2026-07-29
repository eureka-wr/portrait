# Provider Integration

Implement `PortraitProvider.generate()` and return owned image bytes, MIME type, provider name and model. Do not return permanent private URLs to the browser.

## Included providers

- Mock: copies the private source into four traceable candidates and simulates production failures.
- Manual Upload: records an externally generated image as `manual_external`.
- OpenAI Image API: sends a multipart reference image to `/v1/images/edits`, uses high input fidelity, a server-only API key, AbortController timeout and finite retry.

Default real model is `gpt-image-2`, which can be overridden by `PORTRAIT_PROVIDER_MODEL`. Review the current [official image guide](https://developers.openai.com/api/docs/guides/image-generation) before changing model or request fields.

## Adding a provider

1. Implement the interface.
2. Keep source bytes, Prompt and keys server-side.
3. Add a bounded timeout and retry policy.
4. Validate every returned image before private storage.
5. Record provider/model on each Candidate.
6. Add success, partial-success, timeout and missing-configuration tests.
7. Register the adapter in `getPortraitProvider()`.
