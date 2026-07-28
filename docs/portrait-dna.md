# Portrait DNA

Portrait DNA is a versioned composition of Prompt Modules, not a mutable long prompt.

Each Signature owns a public name, internal research reference, status, version and module references. Categories cover identity, career identity, composition, pose, expression, camera, lens, lighting, background, wardrobe, hair, skin, color, retouching, rendering, output and negative rules.

Rules:

- One active version is used for new production orders.
- Draft and retired versions cannot become the default.
- An order stores `selectedStyleId` and `selectedStyleVersion`.
- A Candidate repeats the DNA id/version and compiled prompt id.
- Publishing a new version never changes old orders.
- Published Prompt Modules are copied into a new version before editing.

The four v1 definitions live in `src/modules/portrait/domain/catalog.ts` and are seeded into normalized D1 tables.

To add a style, create a unique stable id/slug, provide all modules, add a migration or seed change, run compiler and state-machine tests, then activate it. Never reuse another style id for a visually different product.

