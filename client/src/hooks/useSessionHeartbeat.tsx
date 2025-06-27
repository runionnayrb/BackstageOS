import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/queryClient";

export function useSessionHeartbeat() {
  const { user } = useAuth();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    // Track user activity
    const trackActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Add activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    // Send heartbeat every 4 minutes if user has been active in last 10 minutes
    const sendHeartbeat = async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const tenMinutes = 10 * 60 * 1000;

      if (timeSinceActivity < tenMinutes) {
        try {
          await apiRequest("POST", "/api/session/heartbeat");
        } catch (error) {
          console.warn("Session heartbeat failed:", error);
        }
      }
    };

    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 4 * 60 * 1000); // 4 minutes

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user]);
}