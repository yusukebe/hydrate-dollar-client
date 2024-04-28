import { PropsWithChildren, useState } from 'react'

export function Counter(props: PropsWithChildren<{ initial: number }>) {
  const [count, setCount] = useState(props.initial ?? 0)
  return (
    <>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </>
  )
}
