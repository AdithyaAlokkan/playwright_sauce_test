const assert = require('node:assert/strict')
const { test } = require('node:test')
const openBookingSignIn = require('./bookingSession')

function createPage() {
  const calls = []

  return {
    calls,
    context() {
      return {
        async clearCookies() {
          calls.push(['clearCookies'])
        },
      }
    },
    async goto(url) {
      calls.push(['goto', url])
    },
    locator(selector) {
      return {
        async waitFor(options) {
          calls.push(['waitFor', selector, options.state])
        },
      }
    },
  }
}

test('clears session cookies before opening the login page directly', async () => {
  const page = createPage()

  await openBookingSignIn(page)

  assert.deepEqual(page.calls, [
    ['clearCookies'],
    ['goto', 'https://pdcb.waseef.qa/Login'],
    ['waitFor', '#txtQatarID', 'visible'],
  ])
})
