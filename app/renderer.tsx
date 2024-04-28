import { reactRenderer } from '@hono/react-renderer'

export const renderer = reactRenderer(({ children }) => {
  return (
    <html>
      <head>
        <script src="/app/client.ts" type="module"></script>
      </head>
      <body>{children}</body>
    </html>
  )
})
