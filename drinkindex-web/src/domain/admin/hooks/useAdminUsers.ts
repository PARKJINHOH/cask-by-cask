import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUserApi } from '../api/adminUserApi'
import type { AdminUserSearchParams, ChangeRoleRequest } from '../types/admin.types'

export function useAdminUsers(params: AdminUserSearchParams) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminUserApi.search(params).then((res) => res.data.data!),
  })
}

export function useChangeRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangeRoleRequest }) =>
      adminUserApi.changeRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminUserApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}
