import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";

interface OptimisticMutationOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables, unknown>, 'onMutate' | 'onError' | 'onSettled'> {
  queryKey: unknown[];
  updateFn?: (oldData: any, variables: TVariables) => any;
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: Error, variables: TVariables, context: any) => void;
}

export function useOptimisticMutation<TData = unknown, TVariables = unknown>({
  queryKey,
  updateFn,
  onSuccess,
  onError,
  ...mutationOptions
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, { previousData: unknown }>({
    ...mutationOptions,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);
      const snapshot = previousData !== undefined ? structuredClone(previousData) : undefined;

      if (updateFn) {
        queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables));
      }

      return { previousData: snapshot };
    },
    onError: (error, variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useOptimisticCreate<TItem, TVariables = Omit<TItem, 'id'>>({
  queryKey,
  mutationFn,
  generateTempId = () => `temp-${Date.now()}-${Math.random()}`,
  onSuccess,
  onError,
}: {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  generateTempId?: () => string | number;
  onSuccess?: (data: TItem, variables: TVariables, context: unknown) => void;
  onError?: (error: Error, variables: TVariables, context: any) => void;
}) {
  return useOptimisticMutation<TItem, TVariables>({
    queryKey,
    mutationFn,
    updateFn: (oldData: TItem[] | undefined, variables: TVariables) => {
      const tempItem = { ...variables, id: generateTempId() } as TItem;
      return oldData ? [...oldData, tempItem] : [tempItem];
    },
    onSuccess,
    onError,
  });
}

export function useOptimisticUpdate<TItem extends { id: string | number }, TVariables extends Partial<TItem> & { id: string | number }>({
  queryKey,
  mutationFn,
  onSuccess,
  onError,
}: {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  onSuccess?: (data: TItem, variables: TVariables, context: unknown) => void;
  onError?: (error: Error, variables: TVariables, context: any) => void;
}) {
  return useOptimisticMutation<TItem, TVariables>({
    queryKey,
    mutationFn,
    updateFn: (oldData: TItem[] | undefined, variables: TVariables) => {
      if (!oldData) return oldData;
      return oldData.map(item => 
        item.id === variables.id ? { ...item, ...variables } : item
      );
    },
    onSuccess,
    onError,
  });
}

export function useOptimisticDelete<TVariables extends { id: string | number }>({
  queryKey,
  mutationFn,
  onSuccess,
  onError,
}: {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<void>;
  onSuccess?: (data: void, variables: TVariables, context: unknown) => void;
  onError?: (error: Error, variables: TVariables, context: any) => void;
}) {
  return useOptimisticMutation<void, TVariables>({
    queryKey,
    mutationFn,
    updateFn: (oldData: any[] | undefined, variables: TVariables) => {
      if (!oldData) return oldData;
      return oldData.filter(item => item.id !== variables.id);
    },
    onSuccess,
    onError,
  });
}
