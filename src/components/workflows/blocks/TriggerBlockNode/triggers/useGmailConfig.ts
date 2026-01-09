import { useEffect, useState } from 'react';
import type { WorkflowNodeData } from '../../../types';
import { GmailConfigState, buildGmailConfigFromProviderConfig, makeDefaultGmailConfig } from '../../../triggers/utils';

export const useGmailConfig = (triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>) => {
  const { subscription, draft } = triggerMeta;
  const [gmailConfig, setGmailConfig] = useState<GmailConfigState>(() =>
    subscription
      ? buildGmailConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialGmailConfig ?? makeDefaultGmailConfig(),
  );

  useEffect(() => {
    if (subscription) {
      setGmailConfig(buildGmailConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialGmailConfig) {
      setGmailConfig(draft.initialGmailConfig);
    } else {
      setGmailConfig(makeDefaultGmailConfig());
    }
  }, [subscription, draft?.initialGmailConfig]);

  return { gmailConfig, setGmailConfig } as const;
};
