import { useMemo } from 'react';
import type { TriggerListOption } from '@/components/workflows/build-and-chat/build/TriggerSection';
import type { TriggerCatalogEntry } from '@/types/triggers';
import {
  FORM_TRIGGER_KEY,
  WEBHOOK_TRIGGER_KEY,
  GMAIL_TRIGGER_KEY,
  CRON_TRIGGER_KEY,
  SUPABASE_TRIGGER_KEY,
} from '@/components/workflows/triggers/constants';

interface UseTriggerOptionsParams {
  triggerCatalog: TriggerCatalogEntry[];
  gmailIntegrationReady: boolean;
  isConnectingGmail: boolean;
  onAddTriggerDraft: (triggerKey: string) => void;
  onConnectGmail: () => void;
}

function createTriggerOption(
  trigger: TriggerCatalogEntry | undefined,
  key: string,
  defaultTitle: string,
  defaultDescription: string,
  onAddDraft: () => void,
): TriggerListOption | null {
  if (!trigger) return null;

  return {
    key,
    title: trigger.title ?? defaultTitle,
    description: trigger.description ?? defaultDescription,
    disabled: false,
    onPrimaryAction: onAddDraft,
    actionLabel: 'Add to canvas',
    status: 'ready',
  };
}

function createGmailTriggerOption(
  trigger: TriggerCatalogEntry | undefined,
  ready: boolean,
  connecting: boolean,
  onAddDraft: () => void,
  onConnect: () => void,
): TriggerListOption | null {
  if (!trigger) return null;

  const disabled = !ready;
  return {
    key: GMAIL_TRIGGER_KEY,
    title: trigger.title ?? 'Gmail',
    description: trigger.description ?? 'Poll a Gmail inbox for newly received emails.',
    disabled,
    disabledReason: disabled ? 'Connect Gmail to continue' : undefined,
    onPrimaryAction: onAddDraft,
    actionLabel: 'Add to canvas',
    badge: ready ? 'Connected' : 'Action required',
    status: ready ? 'ready' : 'action-required',
    secondaryActionLabel: disabled ? 'Connect Gmail' : undefined,
    onSecondaryAction: disabled ? onConnect : undefined,
    isSecondaryActionLoading: disabled && connecting,
  };
}

export function useTriggerOptions({
  triggerCatalog,
  gmailIntegrationReady,
  isConnectingGmail,
  onAddTriggerDraft,
  onConnectGmail,
}: UseTriggerOptionsParams): TriggerListOption[] {
  return useMemo<TriggerListOption[]>(() => {
    const options: TriggerListOption[] = [];

    const formOpt = createTriggerOption(
      triggerCatalog.find((t) => t.key === FORM_TRIGGER_KEY),
      FORM_TRIGGER_KEY,
      'Form',
      'Create a public form with custom URL that triggers this workflow',
      () => onAddTriggerDraft(FORM_TRIGGER_KEY),
    );
    if (formOpt) options.push(formOpt);

    const webhookOpt = createTriggerOption(
      triggerCatalog.find((t) => t.key === WEBHOOK_TRIGGER_KEY),
      WEBHOOK_TRIGGER_KEY,
      'Webhook',
      'Accept HTTP POST requests from any service.',
      () => onAddTriggerDraft(WEBHOOK_TRIGGER_KEY),
    );
    if (webhookOpt) options.push(webhookOpt);

    const gmailOpt = createGmailTriggerOption(
      triggerCatalog.find((t) => t.key === GMAIL_TRIGGER_KEY),
      gmailIntegrationReady,
      isConnectingGmail,
      () => onAddTriggerDraft(GMAIL_TRIGGER_KEY),
      onConnectGmail,
    );
    if (gmailOpt) options.push(gmailOpt);

    const cronOpt = createTriggerOption(
      triggerCatalog.find((t) => t.key === CRON_TRIGGER_KEY),
      CRON_TRIGGER_KEY,
      'Schedule',
      'Schedule workflows with cron expressions',
      () => onAddTriggerDraft(CRON_TRIGGER_KEY),
    );
    if (cronOpt) options.push(cronOpt);

    const supabaseOpt = createTriggerOption(
      triggerCatalog.find((t) => t.key === SUPABASE_TRIGGER_KEY),
      SUPABASE_TRIGGER_KEY,
      'Supabase',
      'Receive real-time webhooks when rows in your Supabase tables change.',
      () => onAddTriggerDraft(SUPABASE_TRIGGER_KEY),
    );
    if (supabaseOpt) options.push(supabaseOpt);

    return options;
  }, [triggerCatalog, gmailIntegrationReady, isConnectingGmail, onAddTriggerDraft, onConnectGmail]);
}
