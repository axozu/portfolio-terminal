import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api';

/** Сбрасывает пользовательские изменения и перезагружает все данные. */
export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => http.postVoid('/demo/reset'),
    onSettled: () => queryClient.invalidateQueries(),
  });
}
