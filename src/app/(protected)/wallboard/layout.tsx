// ============================================================
// SPRINT 51 : Wallboard Layout — Vierge (pas de sidebar/topbar)
// Ce layout est imbriqué dans le (protected) layout mais le
// composant page utilise fixed inset-0 pour s'afficher par
// dessus tout le reste, créant une expérience plein écran.
// ============================================================

export default function WallboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return <>{children}</>
}
