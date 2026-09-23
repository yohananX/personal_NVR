export default function Home() {
  return(
    <main className="min-h-screen big-zinc-950 text-white">
      <header className= "border-b border-zinc-800 px-6 py-4">
        <h1 className = "text-xl font-semibold">SECURITY NVR</h1>
        <p className = "text-sm text-zinc-400">Local CCTV Monitoring System</p>
      </header>
    <section className = "p-6">
      <h2 className="mb-4 text-lg font-medium">Dashboard</h2>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-zinc-400">No camera feeds configured yet.</p>
      </div>
    </section>
    </main>
  )
}