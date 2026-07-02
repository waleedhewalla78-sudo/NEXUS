# ML Prediction Service (Parallel Track)

Sprint 6 calls for a FastAPI microservice to populate the `predictions` table (`optimal_times`, `churn_score`).

## Current integration

The web app reads predictions via:

- `getAnalytics()` → `predictions` table join
- No mock fallbacks in production analytics path

## Recommended architecture

```
nexus-ml-service/   (future FastAPI)
    ↓ batch writes
predictions table (Supabase)
    ↓ read
nexus-social-app analytics dashboard
```

## When to start

After Wave 2 analytics dashboard is validated with real post data.
