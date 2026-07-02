-- Task 1: Traffic Routing & Kill Switch (Week 5)

ALTER TABLE ai_agent_configs 
ADD COLUMN IF NOT EXISTS traffic_allocation_percentage INT DEFAULT 0 CHECK (traffic_allocation_percentage >= 0 AND traffic_allocation_percentage <= 100),
ADD COLUMN IF NOT EXISTS daily_token_limit INT DEFAULT 100000,
ADD COLUMN IF NOT EXISTS is_globally_disabled BOOLEAN DEFAULT false;
