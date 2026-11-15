const supabase = require('./supabaseClient')

async function updateBookingStatus(bookingId, status) {
  const { data, error } = await supabase
    .from('Booking History')
    .update({ Status: status })
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
