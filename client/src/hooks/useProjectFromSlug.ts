import { useQuery } from "@tanstack/react-query";

interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  venue?: string;
  prepStartDate?: Date;
  firstRehearsalDate?: Date;
  designerRunDate?: Date;
  firstTechDate?: Date;
  firstPreviewDate?: Date;
  openingNight?: Date;
  closingDate?: Date;
  season?: string;
  ownerId: number;
  isArchived?: boolean;
  [key: string]: any;
}

export function useProjectFromSlug(slug: string | undefined) {
  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['/api/projects/by-slug', slug],
    enabled: !!slug,
  });

  return {
    project,
    projectId: project?.id,
    isLoading,
    error,
  };
}
