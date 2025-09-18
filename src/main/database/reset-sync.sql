-- Reset sync states
DELETE FROM product_sync_progress;

-- Reset stuck sales
UPDATE sales SET
  sync_status = 'pending',
  sync_attempts = 0,
  last_sync_error = NULL
WHERE sync_status = 'syncing';

-- Reset failed sales that haven't exceeded retry limit
UPDATE sales SET
  sync_status = 'pending',
  last_sync_error = NULL
WHERE sync_status = 'failed'
AND sync_attempts < 3;
