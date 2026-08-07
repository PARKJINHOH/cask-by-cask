import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog'
import useIsDesktop from '@/shared/hooks/useIsDesktop'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { photoCardApi } from '@/domain/photo-card/api/photoCardApi'
import {
  PhotoCardDraftResumeDialog, PhotoCardGuestGateDialog, type GuestGate,
} from '@/domain/photo-card/components/PhotoCardGuestDialogs'
import PhotoCardPublishDialog from '@/domain/photo-card/components/PhotoCardPublishDialog'
import PhotoCardSpiritPicker from '@/domain/photo-card/components/PhotoCardSpiritPicker'
import PhotoCardFillWizard from '@/domain/photo-card/components/PhotoCardFillWizard'
import PhotoCardStage, { DOCKED_BAR_HEIGHT } from '@/domain/photo-card/components/PhotoCardStage'
import PhotoCardToolRail from '@/domain/photo-card/components/PhotoCardToolRail'
import PhotoCardTopBar from '@/domain/photo-card/components/PhotoCardTopBar'
import CardPanel from '@/domain/photo-card/components/panels/CardPanel'
import DataPanel from '@/domain/photo-card/components/panels/DataPanel'
import ElementPanel from '@/domain/photo-card/components/panels/ElementPanel'
import ExportPanel from '@/domain/photo-card/components/panels/ExportPanel'
import LayerPanel from '@/domain/photo-card/components/panels/LayerPanel'
import PhotoPanel from '@/domain/photo-card/components/panels/PhotoPanel'
import SelectionInspector from '@/domain/photo-card/components/panels/SelectionInspector'
import TemplatePanel from '@/domain/photo-card/components/panels/TemplatePanel'
import TextPanel from '@/domain/photo-card/components/panels/TextPanel'
import { PHOTO_CARD_EXPORT_SIZES, PHOTO_CARD_MAX_EDGE } from '@/domain/photo-card/constants/photoCardRatios'
import type { PhotoCardTool } from '@/domain/photo-card/constants/photoCardTools'
import { usePhotoCardEditor } from '@/domain/photo-card/hooks/usePhotoCardEditor'
import { usePhotoCardShortcuts } from '@/domain/photo-card/hooks/usePhotoCardShortcuts'
import { usePhotoCardViewport } from '@/domain/photo-card/hooks/usePhotoCardViewport'
import type { PhotoCardTemplateScope } from '@/domain/photo-card/types/photoCard.types'
import {
  PHOTO_CARD_MAX_TEMPLATES, normalizeLayout,
} from '@/domain/photo-card/utils/layoutSchema'
import {
  buildPhotoCardDraft, clearPhotoCardDraft, loadPhotoCardDraft, savePhotoCardDraft,
} from '@/domain/photo-card/utils/photoCardDraft'
import { frameSizeOf } from '@/domain/photo-card/utils/photoCardRender'
import { useAuthStore } from '@/domain/auth/store/authStore'
import '@/domain/photo-card/photo-card.css'

/**
 * 업로드 상한.
 *
 * 원본 사진은 서버로 가지 않는다(브라우저에서 그리고, 완성된 카드만 올라간다) —
 * 서버 상한(51MB)과는 무관하고, 실제 제약은 브라우저 메모리다.
 * 그마저도 편집기가 원본을 출력 상한(4096px)까지 미리 줄여 물고 있으므로
 * 파일이 커도 메모리는 일정하다. 남는 위험은 '디코딩 순간'뿐이라 30MB 로 둔다.
 */
const MAX_PHOTO_SIZE = 30 * 1024 * 1024

/** 선택한 요소의 속성을 함께 보여 줄 도구들. 요소를 클릭하면 이 중 하나로 자동 전환된다. */
const SELECTION_TOOLS = new Set<PhotoCardTool>(['select', 'text', 'element'])

/**
 * 도구 내용을 선택 속성보다 <b>위에</b> 두는 도구들.
 *
 * 「＋ 텍스트」 같은 추가 버튼은 그 도구에 온 이유 그 자체라 맨 위에 있어야 한다.
 * 선택 속성이 길어서 아래로 밀리면 매번 스크롤해야 찾을 수 있다.
 */
const PANEL_FIRST_TOOLS = new Set<PhotoCardTool>(['text', 'element'])

/**
 * 포토카드 편집기.
 *
 * 화면 전체를 쓰는 3분할이다 — 왼쪽 도구 · 가운데 캔버스 · 오른쪽 속성.
 * 페이지 자체는 스크롤되지 않고(EditorLayout), 좌·우 패널만 각자 스크롤한다.
 * 이 파일은 조립과 대화상자만 맡고, 실제 편집 로직은 usePhotoCardEditor 와 panels/ 에 있다.
 */
export default function PhotoCardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  // 비회원 저장본에는 브랜드 마크가 얹힌다 — 편집 화면에도 같이 그려 결과와 어긋나지 않게 한다.
  const editor = usePhotoCardEditor({ watermark: !isLoggedIn })

  const size = frameSizeOf(editor.layout.frame, PHOTO_CARD_MAX_EDGE)
  const isDesktop = useIsDesktop()
  // 좁은 화면에서는 빠른 편집 바가 작업 영역 바닥에 얹힌다. 글자를 고른 뒤에야 비우면
  // 그때마다 카드가 작아졌다 커지므로, 바가 없을 때도 그 자리는 늘 비워 둔다.
  const viewport = usePhotoCardViewport(size, isDesktop ? 0 : DOCKED_BAR_HEIGHT)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  usePhotoCardShortcuts(editor, viewport)

  const [tool, setTool] = useState<PhotoCardTool>('template')
  const [sheetOpen, setSheetOpen] = useState(true)
  /** 템플릿을 고른 뒤 요소를 하나씩 채우는 중인가. */
  const [filling, setFilling] = useState(false)
  const [templateScope, setTemplateScope] = useState<PhotoCardTemplateScope>('OFFICIAL')
  // 도구를 옮기면 패널이 통째로 사라졌다 다시 그려진다. 어느 템플릿을 쓰고 있는지는
  // 패널이 아니라 페이지가 기억해야 도구를 다녀와도 표시가 남는다.
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null)
  const [spiritPickerOpen, setSpiritPickerOpen] = useState(false)
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishFile, setPublishFile] = useState<File | null>(null)
  const [publishPreview, setPublishPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [exportSizeKey, setExportSizeKey] = useState('high')
  // 비회원이 로그인 필요한 동작을 눌렀을 때 띄우는 안내. 어떤 동작이었는지에 따라 문구가 다르다.
  const [gate, setGate] = useState<GuestGate | null>(null)
  const [draftBusy, setDraftBusy] = useState(false)
  /** 임시저장이 남아 있으면 그 시각. 되살릴지 물어보는 창이 이 값으로 열린다. */
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // busy 는 상태 갱신이 비동기라 아주 빠른 더블클릭이 두 번 통과할 수 있다.
  // 실제 중복 실행 차단은 ref 로 한다(렌더와 무관하게 즉시 반영된다).
  const runningRef = useRef(false)

  const selectedMaxEdge = PHOTO_CARD_EXPORT_SIZES.find((item) => item.key === exportSizeKey)?.maxEdge
    ?? undefined

  /** 템플릿을 고른 직후의 요소 채우기를 연다. 좁은 화면에서는 시트가 접혀 있을 수 있다. */
  const startFill = useCallback(() => {
    setFilling(true)
    setSheetOpen(true)
  }, [])

  const closeFill = useCallback(() => {
    setFilling(false)
    // 마지막으로 채우던 자리를 고른 채로 두면, 돌아온 패널이 그 요소의 속성으로 덮인다.
    editor.selectLayer(null)
  }, [editor.selectLayer])

  // 요소를 고르면 그 요소를 다루는 도구로 옮겨 간다 —
  // 클릭한 것의 속성이 어느 탭에 있는지 사용자가 찾아다니지 않게.
  // 레이어·선택 도구에 있을 때는 그대로 둔다(목록에서 하나씩 눌러 볼 때 화면이 튀지 않게).
  const selectedId = editor.selectedLayer?.id
  const selectedTypeRef = useRef(editor.selectedLayer?.type)
  selectedTypeRef.current = editor.selectedLayer?.type
  // 채우기는 스스로 요소를 짚어 가며 돈다. 그때마다 도구를 옮기면 흐름이 끝난 자리가 매번 달라진다.
  const fillingRef = useRef(filling)
  fillingRef.current = filling
  useEffect(() => {
    const type = selectedTypeRef.current
    if (!selectedId || !type || fillingRef.current) return
    setSheetOpen(true)
    setTool((current) => (
      current === 'layer' || current === 'select' ? current
        : type === 'TEXT' ? 'text' : 'element'
    ))
  }, [selectedId])

  useEffect(() => () => {
    if (publishPreview) URL.revokeObjectURL(publishPreview)
  }, [publishPreview])

  /** 같은 작업이 겹쳐 실행되지 않게 한 번에 하나만 통과시킨다. */
  const runOnce = async (task: () => Promise<void>) => {
    if (runningRef.current) return
    runningRef.current = true
    setBusy(true)
    try {
      await task()
    } finally {
      runningRef.current = false
      setBusy(false)
    }
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_PHOTO_SIZE) {
      setNotice(t('photoCard.errorTooLarge'))
      return
    }
    setNotice(null)
    // HEIC 는 Safari 만 디코딩한다. 확장자로 미리 막지 않고 실제로 열어 본 뒤 안내한다 —
    // 아이폰 사진을 그대로 올리는 흐름을 Safari 에서까지 막을 이유는 없다.
    const ok = await editor.setPhoto(file)
    if (!ok) setNotice(t('photoCard.errorDecode'))
  }

  /**
   * @param watermark 비회원 저장본에는 오른쪽 아래에 브랜드 마크를 얹는다.
   *   마크 없는 저장은 로그인이 필요하며, 그 길은 requireLogin 이 안내한다.
   */
  const download = (watermark: boolean) => runOnce(async () => {
    const blob = await editor.renderToBlob(exportFormat, 1, selectedMaxEdge, watermark)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `caskbycask-photocard-${Date.now()}.${exportFormat === 'image/png' ? 'png' : 'jpg'}`
    // Firefox 는 문서에 붙어 있지 않은 앵커의 click() 을 무시한다.
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // 브라우저가 blob 을 읽기 전에 해제하면 다운로드가 빈 파일이 된다.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  })

  const openPublish = () => runOnce(async () => {
    if (!isLoggedIn) {
      setGate('publish')
      return
    }
    // 게시본은 목록 썸네일로도 쓰이므로 용량을 감안해 JPEG 최고 품질로 고정한다.
    const blob = await editor.renderToBlob('image/jpeg', 1, selectedMaxEdge)
    if (!blob) return
    if (publishPreview) URL.revokeObjectURL(publishPreview)
    setPublishFile(new File([blob], `photocard-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    setPublishPreview(URL.createObjectURL(blob))
    setPublishOpen(true)
  })

  // ── 임시저장 ────────────────────────────────────────────
  // 들어올 때 맡겨 둔 작업이 있는지 본다. 로그인하고 돌아온 사람이 여기서 이어서 하게 된다.
  useEffect(() => {
    let cancelled = false
    void loadPhotoCardDraft().then((draft) => {
      if (!cancelled && draft) setDraftSavedAt(draft.savedAt)
    })
    return () => { cancelled = true }
  }, [])

  const resumeDraft = async () => {
    if (draftBusy) return
    setDraftBusy(true)
    try {
      const draft = await loadPhotoCardDraft()
      // 사진을 다시 열지 못하면(브라우저가 못 읽는 형식 등) 지우지 않는다 — 지우면 되찾을 길이 없다.
      if (draft && await editor.restoreDraft(draft)) {
        await clearPhotoCardDraft()
        setDraftSavedAt(null)
        setNotice(t('photoCard.draftRestored'))
      } else {
        setNotice(t('photoCard.draftRestoreFailed'))
      }
    } finally {
      setDraftBusy(false)
    }
  }

  const discardDraft = async () => {
    if (draftBusy) return
    setDraftBusy(true)
    try {
      await clearPhotoCardDraft()
      setDraftSavedAt(null)
    } finally {
      setDraftBusy(false)
    }
  }

  /** 지금 작업 상태를 그대로 맡겨 둔다. @returns 저장에 성공했는가. */
  const stashDraft = () => savePhotoCardDraft(buildPhotoCardDraft({
    layout: editor.layout,
    photoTransform: editor.photoTransform,
    exif: editor.exif,
    spirit: editor.spirit,
    userInput: editor.userInput,
    photoFile: editor.photoFile,
  })).catch(() => false)

  /** 지금 작업을 맡겨 두고 로그인·회원가입으로 보낸다. 돌아오면 이 페이지에서 이어서 한다. */
  const saveDraftAndLeave = async (target: 'login' | 'signup') => {
    if (draftBusy) return
    setDraftBusy(true)
    const saved = await stashDraft()
    setDraftBusy(false)
    setGate(null)
    if (!saved) {
      // 저장에 실패해도 로그인 길은 열어 준다 — 다만 작업이 남지 않는다는 것을 알려야 한다.
      setNotice(t('photoCard.draftSaveFailed'))
      return
    }
    navigate(target === 'login' ? '/login' : '/signup', {
      state: { from: { pathname: '/photo-card' } },
    })
  }

  // ── 이탈 방지 ──
  // 편집기는 페이지가 스크롤되지 않아 「뒤로」 버튼이 없다 — 나가는 길은 하드웨어 백과
  // 새로고침뿐이라 그 둘만 막으면 된다. 되돌리기가 가능하다는 것은 손을 댔다는 뜻이고,
  // 사진만 올려 둔 상태도 다시 고르는 비용이 있어 지킬 값으로 친다.
  // (로그인 게이트·게시 완료는 navigate 로 직접 나가므로 여기 걸리지 않는다)
  const guardBusy = draftBusy || busy
  const {
    leaveDialogOpen, cancelLeave, confirmLeave,
  } = useUnsavedChangesGuard({
    dirty: editor.canUndo || editor.photoFile != null,
    onLeave: () => navigate('/community/photo'),
  })

  const saveAsTemplate = async () => {
    if (!isLoggedIn) {
      setGate('template')
      return
    }
    const name = window.prompt(t('photoCard.templateNamePrompt'))
    if (!name?.trim()) return
    await runOnce(async () => {
      await photoCardApi.createTemplate({
        name: name.trim(),
        layout: normalizeLayout(editor.layout),
        isPublic: false,
      }).then(() => {
        setNotice(t('photoCard.templateSaved'))
        setTemplateScope('MINE')
      }).catch(() => {
        setNotice(t('photoCard.templateLimit', { count: PHOTO_CARD_MAX_TEMPLATES }))
      })
    })
  }

  const panel = (() => {
    switch (tool) {
      case 'template':
        return (
          <TemplatePanel
            editor={editor}
            scope={templateScope}
            onScopeChange={setTemplateScope}
            isLoggedIn={isLoggedIn}
            busy={busy}
            onSaveAsTemplate={() => { void saveAsTemplate() }}
            appliedKey={appliedTemplate}
            // 템플릿을 고른 직후가 요소를 채우기 가장 좋은 때다 — 어느 자리가 비었는지
            // 방금 본 참이고, 채우는 대로 카드에 나타난다.
            onApplied={(key) => { setAppliedTemplate(key); startFill() }}
            onStartFill={startFill}
          />
        )
      case 'photo':
        return (
          <PhotoPanel
            editor={editor}
            onPickPhoto={() => fileInputRef.current?.click()}
            onEditPhoto={() => setPhotoEditorOpen(true)}
          />
        )
      case 'text': return <TextPanel editor={editor} />
      case 'element': return <ElementPanel editor={editor} />
      case 'data': return <DataPanel editor={editor} onOpenSpiritPicker={() => setSpiritPickerOpen(true)} />
      case 'card': return <CardPanel editor={editor} />
      case 'layer':
        return (
          <LayerPanel
            editor={editor}
            onEditLayer={(layer) => setTool(layer.type === 'TEXT' ? 'text' : 'element')}
          />
        )
      case 'export':
        return (
          <ExportPanel
            editor={editor}
            format={exportFormat}
            onFormatChange={setExportFormat}
            sizeKey={exportSizeKey}
            onSizeKeyChange={setExportSizeKey}
            busy={busy}
            isLoggedIn={isLoggedIn}
            onDownload={() => { void download(!isLoggedIn) }}
            onDownloadClean={() => setGate('cleanDownload')}
            onPublish={() => { void openPublish() }}
          />
        )
      default:
        return editor.selectedLayerIds.length === 0
          ? <p className="text-[11px] leading-relaxed text-neutral-400">{t('photoCard.selectHint')}</p>
          : null
    }
  })()

  return (
    <>
      <SeoMeta title={t('photoCard.title')} description={t('photoCard.subtitle')} noindex />

      <PhotoCardTopBar
        editor={editor}
        viewport={viewport}
        busy={busy}
        // 곧바로 내려받지 않는다 — 크기·형식을 확인하고 받도록 내보내기 화면을 연다.
        onOpenExport={() => {
          setTool('export')
          setSheetOpen(true)
          editor.selectLayer(null)
        }}
        onPublish={() => { void openPublish() }}
      />

      {notice && (
        <p className="shrink-0 border-b border-primary-200 bg-primary-50 px-4 py-2 text-xs text-primary-700">
          {notice}
        </p>
      )}

      {/* 데스크톱은 도구 | 캔버스 | 속성 3열, 모바일은 캔버스 → 속성 시트 → 도구 바 순으로 쌓는다.
          도구는 손이 닿는 화면 아래로 내려가야 하므로 order 로 자리만 바꾼다(DOM 순서는 그대로).
          어느 쪽이든 페이지 자체는 스크롤되지 않고 패널만 각자 스크롤한다. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <PhotoCardToolRail
          value={tool}
          onChange={(next) => {
            setTool(next)
            setSheetOpen(true)
            // 채우던 중이라도 도구를 고르면 그쪽으로 간다 — 안 그러면 눌러도 화면이 그대로다.
            setFilling(false)
            // 도구를 직접 고른 것은 "지금 고른 요소 말고 다른 걸 하겠다"는 뜻이다.
            // 선택을 남겨 두면 속성 패널이 도구 내용을 밀어내고, 새로 얹는 요소도 그 아래로 들어간다.
            editor.selectLayer(null)
          }}
        />

        <PhotoCardStage
          editor={editor}
          viewport={viewport}
          size={size}
          canvasRef={canvasRef}
          onRequestPhoto={() => fileInputRef.current?.click()}
        />

        {/* 좁은 화면의 시트는 내용이 아니라 <b>펼침 여부</b>로만 높이가 정해진다(max-h 가 아니라 h).
            내용에 따라 늘었다 줄면 그만큼 작업 영역이 흔들린다 — 글자를 하나 얹었을 뿐인데
            시트가 올라와 카드 아래가 잘리거나, 화면 맞춤이 다시 걸려 카드 크기가 튄다.
            남는 자리는 비워 두더라도 카드가 놓인 자리는 그대로 두는 편이 낫다. */}
        <aside className={`order-2 flex shrink-0 flex-col border-t border-neutral-200 bg-white lg:order-3 lg:h-auto lg:w-[384px] lg:border-l lg:border-t-0 2xl:w-[424px] ${
          sheetOpen ? 'h-[45dvh]' : ''
        }`}>
          {/* 모바일에서만 보이는 시트 손잡이 — 캔버스를 넓게 보고 싶을 때 접는다 */}
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 lg:hidden"
          >
            {filling ? t('photoCard.fillTitle')
              : t(`photoCard.tool${tool.charAt(0).toUpperCase()}${tool.slice(1)}`)}
            <span className="text-neutral-400">{sheetOpen ? '▼' : '▲'}</span>
          </button>
          <div
            className={`di-photo-card-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 ${
              sheetOpen ? '' : 'hidden lg:block'
            }`}
          >
            {/* 요소 채우기는 도구가 아니라 <b>흐름</b>이라, 도는 동안에는 패널 자리를 통째로 쓴다.
                옆에 도구 내용까지 같이 두면 "지금 무엇에 답하는 중인지"가 흐려진다. */}
            {filling ? (
              <PhotoCardFillWizard
                editor={editor}
                onClose={closeFill}
                onOpenSpiritPicker={() => setSpiritPickerOpen(true)}
              />
            ) : PANEL_FIRST_TOOLS.has(tool) ? (
              <>
                {panel}
                {SELECTION_TOOLS.has(tool) && <SelectionInspector editor={editor} canvasRef={canvasRef} />}
              </>
            ) : (
              <>
                {SELECTION_TOOLS.has(tool) && <SelectionInspector editor={editor} canvasRef={canvasRef} />}
                {panel}
              </>
            )}
          </div>
        </aside>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void pickPhoto(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      <PhotoCardSpiritPicker
        open={spiritPickerOpen}
        onClose={() => setSpiritPickerOpen(false)}
        onSelect={(info) => editor.setSpirit(info)}
      />

      <PhotoCardPublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        previewUrl={publishPreview}
        file={publishFile}
        spirit={editor.spirit}
      />

      <PhotoCardGuestGateDialog
        gate={gate}
        busy={draftBusy}
        onClose={() => setGate(null)}
        onContinue={(target) => { void saveDraftAndLeave(target) }}
      />

      <PhotoCardDraftResumeDialog
        savedAt={draftSavedAt}
        busy={draftBusy}
        onResume={() => { void resumeDraft() }}
        onDiscard={() => { void discardDraft() }}
      />

      <UnsavedChangesDialog
        open={leaveDialogOpen}
        busy={guardBusy}
        onStay={cancelLeave}
        onDiscard={() => { void confirmLeave() }}
        onSaveDraft={() => {
          void confirmLeave(async () => {
            setDraftBusy(true)
            const saved = await stashDraft()
            setDraftBusy(false)
            // 맡겨 두지 못했는데 내보내면 지키려던 작업을 확실하게 잃는다.
            if (!saved) setNotice(t('photoCard.draftSaveFailed'))
            return saved
          })
        }}
      />

      {/* 사진 자체 보정은 기존 이미지 편집기를 그대로 띄워 쓴다. */}
      {photoEditorOpen && editor.photoUrl && (
        <ImageEditorModal
          open
          onClose={() => setPhotoEditorOpen(false)}
          imageSrc={editor.photoUrl}
          isSaving={false}
          initialMode="crop"
          onSave={async (edited) => {
            // 보정 결과는 캔버스에서 나온 이미지라 EXIF 가 없다.
            // 그대로 다시 읽으면 카드에 넣으려던 촬영 정보가 통째로 사라진다.
            await editor.setPhoto(edited, true)
            setPhotoEditorOpen(false)
          }}
        />
      )}
    </>
  )
}
