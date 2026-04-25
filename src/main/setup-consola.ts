/**
 * consola reporter 初始化
 *
 * 必须在所有使用 consola.withTag() 的模块之前执行，
 * 否则 withTag 创建的实例不会继承此 reporter。
 */
import { consola } from 'consola'
import { logCollector } from './log'

consola.addReporter({
  log: (logObj) => logCollector.report(logObj)
})
