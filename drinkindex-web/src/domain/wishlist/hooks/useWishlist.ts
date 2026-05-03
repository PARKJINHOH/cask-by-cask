import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wishlistApi } from '../api/wishlistApi'
import type { WishlistRequest, WishlistType } from '../types/wishlist.types'
import { useAuthStore } from '@/domain/auth/store/authStore'

export function useMyWishlist(type?: WishlistType, page = 0) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['wishlist', type, page],
    queryFn: () =>
      wishlistApi.getMyWishlist({ type, page, size: 18 }).then((res) => res.data.data!),
    enabled: isLoggedIn,
  })
}

/** Returns a Set of WishlistTypes that are active for the given spirit. */
export function useWishlistStatus(spiritId: number) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return useQuery({
    queryKey: ['wishlist-status', spiritId],
    queryFn: async () => {
      const res = await wishlistApi.getMyWishlist({ size: 200 })
      const items = res.data.data?.content ?? []
      return new Set<WishlistType>(
        items.filter((w) => w.spirit.id === spiritId).map((w) => w.type),
      )
    },
    enabled: isLoggedIn,
    staleTime: 30_000,
  })
}

export function useToggleWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: WishlistRequest) => wishlistApi.toggle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] })
    },
  })
}

export function useRemoveWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => wishlistApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] })
    },
  })
}
