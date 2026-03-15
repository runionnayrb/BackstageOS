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
  costumes: boolean;
  seasons: boolean;
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
  costumes: true,
  seasons: false,
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
      const parentValue = featureSettings[parentFeature as keyof FeatureSettings];
      if (typeof parentValue === 'object' && parentValue !== null) {
        return (parentValue as any)[childFeature] ?? true;
      }
      return true;
    }
    const value = featureSettings[feature as keyof Omit<FeatureSettings, 'email'>];
    return typeof value === 'boolean' ? value : true;
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