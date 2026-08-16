-- Realtime UPDATE payloads need full row data for RLS filtering.
-- Without this, clients often only see INSERT (queued) and miss pipeline status changes.

alter table captures replica identity full;
alter table memories replica identity full;
