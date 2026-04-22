type InputEvent =
  | { type: 'mouseMove'; x: number; y: number }
  | { type: 'mouseDown' | 'mouseUp'; x: number; y: number; button: 'left'; clickCount: 1 }
  | { type: 'keyDown' | 'keyUp'; keyCode: 'Backspace' | 'Return' }

export interface AutomationWebContents {
  sendInputEvent(event: InputEvent): void
  insertText(text: string): void
}

interface Point {
  x: number
  y: number
}

interface BrowserAutomationDependencies {
  sleep(ms: number): Promise<void>
  random(): number
}

const commonChars =
  '的一是了我不人在他有这个上们来到时大地为子中你说生国年着就那和要她出也得里后自以会家可下而过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情己面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感见明问力理尔点文几定本公特做外孩相西果走将月十实向声车全信重三机工物气每并别真打太新比才便夫再书部水像眼少家经'

function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export class BrowserAutomationService {
  private readonly sleep: BrowserAutomationDependencies['sleep']
  private readonly random: BrowserAutomationDependencies['random']

  constructor(
    private readonly webContents: AutomationWebContents,
    dependencies: Partial<BrowserAutomationDependencies> = {}
  ) {
    this.sleep = dependencies.sleep ?? defaultSleep
    this.random = dependencies.random ?? Math.random
  }

  async click(point: Point): Promise<void> {
    await this.simulateMouseMove(point)
    await this.sleep(this.randomBetween(100, 300))

    this.webContents.sendInputEvent({
      type: 'mouseDown',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1
    })

    await this.sleep(this.randomBetween(50, 150))

    this.webContents.sendInputEvent({
      type: 'mouseUp',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1
    })
  }

  async typeChinese(text: string): Promise<void> {
    await this.sleep(this.randomBetween(200, 500))

    const words = this.splitIntoChineseWords(text)
    for (const [index, word] of words.entries()) {
      if (index > 0 && this.random() < 0.1) {
        await this.simulateChineseTypo(word)
        continue
      }

      this.webContents.insertText(word)
      await this.sleep(this.randomBetween(100, 300))
    }
  }

  async pressEnter(point: Point): Promise<void> {
    await this.sleep(this.randomBetween(100, 200))
    this.webContents.sendInputEvent({
      type: 'mouseMove',
      x: Math.round(point.x),
      y: Math.round(point.y)
    })
    await this.sleep(this.randomBetween(50, 100))
    this.webContents.sendInputEvent({
      type: 'mouseDown',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1
    })
    await this.sleep(this.randomBetween(50, 100))
    this.webContents.sendInputEvent({
      type: 'mouseUp',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1
    })

    await this.sleep(this.randomBetween(150, 300))
    this.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' })
    await this.sleep(this.randomBetween(30, 60))
    this.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' })
  }

  private async simulateMouseMove(target: Point): Promise<void> {
    let currentX = Math.max(0, target.x - 100)
    let currentY = Math.max(0, target.y - 100)
    const steps = 10 + Math.floor(this.random() * 20)
    const deltaX = (target.x - currentX) / steps
    const deltaY = (target.y - currentY) / steps

    for (let step = 0; step < steps; step++) {
      currentX += deltaX
      currentY += deltaY
      this.webContents.sendInputEvent({
        type: 'mouseMove',
        x: Math.round(currentX),
        y: Math.round(currentY)
      })
      await this.sleep(this.randomBetween(10, 30))
    }
  }

  private splitIntoChineseWords(text: string): string[] {
    const words: string[] = []
    let index = 0

    while (index < text.length) {
      const wordLength = 2 + Math.floor(this.random() * 3)
      words.push(text.slice(index, index + wordLength))
      index += wordLength
    }

    return words
  }

  private async simulateChineseTypo(correctWord: string): Promise<void> {
    let typoWord = ''
    for (let index = 0; index < correctWord.length; index++) {
      const charIndex = Math.floor(this.random() * commonChars.length)
      typoWord += commonChars[charIndex]
    }

    this.webContents.insertText(typoWord)
    await this.sleep(this.randomBetween(200, 500))

    for (let index = 0; index < typoWord.length; index++) {
      this.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' })
      await this.sleep(this.randomBetween(20, 50))
      this.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' })
      await this.sleep(this.randomBetween(10, 30))
    }

    await this.sleep(this.randomBetween(150, 400))
    this.webContents.insertText(correctWord)
  }

  private randomBetween(min: number, max: number): number {
    return min + this.random() * (max - min)
  }
}
