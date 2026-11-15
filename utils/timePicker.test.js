const assert = require('node:assert/strict')
const { test } = require('node:test')
const { selectTimeSlot } = require('./timePicker')

function createPage(labels, unavailableIndexes = []) {
  const selected = new Set()
  const unavailable = new Set(unavailableIndexes)
  const page = {
    selected,
    locator(selector) {
      if (selector === '[id^="GridView1_lblTimeslot_"]') {
        return { allTextContents: async () => labels }
      }

      const index = Number(selector.match(/GridView1_chk_(\d+)/)?.[1])
      return {
        isEnabled: async () => !unavailable.has(index),
        check: async () => selected.add(index),
        isChecked: async () => selected.has(index),
      }
    },
  }

  return page
}

test('selects every slot covering the requested start and end times', async () => {
  const page = createPage([
    '10:00-10:30',
    '10:30-11:00',
    '11:00-11:30',
    '11:30-12:00',
  ])

  const selected = await selectTimeSlot(page, '10:30', '12:00')

  assert.equal(selected, true)
  assert.deepEqual([...page.selected], [1, 2, 3])
})

test('rejects an end time that does not align with an available slot', async () => {
  const page = createPage(['10:00-10:30', '10:30-11:00'])

  await assert.rejects(selectTimeSlot(page, '10:00', '10:45'), /slot boundary/)
  assert.deepEqual([...page.selected], [])
})

test('reports unavailable slots without partially selecting the booking', async () => {
  const page = createPage(
    ['10:00-10:30', '10:30-11:00', '11:00-11:30'],
    [1],
  )

  const selected = await selectTimeSlot(page, '10:00', '11:30')

  assert.equal(selected, false)
  assert.deepEqual([...page.selected], [])
})
