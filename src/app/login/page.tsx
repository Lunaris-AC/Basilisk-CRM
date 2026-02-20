import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
    return (
        <main className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
            {/* Background radial effects for depth (Glassmorphism backdrop) */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen pointer-events-none" />
            <div className="absolute top-[30%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-600/10 blur-[100px] mix-blend-screen pointer-events-none" />

            {/* Auth UI */}
            <div className="relative z-10 w-full flex justify-center px-4">
                <LoginForm />
            </div>
        </main>
    )
}
