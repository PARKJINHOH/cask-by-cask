import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  NodeResizer,
  Position,
  ReactFlow,
  useNodesState,
  type Connection,
  type ConnectionLineComponentProps,
  type Node as FlowNode,
  type NodeProps,
  type ResizeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { TasteTreeContent, TasteTreeEdge, TasteTreeNode } from '../types/tasteTree.types'
import MovableTasteTreeEdge, { type TasteTreeFlowEdge } from './TasteTreeEdge'

export type TasteTreeSourceHandle = 'point-top' | 'point-left' | 'point-right' | 'point-bottom'
export type TasteTreeTargetHandle = TasteTreeSourceHandle

interface TasteTreeGraphProps {
  content: TasteTreeContent
  activeNodeKeys?: string[]
  activeEdgeKeys?: string[]
  compact?: boolean
  editable?: boolean
  language?: 'ko' | 'en'
  selectedNodeKey?: string
  selectedEdgeKey?: string
  onNodeClick?: (nodeKey: string) => void
  onEdgeClick?: (edgeKey: string) => void
  onPaneClick?: () => void
  onMoveNode?: (nodeKey: string, x: number, y: number) => void
  onResizeNode?: (nodeKey: string, x: number, y: number, width: number, height: number) => void
  onDeleteNode?: (nodeKey: string) => void
  onConnect?: (
    sourceKey: string,
    targetKey: string,
    sourceHandle?: TasteTreeSourceHandle,
    targetHandle?: TasteTreeTargetHandle,
  ) => void
  onReconnectEdge?: (
    edgeKey: string,
    sourceKey: string,
    targetKey: string,
    sourceHandle?: TasteTreeSourceHandle,
    targetHandle?: TasteTreeTargetHandle,
  ) => void
  onDeleteEdge?: (edgeKey: string) => void
  onUpdateEdge?: (edgeKey: string, patch: Partial<TasteTreeEdge>) => void
}

interface TreeNodeData extends Record<string, unknown> {
  node: TasteTreeNode
  isEn: boolean
  active: boolean
  editable: boolean
  onDeleteNode?: TasteTreeGraphProps['onDeleteNode']
  onResizeNode?: TasteTreeGraphProps['onResizeNode']
}

type TreeFlowNode = FlowNode<TreeNodeData, 'taste-tree'>

const editableHandleClass = '!h-3 !w-3 !border-2 !border-white !bg-amber-700'
const readonlyHandleClass = '!h-2 !w-2 !border-0 !opacity-0'
const emptyActiveKeys: string[] = []

function TreeNodeCard({ data, selected }: NodeProps<TreeFlowNode>) {
  const { node, isEn, active, editable, onDeleteNode, onResizeNode } = data
  const { t } = useTranslation(undefined, { lng: isEn ? 'en' : 'ko' })
  const title = isEn ? node.titleEn || node.titleKo : node.titleKo
  const description = isEn ? node.descriptionEn || node.descriptionKo : node.descriptionKo
  const whisky = node.whisky
  const image = node.imageHidden ? null : whisky?.imageOverrideUrl || node.imageUrl || whisky?.imageUrl
  const handleClass = editable ? editableHandleClass : readonlyHandleClass

  return (
    <article className={`group relative h-full w-full min-h-[128px] overflow-visible rounded-[6px] border bg-white shadow-[0_10px_28px_rgba(70,45,25,0.09)] transition-colors ${
      active ? 'border-amber-600 ring-4 ring-amber-100' : selected ? 'border-stone-800 ring-2 ring-stone-200' : 'border-stone-200'
    }`}>
      <NodeResizer
        isVisible={editable && selected}
        color="#b45309"
        minWidth={180}
        minHeight={image ? 320 : 128}
        maxWidth={420}
        maxHeight={760}
        keepAspectRatio
        handleClassName="!h-3 !w-3 !rounded-[2px] !border-2 !border-white !bg-amber-700"
        lineClassName="!border-amber-700"
        onResizeEnd={(_, params: ResizeParams) => onResizeNode?.(
          node.key,
          Math.round(params.x),
          Math.round(params.y),
          Math.round(params.width),
          Math.round(params.height),
        )}
      />
      {node.type !== 'START' && <Handle id="point-top" type="source" position={Position.Top} isConnectable={editable} className={handleClass} />}
      <Handle id="point-left" type="source" position={Position.Left} isConnectable={editable} className={handleClass} />
      <Handle id="point-right" type="source" position={Position.Right} isConnectable={editable} className={handleClass} />
      <Handle id="point-bottom" type="source" position={Position.Bottom} isConnectable={editable} className={handleClass} />

      {node.type !== 'WHISKY' && <span className={`absolute left-2.5 top-2.5 z-10 inline-flex rounded-[3px] px-1.5 py-0.5 text-[8px] font-black tracking-wide ${
        node.type === 'START' ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
      }`}>{t(`tasteTree.nodeTypes.${node.type}`)}</span>}

      {image && (
        <div className="aspect-[3/4] w-full overflow-hidden rounded-t-[5px] bg-[#f3efea]">
          <img src={image} alt="" className="mx-auto h-full w-auto max-w-none" />
        </div>
      )}
      <div className={`flex flex-col items-center justify-center p-4 text-center ${image ? 'min-h-[84px]' : 'min-h-[128px] pt-9'}`}>
        <h3 className="line-clamp-2 w-full text-center text-sm font-black leading-5 text-stone-950">{title}</h3>
        {description && <p className="mt-2 line-clamp-2 w-full whitespace-pre-line break-keep text-center text-[11px] font-semibold leading-4 text-stone-500">{description}</p>}
        {(whisky?.priceText || whisky?.priceAmount != null) && (
          <p className="mt-2 text-[11px] font-bold text-amber-800">
            {whisky.priceText || `${new Intl.NumberFormat(isEn ? 'en-US' : 'ko-KR').format(whisky.priceAmount!)} ${whisky.currencyCode || 'KRW'}`}
          </p>
        )}
      </div>

      {editable && node.type !== 'START' && (
        <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteNode?.(node.key) }}
          className="nodrag absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-[5px] border border-red-200 bg-white text-base font-black text-red-600 shadow-md hover:bg-red-50" aria-label={t('tasteTree.builder.deleteNode')}>−</button>
      )}
    </article>
  )
}

const nodeTypes = { 'taste-tree': TreeNodeCard }
const edgeTypes = { 'taste-tree-edge': MovableTasteTreeEdge }

function inferSourceHandle(edge: TasteTreeEdge, nodes: Map<string, TasteTreeNode>): TasteTreeSourceHandle {
  if (edge.sourceHandle?.startsWith('point-')) return edge.sourceHandle as TasteTreeSourceHandle
  if (edge.sourceHandle === 'source-left') return 'point-left'
  if (edge.sourceHandle === 'source-right') return 'point-right'
  if (edge.sourceHandle === 'source-bottom') return 'point-bottom'
  const source = nodes.get(edge.sourceNodeKey)
  const target = nodes.get(edge.targetNodeKey)
  if (!source || !target) return 'point-bottom'
  const xDifference = target.positionX - source.positionX
  const yDifference = target.positionY - source.positionY
  if (Math.abs(xDifference) > Math.abs(yDifference) * 0.65) return xDifference < 0 ? 'point-left' : 'point-right'
  return yDifference < 0 ? 'point-top' : 'point-bottom'
}

function normalizeTargetHandle(value?: string | null): TasteTreeTargetHandle {
  if (value?.startsWith('point-')) return value as TasteTreeTargetHandle
  if (value === 'target-left') return 'point-left'
  if (value === 'target-right') return 'point-right'
  return 'point-top'
}

function StraightArrowConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  return <g>
    <defs><marker id="taste-tree-drag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#92400e" /></marker></defs>
    <path d={`M ${fromX},${fromY} L ${toX},${toY}`} fill="none" stroke="#92400e" strokeWidth="2.5" markerEnd="url(#taste-tree-drag-arrow)" />
  </g>
}

export default function TasteTreeGraph({
  content,
  activeNodeKeys = emptyActiveKeys,
  activeEdgeKeys = emptyActiveKeys,
  compact = false,
  editable = false,
  language,
  selectedNodeKey,
  selectedEdgeKey,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onMoveNode,
  onResizeNode,
  onDeleteNode,
  onConnect,
  onReconnectEdge,
  onDeleteEdge,
  onUpdateEdge,
}: TasteTreeGraphProps) {
  const { t, i18n } = useTranslation()
  const isEn = language ? language === 'en' : i18n.language === 'en'
  const activeNodes = useMemo(() => new Set(activeNodeKeys), [activeNodeKeys])
  const activeEdges = useMemo(() => new Set(activeEdgeKeys), [activeEdgeKeys])
  const contentNodeMap = useMemo(() => new Map(content.nodes.map((node) => [node.key, node])), [content.nodes])

  const calculatedNodes = useMemo<TreeFlowNode[]>(() => content.nodes.map((node, index) => ({
    id: node.key,
    type: 'taste-tree',
    position: { x: node.positionX ?? 80 + (index % 4) * 280, y: node.positionY ?? 50 + Math.floor(index / 4) * 250 },
    data: { node, isEn, active: activeNodes.has(node.key), editable, onDeleteNode, onResizeNode },
    style: {
      width: node.width ?? 220,
      ...(node.height != null ? { height: node.height } : {}),
    },
    selected: selectedNodeKey === node.key,
    draggable: editable,
    connectable: editable,
  })), [activeNodes, content.nodes, editable, isEn, onDeleteNode, onResizeNode, selectedNodeKey])
  const [nodes, setNodes, onNodesChange] = useNodesState<TreeFlowNode>(calculatedNodes)

  useEffect(() => {
    setNodes(calculatedNodes)
  }, [calculatedNodes, setNodes])

  const edges = useMemo<TasteTreeFlowEdge[]>(() => content.edges.map((edge) => {
    const active = activeEdges.has(edge.key)
    const selected = selectedEdgeKey === edge.key
    const color = active ? '#b45309' : selected ? '#292524' : '#b9a99b'
    return {
      id: edge.key,
      source: edge.sourceNodeKey,
      target: edge.targetNodeKey,
      sourceHandle: inferSourceHandle(edge, contentNodeMap),
      targetHandle: normalizeTargetHandle(edge.targetHandle),
      type: 'taste-tree-edge',
      animated: editable && active,
      selected,
      reconnectable: editable && selected,
      selectable: editable,
      interactionWidth: 24,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: { stroke: color, strokeWidth: active || selected ? 4 : 2 },
      deletable: editable,
      data: {
        edge,
        label: isEn ? edge.labelEn || edge.labelKo : edge.labelKo,
        editable,
        active,
        labelMoveAria: t('tasteTree.builder.edgeLabelMove', { lng: isEn ? 'en' : 'ko' }),
        onSelectEdge: onEdgeClick,
        onUpdateEdge,
      },
    }
  }), [activeEdges, content.edges, contentNodeMap, editable, isEn, onEdgeClick, onUpdateEdge, selectedEdgeKey, t])

  const connect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    onConnect?.(
      connection.source,
      connection.target,
      (connection.sourceHandle ?? undefined) as TasteTreeSourceHandle | undefined,
      (connection.targetHandle ?? undefined) as TasteTreeTargetHandle | undefined,
    )
  }, [onConnect])

  return (
    <div className={`taste-tree-graph overflow-hidden rounded-[8px] border border-stone-200 bg-[#eeeae5] shadow-inner ${compact ? 'h-[420px]' : editable ? 'h-[720px]' : 'h-[620px]'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.18}
        maxZoom={1.8}
        nodesDraggable={editable}
        nodesConnectable={editable}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Straight}
        connectionLineComponent={StraightArrowConnectionLine}
        edgesReconnectable={editable}
        elementsSelectable={editable || Boolean(onNodeClick)}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onEdgeClick={(_, edge) => onEdgeClick?.(edge.id)}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) => onMoveNode?.(node.id, Math.round(node.position.x), Math.round(node.position.y))}
        onConnect={connect}
        onReconnect={(edge, connection) => {
          if (!connection.source || !connection.target) return
          onReconnectEdge?.(
            edge.id,
            connection.source,
            connection.target,
            (connection.sourceHandle ?? undefined) as TasteTreeSourceHandle | undefined,
            (connection.targetHandle ?? undefined) as TasteTreeTargetHandle | undefined,
          )
        }}
        onEdgesDelete={(deleted) => deleted.forEach((edge) => onDeleteEdge?.(edge.id))}
        deleteKeyCode={editable ? ['Backspace', 'Delete'] : null}
        reconnectRadius={18}
        elevateEdgesOnSelect
        colorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d8cec5" gap={28} size={1} />
        <Controls showInteractive={false} className="!overflow-hidden !rounded-[6px] !border-stone-200 !bg-white !shadow-lg" />
      </ReactFlow>
    </div>
  )
}
