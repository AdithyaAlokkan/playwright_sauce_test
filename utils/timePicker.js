function parseTime(value) {
  const timeText = String(value).trim()
  const timeMatch = timeText.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  )

  if (!timeMatch) {
    throw new Error(`Invalid time: ${timeText}`)
  }

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  const seconds = Number(timeMatch[3] || 0)
  const meridiem = timeMatch[4]?.toUpperCase()

  if (
    minutes > 59 ||
    seconds !== 0 ||
    (meridiem && (hours < 1 || hours > 12)) ||
    (!meridiem && hours > 23)
  ) {
    throw new Error(`Invalid time: ${timeText}`)
  }

  if (meridiem) {
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0)
  }

  return hours * 60 + minutes
}

async function selectTimeSlot(page, startTime, endTime) {
  const start = parseTime(startTime)
  const end = parseTime(endTime)

  if (end <= start) {
    throw new Error(`Booking end must be after its start: ${startTime} - ${endTime}`)
  }

  const timeLabels = await page
    .locator('[id^="GridView1_lblTimeslot_"]')
    .allTextContents()
  const slots = timeLabels.map((label) => {
    const match = label.trim().match(/^(.+?)\s*-\s*(.+?)$/)

    if (!match) {
      throw new Error(`Invalid time slot label: ${label}`)
    }

    return {
      start: parseTime(match[1]),
      end: parseTime(match[2]),
    }
  })

  let slotIndex = slots.findIndex((slot) => slot.start === start)

  if (slotIndex === -1) {
    throw new Error(`Start time ${startTime} is not an available slot boundary`)
  }

  let coveredUntil = start
  const indexes = []

  while (coveredUntil < end) {
    const slot = slots[slotIndex]

    if (!slot || slot.start !== coveredUntil || slot.end <= slot.start) {
      throw new Error(
        `Available time slots do not continuously cover ${startTime} - ${endTime}`,
      )
    }

    if (slot.end > end) {
      throw new Error(`End time ${endTime} is not an available slot boundary`)
    }

    indexes.push(slotIndex)
    coveredUntil = slot.end
    slotIndex++
  }

  const checkboxes = indexes.map((index) => ({
    index,
    checkbox: page.locator(`#GridView1_chk_${index}`),
  }))

  for (const { checkbox } of checkboxes) {
    if (!(await checkbox.isEnabled())) {
      return false
    }
  }

  for (const { index, checkbox } of checkboxes) {
    await checkbox.check()

    if (!(await checkbox.isChecked())) {
      throw new Error(`Time slot ${index} was not selected`)
    }
  }

  return true
}

module.exports = { selectTimeSlot }
