# Database Verification

This document provides an audit of the Supabase PostgreSQL database tables, migrations, RLS policies, indexes, and database schemas.

## Table Inventory & Schema Analysis

Based on the `.sql` files in the repository:

| Table Name | Primary Key | Foreign Keys | RLS Enabled | Indexes | Source Schema File |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **workspaces** | UUID (Missing) | None | Unknown | Missing | **None (Orphan Reference)** |
| **users** | UUID (Missing) | None | Unknown | Missing | **None (Orphan Reference)** |
| **workspace_members** | `id` UUID | `user_id -> users(id)` (broken), `workspace_id -> workspaces(id)` (broken) | No | None | [phase1_setup.sql](file:///d:/nexus-social-platform/nexus-social-app/src/sql/phase1_setup.sql) |
| **posts** | `id` UUID | `workspace_id -> workspaces(id)` (broken), `client_id` (added Sprint 8) | Yes | None | [phase1_setup.sql](file:///d:/nexus-social-platform/nexus-social-app/src/sql/phase1_setup.sql) |
| **ai_agent_configs** | `workspace_id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [week1_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/week1_schema.sql) |
| **ai_conversation_logs**| `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [week1_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/week1_schema.sql) |
| **chatwoot_inbox_workspace_map** | `chatwoot_inbox_id` | `workspace_id -> workspaces(id)` | Yes | None | [week2_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/week2_schema.sql) |
| **support_tickets** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [week3_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/week3_schema.sql) |
| **ai_evaluations** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [week4_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/week4_schema.sql) |
| **ai_feedback** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [week4_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/week4_schema.sql) |
| **sentiment_metrics** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint12_competitive_gaps.sql](file:///d:/nexus-social-platform/nexus-social-app/supabase/migrations/sprint12_competitive_gaps.sql) |
| **csat_scores** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint12_competitive_gaps.sql](file:///d:/nexus-social-platform/nexus-social-app/supabase/migrations/sprint12_competitive_gaps.sql) |
| **ai_credit_ledger** | `workspace_id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint8_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint8_schema.sql) |
| **subscriptions** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint8_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint8_schema.sql) |
| **client_users** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint8_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint8_schema.sql) |
| **custom_domains** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint8_custom_domains.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint8_custom_domains.sql) |
| **api_keys** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint9_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint9_schema.sql) |
| **webhook_subscriptions**| `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint9_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint9_schema.sql) |
| **custom_reports** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint9_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint9_schema.sql) |
| **data_warehouse_destinations** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint9_schema_part2.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint9_schema_part2.sql) |
| **automation_flows** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint10_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint10_schema.sql) |
| **migration_status** | `id` UUID | `workspace_id -> workspaces(id)` | Yes | None | [sprint10_schema.sql](file:///d:/nexus-social-platform/nexus-social-app/sprint10_schema.sql) |

---

## Technical Audit Findings & Database Gaps

### 1. Missing Core Tables (`workspaces` & `users`)
The tables `workspaces` and `users` are referenced as foreign key targets in **every single schema script** (e.g., `REFERENCES workspaces(id) ON DELETE CASCADE` and `REFERENCES users(id) ON DELETE CASCADE`). However, these tables are **never defined or created** in any migration file in the repository. Running these SQL scripts on a clean database immediately crashes due to non-existent target tables.

### 2. Missing Database Indices (Performance Risks)
There are **zero indexes** defined in any of the schema SQL scripts. 
*   Queries on `posts` filtering by `workspace_id` and `status = 'published'` (such as those run in the ML service) will trigger full table scans as the database grows, causing performance degradation.
*   Foreign key columns (`workspace_id`, `user_id`) lack indexes, slowing down multi-tenant join operations.

### 3. Missing Storage Buckets
The `MigrationHub` page attempts to upload legacy sprout/hootsuite export files to the `enterprise-migrations` storage bucket. However, `phase1_setup.sql` only creates the `media-assets` storage bucket. This mismatch causes file upload operations to fail with a `bucket not found` error.

### 4. Non-Deterministic Migration Flow
Supabase migrations are supposed to be placed in `supabase/migrations/` with sequential timestamps (e.g. `YYYYMMDDHHMMSS_name.sql`). In this repository, the migrations are scattered as ad-hoc scripts in the root directory (e.g. `week1_schema.sql`, `sprint8_schema.sql`), with only one migration in the official folder (`sprint12_competitive_gaps.sql`). This setup makes automated DB deployment and drift tracking impossible.
