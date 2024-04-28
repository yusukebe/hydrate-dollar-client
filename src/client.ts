import { hydrateRoot } from 'react-dom/client'
import { createElement } from 'react'
import { COMPONENT_NAME, COMPONENT_EXPORT_NAME, DATA_SERIALIZED_PROPS, DATA_HONO_TEMPLATE } from './constants'

type CreateChildren = (childNodes: NodeListOf<ChildNode>) => Node[] | Promise<Node[]>
type HydrateComponent = (doc: { querySelectorAll: typeof document.querySelectorAll }) => Promise<void>

const createChildren = async (childNodes: NodeListOf<ChildNode>) => {
  const create = (childNodes: NodeListOf<ChildNode>): ReturnType<CreateChildren> => {
    const children = []
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i] as HTMLElement
      if (child.nodeType === 8) {
        // skip comments
        continue
      } else if (child.nodeType === 3) {
        // text node
        children.push(child.textContent)
      } else {
        children.push(
          createElement(child.nodeName.toLowerCase(), {
            children: create(child.childNodes)
          })
        )
      }
    }
    return children as any
  }
  const result = create(childNodes)
  return result
}

export const createClient = async () => {
  const FILES = import.meta.glob('/**/[a-zA-Z0-9[-]+.(tsx|ts)')

  const hydrateComponent: HydrateComponent = async (document) => {
    const filePromises = Object.keys(FILES).map(async (filePath) => {
      const componentName = filePath
      const elements = document.querySelectorAll(`[${COMPONENT_NAME}="${componentName}"]:not([data-hono-hydrated])`)
      if (elements) {
        const elementPromises = Array.from(elements).map(async (element) => {
          element.setAttribute('data-hono-hydrated', 'true') // mark as hydrated

          const fileCallback = FILES[filePath]
          const file = await fileCallback()

          const exportedName = element.attributes.getNamedItem(COMPONENT_EXPORT_NAME)?.value
          // specify the exported name
          const Component = await file[exportedName ?? 'default']

          const serializedProps = element.attributes.getNamedItem(DATA_SERIALIZED_PROPS)?.value
          const props = JSON.parse(serializedProps ?? '{}') as Record<string, unknown>

          const maybeTemplate = element.childNodes[element.childNodes.length - 1]
          if (
            maybeTemplate?.nodeName === 'TEMPLATE' &&
            (maybeTemplate as HTMLElement)?.attributes.getNamedItem(DATA_HONO_TEMPLATE) !== null
          ) {
            props.children = await createChildren((maybeTemplate as HTMLTemplateElement).content.childNodes)
          }
          const newElem = createElement(Component, props)
          hydrateRoot(element, newElem)
        })
        await Promise.all(elementPromises)
      }
    })
    await Promise.all(filePromises)
  }
  await hydrateComponent(document)
}
