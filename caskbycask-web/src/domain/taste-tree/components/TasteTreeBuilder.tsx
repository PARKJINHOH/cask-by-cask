import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { adminTasteTreeApi, tasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import TasteTreeGraph, { type TasteTreeSourceHandle, type TasteTreeTargetHandle } from '@/domain/taste-tree/components/TasteTreeGraph'
import TasteTreePlayer from '@/domain/taste-tree/components/TasteTreePlayer'
import type { TasteTreeContent, TasteTreeEdge, TasteTreeNode, TasteTreeSavePayload, TasteTreeWhisky } from '@/domain/taste-tree/types/tasteTree.types'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import SeoMeta from '@/shared/components/SeoMeta'
import Toast from '@/shared/components/Toast'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import { useToast } from '@/shared/hooks/useToast'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
const labelClass = 'mb-2.5 block text-xs font-black text-stone-600'
const fieldClass = 'block'
const NODE_TITLE_MAX_LENGTH = 50
const NODE_DESCRIPTION_MAX_LENGTH = 200
const NODE_PROMPT_MAX_LENGTH = 120

interface PendingNodeImage {
  file: File
  previewUrl: string
}

type PendingNodeImages = Record<string, PendingNodeImage>

function withNodeImageUrl(content: TasteTreeContent, nodeKey: string, imageUrl: string): TasteTreeContent {
  return {
    ...content,
    nodes: content.nodes.map((node) => node.key !== nodeKey ? node : node.type !== 'START'
      ? {
          ...node,
          imageHidden: false,
          whisky: { ...(node.whisky ?? { source: 'CUSTOM' }), imageOverrideUrl: imageUrl },
        }
      : { ...node, imageUrl, imageHidden: false }),
  }
}

function mergeNodeDescription(description?: string | null, legacyBody?: string | null) {
  const current = description?.trim() ?? ''
  const legacy = legacyBody?.trim() ?? ''
  if (!legacy || current.includes(legacy)) return description ?? ''
  return [current, legacy].filter(Boolean).join('\n')
}

function normalizeBuilderContent(content: TasteTreeContent): TasteTreeContent {
  const sourceKeys = new Set(content.edges.map((edge) => edge.sourceNodeKey))
  return {
    ...content,
    schemaVersion: 9,
    nodes: content.nodes.map((node) => {
      const promptPatch = sourceKeys.has(node.key) && node.type !== 'CHOICE'
        ? {}
        : { promptKo: null, promptEn: null }
      if (node.type === 'START') return { ...node, ...promptPatch }
      if (node.type === 'CHOICE') return { ...node, ...promptPatch, imageUrl: null, imageHidden: true, whisky: null }
      const whisky: TasteTreeWhisky = node.whisky ?? {
        source: 'CUSTOM',
        nameKo: node.titleKo,
        nameEn: node.titleEn,
      }
      return {
        ...node,
        ...promptPatch,
        type: 'WHISKY',
        descriptionKo: mergeNodeDescription(node.descriptionKo, whisky.noteKo),
        descriptionEn: mergeNodeDescription(node.descriptionEn, whisky.noteEn),
        whisky: { ...whisky, noteKo: null, noteEn: null },
      }
    }),
  }
}

function withoutPendingImagePreviews(content: TasteTreeContent, pendingImages: PendingNodeImages): TasteTreeContent {
  return {
    ...content,
    nodes: content.nodes.map((node) => {
      const previewUrl = pendingImages[node.key]?.previewUrl
      if (!previewUrl) return node
      return {
        ...node,
        imageUrl: node.imageUrl === previewUrl ? null : node.imageUrl,
        whisky: node.whisky
          ? { ...node.whisky, imageOverrideUrl: node.whisky.imageOverrideUrl === previewUrl ? null : node.whisky.imageOverrideUrl }
          : node.whisky,
      }
    }),
  }
}

function createInitialContent(t: TFunction): TasteTreeContent {
  return {
    schemaVersion: 9,
    nodes: [{
      key: 'start', type: 'START', titleKo: t('tasteTree.builder.defaultStartTitle', { lng: 'ko' }),
      titleEn: null,
      descriptionKo: t('tasteTree.builder.defaultStartDesc', { lng: 'ko' }),
      descriptionEn: null,
      promptKo: null,
      promptEn: null, positionX: 420, positionY: 40,
    }],
    edges: [],
  }
}

function wouldCreateCycle(content: TasteTreeContent, source: string, target: string) {
  const adjacency = new Map<string, string[]>()
  content.edges.forEach((edge) => adjacency.set(edge.sourceNodeKey, [...(adjacency.get(edge.sourceNodeKey) ?? []), edge.targetNodeKey]))
  adjacency.set(source, [...(adjacency.get(source) ?? []), target])
  const stack = [target]
  const visited = new Set<string>()
  while (stack.length) {
    const key = stack.pop()!
    if (key === source) return true
    if (visited.has(key)) continue
    visited.add(key)
    stack.push(...(adjacency.get(key) ?? []))
  }
  return false
}

function validateForPublish(content: TasteTreeContent) {
  const textLengthError = validateNodeTextLengths(content)
  if (textLengthError) return textLengthError
  const starts = content.nodes.filter((node) => node.type === 'START')
  if (starts.length !== 1) return 'tasteTree.builder.errorStart'
  const pairs = new Set<string>()
  for (const edge of content.edges) {
    const pair = `${edge.sourceNodeKey}->${edge.targetNodeKey}`
    if (pairs.has(pair) || !edge.labelKo.trim()) return 'tasteTree.builder.errorConnection'
    pairs.add(pair)
  }
  const reachable = new Set<string>()
  const walk = (key: string) => {
    if (reachable.has(key)) return
    reachable.add(key)
    content.edges.filter((edge) => edge.sourceNodeKey === key).forEach((edge) => walk(edge.targetNodeKey))
  }
  walk(starts[0].key)
  if (reachable.size !== content.nodes.length) return 'tasteTree.builder.errorUnreachable'
  if (!content.nodes.some((node) => node.type !== 'START')) return 'tasteTree.builder.errorItem'
  for (const node of content.nodes) {
    if (!node.titleKo.trim()) return 'tasteTree.builder.errorNodeTitle'
    if (node.type !== 'START' && node.type !== 'WHISKY' && node.type !== 'CHOICE') return 'tasteTree.builder.errorItem'
    const hasOutgoing = content.edges.some((edge) => edge.sourceNodeKey === node.key)
    if (node.type !== 'CHOICE' && hasOutgoing && !node.promptKo?.trim()) return 'tasteTree.builder.errorNodePromptRequired'
    if (node.type === 'WHISKY') {
      if (!node.whisky) return 'tasteTree.builder.errorWhisky'
    }
    if (node.type === 'CHOICE' && !content.edges.some((edge) => edge.sourceNodeKey === node.key)) return 'tasteTree.builder.errorQuestionOption'
    if (node.whisky?.source === 'REGISTERED' && !node.whisky.spiritId) return 'tasteTree.builder.errorWhisky'
  }
  return null
}

function validateNodeTextLengths(content: TasteTreeContent) {
  if (content.nodes.some((node) => node.titleKo.length > NODE_TITLE_MAX_LENGTH
    || (node.titleEn?.length ?? 0) > NODE_TITLE_MAX_LENGTH)) return 'tasteTree.builder.errorNodeTitleLength'
  if (content.nodes.some((node) => (node.descriptionKo?.length ?? 0) > NODE_DESCRIPTION_MAX_LENGTH
    || (node.descriptionEn?.length ?? 0) > NODE_DESCRIPTION_MAX_LENGTH)) return 'tasteTree.builder.errorNodeDescriptionLength'
  if (content.nodes.some((node) => (node.promptKo?.length ?? 0) > NODE_PROMPT_MAX_LENGTH
    || (node.promptEn?.length ?? 0) > NODE_PROMPT_MAX_LENGTH)) return 'tasteTree.builder.errorNodePromptLength'
  return null
}

function collectInvalidNodeKeys(content: TasteTreeContent) {
  const invalid = new Set<string>()
  const starts = content.nodes.filter((node) => node.type === 'START')
  if (starts.length !== 1) {
    const candidates = starts.length > 0 ? starts : content.nodes
    candidates.forEach((node) => invalid.add(node.key))
  }

  const pairs = new Set<string>()
  content.edges.forEach((edge) => {
    const pair = `${edge.sourceNodeKey}->${edge.targetNodeKey}`
    if (!edge.labelKo.trim() || pairs.has(pair)) invalid.add(edge.sourceNodeKey)
    pairs.add(pair)
  })

  if (starts.length === 1) {
    const reachable = new Set<string>()
    const walk = (key: string) => {
      if (reachable.has(key)) return
      reachable.add(key)
      content.edges.filter((edge) => edge.sourceNodeKey === key).forEach((edge) => walk(edge.targetNodeKey))
    }
    walk(starts[0].key)
    content.nodes.filter((node) => !reachable.has(node.key)).forEach((node) => invalid.add(node.key))
  }

  if (!content.nodes.some((node) => node.type !== 'START')) starts.forEach((node) => invalid.add(node.key))

  content.nodes.forEach((node) => {
    const hasOutgoing = content.edges.some((edge) => edge.sourceNodeKey === node.key)
    const textTooLong = node.titleKo.length > NODE_TITLE_MAX_LENGTH
      || (node.titleEn?.length ?? 0) > NODE_TITLE_MAX_LENGTH
      || (node.descriptionKo?.length ?? 0) > NODE_DESCRIPTION_MAX_LENGTH
      || (node.descriptionEn?.length ?? 0) > NODE_DESCRIPTION_MAX_LENGTH
      || (node.promptKo?.length ?? 0) > NODE_PROMPT_MAX_LENGTH
      || (node.promptEn?.length ?? 0) > NODE_PROMPT_MAX_LENGTH
    if (!node.titleKo.trim() || textTooLong) invalid.add(node.key)
    if (node.type !== 'START' && node.type !== 'WHISKY' && node.type !== 'CHOICE') invalid.add(node.key)
    if (node.type !== 'CHOICE' && hasOutgoing && !node.promptKo?.trim()) invalid.add(node.key)
    if (node.type === 'WHISKY' && !node.whisky) invalid.add(node.key)
    if (node.type === 'CHOICE' && !hasOutgoing) invalid.add(node.key)
    if (node.whisky?.source === 'REGISTERED' && !node.whisky.spiritId) invalid.add(node.key)
  })

  return invalid
}

type TasteTreeBuilderMode = 'user' | 'admin'

export default function TasteTreeBuilder({ mode }: { mode: TasteTreeBuilderMode }) {
  const admin = mode === 'admin'
  const { id } = useParams<{ id?: string }>()
  const treeId = id ? Number(id) : null
  const { t, i18n } = useTranslation(undefined, admin ? { lng: 'ko' } : undefined)
  const isEn = !admin && i18n.language === 'en'
  const userNickname = useAuthStore((state) => state.user?.nickname ?? null)
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState<TasteTreeContent>(() => createInitialContent(t))
  const [selectedKey, setSelectedKey] = useState('start')
  const [currentId, setCurrentId] = useState<number | null>(treeId)
  const [initializedId, setInitializedId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [spiritKeyword, setSpiritKeyword] = useState('')
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null)
  const [invalidNodeKeys, setInvalidNodeKeys] = useState<string[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingNodeImages>({})
  const pendingImagesRef = useRef<PendingNodeImages>({})

  useEffect(() => {
    pendingImagesRef.current = pendingImages
  }, [pendingImages])

  useEffect(() => () => {
    Object.values(pendingImagesRef.current).forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
  }, [])

  const detailQuery = useQuery({
    queryKey: [admin ? 'admin-taste-tree' : 'taste-tree-builder', treeId],
    queryFn: () => (admin ? adminTasteTreeApi.get(treeId!) : tasteTreeApi.getMineDetail(treeId!)).then((response) => response.data.data!),
    enabled: Boolean(treeId),
  })

  useEffect(() => {
    const tree = detailQuery.data
    if (!tree || initializedId === tree.id) return
    setTitle(tree.title)
    setDescription(tree.description ?? '')
    const normalizedContent = normalizeBuilderContent(tree.content)
    setContent(normalizedContent)
    setSelectedKey(normalizedContent.nodes.find((node) => node.type === 'START')?.key ?? normalizedContent.nodes[0]?.key ?? '')
    setCurrentId(tree.id)
    setInitializedId(tree.id)
  }, [detailQuery.data, initializedId])

  useEffect(() => {
    setContent((previous) => {
      const sourceKeys = new Set(previous.edges.map((edge) => edge.sourceNodeKey))
      let changed = false
      const nodes = previous.nodes.map((node) => {
        if (node.type === 'CHOICE' || sourceKeys.has(node.key) || (!node.promptKo && !node.promptEn)) return node
        changed = true
        return { ...node, promptKo: null, promptEn: null }
      })
      return changed ? { ...previous, nodes } : previous
    })
  }, [content.edges])

  useEffect(() => {
    if (invalidNodeKeys.length === 0) return
    const currentlyInvalid = collectInvalidNodeKeys(content)
    setInvalidNodeKeys((previous) => {
      const next = previous.filter((key) => currentlyInvalid.has(key))
      return next.length === previous.length && next.every((key, index) => key === previous[index]) ? previous : next
    })
  }, [content, invalidNodeKeys.length])

  const selected = content.nodes.find((node) => node.key === selectedKey) ?? content.nodes[0]
  const spiritQuery = useQuery({
    queryKey: ['taste-tree-builder-spirits', spiritKeyword],
    queryFn: () => spiritApi.autocomplete(spiritKeyword, undefined, true).then((response) => response.data.data ?? []),
    enabled: (selected?.type === 'WHISKY' || (admin && selected?.type === 'START')) && spiritKeyword.trim().length >= 2,
  })

  const updateNode = (key: string, patch: Partial<TasteTreeNode>) => {
    setContent((previous) => ({ ...previous, nodes: previous.nodes.map((node) => node.key === key ? { ...node, ...patch } : node) }))
  }

  const discardPendingImage = (nodeKey: string) => {
    setPendingImages((previous) => {
      const pending = previous[nodeKey]
      if (!pending) return previous
      URL.revokeObjectURL(pending.previewUrl)
      const next = { ...previous }
      delete next[nodeKey]
      return next
    })
  }

  const connect = (
    sourceKey: string,
    targetKey: string,
    sourceHandle: TasteTreeSourceHandle = 'point-bottom',
    targetHandle: TasteTreeTargetHandle = 'point-top',
    labelKo = t('tasteTree.builder.defaultEdgeLabel', { lng: 'ko' }),
  ) => {
    const source = content.nodes.find((node) => node.key === sourceKey)
    const target = content.nodes.find((node) => node.key === targetKey)
    if (!source || !target || target.type === 'START'
      || sourceKey === targetKey || content.edges.some((edge) => edge.sourceNodeKey === sourceKey && edge.targetNodeKey === targetKey)) return
    if (wouldCreateCycle(content, sourceKey, targetKey)) {
      showToast(t('tasteTree.builder.errorCycle'), 'error')
      return
    }
    const edge: TasteTreeEdge = {
      key: `edge-${crypto.randomUUID()}`, sourceNodeKey: sourceKey, targetNodeKey: targetKey,
      labelKo, labelEn: null,
      descriptionKo: null, descriptionEn: null,
      sortOrder: content.edges.filter((candidate) => candidate.sourceNodeKey === sourceKey).length,
      sourceHandle, targetHandle, lineType: 'STEP',
    }
    setContent((previous) => ({ ...previous, edges: [...previous.edges, edge] }))
    setSelectedKey(targetKey)
    setSelectedEdgeKey(null)
  }

  const addNode = (type: 'WHISKY' | 'CHOICE') => {
    const anchor = selected ?? content.nodes[0]
    const key = `node-${crypto.randomUUID()}`
    const question = type === 'CHOICE'
    const node: TasteTreeNode = {
      key, type, titleKo: t(question ? 'tasteTree.builder.newQuestion' : 'tasteTree.builder.newChoice', { lng: 'ko' }),
      titleEn: null,
      descriptionKo: '', descriptionEn: null,
      positionX: (anchor?.positionX ?? 120) + 280,
      positionY: (anchor?.positionY ?? 80) + 160,
      width: question ? 300 : null,
      whisky: question ? null : {
        source: 'CUSTOM',
        nameKo: t('tasteTree.builder.newChoice', { lng: 'ko' }),
        nameEn: null,
      },
    }
    setContent((previous) => ({ ...previous, nodes: [...previous.nodes, node] }))
    setSelectedKey(key)
    setSelectedEdgeKey(null)
    setAddMenuOpen(false)
  }

  const deleteNode = (key: string) => {
    if (!window.confirm(t('tasteTree.builder.deleteNodeConfirm'))) return
    discardPendingImage(key)
    setContent((previous) => ({
      ...previous,
      nodes: previous.nodes.filter((node) => node.key !== key),
      edges: previous.edges.filter((edge) => edge.sourceNodeKey !== key && edge.targetNodeKey !== key),
    }))
    setSelectedKey(content.nodes.find((node) => node.type === 'START')?.key ?? '')
    setSelectedEdgeKey(null)
  }

  const updateEdge = (key: string, patch: Partial<TasteTreeEdge>) => {
    setContent((previous) => ({ ...previous, edges: previous.edges.map((edge) => edge.key === key ? { ...edge, ...patch } : edge) }))
  }

  const deleteEdge = (key: string) => {
    setContent((previous) => ({ ...previous, edges: previous.edges.filter((edge) => edge.key !== key) }))
    setSelectedEdgeKey((current) => current === key ? null : current)
  }

  const reconnectEdge = (
    edgeKey: string,
    sourceKey: string,
    targetKey: string,
    sourceHandle: TasteTreeSourceHandle = 'point-bottom',
    targetHandle: TasteTreeTargetHandle = 'point-top',
  ) => {
    const source = content.nodes.find((node) => node.key === sourceKey)
    const target = content.nodes.find((node) => node.key === targetKey)
    const remainingContent = { ...content, edges: content.edges.filter((edge) => edge.key !== edgeKey) }
    if (!source || !target || target.type === 'START' || sourceKey === targetKey
      || remainingContent.edges.some((edge) => edge.sourceNodeKey === sourceKey && edge.targetNodeKey === targetKey)) {
      showToast(t('tasteTree.builder.errorConnection'), 'error')
      return
    }
    if (wouldCreateCycle(remainingContent, sourceKey, targetKey)) {
      showToast(t('tasteTree.builder.errorCycle'), 'error')
      return
    }
    updateEdge(edgeKey, {
      sourceNodeKey: sourceKey,
      targetNodeKey: targetKey,
      sourceHandle,
      targetHandle,
      sortOrder: remainingContent.edges.filter((edge) => edge.sourceNodeKey === sourceKey).length,
    })
    setSelectedEdgeKey(edgeKey)
  }
  const payload = (nextContent: TasteTreeContent = content): TasteTreeSavePayload => ({
    title: title.trim(),
    description: description.trim() || null,
    content: nextContent,
  })

  const save = async () => {
    if (!title.trim()) { showToast(t('tasteTree.builder.errorTitle'), 'error'); return null }
    const textLengthError = validateNodeTextLengths(content)
    if (textLengthError) { showToast(t(textLengthError), 'error'); return null }
    setSaving(true)
    try {
      const queuedImages = pendingImages
      const contentWithoutPreviews = withoutPendingImagePreviews(normalizeBuilderContent(content), queuedImages)
      const response = currentId
        ? await (admin ? adminTasteTreeApi.saveDraft(currentId, payload(contentWithoutPreviews)) : tasteTreeApi.saveDraft(currentId, payload(contentWithoutPreviews)))
        : await (admin ? adminTasteTreeApi.create(payload(contentWithoutPreviews)) : tasteTreeApi.create(payload(contentWithoutPreviews)))
      const saved = response.data.data!
      setCurrentId(saved.id)

      let contentAfterUploads = content
      const uploadedKeys: string[] = []
      const failedKeys: string[] = []
      for (const [nodeKey, pendingImage] of Object.entries(queuedImages)) {
        if (!contentAfterUploads.nodes.some((node) => node.key === nodeKey)) {
          uploadedKeys.push(nodeKey)
          continue
        }
        try {
          const imageResponse = await (admin
            ? adminTasteTreeApi.uploadImage(saved.id, pendingImage.file)
            : tasteTreeApi.uploadImage(saved.id, pendingImage.file))
          const imageUrl = imageResponse.data.data?.imageUrl
          if (!imageUrl) throw new Error('Image URL is missing')
          contentAfterUploads = withNodeImageUrl(
            withoutPendingImagePreviews(contentAfterUploads, { [nodeKey]: pendingImage }),
            nodeKey,
            imageUrl,
          )
          uploadedKeys.push(nodeKey)
        } catch {
          failedKeys.push(nodeKey)
        }
      }

      if (Object.keys(queuedImages).length > 0) {
        setContent(contentAfterUploads)
        setPendingImages((previous) => {
          const next = { ...previous }
          uploadedKeys.forEach((nodeKey) => {
            const uploaded = next[nodeKey]
            if (uploaded) URL.revokeObjectURL(uploaded.previewUrl)
            delete next[nodeKey]
          })
          return next
        })
        const finalContent = withoutPendingImagePreviews(contentAfterUploads, queuedImages)
        await (admin
          ? adminTasteTreeApi.saveDraft(saved.id, payload(finalContent))
          : tasteTreeApi.saveDraft(saved.id, payload(finalContent)))
      }

      showToast(t('tasteTree.builder.draftSaved'), 'success')
      if (failedKeys.length > 0) {
        showToast(t('tasteTree.builder.imageUploadFailed'), 'error')
        return null
      }
      if (!treeId) navigate(admin ? `/admin/taste-trees/${saved.id}/edit` : `/taste-trees/${saved.id}/edit`, { replace: true })
      return saved.id
    } catch {
      showToast(t('tasteTree.builder.saveFailed'), 'error')
      return null
    } finally { setSaving(false) }
  }

  const publish = async () => {
    const invalidKeys = [...collectInvalidNodeKeys(content)]
    const error = validateForPublish(content)
    if (error) {
      setInvalidNodeKeys(invalidKeys)
      if (invalidKeys[0]) {
        setSelectedKey(invalidKeys[0])
        setSelectedEdgeKey(null)
      }
      showToast(t(error), 'error')
      return
    }
    setInvalidNodeKeys([])
    setPublishing(true)
    try {
      const savedId = await save()
      if (!savedId) return
      await (admin ? adminTasteTreeApi.publish(savedId) : tasteTreeApi.publish(savedId))
      showToast(t('tasteTree.builder.published'), 'success')
    } catch { showToast(t('tasteTree.builder.publishFailed'), 'error') }
    finally { setPublishing(false) }
  }

  const upload = async (file: File) => {
    if (!selected) return false
    const nodeKey = selected.key
    if (!currentId) {
      const previewUrl = URL.createObjectURL(file)
      setPendingImages((previous) => {
        const replaced = previous[nodeKey]
        if (replaced) URL.revokeObjectURL(replaced.previewUrl)
        return { ...previous, [nodeKey]: { file, previewUrl } }
      })
      setContent((previous) => withNodeImageUrl(previous, nodeKey, previewUrl))
      return true
    }
    try {
      const response = await (admin ? adminTasteTreeApi.uploadImage(currentId, file) : tasteTreeApi.uploadImage(currentId, file))
      const url = response.data.data?.imageUrl
      if (!url) return false
      const queuedImage = pendingImages[nodeKey]
      setContent((previous) => withNodeImageUrl(
        queuedImage ? withoutPendingImagePreviews(previous, { [nodeKey]: queuedImage }) : previous,
        nodeKey,
        url,
      ))
      discardPendingImage(nodeKey)
      return true
    } catch {
      showToast(t('tasteTree.builder.imageUploadFailed'), 'error')
      return false
    }
  }

  const outgoing = useMemo(() => content.edges.filter((edge) => edge.sourceNodeKey === selected?.key).sort((a, b) => a.sortOrder - b.sortOrder), [content.edges, selected?.key])
  const selectedEdge = content.edges.find((edge) => edge.key === selectedEdgeKey) ?? null
  const backPath = admin ? '/admin/taste-trees' : '/taste-trees/mine'

  return (
    <div className={`${admin ? 'p-4 lg:p-6' : 'mx-auto max-w-7xl px-4 py-7 lg:py-10'} min-w-0 overflow-x-auto`}>
      <SeoMeta title={t('tasteTree.builder.title')} noindex />
      <Toast toasts={toasts} onRemove={removeToast} />
      <div className="w-full min-w-[1120px] pb-2">
      <header className="mb-5 flex items-start justify-between gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="min-w-0">
          {admin && (
            <Link
              to={backPath}
              className="group ui-button inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-bold text-stone-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
            >
              <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
              {t('common.back')}
            </Link>
          )}
          <h1 className={`${admin ? 'mt-3' : ''} text-2xl font-black text-stone-950`}>{admin ? '공식 주류 트리 편집' : t('tasteTree.builder.title')}</h1>
          <p className="mt-1 text-xs text-stone-500">{t('tasteTree.builder.graphHelp')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 hover:bg-amber-100">{admin ? '미리보기' : t('tasteTree.builder.preview')}</button>
          <button type="button" onClick={save} disabled={saving || publishing} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40">{saving ? t('common.saving') : t('tasteTree.builder.saveDraft')}</button>
          <button type="button" onClick={publish} disabled={saving || publishing} className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-black text-stone-950 hover:bg-amber-400 disabled:opacity-40">{publishing ? t('tasteTree.builder.publishing') : t('tasteTree.builder.publish')}</button>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-stone-200 bg-white p-5">
        <RequiredFieldsNotice admin={admin} className="col-span-2" />
        <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.treeTitle')} <RequiredMark /></span><input value={title} onChange={(event) => setTitle(event.target.value)} required aria-required="true" maxLength={120} className={inputClass} /></label>
        <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.treeDescription')}</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} className={inputClass} /></label>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="relative min-w-0">
          <TasteTreeGraph
            content={content}
            editable
            language={admin ? 'ko' : undefined}
            selectedNodeKey={selectedEdge ? undefined : selected?.key}
            selectedEdgeKey={selectedEdgeKey ?? undefined}
            invalidNodeKeys={invalidNodeKeys}
            onNodeClick={(key) => { setSelectedKey(key); setSelectedEdgeKey(null) }}
            onEdgeClick={(key) => setSelectedEdgeKey(key)}
            onPaneClick={() => setSelectedEdgeKey(null)}
            onMoveNode={(key, x, y) => updateNode(key, { positionX: x, positionY: y })}
            onDeleteNode={deleteNode}
            onConnect={connect}
            onReconnectEdge={reconnectEdge}
            onDeleteEdge={deleteEdge}
            onUpdateEdge={updateEdge}
          />
          <div className="absolute right-4 top-4 z-10">
            <button
              type="button"
              onClick={() => setAddMenuOpen((open) => !open)}
              aria-expanded={addMenuOpen}
              className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-black text-white shadow-lg hover:bg-stone-800"
            >
              {t('tasteTree.builder.addNode')} <span aria-hidden="true">+</span>
            </button>
            {addMenuOpen && <div className="mt-2 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white p-1.5 shadow-xl">
              <button type="button" onClick={() => addNode('WHISKY')} className="block w-full rounded-md px-3 py-2.5 text-left text-xs font-black text-stone-800 hover:bg-amber-50">{t('tasteTree.builder.addWhiskyNode')}</button>
              <button type="button" onClick={() => addNode('CHOICE')} className="block w-full rounded-md px-3 py-2.5 text-left text-xs font-black text-stone-800 hover:bg-amber-50">{t('tasteTree.builder.addQuestion')}</button>
            </div>}
          </div>
        </div>

        <aside className="max-h-[720px] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {selectedEdge ? <EdgeEditor
            edge={selectedEdge}
            content={content}
            updateEdge={updateEdge}
            deleteEdge={deleteEdge}
            t={t}
          /> : selected && <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{t(`tasteTree.nodeTypes.${selected.type}`)}</p>
                <h2 className="mt-1 text-lg font-black text-stone-950">{t('tasteTree.builder.nodeSettings')}</h2>
                <RequiredFieldsNotice className="mt-1 text-[11px]" />
              </div>
              {selected.type !== 'START' && <button type="button" onClick={() => deleteNode(selected.key)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600">{t('common.delete')}</button>}
            </div>
            <div className="mt-6 space-y-4">
              <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <h3 className="text-sm font-black text-stone-900">{t(selected.type === 'CHOICE' ? 'tasteTree.builder.selectionPrompt' : 'tasteTree.builder.basicSection')}</h3>
                <div className="mt-4 space-y-4">
                  {selected.type === 'CHOICE' ? <input
                    value={selected.titleKo}
                    required
                    aria-required="true"
                    aria-label={t('tasteTree.builder.selectionPrompt')}
                    maxLength={NODE_TITLE_MAX_LENGTH}
                    onChange={(event) => updateNode(selected.key, { titleKo: event.target.value })}
                    placeholder={t('tasteTree.builder.selectionPromptPlaceholder')}
                    className={inputClass}
                  /> : <>
                    <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.titleKo', { max: NODE_TITLE_MAX_LENGTH })} <RequiredMark /></span><input value={selected.titleKo} required aria-required="true" maxLength={NODE_TITLE_MAX_LENGTH} onChange={(event) => updateNode(selected.key, { titleKo: event.target.value })} className={inputClass} /></label>
                    <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.descriptionKo', { max: NODE_DESCRIPTION_MAX_LENGTH })}</span><textarea value={selected.descriptionKo ?? ''} maxLength={NODE_DESCRIPTION_MAX_LENGTH} onChange={(event) => updateNode(selected.key, { descriptionKo: event.target.value })} rows={3} className={inputClass} /></label>
                  </>}
                </div>
              </section>

              {(selected.type === 'WHISKY' || (admin && selected.type === 'START')) && <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <h3 className="text-sm font-black text-stone-900">{t('tasteTree.builder.spiritSection')}</h3>
                <div className="mt-4 space-y-6">
                  <WhiskyEditor
                    node={selected}
                    updateNode={updateNode}
                    spiritKeyword={spiritKeyword}
                    setSpiritKeyword={setSpiritKeyword}
                    spirits={spiritQuery.data ?? []}
                    isEn={isEn}
                    showSeriesIdentifier={admin}
                    t={t}
                  />
                  <NodeImageEditor key={selected.key} node={selected} updateNode={updateNode} upload={upload} discardPendingImage={discardPendingImage} t={t} />
                </div>
              </section>}

              <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <h3 className="text-sm font-black text-stone-900">{t('tasteTree.builder.connections')}</h3>
                <div className="mt-3 space-y-3">
                  {outgoing.map((edge) => <div key={edge.key} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-stone-400">{content.nodes.find((node) => node.key === edge.targetNodeKey)?.titleKo}</span><button type="button" onClick={() => deleteEdge(edge.key)} className="text-xs font-bold text-red-600">{t('common.delete')}</button></div>
                    <input value={edge.labelKo} onChange={(event) => updateEdge(edge.key, { labelKo: event.target.value })} placeholder={t('tasteTree.builder.edgeLabelKo')} className={`${inputClass} mt-2`} />
                  </div>)}
                  {!outgoing.length && <p className="text-xs leading-5 text-stone-400">{t('tasteTree.builder.noConnections')}</p>}
                </div>
                {selected.type !== 'CHOICE' && <label className="mt-4 block">
                  <span className={labelClass}>{t('tasteTree.builder.selectionPrompt')} {outgoing.length > 0 && <RequiredMark />}</span>
                  <input
                    value={selected.promptKo ?? ''}
                    required={outgoing.length > 0}
                    aria-required={outgoing.length > 0}
                    disabled={outgoing.length === 0}
                    maxLength={NODE_PROMPT_MAX_LENGTH}
                    onChange={(event) => updateNode(selected.key, { promptKo: event.target.value })}
                    placeholder={outgoing.length > 0 ? t('tasteTree.builder.selectionPromptPlaceholder') : ''}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400`}
                  />
                </label>}
              </section>
            </div>
          </>}
        </aside>
      </div>
      </div>

      {previewOpen && <div className="fixed inset-0 z-[100] overflow-y-auto bg-stone-950/75 p-4 lg:p-8" role="dialog" aria-modal="true" aria-label={admin ? '트리 미리보기' : t('tasteTree.builder.preview')}>
        <div className="mx-auto max-w-[1500px] rounded-2xl bg-stone-100 p-4 shadow-2xl lg:p-6">
          <header className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white px-5 py-4">
            <p className="text-xs font-black text-amber-700">{admin ? '미리보기' : t('tasteTree.builder.preview')}</p>
            <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-black text-stone-700 hover:bg-stone-50">{t('tasteTree.builder.closePreview')}</button>
          </header>
          <TasteTreePlayer content={content} language={admin ? 'ko' : undefined} treeTitle={title || t('tasteTree.builder.untitled')} creatorName={admin ? 'CaskByCask' : userNickname} />
        </div>
      </div>}
    </div>
  )
}

function NodeImageEditor({ node, updateNode, upload, discardPendingImage, t }: any) {
  const whisky = node.whisky
  const image = node.imageHidden ? null : whisky?.imageOverrideUrl || node.imageUrl || whisky?.imageUrl
  const [editing, setEditing] = useState(false)
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [localEditUrl, setLocalEditUrl] = useState<string | null>(null)

  useEffect(() => () => {
    if (localEditUrl) URL.revokeObjectURL(localEditUrl)
  }, [localEditUrl])

  const closeEditor = () => {
    setEditing(false)
    setLocalEditUrl(null)
  }

  const selectImage = (file: File) => {
    setLocalEditUrl(URL.createObjectURL(file))
    setEditing(true)
  }

  const editImage = async (file: File) => {
    setIsEditingImage(true)
    try {
      const saved = await upload(file)
      if (saved) closeEditor()
    } finally {
      setIsEditingImage(false)
    }
  }
  const remove = () => {
    discardPendingImage(node.key)
    updateNode(node.key, {
      imageUrl: null,
      imageHidden: !(whisky?.source === 'REGISTERED' && whisky.imageUrl),
      whisky: whisky ? { ...whisky, imageOverrideUrl: null } : null,
    })
  }

  return <section className="border-t border-stone-200 pt-6">
    <span className={labelClass}>{t('tasteTree.builder.nodeImage')}</span>
    {image && <div className="group relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
      <img src={image} alt="" className="pointer-events-none mx-auto h-full w-auto max-w-none" />
      <button
        type="button"
        onClick={() => { setLocalEditUrl(null); setEditing(true) }}
        aria-label={t('tasteTree.builder.imageEdit')}
        title={t('tasteTree.builder.imageEdit')}
        className="absolute right-9 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600/90 text-white opacity-0 transition-opacity hover:bg-amber-600 group-hover:opacity-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
      </button>
      <button
        type="button"
        onClick={remove}
        aria-label={t('tasteTree.builder.imageRemove')}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-sm text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
      >×</button>
    </div>}
    <label className="ui-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-xs font-black text-stone-500 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700">
      <span className="text-lg leading-none">+</span>
      <span>{t('tasteTree.builder.imageAdd')}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) selectImage(file); event.currentTarget.value = '' }} className="hidden cursor-pointer" />
    </label>
    {editing && (localEditUrl || image) && <ImageEditorModal
      open={editing}
      onClose={closeEditor}
      imageSrc={localEditUrl || image}
      onSave={editImage}
      isSaving={isEditingImage}
      initialMode="crop"
      initialCropRatio="3:4"
    />}
  </section>
}

function EdgeEditor({ edge, content, updateEdge, deleteEdge, t }: any) {
  const sourceHandle = (edge.sourceHandle?.replace('source-', 'point-') || 'point-bottom') as TasteTreeSourceHandle
  const targetHandle = (edge.targetHandle?.replace('target-', 'point-') || 'point-top') as TasteTreeTargetHandle
  const sourceNode = content.nodes.find((node: TasteTreeNode) => node.key === edge.sourceNodeKey)
  return <>
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">LINE</p><h2 className="mt-1 text-lg font-black text-stone-950">{t('tasteTree.builder.edgeSettings')}</h2></div>
      <button type="button" onClick={() => deleteEdge(edge.key)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600">{t('common.delete')}</button>
    </div>
    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">{t('tasteTree.builder.edgeHelp')}</p>
    <div className="mt-6 space-y-6">
      <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.edgeLabelKo')}</span><input value={edge.labelKo} onChange={(event) => updateEdge(edge.key, { labelKo: event.target.value })} className={inputClass} /></label>
      <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.edgeDescriptionKo')}</span><input value={edge.descriptionKo ?? ''} maxLength={300} onChange={(event) => updateEdge(edge.key, { descriptionKo: event.target.value })} placeholder={t('tasteTree.builder.edgeDescriptionPlaceholder')} className={inputClass} /></label>
      <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.lineType')}</span><select value={edge.lineType ?? 'STEP'} onChange={(event) => updateEdge(edge.key, { lineType: event.target.value as TasteTreeEdge['lineType'] })} className={inputClass}>
        <option value="STEP">{t('tasteTree.builder.lineStep')}</option>
        <option value="STRAIGHT">{t('tasteTree.builder.lineStraight')}</option>
      </select></label>
      <div className="grid grid-cols-2 gap-4">
        <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.sourceHandle')}</span><select value={sourceHandle} onChange={(event) => updateEdge(edge.key, { sourceHandle: event.target.value })} className={inputClass}>
          <option value="point-top" disabled={sourceNode?.type === 'START'}>{t('tasteTree.builder.handleTop')}</option><option value="point-left">{t('tasteTree.builder.handleLeft')}</option><option value="point-right">{t('tasteTree.builder.handleRight')}</option><option value="point-bottom">{t('tasteTree.builder.handleBottom')}</option>
        </select></label>
        <label className={fieldClass}><span className={labelClass}>{t('tasteTree.builder.targetHandle')}</span><select value={targetHandle} onChange={(event) => updateEdge(edge.key, { targetHandle: event.target.value })} className={inputClass}>
          <option value="point-top">{t('tasteTree.builder.handleTop')}</option><option value="point-left">{t('tasteTree.builder.handleLeft')}</option><option value="point-right">{t('tasteTree.builder.handleRight')}</option><option value="point-bottom">{t('tasteTree.builder.handleBottom')}</option>
        </select></label>
      </div>
    </div>
  </>
}

function getSpiritSearchResultName(spirit: any, isEn: boolean, showSeriesIdentifier: boolean) {
  const name = isEn ? spirit.nameEn || spirit.nameKo : spirit.nameKo
  if (!showSeriesIdentifier) return name
  const seriesIdentifier = isEn
    ? spirit.seriesIdentifierEn || spirit.seriesIdentifier
    : spirit.seriesIdentifier
  return seriesIdentifier ? `${name} (${seriesIdentifier})` : name
}

function WhiskyEditor({
  node,
  updateNode,
  spiritKeyword,
  setSpiritKeyword,
  spirits,
  isEn,
  showSeriesIdentifier,
  t,
}: any) {
  const whisky = node.whisky ?? { source: 'CUSTOM', nameKo: '' }
  const updateWhisky = (patch: Record<string, unknown>) => updateNode(node.key, { whisky: { ...whisky, ...patch } })
  const selectRegisteredSpirit = (spirit: any) => {
    updateNode(node.key, {
      titleKo: spirit.nameKo,
      titleEn: spirit.nameEn,
      imageHidden: false,
      whisky: {
        ...whisky,
        source: 'REGISTERED',
        spiritId: spirit.id,
        nameKo: spirit.nameKo,
        nameEn: spirit.nameEn,
        imageUrl: spirit.imageUrl,
      },
    })
    setSpiritKeyword('')
  }
  return <div className="rounded-lg bg-stone-50 p-4">
    <span className={labelClass}>{t('tasteTree.builder.whiskySource')} <RequiredMark /></span>
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-required="true">
      {(['REGISTERED', 'CUSTOM'] as const).map((source) => <button key={source} type="button" onClick={() => updateNode(node.key, {
        imageHidden: false,
        whisky: { ...whisky, source, spiritId: null, nameKo: null, nameEn: null, imageUrl: null },
      })} className={`rounded-lg border px-3 py-2 text-xs font-black ${whisky.source === source ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-stone-200 bg-white text-stone-500'}`}>{t(`tasteTree.whiskySources.${source}`)}</button>)}
    </div>
    {whisky.source === 'REGISTERED' ? <div className="mt-4">
      <span className={labelClass}>{t('tasteTree.builder.registeredSpirit')} <RequiredMark /></span>
      <input value={spiritKeyword} aria-required="true" onChange={(event) => setSpiritKeyword(event.target.value)} placeholder={t('tasteTree.builder.searchPlaceholder')} className={inputClass} />
      {spiritKeyword.trim().length >= 2 && <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white">
        {spirits.map((spirit: any) => <button key={spirit.id} type="button" onClick={() => selectRegisteredSpirit(spirit)} className="flex w-full items-center gap-3 border-b border-stone-100 p-2 text-left last:border-0 hover:bg-amber-50">
          {spirit.imageUrl && <img src={spirit.imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />}<span className="min-w-0 text-xs font-bold text-stone-800">{getSpiritSearchResultName(spirit, isEn, showSeriesIdentifier)}</span>
        </button>)}
      </div>}
      {whisky.spiritId && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700">{whisky.nameKo} #{whisky.spiritId}</p>}
    </div> : null}
    <input value={whisky.priceText ?? ''} onChange={(event) => updateWhisky({ priceText: event.target.value, priceAmount: null, currencyCode: null })} maxLength={50} placeholder={t('tasteTree.builder.priceTextPlaceholder')} className={`${inputClass} mt-4`} />
  </div>
}
