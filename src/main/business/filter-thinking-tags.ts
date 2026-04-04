/** 过滤 AI 回复中的思考标签 <thk>xxx</thk> 和 <think>xxx</think> */
export function filterThinkingTags(text: string): string {
  return text.replace(/<thk>[\s\S]*?<\/thk>/gi, '').replace(/<think>[\s\S]*?<\/think>/gi, '')
}
