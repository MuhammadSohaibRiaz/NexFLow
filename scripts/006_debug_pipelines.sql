-- Inspect Pipelines
SELECT id, name, platforms, frequency, next_run_at, is_active 
FROM pipelines;

-- Inspect Topics for a specific pipeline (you may need to fill the ID)
SELECT id, pipeline_id, title, status, sort_order
FROM topics
ORDER BY pipeline_id, sort_order;
