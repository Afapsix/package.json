export const metadata = {
  title: 'CardAI — Генератор карточек для WB и Ozon',
  description: 'AI-инструмент для создания продающих карточек товаров',
}
export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, padding: 0, background: '#0d0d14' }}>
        {children}
      </body>
    </html>
  )
}
