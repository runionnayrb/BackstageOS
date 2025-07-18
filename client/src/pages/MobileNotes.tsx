import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MobileNotesList } from "../components/notes/MobileNotesList";

export default function MobileNotes() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"all" | "project">("all");
  
  // Get current project from URL or context
  const projectId = new URLSearchParams(window.location.search).get('projectId');

  // Set view mode based on projectId
  useEffect(() => {
    setViewMode(projectId ? "project" : "all");
  }, [projectId]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in required</h2>
          <p className="text-gray-500">Please sign in to access your notes</p>
        </div>
      </div>
    );
  }

  return (
    <MobileNotesList 
      projectId={projectId}
      viewMode={viewMode}
    />
  );
}