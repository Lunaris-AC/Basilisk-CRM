import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { FileCode } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Audit Logs | God Mode',
    description: 'Historique des actions administratives',
}

export default async function AuditLogsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role, support_level').eq('id', user.id).single()

    if ((profile?.role !== 'TECHNICIEN' || profile?.support_level !== 'N4') && profile?.role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const { data: logs, error } = await supabase
        .from('admin_audit_logs')
        .select(`
            *,
            admin:profiles!admin_audit_logs_admin_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto bg-background">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent tracking-tighter flex items-center gap-3">
                        <FileCode className="w-10 h-10 text-primary" />
                        AUDIT LOGS
                    </h1>
                    <p className="text-muted-foreground font-medium italic">Historique de sécurité des actions d'administration.</p>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-2xl shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/[0.02] text-xs text-muted-foreground uppercase tracking-widest border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-black">Date</th>
                                <th className="px-6 py-4 font-black">Admin</th>
                                <th className="px-6 py-4 font-black">Action</th>
                                <th className="px-6 py-4 font-black">Cible</th>
                                <th className="px-6 py-4 font-black">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs?.map((log) => (
                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                                        {new Date(log.created_at).toLocaleString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-medium">
                                            {log.admin?.first_name} {log.admin?.last_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border
                                            ${log.action_type.includes('NUKE') || log.action_type.includes('FORCE') 
                                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' 
                                                : 'bg-primary/20 text-primary/80 border-primary/50'}`}>
                                            {log.action_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {log.entity_type} <span className="text-muted-foreground text-xs">{log.entity_id ? `(${log.entity_id.substring(0, 8)}...)` : ''}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs font-mono text-muted-foreground">
                                            {log.new_data ? JSON.stringify(log.new_data) : '-'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!logs || logs.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Aucun log d'audit trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
