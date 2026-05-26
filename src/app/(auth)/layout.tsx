export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Haydee</h1>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
            AI co-pilot for literary translators
          </p>
        </div>
        <div className="bg-white rounded-[8px] border border-[var(--border)] p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
