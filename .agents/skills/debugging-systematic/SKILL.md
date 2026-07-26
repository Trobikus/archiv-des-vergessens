---
name: Systematic Debugging Workflow
description: Core workflow for systematic error diagnosis, root cause analysis, and regression testing in Archiv des Vergessens.
---

# Systematic Debugging Workflow

This skill defines the baseline process for diagnosing and fixing bugs in the `archiv-des-vergessens` project.

## Activation
Use this skill when you are tasked with finding, reproducing, and fixing a bug that does not clearly fall under a more specific debugging skill.

## Workflow
1. **Reproduce:** Never guess the fix. First, reproduce the error locally.
2. **Isolate:** Narrow down the problem to a specific module, file, or function. Use the custom `js/core/logger.js` (e.g., `console.log('[Component] ...')`) to trace execution.
3. **Find Root Cause:** Identify *why* the bug happens, not just *where*. Is it a race condition? A type error? A logic flaw?
4. **Fix:** Implement the fix incrementally.
5. **Verify:** Confirm the fix works using manual tests or automated tests (e.g., `npm run test` or Vitest).
6. **Regression Test:** Add or update a unit test in `js/_tests_/` to prevent the bug from returning.

## Common Tools & Commands
- `npm run test` or `npm run dev` for rapid feedback.
- Look out for console logs with prefixes like `[Storage]`, `[Tauri Bridge]`, or `[Test]`.
- Use `f:\Max_Projekte\archiv-des-vergessens\scripts\test-live.js` if the bug is related to server connections.

## Do Not Use
- Do not use this skill for performance optimization unless there is an actual defect (e.g., memory leak).
- Do not use this skill to just guess a fix and apply it without verification.
