import type { ComponentType } from 'react'
import { AgentConfigPage } from '../pages/AgentConfigPage'
import { ConfigsPage } from '../pages/ConfigsPage'
import { ConversationsPage } from '../pages/ConversationsPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { LogsPage } from '../pages/LogsPage'
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
  '/q-and-a': QAndAPage,
  '/logs': LogsPage
}

/**
 * 根据路径返回对应页面组件。
 */
export function getRouteComponent(pathname: string): ComponentType | null {
  return routeComponentMap[pathname] ?? null
}
