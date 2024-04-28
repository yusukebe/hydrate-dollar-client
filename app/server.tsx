import { Hono } from 'hono'
import { renderer } from './renderer'
import Badge from './components/Badge'
// You can import a named exported component
import { Counter } from './components/Counter'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(
    <>
      <Counter $client initial={3} />
      <hr />
      <Badge $client name="parent">
        <Badge name="child" />
      </Badge>
      <hr />
      <Badge $client name="Hono">
        {/* not working */}
        <Counter initial={5} />
      </Badge>
    </>
  )
})

export default app
