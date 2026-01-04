import type { LucideIcon } from 'lucide-react';
import { Link, Mail } from 'lucide-react';

export const WEBHOOK_TRIGGER_KEY = 'webhook.generic';
export const GMAIL_TRIGGER_KEY = 'poll.gmail.email_received';

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

export const TRIGGER_ICON_BY_KEY: Record<string, LucideIcon> = {
  [WEBHOOK_TRIGGER_KEY]: Link,
  [GMAIL_TRIGGER_KEY]: Mail,
};

export const GMAIL_TOOL_FALLBACK_NAMES = ['gmail_read_emails'];

