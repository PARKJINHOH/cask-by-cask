import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/domain/auth/store/authStore';
import { userBottleApi } from '../api/userBottleApi';
import type { SpiritCategory, BottleStatus, UserBottleRequest } from '../types/userBottle.types';

const MY_BOTTLES_KEY = ['bottles', 'my'] as const;

export function useMyBottles(params: { category?: SpiritCategory; status?: BottleStatus; page?: number }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  return useQuery({
    queryKey: [...MY_BOTTLES_KEY, params],
    queryFn: () => userBottleApi.getMyBottles(params),
    enabled: isLoggedIn,
  });
}

export function usePublicBottles(userId: number, category?: SpiritCategory) {
  return useQuery({
    queryKey: ['bottles', 'public', userId, category],
    queryFn: () => userBottleApi.getPublicBottles(userId, { category }),
  });
}

function useInvalidateMyBottles() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: MY_BOTTLES_KEY });
}

export function useCreateBottle() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (data: UserBottleRequest) => userBottleApi.createBottle(data), onSuccess: invalidate });
}

export function useUpdateBottle() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserBottleRequest }) => userBottleApi.updateBottle(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteBottle() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (id: number) => userBottleApi.deleteBottle(id), onSuccess: invalidate });
}

export function useToggleBottleStatus() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (id: number) => userBottleApi.toggleStatus(id), onSuccess: invalidate });
}

export function useToggleBottlePublic() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({ mutationFn: (id: number) => userBottleApi.togglePublic(id), onSuccess: invalidate });
}

export function useUploadBottleImage() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => userBottleApi.uploadImage(id, file),
    onSuccess: invalidate,
  });
}

export function useReplaceBottleImage() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ bottleId, imageId, file }: { bottleId: number; imageId: number; file: File }) =>
      userBottleApi.replaceImage(bottleId, imageId, file),
    onSuccess: invalidate,
  });
}

export function useDeleteBottleImage() {
  const invalidate = useInvalidateMyBottles();
  return useMutation({
    mutationFn: ({ bottleId, imageId }: { bottleId: number; imageId: number }) =>
      userBottleApi.deleteImage(bottleId, imageId),
    onSuccess: invalidate,
  });
}

