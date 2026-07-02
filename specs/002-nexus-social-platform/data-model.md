# Data Model: Nexus Social Platform

Entity reference for planning and migrations. Primary store: **Supabase PostgreSQL** with RLS. See also `specs/001-production-readiness-hardening/data-model.md` for hardening-specific deltas.

---

## Tenancy & Identity

### `workspaces`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Tenant root |
| name | TEXT | Display name |
| slug | TEXT UNIQUE | URL-safe identifier |
| parent_client_id | UUID FK nullable | Agency client portal scope (Sprint 8) |
| created_at / updated_at | TIMESTAMPTZ | Audit |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References `auth.users` |
| email | TEXT UNIQUE | Profile sync |
| has_completed_onboarding | BOOLEAN | Onboarding tour gate |

### `workspace_members`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| user_id | UUID FK | |
| role | ENUM | owner, editor, agent, client |

**RLS pattern:** `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`

---

## Content (Sprint 2)

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK | Required |
| content | TEXT | Caption/body |
| scheduled_at | TIMESTAMPTZ | Calendar placement |
| status | ENUM | draft, scheduled, published, failed |
| media_urls | TEXT[] | Storage references |

### `media_assets`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK | |
| storage_path | TEXT | Supabase Storage key |
| mime_type | TEXT | |

---

## Inbox & Channels (Sprint 3)

### `chatwoot_inbox_workspace_map`
| Column | Type | Notes |
|--------|------|-------|
| chatwoot_inbox_id | TEXT/INT | External inbox ID |
| workspace_id | UUID FK | Tenant mapping |
| chatwoot_account_id | TEXT | |

**Note:** Feedback webhook must join via this table—not non-existent `inbox_id` on logs (001-T019).

---

## AI Agent (Weeks 1–5)

### `ai_agent_configs`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK UNIQUE | One config per workspace |
| dify_app_id | TEXT | Chat app |
| dify_dataset_id | TEXT | RAG dataset |
| dify_app_api_key | TEXT | **Per-tenant auth** (001 hardening) |
| persona_name | TEXT | |
| system_prompt_override | TEXT nullable | |
| traffic_allocation_percentage | INT 0–100 | Canary (Week 5) |
| daily_token_limit | INT | Cost cap |
| is_globally_disabled | BOOLEAN | Kill switch |

### `ai_conversation_logs`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| channel | TEXT | |
| external_conversation_id | TEXT | Chatwoot conversation |
| user_query | TEXT | PII-redacted |
| ai_response | TEXT | |
| confidence_score | FLOAT | HITL threshold 0.85 |
| tokens_used | INT | |

### `ai_evaluations` (Week 4)
| Column | Type | Notes |
|--------|------|-------|
| log_id | UUID FK | Source conversation |
| accuracy_score | FLOAT | LLM-as-Judge |
| tone_score | FLOAT | |
| hallucination_flag | BOOLEAN | |
| judge_reasoning | TEXT | |

### `ai_feedback` (Week 4)
| Column | Type | Notes |
|--------|------|-------|
| log_id | UUID FK | |
| human_edited | BOOLEAN | |
| similarity_score | FLOAT | Original vs final |
| final_message_text | TEXT | |

---

## Billing (Sprint 8)

### `subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| stripe_customer_id | TEXT | |
| stripe_subscription_id | TEXT | |
| plan_tier | TEXT | |
| status | ENUM | active, canceled, past_due |

### `ai_credit_ledger`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| total_credits | INT | |
| used_credits | INT | CHECK total >= used |

---

## Developer API (Sprint 9)

### `api_keys`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| key_hash | TEXT UNIQUE | SHA-256 of raw key |
| rate_limit_tier | INT | Requests/minute |
| revoked_at | TIMESTAMPTZ nullable | |

### `webhook_subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| url | TEXT | Outbound target |
| events | TEXT[] | post.created, etc. |
| secret | TEXT | Signing key |

---

## Enterprise (Sprint 7)

### `audit_logs`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| actor_id | UUID FK | |
| action | TEXT | refund.approved, etc. |
| payload | JSONB | Immutable insert-only |

### `approval_requests` (HITL)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| workspace_id | UUID FK | |
| tool_name | TEXT | issue-refund |
| status | ENUM | pending, approved, rejected, expired |
| token_hash | TEXT | HMAC payload reference |

---

## Automations & Migration (Sprint 10)

### `automations`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| flow_json | JSONB | ReactFlow graph |
| activepieces_flow_id | TEXT nullable | |

### `enterprise_migrations`
| Column | Type | Notes |
|--------|------|-------|
| workspace_id | UUID FK | |
| storage_path | TEXT | Bucket object |
| status | ENUM | queued, processing, complete, failed |

**Storage bucket:** `enterprise-migrations` (private)

---

## Entity Relationships (summary)

```text
workspaces 1──* workspace_members *──1 users
workspaces 1──* posts
workspaces 1──1 ai_agent_configs
workspaces 1──* ai_conversation_logs
workspaces 1──1 ai_credit_ledger
workspaces 1──* api_keys
chatwoot_inbox_workspace_map *──1 workspaces
ai_conversation_logs 1──* ai_evaluations
ai_conversation_logs 1──* ai_feedback
```

---

## Migration Order (recommended)

1. `phase1_setup.sql` — workspaces, users, members, RLS base
2. Sprint 2–4 schemas — posts, media, analytics RPCs
3. `week1_schema.sql` → `week5_schema.sql` — AI pipeline
4. `master_ai_schema.sql` — telemetry, configs
5. `sprint8_schema.sql` — billing
6. `enterprise_schema.sql` — audit, SSO prep
7. `sprint12_competitive_gaps.sql` — ledger constraints, sentiment

Consolidate into timestamped files under `supabase/migrations/` (Wave 0 task).
