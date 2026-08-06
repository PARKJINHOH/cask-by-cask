import type {
  PhotoCardLayout,
  PhotoCardSpiritInfo,
  PhotoCardUserInput,
  PhotoExif,
} from '../types/photoCard.types'
import type { PhotoTransform } from './photoCardRender'
import { normalizeLayout } from './layoutSchema'

/**
 * 편집 중인 카드를 브라우저에 잠시 맡겨 두는 곳.
 *
 * 비회원이 「로고 없이 저장」이나 「갤러리에 올리기」를 누르면 로그인이 필요하다.
 * 그 자리에서 로그인으로 보내면 편집하던 것이 통째로 날아가므로, 떠나기 직전에 여기 넣어 두고
 * 돌아왔을 때 그대로 이어서 하게 한다.
 *
 * ── 왜 localStorage 가 아닌가 ──
 * 원본 사진(최대 30MB)을 함께 넣어야 이어서 편집할 수 있다. localStorage 는 문자열만 담고
 * 한도도 5MB 안팎이라 사진이 들어가지 않는다. IndexedDB 는 Blob 을 그대로 담는다.
 *
 * 저장은 사용자가 그 순간 동의했을 때만 한다(자동 저장 없음) — 남의 단말에 사진이 남는 일이
 * 사용자가 모르는 사이에 일어나면 안 된다. 되살리고 나면 바로 지운다.
 */

const DB_NAME = 'caskbycask-photo-card'
const DB_VERSION = 1
const STORE = 'draft'
/** 한 번에 하나만 맡아 둔다. 여러 개를 관리할 만한 흐름이 아니다. */
const KEY = 'current'

export interface PhotoCardDraft {
  /** 저장 시각(ms). 되살릴지 물어볼 때 "언제 것"인지 보여 준다. */
  savedAt: number
  layout: PhotoCardLayout
  photoTransform: PhotoTransform
  exif: PhotoExif | null
  spirit: PhotoCardSpiritInfo | null
  user: PhotoCardUserInput
  /** 원본 사진. 없으면(사진을 아직 안 고른 상태) 레이아웃만 되살린다. */
  photo: Blob | null
  photoName: string | null
}

const openDb = (): Promise<IDBDatabase | null> => new Promise((resolve) => {
  if (typeof indexedDB === 'undefined') {
    resolve(null)
    return
  }
  try {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    // 사생활 보호 모드·저장 공간 차단 등으로 열리지 않을 수 있다. 그때는 임시저장만 못 할 뿐이다.
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  } catch {
    resolve(null)
  }
})

const runTransaction = <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> => openDb().then((db) => {
  if (!db) return null
  return new Promise<T | null>((resolve) => {
    try {
      const transaction = db.transaction(STORE, mode)
      const request = action(transaction.objectStore(STORE))
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
      transaction.oncomplete = () => db.close()
      transaction.onerror = () => { db.close(); resolve(null) }
      transaction.onabort = () => { db.close(); resolve(null) }
    } catch {
      db.close()
      resolve(null)
    }
  })
})

/**
 * 지금 편집 중인 것을 임시저장 형태로 만든다.
 *
 * 되살릴 때 필요한 것만 담는다 — 선택·잠금·되돌리기 기록은 편집 보조라 담지 않는다.
 * 레이아웃은 저장 규칙으로 한 번 정리해 둔다(서버에 보낼 때와 같은 모양).
 */
export const buildPhotoCardDraft = (source: {
  layout: PhotoCardLayout
  photoTransform: PhotoTransform
  exif: PhotoExif | null
  spirit: PhotoCardSpiritInfo | null
  userInput: PhotoCardUserInput
  photoFile: File | null
}): PhotoCardDraft => ({
  savedAt: Date.now(),
  layout: normalizeLayout(source.layout),
  photoTransform: { ...source.photoTransform },
  exif: source.exif,
  spirit: source.spirit,
  user: { ...source.userInput },
  photo: source.photoFile,
  photoName: source.photoFile?.name ?? null,
})

/** @returns 저장에 성공했는가. 실패해도 편집은 계속할 수 있어야 하므로 던지지 않는다. */
export const savePhotoCardDraft = async (draft: PhotoCardDraft): Promise<boolean> => {
  const result = await runTransaction<IDBValidKey>('readwrite', (store) => store.put(draft, KEY))
  return result !== null
}

export const loadPhotoCardDraft = async (): Promise<PhotoCardDraft | null> => {
  const draft = await runTransaction<PhotoCardDraft>('readonly', (store) => store.get(KEY))
  // 스키마가 바뀐 옛 임시저장이 남아 있을 수 있다. 최소한의 모양만 확인하고 아니면 없는 셈 친다.
  if (!draft || typeof draft.savedAt !== 'number' || !draft.layout) return null
  return draft
}

export const clearPhotoCardDraft = async (): Promise<void> => {
  await runTransaction('readwrite', (store) => store.delete(KEY))
}
