import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useOrganizations(enabled = true) {
  return useQuery({ queryKey: qk.organizations.all(), queryFn: adminApi.getOrganizations, enabled });
}

export function useEnrollmentSchema({ organizationId, superAdmin }) {
  return useQuery({
    queryKey: superAdmin ? qk.enrollmentSchema.organization(organizationId) : qk.enrollmentSchema.manager(),
    queryFn: () => superAdmin ? adminApi.getOrganizationEnrollmentSchema(organizationId) : adminApi.getManagerEnrollmentSchema(),
    enabled: !superAdmin || Boolean(organizationId),
  });
}

export function useSaveEnrollmentSchema({ organizationId, superAdmin }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields) => superAdmin
      ? adminApi.updateOrganizationEnrollmentSchema(organizationId, fields)
      : adminApi.updateManagerEnrollmentSchema(fields),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: superAdmin ? qk.enrollmentSchema.organization(organizationId) : qk.enrollmentSchema.manager(),
    }),
  });
}
