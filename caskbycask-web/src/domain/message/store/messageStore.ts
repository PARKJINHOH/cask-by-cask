import { create } from 'zustand'

interface MessageStore {
  isOpen: boolean
  receiverNickname: string
  openPopup: (receiverNickname?: string) => void
  closePopup: () => void
}

export const useMessageStore = create<MessageStore>((set) => ({
  isOpen: false,
  receiverNickname: '',
  openPopup: (receiverNickname = '') => set({ isOpen: true, receiverNickname }),
  closePopup: () => set({ isOpen: false, receiverNickname: '' }),
}))
