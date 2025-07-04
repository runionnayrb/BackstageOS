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

export function getAllDepartmentNames(
  customNames?: Record<string, string>,
  departmentOrder?: string[]
): Array<{
  key: DepartmentKey;
  displayName: string;
}> {
  const defaultOrder = Object.keys(DEFAULT_DEPARTMENT_NAMES) as DepartmentKey[];
  
  if (departmentOrder && departmentOrder.length > 0) {
    // Use the provided order, including custom departments
    return departmentOrder.map(key => ({
      key: key as DepartmentKey,
      displayName: customNames?.[key] || DEFAULT_DEPARTMENT_NAMES[key as DepartmentKey] || key
    }));
  }
  
  // Default order if no custom order is provided
  return defaultOrder.map(key => ({
    key,
    displayName: getDepartmentDisplayName(key, customNames)
  }));
}