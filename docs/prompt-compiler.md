# Prompt Compiler

The compiler is deterministic for the same traceable input.

Fixed order:

1. Identity Preservation
2. Source Image Context
3. Career Identity
4. Composition
5. Pose
6. Expression
7. Camera
8. Lens
9. Lighting
10. Background
11. Wardrobe
12. Hair
13. Skin
14. Color Science
15. Retouching
16. Rendering
17. Output Specification
18. Negative Rules

The positive Prompt, negative Prompt, module version map, DNA id/version, compiler version and SHA-256 checksum are stored per generation. Refinement adds a final scoped instruction: preserve identity and all unrequested elements, then change only the named attributes.

Complete Prompts are returned only to Admin. Audit logs record checksum prefixes and version facts, never the full Prompt or source image.

