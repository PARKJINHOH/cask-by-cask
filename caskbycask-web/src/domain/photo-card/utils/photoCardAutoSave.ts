/**
 * 자동 저장 판단.
 *
 * 3분마다 돌아오는 차례에서 <b>지금 서버에 보낼 것인가, 보낸다면 사진도 같이 올릴 것인가</b>만 정한다.
 * 타이머·네트워크·상태 갱신은 훅(usePhotoCardAutoSave)과 페이지가 맡는다 —
 * 조건을 훅 안에 두면 렌더 없이 확인할 길이 없어진다.
 *
 * ── 이 두 가지가 서버 부담을 결정한다 ──
 * ① 바뀐 것이 없으면 요청 자체를 보내지 않는다. 편집기를 열어만 둔 사용자는 요청이 0회다.
 * ② 사진은 바뀌었을 때만 올린다. 서버는 photo 파트가 없으면 들고 있던 사진을 그대로 두므로
 *    (PhotoCardDraftService.save), 두 번째 저장부터는 수십 KB 짜리 요청이 된다.
 *    사진 하나가 최대 9MB 라 이 규칙이 없으면 3분마다 그만큼이 다시 올라간다.
 */

/** 자동 저장 간격(ms). */
export const PHOTO_CARD_AUTO_SAVE_INTERVAL_MS = 180_000

/**
 * 탭을 덮어 두는 순간에도 한 번 저장하되, 직전 시도에서 이만큼(ms)은 지났어야 한다.
 * 창을 오갈 때마다 보내면 간격을 정해 둔 뜻이 없어진다.
 */
export const PHOTO_CARD_AUTO_SAVE_MIN_GAP_MS = 60_000

/** 연속 실패가 이만큼 쌓이면 이번 세션에서는 멈춘다. 끊긴 망에 3분마다 계속 두드리지 않는다. */
export const PHOTO_CARD_AUTO_SAVE_MAX_FAILURES = 3

/** 켜고 끈 선택을 기억하는 곳. 프로젝트의 `di_*` 규칙을 따른다. */
export const PHOTO_CARD_AUTO_SAVE_STORAGE_KEY = 'di_photo_card_autosave'

/** 서버가 임시저장 개수 상한을 알릴 때 쓰는 코드(ErrorCode.PHOTO_CARD_DRAFT_LIMIT_EXCEEDED). */
export const PHOTO_CARD_DRAFT_LIMIT_CODE = 'PHOTO_CARD_007'

/** 저장을 건너뛴 이유. 화면에 쓰지는 않고, 검증과 디버깅에서 "왜 안 보냈는지"를 남긴다. */
export type AutoSaveSkipReason =
  | 'disabled' | 'guest' | 'noPhoto' | 'stopped' | 'busy' | 'unchanged'

/** 페이지가 돌려주는 저장 결과. 훅이 이 값으로 다음 차례를 정한다. */
export type AutoSaveOutcome =
  /** 저장했다 */
  | 'saved'
  /** 일시적 실패 — 다음 차례에 다시 해 본다 */
  | 'retry'
  /** 임시저장 목록이 가득 찼다 — 사용자가 자리를 비우기 전에는 될 리가 없다 */
  | 'full'
  /** 로그인이 풀렸다 */
  | 'auth'

/** 자동 저장이 이번 세션에서 멈춘 이유. */
export type AutoSaveStopReason = 'full' | 'auth' | 'error'

/** 서버가 지금 그 칸에 대해 들고 있는 사진. */
export interface AutoSavePhotoState {
  draftId: number
  /**
   * 올려 둔 원본 파일.
   *
   * 같은 파일인지는 <b>객체가 같은지</b>로 본다 — 내용을 비교하려면 30MB 를 읽어야 하는데,
   * 편집기에서 사진이 바뀌는 길은 새로 고르기·보정뿐이고 그때마다 새 File 이 만들어진다.
   */
  file: File | null
}

export interface AutoSaveState {
  enabled: boolean
  isLoggedIn: boolean
  hasPhoto: boolean
  /** 연속 실패·개수 초과로 이번 세션에서 멈췄는가 */
  stopped: boolean
  /** 다른 작업(수동 저장·내보내기·게시)이 진행 중인가 */
  busy: boolean
  /** 지금 편집 내용 — buildDraftContent 결과 */
  content: string
  /** 마지막으로 서버에 넣은 내용. null 이면 아직 아무것도 넣지 않았다 */
  savedContent: string | null
  currentDraftId: number | null
  photoFile: File | null
  savedPhoto: AutoSavePhotoState | null
}

export type AutoSaveDecision =
  | { save: true; includePhoto: boolean }
  | { save: false; reason: AutoSaveSkipReason }

/**
 * 이번 저장에 사진을 같이 올려야 하는가.
 *
 * 새 칸이거나(아직 사진이 없다), 다른 칸으로 옮겨 갔거나, 사진 자체가 바뀐 경우에만 올린다.
 * 수동 저장도 같은 판단을 쓴다 — 배치만 고치고 저장을 누를 때 9MB 를 다시 올릴 이유가 없다.
 */
export const needsPhotoUpload = (
  currentDraftId: number | null,
  photoFile: File | null,
  savedPhoto: AutoSavePhotoState | null,
): boolean => currentDraftId == null
  || savedPhoto == null
  || savedPhoto.draftId !== currentDraftId
  || savedPhoto.file !== photoFile

/**
 * 지금 저장할 것인가.
 *
 * `savedContent` 가 null 이면 아직 서버에 아무것도 없다는 뜻이라 <b>바뀐 것으로 본다</b> —
 * 사진만 올려 둔 상태도 지킬 값이다(이탈 방지 가드가 `canUndo || photoFile != null` 로
 * 잡는 기준과 같다). 다시 고르는 비용이 있는 것은 배치뿐이 아니다.
 */
export const decideAutoSave = (state: AutoSaveState): AutoSaveDecision => {
  if (!state.enabled) return { save: false, reason: 'disabled' }
  // 서버 임시저장은 회원 전용이다. 비회원의 브라우저 임시저장은 로그인 왕복 때만 쓴다.
  if (!state.isLoggedIn) return { save: false, reason: 'guest' }
  // 사진 없이 남긴 임시저장은 되살려도 빈 카드다.
  if (!state.hasPhoto) return { save: false, reason: 'noPhoto' }
  if (state.stopped) return { save: false, reason: 'stopped' }
  // 수동 저장·내보내기와 겹치면 같은 칸에 두 번 쓰게 된다. 다음 차례에 하면 된다.
  if (state.busy) return { save: false, reason: 'busy' }
  if (state.savedContent != null && state.savedContent === state.content) {
    return { save: false, reason: 'unchanged' }
  }
  return {
    save: true,
    includePhoto: needsPhotoUpload(state.currentDraftId, state.photoFile, state.savedPhoto),
  }
}
