import type { ComponentType } from 'react'
import { AgentConfigPage } from '../pages/AgentConfigPage'
import { ConfigsPage } from '../pages/ConfigsPage'
import { ConversationsPage } from '../pages/ConversationsPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { ProductsPage } from '../pages/ProductsPage'
import { QAndAPage } from '../pages/QAndAPage'
import { QuickStartPage } from '../pages/QuickStartPage'

const routeComponentMap: Record<string, ComponentType> = {
  '/': ConfigsPage,
  '/products': ProductsPage,
  '/agent-config': AgentConfigPage,
  '/conversations': ConversationsPage,
  '/documents': DocumentsPage,
  '/quick-start': QuickStartPage,
  '/q-and-a': QAndAPage
}

/**
 * 根据路径返回对应页面组件。
 */
export function getRouteComponent(pathname: string): ComponentType {
  const routeComponent = routeComponentMap[pathname]

  if (!routeComponent) {
    throw new Error(`未找到路径对应的页面组件: ${pathname}`)
  }

  return routeComponent
}
