const { test, expect } = require('@playwright/test')
const sendEmail = require('../utils/email')

test('Scheduled execution test', async ({ page }) => {
  const startTime = new Date().toISOString()

  console.log(`TEST STARTED AT: ${startTime}`)

  await page.goto('https://example.com')

  await expect(page).toHaveTitle('Example Domain')

  await sendEmail(
    'Playwright Test',
    'Your automated test has completed successfully!',
  )

  console.log('TEST COMPLETED SUCCESSFULLY')
})

