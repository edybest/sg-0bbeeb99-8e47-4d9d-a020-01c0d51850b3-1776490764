---
title: Fonnte group ID settings panel
status: in_progress
priority: high
type: feature
tags:
  - admin
  - settings
  - fonnte
  - supabase
created_by: agent
created_at: 2026-04-29T01:11:09Z
position: 17
---

## Notes
Add an admin settings panel that lets admins view and update the Fonnte group ID configuration used for WhatsApp group messaging. Reuse the existing admin settings patterns and store the configuration in the current project configuration flow if available. Keep the UI clear enough that an admin can copy, edit, and save the group ID without touching environment variables manually.

## Checklist
- [ ] Inspect the current admin settings surface and existing configuration storage flow
- [ ] Identify where Fonnte configuration should be persisted in Supabase or existing settings state
- [ ] Add an admin UI section to display and edit the Fonnte group ID
- [ ] Save updates through the existing settings mechanism with success and error feedback
- [ ] Wire webhook/group messaging code to read the saved Fonnte group ID when applicable
- [ ] Validate the implementation and mark the task done

## Acceptance
Admins can open the settings area, see the current Fonnte group ID value, update it, and save it successfully.
Webhook-related group messaging can use the configured group ID without editing code.