const supabase = require('./supabaseClient')

async function updateBookingStatus(bookingId, status, errorMessage) {
  const update = { Status: status, error_message: null }

  if (status === 'Failed' || typeof errorMessage === 'string') {
    if (typeof errorMessage !== 'string' || !errorMessage.trim()) {
      throw new Error(`An error message is required to fail booking ${bookingId}`)
    }

    const normalizedMessage = errorMessage.replace(/\s+/g, ' ').trim()
    update.error_message =
      normalizedMessage.length > 250
        ? `${normalizedMessage.slice(0, 247)}...`
        : normalizedMessage
  }

  const { data, error } = await supabase
    .from('Booking History')
    .update(update)
    .eq('id', bookingId)
    .in('Status', ['Pending', 'Failed'])
    .select('id')

  if (error) {
    throw new Error(
      `Failed to update booking ${bookingId} to ${status}: ${error.message}`,
    )
  }

  if (data.length !== 1) {
    throw new Error(
      `Booking ${bookingId} was not updated to ${status}; it may no longer be Pending or Failed`,
    )
  }
}

module.exports = updateBookingStatus
