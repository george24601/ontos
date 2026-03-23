import { APIRequestContext, Page } from '@playwright/test'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function loadDemoData(request: APIRequestContext) {
  const resp = await request.post(`${BACKEND_URL}/api/settings/demo-data/load`)
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`Failed to load demo data (${resp.status()}): ${body}`)
  }
  return resp.json()
}

export async function clearDemoData(request: APIRequestContext) {
  const resp = await request.delete(`${BACKEND_URL}/api/settings/demo-data`)
  if (!resp.ok()) {
    const body = await resp.text()
    throw new Error(`Failed to clear demo data (${resp.status()}): ${body}`)
  }
  return resp.json()
}

/**
 * Dismiss the copilot side-panel that opens by default for first-time visitors.
 * Playwright starts with clean localStorage, so the panel always appears and
 * intercepts clicks on the main content area. Setting the visited key prevents it.
 * Must be called before `page.goto()` in each test, or once in beforeEach.
 */
export async function dismissCopilot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('copilot-sidebar-visited', 'true')
  })
}
