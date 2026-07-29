# Portrait DNA

Portrait DNA is a versioned composition of Prompt Modules, not a mutable long prompt. Four v2.0 definitions are active; the four v1.0 definitions remain retired and readable.

Each Signature owns a public name, internal research reference, status, DNA version, engine version, module references and parameter profiles. v2 categories cover identity, source interpretation, pose normalization, gaze, expression, presence, hair & grooming, career identity, wardrobe, composition, camera, lens, lighting, background, skin, color, retouching, rendering, output and negative rules.

Rules:

- One active version is used for new production orders.
- Draft and retired versions cannot become the default. A published version enters testing before it can be activated.
- An order stores `selectedStyleId` and `selectedStyleVersion`.
- A Candidate repeats the DNA id/version and compiled prompt id.
- Publishing a new version never changes old orders.
- Published Prompt Modules are copied into a new version before editing.

All eight historical/current definitions live in `src/modules/portrait/domain/catalog.ts` and are idempotently seeded into normalized D1 tables. Presence, Gaze, Pose and Hair parameters differ by DNA and are visible in Admin.

To add a style, create a unique stable id/slug, provide all modules, add a migration or seed change, run compiler and state-machine tests, then activate it. Never reuse another style id for a visually different product.
