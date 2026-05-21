Title: 🧹 [Code Health] Use Point objects in drawLead and drawPost parameters

Description:
🎯 **What:** Modified the `drawLead` and `drawPost` functions in `circuit-sim/src/renderer/element-renderers.ts` to accept `Point` objects from `../engine/types` instead of discrete `x` and `y` coordinates.

💡 **Why:** This improves maintainability and readability by reducing the number of parameters in these functions and grouping logically related coordinates together. This aligns with standard object-oriented geometric representations.

✅ **Verification:** Verified by compiling the TypeScript project (`npm run build`) and ensuring the existing Vitest test suite runs without errors (`npm run test`).

✨ **Result:** Cleaner function signatures (`drawLead(ctx, p1, p2, v)` instead of `drawLead(ctx, x1, y1, x2, y2, v)`) that are easier to read and maintain, with no changes to application behavior.
