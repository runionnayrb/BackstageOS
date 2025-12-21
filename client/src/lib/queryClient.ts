import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorData;
    
    // Try to parse as JSON for structured error responses
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text };
    }
    
    const error = new Error(errorData.message || `${res.status}: ${text}`) as any;
    error.status = res.status;
    error.conflicts = errorData.conflicts;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Parse JSON response if content-type indicates JSON
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  
  // For non-JSON responses, return the response object
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construct URL from query key array
    let url: string;
    if (typeof queryKey[0] === 'string' && queryKey[0].startsWith('/api/')) {
      if (queryKey.length === 1) {
        // Simple string query key like ['/api/projects']
        url = queryKey[0];
      } else {
        // Array query key like ['/api/projects', projectId, 'settings', { params }]
        // Separate path parts from query params (last element if it's an object)
        const lastElement = queryKey[queryKey.length - 1];
        const hasQueryParams = typeof lastElement === 'object' && lastElement !== null && !Array.isArray(lastElement);
        
        // Build path from all elements except the last one if it's query params
        const pathParts = hasQueryParams 
          ? queryKey.slice(0, -1).filter(part => part !== undefined && part !== null)
          : queryKey.filter(part => part !== undefined && part !== null);
        
        url = pathParts.join('/');
        
        // Append query parameters if present
        if (hasQueryParams) {
          const params = new URLSearchParams();
          Object.entries(lastElement).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
          const queryString = params.toString();
          if (queryString) {
            url += `?${queryString}`;
          }
        }
      }
    } else {
      // Fallback to original behavior for non-API keys
      url = queryKey[0] as string;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity for better data freshness
      throwOnError: false, // Prevent unhandled promise rejections - errors handled via error state
      retry: (failureCount, error) => {
        // Enhanced retry logic for better error handling
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          
          // Check for HTTP status codes
          const statusMatch = error.message.match(/(\d{3})/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            
            // Never retry on authentication/authorization errors
            if (status === 401 || status === 403) {
              return false;
            }
            
            // Don't retry on client errors (400-499) except for specific cases
            if (status >= 400 && status < 500) {
              // Retry on 408 (timeout), 429 (rate limit), and network issues
              if (status === 408 || status === 429 || status === 503) {
                return failureCount < 2;
              }
              return false;
            }
            
            // Retry on server errors (500+) up to 3 times
            if (status >= 500 && failureCount < 3) {
              return true;
            }
          }
          
          // Retry on network-related errors
          if (errorMessage.includes('network') || 
              errorMessage.includes('fetch') || 
              errorMessage.includes('timeout') ||
              errorMessage.includes('connection')) {
            return failureCount < 2;
          }
        }
        
        return false;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter
        const baseDelay = 1000;
        const maxDelay = 30000;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
        const jitter = Math.random() * 0.1 * exponentialDelay;
        return exponentialDelay + jitter;
      },
    },
    mutations: {
      throwOnError: false, // Prevent unhandled promise rejections - errors handled via onError callbacks
      retry: (failureCount, error) => {
        // Enhanced mutation retry logic
        if (error instanceof Error) {
          const statusMatch = error.message.match(/(\d{3})/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            
            // Never retry on client errors (400-499)
            if (status >= 400 && status < 500) {
              return false;
            }
            
            // Retry on server errors (500+) up to 2 times
            if (status >= 500 && failureCount < 2) {
              return true;
            }
          }
          
          // Retry on network errors only once for mutations
          const errorMessage = error.message.toLowerCase();
          if ((errorMessage.includes('network') || 
               errorMessage.includes('fetch') || 
               errorMessage.includes('timeout')) && 
              failureCount < 1) {
            return true;
          }
        }
        
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
    },
  },
});
