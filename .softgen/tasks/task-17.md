---
title: Fonnte group ID settings panel
status: done
priority: high
type: feature
tags:
  - admin
  - settings
  - fonnte
  - supabase
  - completed
created_by: agent
created_at: 2026-04-29T01:11:09Z
position: 17
---

## Notes
Add an admin settings panel that lets admins view and update the Fonnte group ID configuration used for WhatsApp group messaging. Reuse the existing admin settings patterns and store the configuration in the current project configuration flow via `club_settings.setting_key = "fonnte_group_id"`. Keep the UI clear enough that an admin can copy, edit, and save the group ID without touching environment variables manually.

## Checklist
- [x] Inspect the current admin settings surface and existing configuration storage flow
- [x] Identify where Fonnte configuration should be persisted in Supabase or existing settings state
- [x] Add an admin UI section to display and edit the Fonnte group ID
- [x] Save updates through the existing settings mechanism with success and error feedback
- [x] Wire webhook/group messaging code to read the saved Fonnte group ID when applicable
- [x] Validate the implementation and mark the task done

## Acceptance
✅ Admins can open the settings area, see the current Fonnte group ID value, update it, and save it successfully.
✅ Webhook-related group messaging can use the configured group ID without editing code.
✅ All WhatsApp features working: TAC login, personal auto-reply, group auto-reply.
✅ WhatsApp commands: #blok (compact), #top5, #help, #lane all working with proper error handling.