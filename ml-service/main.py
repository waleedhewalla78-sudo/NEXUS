import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
import pandas as pd
from prophet import Prophet
from sklearn.ensemble import RandomForestClassifier
import numpy as np
from datetime import datetime

app = FastAPI(title="Nexus Social ML Service")

# Initialize Supabase with Service Role to bypass RLS, but enforce tenant isolation in queries.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL else None

class PredictRequest(BaseModel):
    workspace_id: str

@app.post("/predict/optimal-time")
def predict_optimal_time(req: PredictRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # CRITICAL: Strict Multi-Tenancy Enforcement
    # MUST append .eq("workspace_id", req.workspace_id) to prevent data leakage!
    response = supabase.table("posts") \
        .select("created_at, likes, shares, comments") \
        .eq("workspace_id", req.workspace_id) \
        .eq("status", "published") \
        .execute()
    
    data = response.data
    if not data or len(data) < 10:
        return {"optimal_times": ["09:00", "12:00", "18:00"], "note": "Insufficient data, returning defaults"}
    
    # Process data for Prophet
    df = pd.DataFrame(data)
    df['created_at'] = pd.to_datetime(df['created_at'])
    # Aggregate engagement score
    df['y'] = df.get('likes', 0) + df.get('shares', 0) * 2 + df.get('comments', 0) * 3
    # Prophet requires 'ds' (datetime) and 'y' (target)
    df['ds'] = df['created_at'].dt.tz_localize(None)

    # Initialize and fit Prophet
    m = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    m.fit(df)
    
    # Predict future hours to find peaks
    future = m.make_future_dataframe(periods=24, freq='h')
    forecast = m.predict(future)
    
    # Get top 3 hours with highest predicted trend/seasonality
    recent_forecast = forecast.tail(24)
    top_hours = recent_forecast.sort_values(by='yhat', ascending=False).head(3)
    optimal_times = top_hours['ds'].dt.strftime('%H:%M').tolist()
    
    # Save prediction
    supabase.table("predictions").upsert({
        "workspace_id": req.workspace_id,
        "optimal_times": optimal_times,
        "created_at": datetime.utcnow().isoformat()
    }, on_conflict="workspace_id").execute()

    return {"optimal_times": optimal_times}

@app.post("/predict/churn")
def predict_churn(req: PredictRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Fetch Workspace Activity
    # CRITICAL: Append .eq("workspace_id", req.workspace_id)
    posts_res = supabase.table("posts") \
        .select("id") \
        .eq("workspace_id", req.workspace_id) \
        .execute()
    
    members_res = supabase.table("workspace_members") \
        .select("id") \
        .eq("workspace_id", req.workspace_id) \
        .execute()
    
    post_count = len(posts_res.data)
    member_count = len(members_res.data)

    # Simple Random Forest model for demonstration
    # In a real app, this would be pre-trained on historical churn data
    X_train = np.array([[10, 1], [50, 3], [100, 5], [0, 1], [5, 2]])
    y_train = np.array([1, 0, 0, 1, 1]) # 1 = Churned, 0 = Active
    
    clf = RandomForestClassifier(n_estimators=10, random_state=42)
    clf.fit(X_train, y_train)
    
    # Predict probability for current workspace
    X_test = np.array([[post_count, member_count]])
    churn_prob = clf.predict_proba(X_test)[0][1] # Probability of class 1
    churn_score = int(churn_prob * 100)

    # Save Prediction
    supabase.table("predictions").upsert({
        "workspace_id": req.workspace_id,
        "churn_score": churn_score,
        "created_at": datetime.utcnow().isoformat()
    }, on_conflict="workspace_id").execute()
    
    return {"churn_score": churn_score}
