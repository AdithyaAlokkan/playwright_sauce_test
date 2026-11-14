const supabase = require('./supabaseClient')

async function getBookings() {
  const { data, error } = await supabase.from('Booking History').select('*')

  if (error) {
    throw new Error(`Failed to load booking history: ${error.message}`)
  }

  return data
}

module.exports = getBookings