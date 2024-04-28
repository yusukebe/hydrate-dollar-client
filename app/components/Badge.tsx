import { PropsWithChildren } from 'react'

export default function Badge({ name, children }: PropsWithChildren<{ name: string }>) {
  return (
    <div>
      <p>Hey {name}</p>
      {children}
    </div>
  )
}
