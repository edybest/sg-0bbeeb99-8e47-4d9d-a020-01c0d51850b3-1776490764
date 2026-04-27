---
title: Group webhook parsing test script
status: in_progress
priority: medium
type: feature
tags:
- whatsapp
- webhook
- testing
- group
created_by: agent
created_at: 2026-04-27 08:20:49 UTC
position: 16
---

## Notes
Create a focused automated test script that simulates a WhatsApp group webhook payload and verifies the parsing logic in the webhook layer. The test should confirm that group chat target and actual member sender are separated correctly, and that command text can still be read from the payload. Reuse the current project test setup instead of introducing a new runner.

## Checklist
- [x] Review current test runner and an existing test file pattern
- [x] Expose only the minimal webhook parsing helper needed for testing
- [x] Add a focused test that simulates a group webhook payload
- [x] Verify member sender, reply target, and group id parsing for group messages
- [ ] Run project error checks after adding the test

## Acceptance
A developer can run the new test and confirm that a simulated WhatsApp group payload resolves the real sender separately from the group chat target.