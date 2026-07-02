# AI Incident Runbook

This document outlines the Standard Operating Procedures (SOP) for DevOps and Support teams to manage and mitigate incidents involving the Nexus Social Omnichannel AI Agent.

## 1. Execute the Global Kill Switch
If the AI system experiences a catastrophic failure, infinite loop, or prompt injection attack affecting multiple workspaces, you must immediately trigger the Global Kill Switch. This will force 100% of incoming traffic to bypass the AI and route directly to human agents in Chatwoot.

**Action:** Execute the following SQL command against the production Supabase database:
```sql
UPDATE ai_agent_configs SET is_globally_disabled = true;
```

*Note: The webhook listener will instantly drop payloads. Jobs already in the Redis queue will perform a secondary check and abort.*

## 2. Execute a Workspace-Level Kill Switch
If a specific agency or brand's AI is hallucinating or malfunctioning, you can disable the AI exclusively for that tenant without affecting the rest of the platform.

**Action:** Execute the following SQL command:
```sql
UPDATE ai_agent_configs 
SET is_active = false 
WHERE workspace_id = 'TARGET_WORKSPACE_UUID';
```

## 3. Investigating a Hallucination
If a customer reports that the AI provided incorrect information (e.g., wrong return policy or hallucinated order status):

**Action:**
1. Log into your Sentry dashboard and search for the specific `workspace_id` using the tag filter.
2. Locate the OpenTelemetry trace ID associated with that conversation. The trace will map the exact lifecycle: `db_lookup` -> `pii_redaction` -> `dify_api_call`.
3. Query the `ai_conversation_logs` table for the raw transcript:
   ```sql
   SELECT user_query, ai_response, confidence_score 
   FROM ai_conversation_logs 
   WHERE workspace_id = 'TARGET_WORKSPACE_UUID' 
   ORDER BY created_at DESC LIMIT 5;
   ```
4. Check the `confidence_score` and review the Dify prompt context to determine why the RAG engine retrieved the wrong chunk.

## 4. Force-Reset Daily Token Limits
If an agency hits their `daily_token_limit` due to a spike in traffic (or a false-positive loop), and an admin approves an extension, you must manually reset their Redis token counter.

**Action:**
Connect to the production Redis instance and execute:
```bash
# Delete the key to instantly reset their usage to 0 for the day
DEL ai_tokens:{workspace_id}:{YYYY-MM-DD}

# Alternatively, increase their limit in the DB to prevent future blocks:
# UPDATE ai_agent_configs SET daily_token_limit = 500000 WHERE workspace_id = '...';
```
