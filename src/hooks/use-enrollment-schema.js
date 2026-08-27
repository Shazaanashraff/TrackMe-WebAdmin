import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

// Organizations and the enrollment-form schema are edited a handful of times a
// month. An hour of staleness keeps them out of the per-visit refetch churn;
// useSaveEnrollmentSchema still invalidates the schema on every save.
export const ORGANIZATIONS_STALE_TIME = 60 * 60 * 1000;
export const ENROLLMENT_SCHEMA_STALE_TIME = 60 * 60 * 1000;

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: qk.organizations.all(),
    queryFn: adminApi.getOrganizations,
    enabled,
    staleTime: ORGANIZATIONS_STALE_TIME,
  });
}

export function useEnrollmentSchema({ organizationId, superAdmin }) {
  return useQuery({
    queryKey: superAdmin ? qk.enrollmentSchema.organization(organizationId) : qk.enrollmentSchema.manager(),
    queryFn: () => superAdmin ? adminApi.getOrganizationEnrollmentSchema(organizationId) : adminApi.getManagerEnrollmentSchema(),
    enabled: !superAdmin || Boolean(organizationId),
    staleTime: ENROLLMENT_SCHEMA_STALE_TIME,
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
