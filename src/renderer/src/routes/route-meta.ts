import routeMetaListJson from './route-meta.json'

export type RouteIconKey =
  | 'agent'
  | 'conversations'
  | 'documents'
  | 'products'
  | 'qa'
  | 'quickStart'
  | 'settings'

export interface RouteMeta {
  path: string
  title: string
  iconKey: RouteIconKey
  navVisible: boolean
}

const routeMetaList = routeMetaListJson as RouteMeta[]
const routeMetaByPath = new Map(
  routeMetaList.map((routeMeta) => [routeMeta.path, routeMeta] as const)
)

/**
 * 返回渲染进程使用的全部路由元数据。
 */
export function getRouteMetaList(): RouteMeta[] {
  return routeMetaList
}

/**
 * 返回需要出现在侧边栏中的路由元数据。
 */
export function getVisibleRouteMetaList(): RouteMeta[] {
  return routeMetaList.filter((routeMeta) => routeMeta.navVisible)
}

/**
 * 根据路径读取页面标题，供头部标题栏复用。
 */
export function getRouteTitle(pathname: string): string | undefined {
  return routeMetaByPath.get(pathname)?.title
}
