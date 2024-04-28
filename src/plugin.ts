import { Plugin } from 'vite'
import path from 'path'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const traverse = (_traverse.default as typeof _traverse) ?? _traverse
import _generate from '@babel/generator'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const generate = (_generate.default as typeof _generate) ?? _generate
import {
  jsxAttribute,
  jsxClosingElement,
  jsxElement,
  jsxIdentifier,
  jsxOpeningElement,
  stringLiteral,
  jsxExpressionContainer,
  isJSXAttribute
} from '@babel/types'
import { COMPONENT_NAME, COMPONENT_EXPORT_NAME, DATA_SERIALIZED_PROPS, DATA_HONO_TEMPLATE } from './constants'

const islandComponentPlugin = (): Plugin => {
  return {
    name: 'island-component-plugin',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.tsx')) {
        return null
      }

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      })

      const files = {}
      const imports = {}

      const resolutions = await Promise.all(
        ast.program.body
          .filter((node) => node.type === 'ImportDeclaration')
          .map(async (node) => {
            const sourcePath = node.source.value
            const resolution = await this.resolve(sourcePath, id)
            const relativePath = path.relative(process.cwd(), resolution.id)
            return { sourcePath, resolution: `/${relativePath}` }
          })
      )

      resolutions.forEach(({ sourcePath, resolution }) => {
        if (resolution.endsWith('.tsx')) {
          files[`${id}-${sourcePath}`] = resolution
        }
      })

      traverse(ast, {
        ImportDeclaration(path) {
          const sourcePath = path.node.source.value
          path.node.specifiers.forEach((specifier) => {
            const localName = specifier.local.name
            const importedType = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name
            const key = `${id}-${localName}`
            imports[key] = { sourcePath, importedType, componentName: localName }
          })
        },
        JSXElement(path) {
          const openingElement = path.node.openingElement
          const componentName = openingElement.name.name
          const clientAttr = openingElement.attributes.find(
            (attr) => isJSXAttribute(attr) && attr.name.name === '$client'
          )
          if (clientAttr) {
            const key = `${id}-${componentName}`
            if (imports[key]) {
              const { sourcePath, importedType } = imports[key]
              const fullpath = files[`${id}-${sourcePath}`]
              console.log(`Component: ${componentName} is imported from ${fullpath} as ${importedType}`)

              const props = {}
              openingElement.attributes.forEach((attr) => {
                if (!isJSXAttribute(attr) || attr.name.name === '$client') return
                const attrName = attr.name.name
                const attrValue = attr.value.value || attr.value.expression.value
                props[attrName] = attrValue
              })

              const islandOpening = jsxOpeningElement(
                jsxIdentifier('honox-island'),
                [
                  jsxAttribute(jsxIdentifier(COMPONENT_NAME), stringLiteral(fullpath)),
                  jsxAttribute(jsxIdentifier(COMPONENT_EXPORT_NAME), stringLiteral(importedType)),
                  jsxAttribute(
                    jsxIdentifier(DATA_SERIALIZED_PROPS),
                    jsxExpressionContainer(stringLiteral(JSON.stringify(props)))
                  )
                ],
                false
              )
              const islandClosing = jsxClosingElement(jsxIdentifier('honox-island'))

              const templateElement = jsxElement(
                jsxOpeningElement(
                  jsxIdentifier('template'),
                  [jsxAttribute(jsxIdentifier(DATA_HONO_TEMPLATE), stringLiteral(''))],
                  false
                ),
                jsxClosingElement(jsxIdentifier('template')),
                path.node.children
              )

              const islandElement = jsxElement(islandOpening, islandClosing, [path.node, templateElement], false)
              path.replaceWith(islandElement)
              path.skip()
            }
          }
        }
      })
      return generate(ast)
    }
  }
}

export default islandComponentPlugin
