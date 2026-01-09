export const GMAIL_QUICK_OPTIONS = [
  { label: 'Subject', path: 'data.subject' },
  { label: 'From', path: 'data.from' },
  { label: 'Body', path: 'data.body' },
  { label: 'Message ID', path: 'data.messageId' },
];

export const CRON_QUICK_OPTIONS = [
  { label: 'Timestamp', path: 'data.timestamp' },
  { label: 'Run ID', path: 'data.run_id' },
];

export const SUPABASE_QUICK_OPTIONS = [
  { label: 'Record', path: 'data.record' },
  { label: 'Old Record', path: 'data.old_record' },
  { label: 'Event Type', path: 'data.type' },
  { label: 'Table', path: 'data.table' },
];

export const SUPABASE_PROJECT_PICKER_CONFIG = {
  resource_type: 'supabase_binding',
  endpoint: '/api/integrations/supabase/resources/bindings',
  display_field: 'display_name',
  value_field: 'id',
  search_enabled: true,
} as const;

export const SUPABASE_EVENT_LABELS = {
  INSERT: 'INSERT – Row created',
  UPDATE: 'UPDATE – Row modified',
  DELETE: 'DELETE – Row removed',
} as const;
