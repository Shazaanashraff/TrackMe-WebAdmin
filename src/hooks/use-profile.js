import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/api';

// No query key / invalidation here: the caller's own account isn't cached by
// TanStack Query anywhere else — it lives in authSession's stored auth, kept
// in sync via the mutation's onSuccess in the calling page.
export function useUpdateOwnProfile() {
  return useMutation({
    mutationFn: (name) => adminApi.updateOwnProfile(name),
  });
}
