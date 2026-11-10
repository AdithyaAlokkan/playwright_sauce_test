const { test, expect } = require('@playwright/test')

test('Scheduled execution test', async ({ page }) => {
  const startTime = new Date().toISOString()

  console.log(`TEST STARTED AT: ${startTime}`)

  await page.goto('https://example.com')

  await expect(page).toHaveTitle('Example Domain')

  console.log('TEST COMPLETED SUCCESSFULLY')
})

