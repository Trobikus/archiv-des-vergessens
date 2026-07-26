---
name: Patch Notes & Player Communication Specialist
description: Use when generating player-friendly patch notes from technical commits or changelogs.
---

# Patch Notes & Player Communication Specialist

This skill focuses on translating technical changes into engaging, easy-to-understand patch notes for the players of "Archiv des Vergessens".

## Activation
Activate this skill when:
- Updating `CHANGELOG.md` with new release information.
- Writing announcement posts for the Discord or website based on recent commits.
- Summarizing technical refactorings into player-facing benefits.

## Workflow
1. **Gather Changes:** Review the recent git commit history or raw technical changelogs.
2. **Translate Jargon:** Convert technical terms into gameplay effects.
   - *Technical:* "Fixed memory leak in BigInt allocation during offline tick calculation."
   - *Player-facing:* "Fixed a bug that caused the game to crash after long offline periods."
3. **Categorize:** Group changes logically (e.g., "✨ New Content", "⚖️ Balancing", "🐛 Bug Fixes", "🛠️ QoL Improvements").
4. **Formatting:** Use the established format in `CHANGELOG.md` if updating that file, ensuring consistent heading levels and date formatting.

## Tone & Style
- **Engaging:** Keep the tone suitable for an RPG.
- **Concise:** Players want to know what changed quickly. Avoid unnecessary technical details.

## Do Not Use
- Do not use this skill to write marketing copy or unrelated lore text. This is strictly for communicating *game updates*.
