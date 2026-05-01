import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { WishlistItem, WishlistRequest, WishlistType } from '../types/wishlist.types'

export const wishlistApi = {
  toggle: (data: WishlistRequest) =>
    axiosInstance.post<ApiResponse<null>>('/api/wishlists', data),

  getMyWishlist: (params?: { type?: WishlistType; page?: number; size?: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<WishlistItem>>>('/api/wishlists/me', { params }),

  deleteItem: (id: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/wishlists/${id}`),
}
