import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { readdirSync } from 'node:fs'

async function choose(page: Page, name: string | RegExp) {
  await page.getByRole('region', { name: 'Current diagnostic question' }).getByRole('button', { name }).click()
}
async function startIntake(page: Page) {
  await choose(page, 'No signs of heat or burning')
  await choose(page, 'Yes, a 1967 Mercury Cougar')
  await choose(page, 'Standard Cougar')
}
async function workbench(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Diagram & sources', exact: true }).click()
}
async function guide(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Diagnostic guide', exact: true }).click()
}
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error })
  page.on('request', request => {
    if (/^https?:/.test(request.url())) expect(new URL(request.url()).origin).toBe('http://127.0.0.1:4174')
    expect(request.method()).toBe('GET')
  })
  await page.goto('/')
})

test('source browsing, search, focus, panel controls and no invented image', async ({ page, isMobile }) => {
  await workbench(page, isMobile)
  await expect(page.getByRole('heading', { name: 'A clearer place to start.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search components and pages' }).fill('motor')
  await page.getByRole('button', { name: /Sequential turn signal motor/ }).click()
  await expect(page.getByRole('region', { name: 'Selected component detail' })).toContainText('No sequence timing')
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await expect(page.locator('.map-node.dimmed')).toHaveCount(9)
  await page.getByRole('button', { name: 'Original source', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bring the original into view.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Manual pages', exact: true }).click()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await page.getByRole('button', { name: /Exterior lights Scan 5.jpeg/ }).click()
  await expect(page.locator('.source-label')).toContainText('Physical location')
  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await page.getByRole('button', { name: 'Show navigation' }).click()
  if (!isMobile) {
    await page.getByRole('button', { name: 'Hide guide', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Diagnostic guide' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Show guide', exact: true }).click()
  }
})

test('full unknown-mechanism case, notes, edit invalidation and reload', async ({ page, isMobile }) => {
  await startIntake(page)
  await choose(page, 'Unknown / not inspected')
  await choose(page, 'Both sides')
  await choose(page, 'Flashes')
  await choose(page, 'Flashes')
  await choose(page, 'Only some lamps light')
  await choose(page, 'Two lamps light')
  await choose(page, 'No lamps light')
  await choose(page, 'Only some brake lamps light')
  await choose(page, 'All front and rear signal lamps flash')
  await choose(page, 'Nothing yet')
  await expect(page.getByRole('heading', { name: 'Your next step, not a parts guess.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Installed mechanism is unknown' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brake-light failure also reported' })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open field notes', exact: true }).click()
  else await page.getByRole('button', { name: /Field notes & recheck/ }).click()
  await page.getByRole('textbox', { name: 'Note', exact: true }).fill('<img src=x onerror=alert(1)> Left rear: two lamps, observed while parked.')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await expect(page.locator('.saved-note')).toContainText('<img src=x onerror=alert(1)>')
  await expect(page.locator('.saved-note img')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Recheck Left front and all left rear turn lamps' }).selectOption('pass')
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your next step, not a parts guess.' })).toBeVisible()
  await page.getByRole('button', { name: 'Answer history' }).click()
  await page.getByRole('button', { name: /Which turn signal is giving you trouble/ }).click()
  await choose(page, 'Left side')
  await expect(page.getByRole('heading', { name: 'With LEFT selected, what does the left front lamp do?' })).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('thundermender.cases.v1')!))
  expect(saved.cases[0].answers.rearLeft).toBeUndefined()
  expect(saved.cases[0].verification).toEqual({})
  expect(saved.cases[0].notes).toHaveLength(1)
})

test('vehicle mismatch and heat stop gate without unsafe tests', async ({ page }) => {
  await choose(page, 'No signs of heat or burning')
  await choose(page, 'No, a different year or model')
  await expect(page.getByRole('heading', { name: 'We need the right vehicle evidence.' })).toBeVisible()
  await page.getByRole('button', { name: 'Report heat / smoke', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Stop here. Establish safety first.' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Current diagnostic question' })).toHaveCount(0)
})

test('export/import handoff creates independent copies and rejects malformed files', async ({ page }) => {
  await startIntake(page)
  await page.getByRole('button', { name: 'My cases', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export current case', exact: true }).click()
  const download = await downloadPromise
  const file = await download.path()
  expect(file).not.toBeNull()
  await page.getByTestId('case-file').setInputFiles(file!)
  await expect(page.getByRole('status')).toContainText('Imported as a new local copy')
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('thundermender.cases.v1')!))
  expect(store.cases).toHaveLength(2)
  expect(store.cases[0].id).not.toBe(store.cases[1].id)
  await page.getByTestId('case-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999}') })
  await expect(page.getByRole('alert')).toContainText('Invalid case data')
})

test('unmatched images remain browsable without incorrect source overlays', async ({ page, isMobile }) => {
  await workbench(page, isMobile)
  await page.getByRole('button', { name: 'Manual library', exact: false }).click()
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 100; canvas.height = 100
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 100, 100)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByTestId('manual-files').setInputFiles({ name: 'Scan 6.jpeg', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await expect(page.getByRole('status')).toContainText('0 source matches, 1 unmatched')
  await page.getByRole('heading', { name: 'Unmatched local images' }).locator('..').getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.locator('.source-stage img')).toBeVisible()
  await expect(page.locator('.source-region')).toHaveCount(0)
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(page.getByLabel('Diagram zoom', { exact: true })).toHaveText('135%')
  await page.getByRole('button', { name: 'Reset diagram view', exact: true }).click()
  await expect(page.getByLabel('Diagram zoom', { exact: true })).toHaveText('100%')
  await page.getByRole('button', { name: 'Manual library', exact: false }).click()
  await page.getByRole('button', { name: 'Remove Scan 6.jpeg', exact: true }).click()
  await page.getByRole('button', { name: 'Remove local copy', exact: true }).click()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bring the original into view.' })).toBeVisible()
})

test('layout has no horizontal overflow and dialogs support keyboard dismissal', async ({ page, isMobile }) => {
  await expect(page.getByRole('heading', { name: 'Any smoke, burning smell, or unusually hot wiring?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (isMobile) await page.screenshot({ path: 'test-results/guide-phone.png', fullPage: true })
  await workbench(page, isMobile)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Privacy, costs and about' }).click()
  await expect(page.getByRole('heading', { name: 'AI status: not connected' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: `test-results/workbench-${isMobile ? 'phone' : 'desktop'}.png`, fullPage: true })
})

test('corrupt saved data is not overwritten', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('thundermender.cases.v1', 'corrupt'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Let’s protect your saved cases.' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('thundermender.cases.v1'))).toBe('corrupt')
})

test('storage quota errors are visible without discarding in-memory answers', async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage quota exceeded', 'QuotaExceededError') }
  })
  await choose(page, 'No signs of heat or burning')
  await expect(page.getByRole('alert')).toContainText('Your changes are in memory only')
  await expect(page.getByRole('heading', { name: 'Are we working on a 1967 Mercury Cougar?' })).toBeVisible()
})

test('actual supplied scans match identity, preserve source links, and reload', async ({ page, isMobile }) => {
  const directory = process.env.THUNDERMENDER_MANUAL_DIR
  test.skip(!directory, 'Optional local-only source validation; set THUNDERMENDER_MANUAL_DIR.')
  await workbench(page, isMobile)
  await page.getByRole('button', { name: 'Manual library', exact: false }).click()
  const images = readdirSync(directory!).filter(name => /\.jpeg$/i.test(name)).map(name => path.join(directory!, name))
  await page.getByTestId('manual-files').setInputFiles(images)
  await expect(page.getByRole('status')).toContainText('13 source matches, 0 unmatched', { timeout: 30000 })
  await page.locator('.library-page').filter({ hasText: 'Exterior lighting, horns & turn signals' }).getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.locator('.source-stage img')).toBeVisible()
  await expect(page.locator('.source-region')).toHaveCount(11)
  await page.getByRole('button', { name: /Locate Sequential turn signal motor:/ }).click()
  await expect(page.getByRole('region', { name: 'Selected component detail' })).toContainText('Sequential turn signal motor')
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await expect(page.locator('.source-dim')).toHaveCount(1)
  await page.screenshot({ path: `test-results/private-source-${isMobile ? 'phone' : 'desktop'}.png`, fullPage: true })
  if (!isMobile) {
    const viewport = page.getByLabel('Manual diagram.', { exact: false })
    const bounds = await viewport.boundingBox()
    const originalLeft = await page.locator('.source-stage').evaluate(node => getComputedStyle(node).left)
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds!.x + bounds!.width / 2 + 60, bounds!.y + bounds!.height / 2, { steps: 6 })
    await page.mouse.up()
    expect(await page.locator('.source-stage').evaluate(node => getComputedStyle(node).left)).not.toBe(originalLeft)
    await viewport.focus()
    await page.keyboard.press('Home')
    await expect(page.getByLabel('Diagram zoom', { exact: true })).toHaveText('100%')
    await page.keyboard.press('+')
    await expect(page.getByLabel('Diagram zoom', { exact: true })).toHaveText('130%')
    const before = await page.locator('.source-stage').evaluate(node => getComputedStyle(node).left)
    await page.keyboard.press('ArrowRight')
    expect(await page.locator('.source-stage').evaluate(node => getComputedStyle(node).left)).not.toBe(before)
  }
  await page.reload()
  await workbench(page, isMobile)
  await page.getByRole('button', { name: 'Original source', exact: true }).click()
  await expect(page.locator('.source-stage img')).toBeVisible()
  await expect(page.locator('.source-region')).toHaveCount(11)
  await guide(page, isMobile)
})
