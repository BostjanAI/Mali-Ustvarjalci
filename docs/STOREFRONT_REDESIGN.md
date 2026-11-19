# Storefront redesign

The storefront now uses a responsive Manrope-based design with clearer category discovery, creative play imagery and product quick views. The native dialog supports Escape, keyboard focus return and adding an item without leaving the catalogue. Category and price filters are preserved when switching languages.

This change also includes the earlier storefront work: localized demo products, persistent cart storage, combined search filters, request error states, server-side checkout pricing and payment status verification. Demo purchases are disabled. Real supplier, database, email and Stripe integrations have not been validated end to end; live payment rollout still needs webhook idempotency and integration testing.

Validation: production Next.js build with type checking (lint skipped), 22 storefront assertions using `npm run verify:storefront`, and desktop/mobile browser checks for quick view, Escape, focus restoration, add to cart and language/filter navigation. Existing Jest and full Playwright suites were not run. Test folders and local backups are excluded from the application TypeScript build.

Manrope is hosted locally with its [SIL Open Font License](../public/fonts/OFL-Manrope.txt); source: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope). The new creative-afternoon.webp image is illustrative AI-generated lifestyle inspiration, not a supplier product photo. It was generated with the built-in image_gen tool and optimized with sharp. Existing play-hero.webp was retained.

Image generation prompt:

```text
Use case: photorealistic-natural. Asset type: editorial lifestyle photograph for a modern Slovenian children's creative toy shop. Bright contemporary overhead editorial photograph of two young children's hands making a playful paper sun and cut-paper flowers at a clean light lavender table. Child-safe rounded scissors, colorful paper, a few chunky crayons and paintbrushes, naturally arranged with generous uncluttered negative space around the edges. Vibrant lime green, tangerine, lilac and cobalt paper colors, real paper texture, gentle daylight and natural shadows, refined modern art direction for a premium family brand. Horizontal 3:2 composition, objects centered, no faces needed. No text, no lettering, no logos, no watermark. Illustrative lifestyle inspiration, not a photo of a named product.
```
