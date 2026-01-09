import { useEffect, useState } from 'react';
import type { WorkflowNodeData } from '../../../types';
import { CronConfigState, buildCronConfigFromProviderConfig, makeDefaultCronConfig } from '../../../triggers/utils';

export const useCronConfig = (triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>) => {
  const { subscription, draft } = triggerMeta;
  const [cronConfig, setCronConfig] = useState<CronConfigState>(() =>
    subscription
      ? buildCronConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialCronConfig ?? makeDefaultCronConfig(),
  );

  useEffect(() => {
    if (subscription) {
      setCronConfig(buildCronConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialCronConfig) {
      setCronConfig(draft.initialCronConfig);
    } else {
      setCronConfig(makeDefaultCronConfig());
    }
  }, [subscription, draft?.initialCronConfig]);

  return { cronConfig, setCronConfig } as const;
};
