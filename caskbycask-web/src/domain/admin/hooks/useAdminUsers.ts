import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUserApi } from '../api/adminUserApi'
import type { AdminUserSearchParams, ChangeRoleRequest, SuspendUserRequest, UpdateBoardPermissionsRequest } from '../types/admin.types'

export function useAdminUsers(params: AdminUserSearchParams) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminUserApi.search(params).then((res) => res.data.data!),
  })
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminUserApi.getUser(id).then((res) => res.data.data!),
  })
}

export function useUpdateBoardPermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBoardPermissionsRequest }) =>
      adminUserApi.updateBoardPermissions(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
    },
  })
}

export function useChangeRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangeRoleRequest }) =>
      adminUserApi.changeRole(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
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

export function useActivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminUserApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useSuspendUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SuspendUserRequest }) =>
      adminUserApi.suspend(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminUserApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

