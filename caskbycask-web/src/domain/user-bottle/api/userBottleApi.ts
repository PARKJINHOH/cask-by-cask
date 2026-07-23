import axiosInstance from '@/shared/api/axiosInstance';
import type { ApiResponse } from '@/shared/types/common.types';
import type { BottleListResponse, UserBottle, UserBottleRequest, SpiritCategory, MyBottleQuery } from '../types/userBottle.types';

export const userBottleApi = {
  getMyBottles: (params: MyBottleQuery) =>
    axiosInstance.get<ApiResponse<BottleListResponse>>('/api/bottles/my', { params })
      .then(r => r.data.data),

  createBottle: (data: UserBottleRequest) =>
    axiosInstance.post<ApiResponse<UserBottle>>('/api/bottles', data)
      .then(r => r.data.data),

  updateBottle: (id: number, data: UserBottleRequest) =>
    axiosInstance.put<ApiResponse<UserBottle>>(`/api/bottles/${id}`, data)
      .then(r => r.data.data),

  deleteBottle: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/bottles/${id}`),

  toggleStatus: (id: number) =>
    axiosInstance.patch<ApiResponse<UserBottle>>(`/api/bottles/${id}/status`)
      .then(r => r.data.data),

  togglePublic: (id: number) =>
    axiosInstance.patch<ApiResponse<UserBottle>>(`/api/bottles/${id}/public`)
      .then(r => r.data.data),

  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosInstance.post<ApiResponse<void>>(`/api/bottles/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  replaceImage: (bottleId: number, imageId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosInstance.put<ApiResponse<void>>(`/api/bottles/${bottleId}/images/${imageId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (bottleId: number, imageId: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/bottles/${bottleId}/images/${imageId}`),

  getPublicBottles: (userId: number, params?: { category?: SpiritCategory; year?: number; page?: number }) =>
    axiosInstance.get<ApiResponse<BottleListResponse>>(`/api/users/${userId}/bottles`, { params })
      .then(r => r.data.data),
};
