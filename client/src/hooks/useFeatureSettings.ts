import { useQuery } from "@tanstack/react-query";

interface FeatureSettings {
  email: {
    team: boolean;
  };
  chat: boolean;
  reports: boolean;
  calendar: boolean;
  script: boolean;
  props: boolean;
  contacts: boolean;
}

interface ShowSettings {
  featureSettings?: FeatureSettings;
}

const defaultFeatureSettings: FeatureSettings = {
  email: {
    team: true,
  },
  chat: true,
  reports: true,
  calendar: true,
  script: true,
  props: true,
  contacts: true,
};

export function useFeatureSettings(showId?: string) {
  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${showId}/settings`],
    enabled: !!showId,
  });

  const featureSettings = (settings as ShowSettings)?.featureSettings || defaultFeatureSettings;

  const isFeatureEnabled = (feature: keyof Omit<FeatureSettings, 'email'> | 'email.team'): boolean => {
    if (feature.includes('.')) {
      const [parentFeature, childFeature] = feature.split('.');
      return featureSettings[parentFeature as keyof FeatureSettings]?.[childFeature as any] ?? true;
    }
    return featureSettings[feature as keyof FeatureSettings] ?? true;
  };

  const isEmailEnabled = () => {
    // When outside a show context (showId is undefined), always show email
    // When inside a show context, only show if team email is enabled
    if (!showId) return true;
    return featureSettings.email.team;
  };

  return {
    featureSettings,
    isFeatureEnabled,
    isEmailEnabled,
  };
}