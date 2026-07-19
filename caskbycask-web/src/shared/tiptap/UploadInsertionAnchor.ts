import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'

type AnchorMeta =
  | { type: 'add'; id: string; pos: number }
  | { type: 'remove'; id: string }

const uploadInsertionAnchorKey = new PluginKey<Map<string, number>>('uploadInsertionAnchor')

/**
 * 비동기 업로드가 진행되는 동안 최초 삽입 위치를 문서 트랜잭션에 맞춰 이동시킨다.
 * 사용자가 다른 곳에서 입력하거나 내용을 삭제해도 앵커는 가장 가까운 유효 위치를 유지한다.
 */
export const UploadInsertionAnchor = Extension.create({
  name: 'uploadInsertionAnchor',

  addProseMirrorPlugins() {
    return [
      new Plugin<Map<string, number>>({
        key: uploadInsertionAnchorKey,
        state: {
          init: () => new Map(),
          apply(transaction, anchors) {
            const next = new Map<string, number>()
            anchors.forEach((pos, id) => {
              next.set(id, transaction.mapping.map(pos, 1))
            })

            const meta = transaction.getMeta(uploadInsertionAnchorKey) as AnchorMeta | undefined
            if (meta?.type === 'add') {
              next.set(meta.id, Math.min(Math.max(0, meta.pos), transaction.doc.content.size))
            } else if (meta?.type === 'remove') {
              next.delete(meta.id)
            }
            return next
          },
        },
      }),
    ]
  },
})

export function createUploadInsertionAnchor(editor: Editor, pos: number): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `upload-anchor-${Date.now()}-${Math.random().toString(36).slice(2)}`
  editor.view.dispatch(editor.state.tr.setMeta(uploadInsertionAnchorKey, { type: 'add', id, pos } satisfies AnchorMeta))
  return id
}

export function getUploadInsertionAnchor(editor: Editor, id: string): number | null {
  return uploadInsertionAnchorKey.getState(editor.state)?.get(id) ?? null
}

export function removeUploadInsertionAnchor(editor: Editor, id: string) {
  if (editor.isDestroyed) return
  editor.view.dispatch(editor.state.tr.setMeta(uploadInsertionAnchorKey, { type: 'remove', id } satisfies AnchorMeta))
}
