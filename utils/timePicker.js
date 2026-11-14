async function selectTimeSlot(page, startTime) {
  const timeMatch = String(startTime)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i)

  if (!timeMatch) {
    throw new Error(`Invalid time slot: ${startTime}`)
  }

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  const meridiem = timeMatch[3]?.toUpperCase()

  if (minutes > 59 || (meridiem && (hours < 1 || hours > 12))) {
    throw new Error(`Invalid time slot: ${startTime}`)
  }

  if (meridiem) {
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0)
  } else if (hours > 23) {
    throw new Error(`Invalid time slot: ${startTime}`)
  }

  const normalizedStart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const timeLabels = await page
    .locator('[id^="GridView1_lblTimeslot_"]')
    .allTextContents()

  const index = timeLabels.findIndex((label) => {
    const match = label.trim().match(/^(\d{1,2}:\d{2})\s*-/)
    return match?.[1] === normalizedStart
  })

  if (index === -1 || index + 1 >= timeLabels.length) {
    throw new Error(`Time slot ${startTime} not found`)
  }

  for (let i = index; i <= index + 1; i++) {
    const checkbox = page.locator(`#GridView1_chk_${i}`)

    if (!(await checkbox.isEnabled())) {
      throw new Error(`Time slot ${i} is unavailable`)
    }

    await checkbox.check()

    if (!(await checkbox.isChecked())) {
      throw new Error(`Time slot ${i} was not selected`)
    }
  }
}

module.exports = { selectTimeSlot }
