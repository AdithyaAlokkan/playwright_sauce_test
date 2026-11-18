const assert = require('node:assert/strict')
const { test } = require('node:test')

let response = { data: [{ id: 1 }], error: null }
let updatePayload
const supabaseMock = {
  from(table) {
    assert.equal(table, 'Booking History')
    return {
      update(payload) {
        updatePayload = payload
        return this
      },
      eq() {
        return this
      },
      in() {
        return this
      },
      select() {
        return Promise.resolve(response)
      },
    }
  },
}

const supabaseClientPath = require.resolve('./supabaseClient')
const previousSupabaseClient = require.cache[supabaseClientPath]
require.cache[supabaseClientPath] = {
  id: supabaseClientPath,
  filename: supabaseClientPath,
  loaded: true,
  exports: supabaseMock,
}
const updateBookingStatus = require('./updateBookingStatus')
if (previousSupabaseClient) {
  require.cache[supabaseClientPath] = previousSupabaseClient
} else {
  delete require.cache[supabaseClientPath]
}

test('stores a normalized short error message for failed bookings', async () => {
  await updateBookingStatus(1, 'Failed', '  No   slots available.  ')

  assert.deepEqual(updatePayload, {
    Status: 'Failed',
    error_message: 'No slots available.',
  })
})

test('clears an old error message when a booking completes', async () => {
  await updateBookingStatus(1, 'Complete')

  assert.deepEqual(updatePayload, {
    Status: 'Complete',
    error_message: null,
  })
})

test('records an unavailable date without changing a pending booking status', async () => {
  const reason =
    'Booking date is not yet available. We’ll continue attempting to book until it opens.'

  await updateBookingStatus(1, 'Pending', reason)

  assert.deepEqual(updatePayload, {
    Status: 'Pending',
    error_message: reason,
  })
})

test('requires a reason before marking a booking failed', async () => {
  await assert.rejects(
    updateBookingStatus(1, 'Failed', '  '),
    /error message is required/,
  )
})

test('truncates long failure reasons', async () => {
  const reason = 'x'.repeat(300)
  await updateBookingStatus(1, 'Failed', reason)

  assert.equal(updatePayload.error_message.length, 250)
  assert.equal(updatePayload.error_message, `${'x'.repeat(247)}...`)
})
