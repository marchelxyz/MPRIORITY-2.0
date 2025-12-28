import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MPRIORITY 2.0 - Метод анализа иерархий',
  description: 'Веб-версия программы для поддержки принятия решений на основе метода анализа иерархий (МАИ/AHP)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  )
}
