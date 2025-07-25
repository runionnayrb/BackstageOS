// Temporary simplified toast implementation to fix React hooks error
import { useState } from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

// Simple toast function that does nothing for now
export function toast(props: Omit<Toast, "id">) {
  console.log("Toast called:", props)
  return {
    id: Date.now().toString(),
    dismiss: () => {},
    update: () => {},
  }
}

// Simple hook that returns empty state
export function useToast() {
  const [toasts] = useState<Toast[]>([])
  
  return {
    toasts,
    toast,
    dismiss: () => {},
  }
}