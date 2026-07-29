# Prompt Compiler

The compiler is deterministic for the same traceable input.

Portrait Engine v2 fixed order:

1. Identity Preservation
2. Source Interpretation
3. Pose Normalization
4. Gaze
5. Expression
6. Presence
7. Hair & Grooming
8. Career Identity
9. Wardrobe
10. Composition / Face Framing
11. Camera
12. Lens
13. Lighting
14. Background
15. Skin
16. Color Science
17. Retouching
18. Rendering
19. Output
20. Negative Rules

The positive Prompt, negative Prompt, exact module order, module version map, DNA id/version, engine version, compiler version (`2.0.0`) and SHA-256 checksum are stored per generation. Negative stays separate in storage and is appended as module 20 for Provider calls. Refinement adds a scoped instruction: preserve identity and all unrequested elements, then change only the named attributes.

Compiler v1.0.0 and its 17 historical categories remain available only for orders already bound to v1 DNA. Draft/testing DNA cannot compile for default production.

Complete Prompts are returned only to Admin. Audit logs record checksum prefixes and version facts, never the full Prompt or source image.
