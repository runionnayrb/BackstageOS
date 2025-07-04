// Default department names for tech reports
export const DEFAULT_DEPARTMENT_NAMES = {
  scenic: 'Scenic',
  lighting: 'Lighting',
  audio: 'Audio',
  video: 'Video',
  props: 'Props'
} as const;

export type DepartmentKey = keyof typeof DEFAULT_DEPARTMENT_NAMES;

export function getDepartmentDisplayName(
  department: DepartmentKey,
  customNames?: Record<string, string>
): string {
  return customNames?.[department] || DEFAULT_DEPARTMENT_NAMES[department];
}

export function getAllDepartmentNames(customNames?: Record<string, string>): Array<{
  key: DepartmentKey;
  displayName: string;
}> {
  return Object.keys(DEFAULT_DEPARTMENT_NAMES).map(key => ({
    key: key as DepartmentKey,
    displayName: getDepartmentDisplayName(key as DepartmentKey, customNames)
  }));
}