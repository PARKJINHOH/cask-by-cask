import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spiritRequestApi } from '../api/spiritRequestApi'
import type { SpiritRegisterRequestForm } from '../types/spiritRequest.types'

export function useMyRequests() {
  return useQuery({
    queryKey: ['spirit-requests', 'me'],
    queryFn: async () => {
      const res = await spiritRequestApi.myRequests()
      return res.data.data ?? []
    },
  })
}

export function useSubmitRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SpiritRegisterRequestForm) => spiritRequestApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spirit-requests', 'me'] })
    },
  })
}
