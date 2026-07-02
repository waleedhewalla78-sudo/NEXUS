import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_optimal_time():
    print("Testing /predict/optimal-time...")
    # Using a dummy UUID for the workspace_id
    payload = {"workspace_id": "00000000-0000-0000-0000-000000000000"}
    response = client.post("/predict/optimal-time", json=payload)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data}")
        assert "optimal_times" in data
        print("✅ Optimal Time Test Passed (Structure Verified)")
    else:
        print(f"❌ Failed: {response.text}")

def test_churn():
    print("\nTesting /predict/churn...")
    payload = {"workspace_id": "00000000-0000-0000-0000-000000000000"}
    response = client.post("/predict/churn", json=payload)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data}")
        assert "churn_score" in data
        print("✅ Churn Test Passed (Structure Verified)")
    else:
        print(f"❌ Failed: {response.text}")

if __name__ == "__main__":
    test_optimal_time()
    test_churn()
