import type { LucideIcon } from 'lucide-react';
import { Calendar, Database, Link, Mail, FormInput } from 'lucide-react';

export const WEBHOOK_TRIGGER_KEY = 'webhook.generic';
export const GMAIL_TRIGGER_KEY = 'poll.gmail.email_received';
export const CRON_TRIGGER_KEY = 'schedule.cron';
export const SUPABASE_TRIGGER_KEY = 'webhook.supabase.db_changes';
export const FORM_TRIGGER_KEY = 'form.hosted';

export interface GmailFieldOption {
  label: string;
  path: string;
  hint?: string;
}

export const GMAIL_FIELD_OPTIONS: GmailFieldOption[] = [
  { label: 'Subject', path: 'data.subject' },
  { label: 'Snippet', path: 'data.snippet' },
  { label: 'Message ID', path: 'data.message_id' },
  { label: 'Thread ID', path: 'data.thread_id' },
  { label: 'From email', path: 'data.from.email' },
  { label: 'From name', path: 'data.from.name' },
  { label: 'First recipient email', path: 'data.to.0.email' },
  { label: 'Internal date (ms)', path: 'data.internal_date_ms' },
];

export const CRON_FIELD_OPTIONS: GmailFieldOption[] = [
  { label: 'Scheduled time', path: 'data.scheduled_time' },
  { label: 'Actual time', path: 'data.actual_time' },
  { label: 'Cron expression', path: 'data.cron_expression' },
  { label: 'Timezone', path: 'data.timezone' },
];

export const TRIGGER_ICON_BY_KEY: Record<string, LucideIcon> = {
  [WEBHOOK_TRIGGER_KEY]: Link,
  [GMAIL_TRIGGER_KEY]: Mail,
  [CRON_TRIGGER_KEY]: Calendar,
  [SUPABASE_TRIGGER_KEY]: Database,
  [FORM_TRIGGER_KEY]: FormInput,
};

export const CRON_PRESETS = [
  { label: 'Every 5 minutes', expression: '*/5 * * * *' },
  { label: 'Every 15 minutes', expression: '*/15 * * * *' },
  { label: 'Every 30 minutes', expression: '*/30 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at midnight', expression: '0 0 * * *' },
  { label: 'Every day at 9 AM', expression: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', expression: '0 9 * * 1' },
  { label: 'First day of month', expression: '0 0 1 * *' },
];

export const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export const SUPABASE_FIELD_OPTIONS: GmailFieldOption[] = [
  { label: 'Change type', path: 'data.type' },
  { label: 'Schema', path: 'data.schema' },
  { label: 'Table', path: 'data.table' },
  { label: 'New record', path: 'data.record' },
  { label: 'Old record', path: 'data.old_record' },
];

export const GMAIL_TOOL_FALLBACK_NAMES = ['gmail_read_emails'];
export const SUPABASE_TOOL_FALLBACK_NAMES = ['supabase_table_query'];

