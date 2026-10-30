import { Scorepad } from '@/components/Scorepad'

export default function Home() {
  return (
    <main>
      <header className="text-center">
        <h1 className="wordmark text-4xl sm:text-6xl">WINGSPAN</h1>
      </header>
      <Scorepad />
    </main>
  )
}
