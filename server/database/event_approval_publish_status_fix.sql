-- Event approval/publish status repair.
-- Run once on production after deploying the code changes.

DELIMITER $$

DROP PROCEDURE IF EXISTS buizz_add_index_if_missing $$
CREATE PROCEDURE buizz_add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

-- If Super Admin already approved a create/update request, make the real event status approved.
UPDATE events e
JOIN (
  SELECT event_id, MAX(id) AS approval_request_id
  FROM event_approval_requests
  WHERE event_id IS NOT NULL
    AND status = 'approved'
    AND super_admin_status = 'approved'
    AND action_type IN ('create', 'update')
  GROUP BY event_id
) approved_request ON approved_request.event_id = e.event_id
SET e.status = 'approved',
    e.updated_at = NOW()
WHERE e.status NOT IN ('approved', 'published', 'ongoing', 'completed');

-- Keep only the newest approval request row for the same organizer + event.
DELETE old_request
FROM event_approval_requests old_request
JOIN (
  SELECT event_id, organizer_id, MAX(id) AS keep_id
  FROM event_approval_requests
  WHERE event_id IS NOT NULL
  GROUP BY event_id, organizer_id
) latest ON latest.event_id = old_request.event_id
  AND latest.organizer_id = old_request.organizer_id
WHERE old_request.id <> latest.keep_id;

-- Keep only one history row per approval request action.
DELETE old_history
FROM event_approval_history old_history
JOIN event_approval_history latest_history
  ON latest_history.approval_request_id = old_history.approval_request_id
  AND latest_history.action = old_history.action
  AND latest_history.id > old_history.id
WHERE old_history.approval_request_id IS NOT NULL;

CALL buizz_add_index_if_missing(
  'event_approval_requests',
  'event_approval_requests_event_organizer_unique',
  'UNIQUE KEY event_approval_requests_event_organizer_unique (event_id, organizer_id)'
);

CALL buizz_add_index_if_missing(
  'event_approval_history',
  'event_approval_history_request_action_unique',
  'UNIQUE KEY event_approval_history_request_action_unique (approval_request_id, action)'
);

DROP PROCEDURE IF EXISTS buizz_add_index_if_missing;
