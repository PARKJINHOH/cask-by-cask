import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messageApi } from '../api/messageApi'
import type { MessageBox } from '../types/message.types'

const LIST_KEY = (box: MessageBox) => ['messages', box]
const THREAD_KEY = (id: number) => ['message', id]

export function useMessageList(box: MessageBox, page = 0, size = 20) {
  return useQuery({
    queryKey: [...LIST_KEY(box), page],
    queryFn: () => messageApi.getMessages({ box, page, size }).then((r) => r.data.data!),
    staleTime: 10_000,
  })
}

export function useMessageThread(id: number) {
  return useQuery({
    queryKey: THREAD_KEY(id),
    queryFn: () => messageApi.getThread(id).then((r) => r.data.data!),
    enabled: id > 0,
    staleTime: 0,
  })
}

export function useMessageActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['messages'] })
    qc.invalidateQueries({ queryKey: ['message'] })
  }

  const sendMutation = useMutation({
    mutationFn: (data: { receiverNickname: string; content: string }) =>
      messageApi.send(data),
    onSuccess: invalidate,
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      messageApi.reply(id, content),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => messageApi.delete(id),
    onSuccess: invalidate,
  })

  return { sendMutation, replyMutation, deleteMutation }
}
