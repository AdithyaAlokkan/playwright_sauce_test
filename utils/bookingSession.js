const LOGIN_URL = 'https://pdcb.waseef.qa/Login'

async function openBookingSignIn(page) {
  await page.context().clearCookies()
  await page.goto(LOGIN_URL)
  await page.locator('#txtQatarID').waitFor({ state: 'visible' })
}

module.exports = openBookingSignIn
