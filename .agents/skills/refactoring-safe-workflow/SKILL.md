---
name: Safe Refactoring Workflow
description: Core workflow for safely refactoring code without breaking existing functionality, using small steps and tests.
---

# Safe Refactoring Workflow

This skill defines the baseline process for refactoring code in the `archiv-des-vergessens` project safely and reliably.

## Activation
Use this skill when you are tasked with cleaning up, restructuring, or improving the internal design of existing code without changing its external behavior.

## Workflow
1. **Baseline Assessment:** Before changing any code, ensure the current behavior is well understood. Run existing tests (`npm run test`).
2. **Add Missing Tests:** If the code being refactored lacks test coverage, write characterization tests (tests that lock in the current behavior) *before* refactoring.
3. **Small Steps:** Make small, incremental changes. Do not attempt a "Big Bang" rewrite.
4. **Continuous Verification:** Run tests after every small change to catch regressions immediately.
5. **No Logic Changes:** Never change balancing numbers, fix bugs, or add features during a pure refactoring step. Keep them separate.

## Project Context
- Tests are typically located in the `js/_tests_/` directory.
- Use `Vitest` or the project's standard test runner for verification.
- Compare console output (`[Storage]`, `[Test]`) before and after refactoring to ensure logging behavior remains consistent if it's important.

## Do Not Use
- Do not use this skill to justify a complete rewrite of a functional module without explicit permission.
- Do not mix refactoring with bug fixing or feature development in the same step.
