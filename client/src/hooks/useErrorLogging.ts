import { useCallback } from 'react';
import { errorLogger, logClickFailure, logFormSubmissionError, logPageLoadFailure, logNavigationError } from '@/lib/errorLogger';
import { useToast } from '@/hooks/use-toast';

export function useErrorLogging() {
  const { toast } = useToast();

  const logAndShowError = useCallback((message: string, error?: Error) => {
    // Log the error automatically
    errorLogger.logClickFailure('Generic Action', message, error);
    
    // Show user-friendly toast
    toast({
      title: "Something went wrong",
      description: "We've recorded this issue and will look into it.",
      variant: "destructive",
    });
  }, [toast]);

  const wrapAsyncAction = useCallback(<T extends any[], R>(
    action: (...args: T) => Promise<R>,
    actionName: string,
    element?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await action(...args);
      } catch (error) {
        logClickFailure(element || actionName, `Failed to ${actionName}`, error as Error);
        toast({
          title: "Action Failed",
          description: "We've recorded this issue and will look into it.",
          variant: "destructive",
        });
        throw error; // Re-throw to let the caller handle it if needed
      }
    };
  }, [toast]);

  const wrapFormSubmission = useCallback(<T extends any[], R>(
    submitFn: (...args: T) => Promise<R>,
    formName: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await submitFn(...args);
      } catch (error) {
        logFormSubmissionError(formName, error as Error);
        toast({
          title: "Form Submission Failed",
          description: "Please check your input and try again. We've recorded this issue.",
          variant: "destructive",
        });
        throw error;
      }
    };
  }, [toast]);

  const wrapNavigation = useCallback((
    navigateFn: () => void,
    fromPage: string,
    toPage: string
  ) => {
    return () => {
      try {
        navigateFn();
      } catch (error) {
        logNavigationError(fromPage, toPage, error as Error);
        toast({
          title: "Navigation Failed",
          description: "Unable to navigate to the requested page.",
          variant: "destructive",
        });
      }
    };
  }, [toast]);

  return {
    logAndShowError,
    wrapAsyncAction,
    wrapFormSubmission,
    wrapNavigation,
    logClickFailure,
    logFormSubmissionError,
    logPageLoadFailure,
    logNavigationError,
  };
}