/**
 * 注入脚本统一入口
 *
 * 编译目标：resources/injected.bundle.js（IIFE 格式）
 * 注入方式：preload-browser.ts 通过 script 标签注入
 *
 * 根据当前页面路径启动对应处理器：
 *   /im   → ImRobot（状态机驱动的自动化流程）
 *   /item → ProductCollector（商品信息收集）
 */
import { ImRobot } from './im-robot'
import { ProductCollector } from './product-collector'

const path = window.location.pathname

if (path.startsWith('/im')) {
  const robot = new ImRobot()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => robot.start())
  } else {
    robot.start()
  }
} else if (path.startsWith('/item')) {
  const collector = new ProductCollector()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => collector.start())
  } else {
    collector.start()
  }
}
