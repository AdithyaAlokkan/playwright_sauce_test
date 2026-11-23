const LOGIN_URL = 'https://pdcb.waseef.qa/Login'

async function openBookingSignIn(page, waitAfterAction = async () => {}) {
  await page.context().clearCookies()
  await waitAfterAction()
  await page.goto(LOGIN_URL)
  await waitAfterAction()
  await page.locator('#txtQatarID').waitFor({ state: 'visible' })
}

module.exports = openBookingSignIn
