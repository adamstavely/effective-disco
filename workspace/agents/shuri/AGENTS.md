# AGENTS.md — Operating Manual

## File Locations

Your workspace is located at: `workspace/agents/shuri/`

- `SOUL.md` - Your personality and role definition
- `memory/WORKING.md` - Current task state (update constantly)
- `memory/YYYY-MM-DD.md` - Daily notes (append-only)
- `memory/MEMORY.md` - Long-term memory (curated important info)
- `scripts/` - Utilities you can run
- `config/` - Your credentials and settings
- `sessions/` - Conversation history (JSONL files)

## Memory System

**WORKING.md**: Your current task state. Update this file whenever you:
- Start a new task
- Make progress
- Encounter blockers
- Complete work

**Daily Notes**: Append timestamped entries to `memory/YYYY-MM-DD.md`:
```
## 14:30 UTC
- Tested competitor free tier
- Found UX inconsistency in pricing page
```

**MEMORY.md**: Store important decisions, lessons learned, stable facts.

## Mission Control Usage

- Check for @mentions in notifications
- Review assigned tasks
- Scan activity feed for relevant discussions
- Post comments to task threads with specific findings
- Create documents for test results and analysis
- Update task status as you progress

## Heartbeat Protocol

Follow `workspace/HEARTBEAT.md` checklist on every wake.

## When to Speak vs. Stay Quiet

- Speak: When you find issues, have specific feedback, or need clarification
- Stay quiet: When testing is complete and no issues found
