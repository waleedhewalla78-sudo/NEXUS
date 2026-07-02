-- Task 4: Analytics Dashboard RPG (date_trunc grouping)

CREATE OR REPLACE FUNCTION get_ai_analytics(p_workspace_id UUID)
RETURNS TABLE (
  day DATE,
  total_conversations INT,
  avg_confidence FLOAT,
  avg_accuracy FLOAT,
  avg_tone FLOAT,
  hallucination_rate FLOAT,
  human_edit_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_logs AS (
    SELECT 
      DATE_TRUNC('day', created_at)::DATE AS log_day,
      COUNT(id) AS total_logs,
      AVG(confidence_score) AS avg_conf
    FROM ai_conversation_logs
    WHERE workspace_id = p_workspace_id AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  ),
  daily_evals AS (
    SELECT 
      DATE_TRUNC('day', evaluated_at)::DATE AS eval_day,
      AVG(accuracy_score) AS avg_acc,
      AVG(tone_score) AS avg_tone,
      (SUM(CASE WHEN hallucination_flag THEN 1 ELSE 0 END)::FLOAT / COUNT(id)) AS hall_rate
    FROM ai_evaluations
    WHERE workspace_id = p_workspace_id AND evaluated_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  ),
  daily_feedback AS (
    SELECT 
      DATE_TRUNC('day', created_at)::DATE AS fb_day,
      (SUM(CASE WHEN human_edited THEN 1 ELSE 0 END)::FLOAT / COUNT(id)) AS edit_rate
    FROM ai_feedback
    WHERE workspace_id = p_workspace_id AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  )
  SELECT 
    l.log_day,
    l.total_logs::INT,
    l.avg_conf::FLOAT,
    COALESCE(e.avg_acc, 0)::FLOAT,
    COALESCE(e.avg_tone, 0)::FLOAT,
    COALESCE(e.hall_rate, 0)::FLOAT,
    COALESCE(f.edit_rate, 0)::FLOAT
  FROM daily_logs l
  LEFT JOIN daily_evals e ON l.log_day = e.eval_day
  LEFT JOIN daily_feedback f ON l.log_day = f.fb_day
  ORDER BY l.log_day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
