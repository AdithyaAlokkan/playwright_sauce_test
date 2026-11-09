import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('https://nologin.in/')
  await page.getByRole('textbox', { name: 'Enter page name' }).click()
  await page
    .getByRole('textbox', { name: 'Enter page name' })
    .fill('playwrighttest')
  await page.getByRole('textbox', { name: 'Enter page name' }).press('Enter')
  await page
    .getByRole('textbox', { name: 'Enter text and hit save button' })
    .click({
      clickCount: 3,
    })
  const currentTime = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  await page
    .getByRole('textbox', { name: 'Enter text and hit save button' })
    .fill(`test executed at ${currentTime}`)
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'close' }).click()
})

