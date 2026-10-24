UPDATE `sessions`
SET `log_json` = (
  SELECT json_set(
    `sessions`.`log_json`,
    '$[' || p.`key` || '].sets[0].reps', 6,
    '$[' || p.`key` || '].sets[0].rpe', 0,
    '$[' || p.`key` || '].sets[1].reps', 6,
    '$[' || p.`key` || '].sets[1].rpe', 0
  )
  FROM json_each(`sessions`.`log_json`) AS p
  WHERE lower(json_extract(p.`value`, '$.name')) = 'pike push-up'
    AND json_array_length(json_extract(p.`value`, '$.sets')) = 2
    AND json_extract(p.`value`, '$.sets[0].completed') = 1
    AND json_extract(p.`value`, '$.sets[1].completed') = 1
    AND json_extract(p.`value`, '$.sets[0].reps') = 6
    AND json_extract(p.`value`, '$.sets[1].reps') = 6
    AND json_extract(p.`value`, '$.sets[0].rpe') = 1
    AND json_extract(p.`value`, '$.sets[1].rpe') = 1
)
WHERE `id` = 1
  AND `session_type` = 'full_body'
  AND EXISTS (
    SELECT 1
    FROM json_each(`sessions`.`log_json`) AS p
    WHERE lower(json_extract(p.`value`, '$.name')) = 'pike push-up'
      AND json_array_length(json_extract(p.`value`, '$.sets')) = 2
      AND json_extract(p.`value`, '$.sets[0].reps') = 6
      AND json_extract(p.`value`, '$.sets[1].reps') = 6
      AND json_extract(p.`value`, '$.sets[0].rpe') = 1
      AND json_extract(p.`value`, '$.sets[1].rpe') = 1
  );
