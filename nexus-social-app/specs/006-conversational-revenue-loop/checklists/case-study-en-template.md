# Feature 006 Pilot Case Study — English (template)

**Status:** Template — fill with live pilot metrics after Shadow UAT  
**Workspace:** `________________`  
**Wedge account (CL-050):** Existing ABM telecom/banking demo — confirm name: `________________`  
**Period:** `________________`

---

## Narrative

**Problem.** Enterprise buyers in MENA engage on WhatsApp, but qualification and CRM attribution were disconnected from ABM activation.

**Motion.** Diligent AI / Nexus Concierge qualifies inbound conversations (Shadow → AI-Active after sign-off), writes `qualified_leads` via reconciler, and joins CRM closed-won on `account_domain`.

**Proof chain.**

1. ABM activate → `abm_playbook_runs` + `conversationSeed`
2. Concierge inbound → `conversation_qualifications` (+ escalation when needed)
3. Qualified lead → `qualified_leads.account_domain`
4. CRM mirror → `crm_activity_mirror` → attribution export
5. Margin gate → PASS/FAIL at ≥55% (CL-053)

**Outcome (fill).** Pipeline influenced: `$____` · Closed-won attributed: `$____` · Gross margin: `____%` · Gate: PASS / FAIL

**Quote (optional).** “________________”

---

## Attachments

- [ ] Attribution screenshot
- [ ] Audited thread JSON (`npm run generate:006-thread`)
- [ ] Margin gate API response
- [ ] Client Shadow sign-off date: `________`
