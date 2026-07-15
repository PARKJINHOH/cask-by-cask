import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { tasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import TasteTreeGraph from '@/domain/taste-tree/components/TasteTreeGraph'
import type {
  TasteTreeContent,
  TasteTreeNode,
  TasteTreeOption,
  TasteTreeResultDefinition,
  TasteTreeSavePayload,
  TasteTreeView,
} from '@/domain/taste-tree/types/tasteTree.types'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import SeoMeta from '@/shared/components/SeoMeta'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100'
const labelClass = 'mb-1.5 block text-xs font-bold text-neutral-700'

function initialContent(t: TFunction): TasteTreeContent {
  return {
    experienceLevel: 'USER',
    nodes: [
      {
        key: 'start',
        type: 'START',
        titleKo: t('tasteTree.builder.defaultStartTitle'),
        titleEn: t('tasteTree.builder.defaultStartTitleEn'),
        descriptionKo: t('tasteTree.builder.defaultStartDesc'),
        descriptionEn: t('tasteTree.builder.defaultStartDescEn'),
        positionX: 310,
        positionY: 20,
        options: [{ key: 'start-next', labelKo: t('tasteTree.start'), labelEn: 'Start', targetNodeKey: 'question-1' }],
      },
      {
        key: 'question-1',
        type: 'QUESTION',
        titleKo: t('tasteTree.builder.defaultQuestion'),
        titleEn: t('tasteTree.builder.defaultQuestionEn'),
        positionX: 310,
        positionY: 170,
        selectionType: 'SINGLE',
        minSelect: 1,
        maxSelect: 1,
        options: [
          { key: 'option-1', labelKo: t('tasteTree.builder.defaultOption'), labelEn: t('tasteTree.builder.defaultOptionEn'), targetNodeKey: 'result-1' },
        ],
      },
      {
        key: 'result-1',
        type: 'RESULT',
        titleKo: t('tasteTree.builder.defaultResult'),
        titleEn: t('tasteTree.builder.defaultResultEn'),
        positionX: 310,
        positionY: 340,
        results: [],
      },
    ],
  }
}

function validateForPublish(content: TasteTreeContent) {
  const nodes = content.nodes
  const nodeKeys = new Set(nodes.map((node) => node.key))
  const start = nodes.find((node) => node.type === 'START')
  if (!start || nodes.filter((node) => node.type === 'START').length !== 1) return 'tasteTree.builder.errorStart'
  if (!nodes.some((node) => node.type === 'RESULT')) return 'tasteTree.builder.errorResult'
  for (const node of nodes) {
    if (!node.titleKo.trim()) return 'tasteTree.builder.errorNodeTitle'
    if (node.type === 'QUESTION' && !(node.options?.length)) return 'tasteTree.builder.errorQuestionOption'
    if (node.type === 'RESULT') {
      const items = node.results ?? []
      if (items.length < 1 || items.length > 3) return 'tasteTree.builder.errorResultCount'
      if (items.some((item) => item.type === 'REGISTERED' ? !item.spiritId : !item.customName?.trim())) return 'tasteTree.builder.errorResultItem'
    }
    for (const option of node.options ?? []) {
      if (!option.labelKo.trim() || !option.targetNodeKey || !nodeKeys.has(option.targetNodeKey)) return 'tasteTree.builder.errorOption'
    }
    if (node.selectionType === 'MULTIPLE') {
      const targets = new Set((node.options ?? []).map((option) => option.targetNodeKey))
      if (targets.size > 1) return 'tasteTree.builder.errorMultiTarget'
    }
  }
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const map = new Map(nodes.map((node) => [node.key, node]))
  const walk = (key: string): boolean => {
    if (visiting.has(key)) return false
    if (visited.has(key)) return true
    visiting.add(key)
    visited.add(key)
    for (const option of map.get(key)?.options ?? []) {
      if (!walk(option.targetNodeKey)) return false
    }
    visiting.delete(key)
    return true
  }
  if (!walk(start.key)) return 'tasteTree.builder.errorCycle'
  if (visited.size !== nodes.length) return 'tasteTree.builder.errorUnreachable'
  return null
}

export default function TasteTreeBuilderPage() {
  const { id } = useParams<{ id?: string }>()
  const treeId = id ? Number(id) : null
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState<TasteTreeContent>(() => initialContent(t))
  const [selectedKey, setSelectedKey] = useState('question-1')
  const [currentId, setCurrentId] = useState<number | null>(treeId)
  const [version, setVersion] = useState<TasteTreeView | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [spiritKeyword, setSpiritKeyword] = useState('')

  const detailQuery = useQuery({
    queryKey: ['taste-trees', 'mine', treeId],
    queryFn: () => tasteTreeApi.getMineDetail(treeId!).then((response) => response.data.data!),
    enabled: Boolean(treeId),
  })

  useEffect(() => {
    if (!detailQuery.data) return
    setTitle(detailQuery.data.title)
    setDescription(detailQuery.data.description ?? '')
    setContent(detailQuery.data.content)
    setSelectedKey(detailQuery.data.content.nodes.find((node) => node.type === 'QUESTION')?.key ?? detailQuery.data.content.nodes[0]?.key ?? '')
    setVersion(detailQuery.data)
  }, [detailQuery.data])

  const selected = content.nodes.find((node) => node.key === selectedKey) ?? content.nodes[0]
  const spiritQuery = useQuery({
    queryKey: ['taste-tree-builder', 'spirits', spiritKeyword],
    queryFn: () => spiritApi.autocomplete(spiritKeyword, undefined, true).then((response) => response.data.data ?? []),
    enabled: selected?.type === 'RESULT' && spiritKeyword.trim().length >= 2,
    staleTime: 30_000,
  })

  const updateNode = (key: string, patch: Partial<TasteTreeNode>) => {
    setContent((previous) => ({
      ...previous,
      nodes: previous.nodes.map((node) => node.key === key ? { ...node, ...patch } : node),
    }))
  }

  const addNode = (type: 'QUESTION' | 'RESULT' | 'INFO') => {
    const key = `${type.toLowerCase()}-${Date.now()}`
    const index = content.nodes.length
    const node: TasteTreeNode = {
      key,
      type,
      titleKo: type === 'QUESTION' ? t('tasteTree.builder.newQuestion') : type === 'RESULT' ? t('tasteTree.builder.newResult') : t('tasteTree.builder.newInfo'),
      titleEn: '',
      positionX: 60 + (index % 4) * 220,
      positionY: 160 + Math.floor(index / 4) * 150,
      ...(type === 'QUESTION' ? { selectionType: 'SINGLE' as const, minSelect: 1, maxSelect: 1, options: [] } : {}),
      ...(type === 'INFO' ? { options: [] } : {}),
      ...(type === 'RESULT' ? { results: [] } : {}),
    }
    setContent((previous) => ({ ...previous, nodes: [...previous.nodes, node] }))
    setSelectedKey(key)
  }

  const deleteNode = (key: string) => {
    const target = content.nodes.find((node) => node.key === key)
    if (!target || target.type === 'START') return
    setContent((previous) => ({
      ...previous,
      nodes: previous.nodes
        .filter((node) => node.key !== key)
        .map((node) => ({ ...node, options: (node.options ?? []).filter((option) => option.targetNodeKey !== key) })),
    }))
    setSelectedKey('start')
  }

  const updateOption = (index: number, patch: Partial<TasteTreeOption>) => {
    if (!selected) return
    updateNode(selected.key, {
      options: (selected.options ?? []).map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option),
    })
  }

  const addOption = () => {
    if (!selected || (selected.options?.length ?? 0) >= 8) return
    const firstTarget = content.nodes.find((node) => node.key !== selected.key)?.key ?? ''
    const option: TasteTreeOption = {
      key: `option-${Date.now()}`,
      labelKo: t('tasteTree.builder.newOption'),
      labelEn: '',
      descriptionKo: '',
      descriptionEn: '',
      targetNodeKey: firstTarget,
    }
    updateNode(selected.key, { options: [...(selected.options ?? []), option] })
  }

  const removeOption = (index: number) => {
    if (!selected) return
    updateNode(selected.key, { options: (selected.options ?? []).filter((_, optionIndex) => optionIndex !== index) })
  }

  const addResultItem = (item: TasteTreeResultDefinition) => {
    if (!selected || selected.type !== 'RESULT' || (selected.results?.length ?? 0) >= 3) return
    if (item.type === 'REGISTERED' && selected.results?.some((result) => result.type === 'REGISTERED' && result.spiritId === item.spiritId)) {
      showToast(t('tasteTree.builder.duplicateSpirit'), 'info')
      return
    }
    updateNode(selected.key, { results: [...(selected.results ?? []), item] })
    setSpiritKeyword('')
  }

  const updateResultItem = (index: number, patch: Partial<TasteTreeResultDefinition>) => {
    if (!selected) return
    updateNode(selected.key, {
      results: (selected.results ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    })
  }

  const removeResultItem = (index: number) => {
    if (!selected) return
    updateNode(selected.key, { results: (selected.results ?? []).filter((_, itemIndex) => itemIndex !== index) })
  }

  const uploadCustomImage = async (index: number, file?: File) => {
    if (!file) return
    try {
      const response = await tasteTreeApi.uploadImage(file)
      const imageUrl = response.data.data?.imageUrl
      if (imageUrl) updateResultItem(index, { customImageUrl: imageUrl })
    } catch {
      showToast(t('tasteTree.builder.imageUploadFailed'), 'error')
    }
  }

  const payload = (): TasteTreeSavePayload => ({
    title: title.trim() || t('tasteTree.builder.untitled'),
    description: description.trim() || null,
    content,
  })

  const saveDraft = async () => {
    setSaving(true)
    try {
      const response = currentId
        ? await tasteTreeApi.saveDraft(currentId, payload())
        : await tasteTreeApi.create(payload())
      const saved = response.data.data!
      setCurrentId(saved.id)
      setVersion(saved)
      if (!currentId) navigate(`/taste-trees/${saved.id}/edit`, { replace: true })
      showToast(t('tasteTree.builder.draftSaved'), 'success')
      return saved
    } catch {
      showToast(t('tasteTree.builder.saveFailed'), 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    const errorKey = validateForPublish(content)
    if (!title.trim()) {
      showToast(t('tasteTree.builder.errorTitle'), 'error')
      return
    }
    if (errorKey) {
      showToast(t(errorKey), 'error')
      return
    }
    setPublishing(true)
    try {
      const saved = await saveDraft()
      if (!saved) return
      const response = await tasteTreeApi.publish(saved.id)
      setVersion(response.data.data!)
      showToast(t('tasteTree.builder.published'), 'success')
    } catch {
      showToast(t('tasteTree.builder.publishFailed'), 'error')
    } finally {
      setPublishing(false)
    }
  }

  const nodeTargets = useMemo(() => content.nodes.filter((node) => node.key !== selected?.key), [content.nodes, selected?.key])
  const isEn = i18n.language === 'en'

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <SeoMeta title={treeId ? t('tasteTree.builder.editTitle') : t('tasteTree.builder.createTitle')} noindex />
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 lg:hidden">
        <h1 className="text-lg font-black text-amber-950">{t('tasteTree.pcOnlyTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-amber-800">{t('tasteTree.pcOnlyDesc')}</p>
      </div>

      <div className="hidden lg:block">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-neutral-950">{t('tasteTree.builder.title')}</h1>
              {version && (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${version.versionStatus === 'DRAFT' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
                  VERSION {version.versionNumber} · {version.versionStatus}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">{t('tasteTree.builder.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/taste-trees/mine')} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50">
              {t('tasteTree.myTrees')}
            </button>
            <button onClick={saveDraft} disabled={saving || publishing} className="rounded-lg border border-primary-800 px-4 py-2 text-sm font-bold text-primary-800 hover:bg-primary-50 disabled:opacity-50">
              {saving ? t('common.saving') : t('tasteTree.builder.saveDraft')}
            </button>
            <button onClick={publish} disabled={saving || publishing} className="rounded-lg bg-primary-800 px-5 py-2 text-sm font-bold text-white hover:bg-primary-900 disabled:opacity-50">
              {publishing ? t('tasteTree.builder.publishing') : t('tasteTree.builder.publish')}
            </button>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <label>
            <span className={labelClass}>{t('tasteTree.builder.treeTitle')}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className={inputClass} placeholder={t('tasteTree.builder.treeTitlePlaceholder')} />
          </label>
          <label>
            <span className={labelClass}>{t('tasteTree.builder.treeDescription')}</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} className={inputClass} placeholder={t('tasteTree.builder.treeDescriptionPlaceholder')} />
          </label>
        </section>

        <div className="grid min-h-[720px] grid-cols-[230px_minmax(520px,1fr)_380px] gap-4">
          <aside className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-neutral-900">{t('tasteTree.builder.nodes')}</h2>
              <span className="text-xs text-neutral-400">{content.nodes.length}/100</span>
            </div>
            <div className="space-y-1.5">
              {content.nodes.map((node) => (
                <button
                  key={node.key}
                  onClick={() => setSelectedKey(node.key)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left ${selected?.key === node.key ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:bg-neutral-50'}`}
                >
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700">{node.type}</span>
                  <span className="mt-1 block truncate text-xs font-bold text-neutral-800">{isEn ? node.titleEn || node.titleKo : node.titleKo}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
              <button onClick={() => addNode('QUESTION')} className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-600 hover:border-amber-400 hover:bg-amber-50">{t('tasteTree.builder.addQuestion')}</button>
              <button onClick={() => addNode('RESULT')} className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-600 hover:border-amber-400 hover:bg-amber-50">{t('tasteTree.builder.addResult')}</button>
              <button onClick={() => addNode('INFO')} className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-600 hover:border-amber-400 hover:bg-amber-50">{t('tasteTree.builder.addInfo')}</button>
            </div>
          </aside>

          <main className="min-w-0">
            <TasteTreeGraph content={content} activeNodeKeys={selected ? [selected.key] : []} onNodeClick={setSelectedKey} />
            <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs leading-5 text-neutral-500">
              {t('tasteTree.builder.graphHelp')}
            </div>
          </main>

          <aside className="max-h-[900px] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            {selected && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">{selected.type}</p>
                    <h2 className="mt-1 text-base font-black text-neutral-950">{t('tasteTree.builder.nodeSettings')}</h2>
                  </div>
                  {selected.type !== 'START' && (
                    <button onClick={() => deleteNode(selected.key)} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">{t('common.delete')}</button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className={labelClass}>{t('tasteTree.builder.titleKo')}</span>
                    <input value={selected.titleKo} onChange={(event) => updateNode(selected.key, { titleKo: event.target.value })} className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>{t('tasteTree.builder.titleEn')}</span>
                    <input value={selected.titleEn ?? ''} onChange={(event) => updateNode(selected.key, { titleEn: event.target.value })} className={inputClass} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className={labelClass}>{t('tasteTree.builder.descriptionKo')}</span>
                    <textarea value={selected.descriptionKo ?? ''} onChange={(event) => updateNode(selected.key, { descriptionKo: event.target.value })} rows={3} className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>{t('tasteTree.builder.descriptionEn')}</span>
                    <textarea value={selected.descriptionEn ?? ''} onChange={(event) => updateNode(selected.key, { descriptionEn: event.target.value })} rows={3} className={inputClass} />
                  </label>
                </div>

                {selected.type === 'QUESTION' && (
                  <div className="rounded-xl border border-neutral-200 p-3">
                    <span className={labelClass}>{t('tasteTree.builder.selectionType')}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['SINGLE', 'MULTIPLE'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateNode(selected.key, { selectionType: type, minSelect: 1, maxSelect: type === 'SINGLE' ? 1 : Math.max(1, selected.maxSelect ?? 1) })}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold ${selected.selectionType === type ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-neutral-200 text-neutral-500'}`}
                        >
                          {type === 'SINGLE' ? t('tasteTree.builder.single') : t('tasteTree.builder.multiple')}
                        </button>
                      ))}
                    </div>
                    {selected.selectionType === 'MULTIPLE' && (
                      <label className="mt-3 block">
                        <span className={labelClass}>{t('tasteTree.builder.maxSelect')}</span>
                        <select value={selected.maxSelect ?? 1} onChange={(event) => updateNode(selected.key, { maxSelect: Number(event.target.value) })} className={inputClass}>
                          {[1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                {(selected.type === 'START' || selected.type === 'QUESTION' || selected.type === 'INFO') && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-black text-neutral-900">{t('tasteTree.builder.options')}</h3>
                      <button onClick={addOption} disabled={(selected.options?.length ?? 0) >= 8 || selected.type === 'START' && (selected.options?.length ?? 0) >= 1} className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-600 disabled:opacity-40">{t('tasteTree.builder.addOption')}</button>
                    </div>
                    <div className="space-y-3">
                      {(selected.options ?? []).map((option, index) => (
                        <div key={option.key} className="rounded-xl border border-neutral-200 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-black text-neutral-500">{t('tasteTree.builder.optionNumber', { number: index + 1 })}</span>
                            {selected.type !== 'START' && <button onClick={() => removeOption(index)} className="text-xs font-bold text-red-600">{t('common.delete')}</button>}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={option.labelKo} onChange={(event) => updateOption(index, { labelKo: event.target.value })} className={inputClass} placeholder={t('tasteTree.builder.labelKo')} />
                            <input value={option.labelEn ?? ''} onChange={(event) => updateOption(index, { labelEn: event.target.value })} className={inputClass} placeholder={t('tasteTree.builder.labelEn')} />
                          </div>
                          <select value={option.targetNodeKey} onChange={(event) => updateOption(index, { targetNodeKey: event.target.value })} className={`${inputClass} mt-2`}>
                            <option value="">{t('tasteTree.builder.selectNext')}</option>
                            {nodeTargets.map((node) => <option key={node.key} value={node.key}>{node.type} · {node.titleKo}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.type === 'RESULT' && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-neutral-900">{t('tasteTree.builder.resultWhiskies')}</h3>
                        <p className="mt-1 text-[11px] text-neutral-400">{t('tasteTree.builder.resultCount', { count: selected.results?.length ?? 0 })}</p>
                      </div>
                      <button onClick={() => addResultItem({ type: 'CUSTOM', customName: '', currencyCode: 'KRW', recommendationReasonKo: '', recommendationReasonEn: '' })} disabled={(selected.results?.length ?? 0) >= 3} className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-600 disabled:opacity-40">
                        {t('tasteTree.builder.addCustom')}
                      </button>
                    </div>

                    {(selected.results?.length ?? 0) < 3 && (
                      <div className="relative mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <label>
                          <span className={labelClass}>{t('tasteTree.builder.searchRegistered')}</span>
                          <input value={spiritKeyword} onChange={(event) => setSpiritKeyword(event.target.value)} className={inputClass} placeholder={t('tasteTree.builder.searchPlaceholder')} />
                        </label>
                        {spiritKeyword.trim().length >= 2 && (
                          <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
                            {(spiritQuery.data ?? []).map((spirit) => (
                              <button
                                key={spirit.id}
                                onClick={() => addResultItem({
                                  type: 'REGISTERED', spiritId: spirit.id, displayNameKo: spirit.nameKo,
                                  displayNameEn: spirit.nameEn, imageUrl: spirit.imageUrl,
                                  recommendationReasonKo: '', recommendationReasonEn: '',
                                })}
                                className="flex w-full items-center gap-3 border-b border-neutral-100 p-2.5 text-left last:border-0 hover:bg-neutral-50"
                              >
                                {spirit.imageUrl ? <img src={spirit.imageUrl} alt="" className="h-10 w-10 rounded-md object-contain" /> : <div className="h-10 w-10 rounded-md bg-neutral-100" />}
                                <span className="min-w-0"><strong className="block truncate text-xs text-neutral-900">{isEn ? spirit.nameEn || spirit.nameKo : spirit.nameKo}</strong><span className="block truncate text-[10px] text-neutral-400">{isEn ? spirit.nameKo : spirit.nameEn}</span></span>
                              </button>
                            ))}
                            {!spiritQuery.isLoading && !(spiritQuery.data?.length) && <p className="p-4 text-center text-xs text-neutral-400">{t('tasteTree.builder.noSearchResult')}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      {(selected.results ?? []).map((item, index) => (
                        <div key={`${item.type}-${item.spiritId ?? index}`} className="rounded-xl border border-neutral-200 p-3">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {(item.imageUrl || item.customImageUrl) && <img src={item.imageUrl || item.customImageUrl || ''} alt="" className="h-12 w-12 rounded-md bg-neutral-50 object-contain" />}
                              <div className="min-w-0"><span className="text-[10px] font-black text-amber-700">{item.type === 'REGISTERED' ? t('tasteTree.builder.registered') : t('tasteTree.builder.custom')}</span><p className="truncate text-xs font-bold text-neutral-900">{item.type === 'REGISTERED' ? item.displayNameKo || `#${item.spiritId}` : item.customName || t('tasteTree.builder.nameRequired')}</p></div>
                            </div>
                            <button onClick={() => removeResultItem(index)} className="text-xs font-bold text-red-600">{t('common.delete')}</button>
                          </div>
                          {item.type === 'CUSTOM' && (
                            <div className="space-y-2">
                              <input value={item.customName ?? ''} onChange={(event) => updateResultItem(index, { customName: event.target.value })} className={inputClass} placeholder={t('tasteTree.builder.customName')} />
                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadCustomImage(index, event.target.files?.[0])} className="w-full text-xs text-neutral-500 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2 file:py-1.5 file:text-xs file:font-bold" />
                              <div className="grid grid-cols-[1fr_100px] gap-2"><input type="number" min="0" value={item.priceAmount ?? ''} onChange={(event) => updateResultItem(index, { priceAmount: event.target.value ? Number(event.target.value) : null })} className={inputClass} placeholder={t('tasteTree.builder.optionalPrice')} /><select value={item.currencyCode ?? 'KRW'} onChange={(event) => updateResultItem(index, { currencyCode: event.target.value })} className={inputClass}><option value="KRW">KRW</option><option value="JPY">JPY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
                            </div>
                          )}
                          <textarea value={item.recommendationReasonKo ?? ''} onChange={(event) => updateResultItem(index, { recommendationReasonKo: event.target.value })} maxLength={300} rows={2} className={`${inputClass} mt-2`} placeholder={t('tasteTree.builder.reasonKo')} />
                          <textarea value={item.recommendationReasonEn ?? ''} onChange={(event) => updateResultItem(index, { recommendationReasonEn: event.target.value })} maxLength={300} rows={2} className={`${inputClass} mt-2`} placeholder={t('tasteTree.builder.reasonEn')} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
