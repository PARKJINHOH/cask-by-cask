import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminRoleTypeApi } from '../api/adminRoleTypeApi'
import type { CreateRoleTypeRequest, UpdateRoleTypeRequest } from '../types/admin.types'

export function useAdminRoleTypes() {
  return useQuery({
    queryKey: ['admin-role-types'],
    queryFn: () => adminRoleTypeApi.getAll().then((res) => res.data.data!),
  })
}

export function useCreateRoleType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleTypeRequest) => adminRoleTypeApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-role-types'] }),
  })
}

export function useUpdateRoleType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleTypeRequest }) =>
      adminRoleTypeApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-role-types'] }),
  })
}

export function useDeleteRoleType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminRoleTypeApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-role-types'] }),
  })
}
