---
description: Project-specific guidelines for the "archiv-des-vergessens" workspace.
---

# Archiv des Vergessens Guidelines

When working in the `archiv-des-vergessens` project, always adhere to the following rules:

1. **Preact with HTM Syntax:** 
   When creating or modifying Preact components, always use HTM template literals instead of standard JSX. 
   Import the setup: `import { h, html } from '../setup.js';`
   Use the syntax: `return html\`<div class="example">...</div>\`;`
   
2. **Strict Verification Protocol:**
   After making code changes, always verify them by running:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

3. **Behavior-Preserving Refactoring:**
   When asked to refactor or extract components, strictly preserve the existing logic and behavior. Do not proactively fix or migrate out-of-scope code (e.g., migrating hardcoded strings to `i18nService` during a UI extraction) unless explicitly requested by the user.

4. **Plan Before Execution:**
   Always use Planning Mode for structural changes or component extractions.
