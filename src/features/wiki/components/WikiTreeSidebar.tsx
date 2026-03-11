'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, Plus, FileText, Clock, Eye, FolderOpen, Search } from 'lucide-react'
import { useWikiTree, useCreateWikiDocument } from '@/features/wiki/api/useWiki'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface WikiTreeSidebarProps {
    selectedId: string | null
    onSelect: (id: string) => void
    userRole: string
    showPending: boolean
    onTogglePending: () => void
    isReviewer: boolean
}

interface TreeNode {
    id: string
    parent_id: string | null
    title: string
    icon: string
    status: string
    author_id: string
    position: number
    updated_at: string
    children: TreeNode[]
}

function buildTree(items: any[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    for (const item of items) {
        map.set(item.id, { ...item, children: [] })
    }

    for (const item of items) {
        const node = map.get(item.id)!
        if (item.parent_id && map.has(item.parent_id)) {
            map.get(item.parent_id)!.children.push(node)
        } else {
            roots.push(node)
        }
    }

    // Sort by position
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => a.position - b.position)
        nodes.forEach(n => sortNodes(n.children))
    }
    sortNodes(roots)

    return roots
}

export function WikiTreeSidebar({
    selectedId,
    onSelect,
    userRole,
    showPending,
    onTogglePending,
    isReviewer,
}: WikiTreeSidebarProps) {
    const { data: rawDocs, isLoading } = useWikiTree()
    const createDoc = useCreateWikiDocument()
    const [search, setSearch] = useState('')

    const tree = useMemo(() => {
        if (!rawDocs) return []
        return buildTree(rawDocs)
    }, [rawDocs])

    const filteredTree = useMemo(() => {
        if (!search.trim()) return tree
        const term = search.toLowerCase()

        function filterNode(node: TreeNode): TreeNode | null {
            const childMatches = node.children.map(filterNode).filter(Boolean) as TreeNode[]
            if (node.title.toLowerCase().includes(term) || childMatches.length > 0) {
                return { ...node, children: childMatches }
            }
            return null
        }

        return tree.map(filterNode).filter(Boolean) as TreeNode[]
    }, [tree, search])

    async function handleCreate(parentId?: string | null) {
        try {
            const result = await createDoc.mutateAsync({ parentId })
            onSelect(result.id)
            toast.success('Brouillon créé')
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    return (
        <div className="w-72 h-full flex flex-col border-r border-white/10 bg-black/20 backdrop-blur-sm shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold tracking-wide text-foreground/80 uppercase">Wiki</h2>
                    <button
                        onClick={() => handleCreate(null)}
                        disabled={createDoc.isPending}
                        className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                        title="Nouvelle page"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                </div>

                {/* Pending toggle */}
                {isReviewer && (
                    <button
                        onClick={onTogglePending}
                        className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            showPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        En attente de validation
                    </button>
                )}
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                        Chargement...
                    </div>
                ) : filteredTree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs space-y-2">
                        <FileText className="w-8 h-8 opacity-30" />
                        <span>Aucune page</span>
                    </div>
                ) : (
                    filteredTree.map(node => (
                        <TreeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onCreate={handleCreate}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// Recursive TreeItem
// ═══════════════════════════════════════════════════════════════

function TreeItem({
    node,
    depth,
    selectedId,
    onSelect,
    onCreate,
}: {
    node: TreeNode
    depth: number
    selectedId: string | null
    onSelect: (id: string) => void
    onCreate: (parentId: string) => void
}) {
    const [expanded, setExpanded] = useState(depth < 2)
    const hasChildren = node.children.length > 0
    const isSelected = selectedId === node.id
    const isDraft = node.status === 'DRAFT'
    const isPending = node.status === 'PENDING'

    return (
        <div>
            <div
                className={cn(
                    'group flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 text-sm',
                    isSelected
                        ? 'bg-white/10 text-foreground ring-1 ring-white/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => onSelect(node.id)}
            >
                {/* Expand toggle */}
                <button
                    className={cn(
                        'p-0.5 rounded transition-transform shrink-0',
                        !hasChildren && 'invisible'
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(!expanded)
                    }}
                >
                    <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')} />
                </button>

                {/* Icon */}
                <span className="text-base shrink-0">{node.icon}</span>

                {/* Title */}
                <span className="truncate flex-1 text-xs font-medium">{node.title}</span>

                {/* Status badges */}
                {isDraft && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        DRAFT
                    </span>
                )}
                {isPending && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PENDING
                    </span>
                )}

                {/* Add child button */}
                <button
                    className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                    onClick={(e) => {
                        e.stopPropagation()
                        onCreate(node.id)
                    }}
                    title="Ajouter une sous-page"
                >
                    <Plus className="w-3 h-3" />
                </button>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onCreate={onCreate}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
