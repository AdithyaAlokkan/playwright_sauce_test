const { expect, test } = require('@playwright/test')
const getBookings = require('../utils/getBookings')
const updateBookingStatus = require('../utils/updateBookingStatus')
const openBookingSignIn = require('../utils/bookingSession')
const { selectTimeSlot } = require('../utils/timePicker')

const BOOKING_TIME_ZONE = 'Asia/Qatar'
const CHOOSE_LOCATION_URL = 'https://pdcb.waseef.qa/ChooseLocation'

function getDohaDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
}

function getCurrentDohaTime() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )

  return Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
    now.getUTCMilliseconds(),
  )
}

function getDateParts(value) {
  const dateText = String(value).trim()
  const isoDate = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (isoDate) {
    return {
      year: Number(isoDate[1]),
      month: Number(isoDate[2]),
      day: Number(isoDate[3]),
    }
  }

  const parsedDate = new Date(dateText)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid booking date: ${dateText}`)
  }

  return getDohaDateParts(parsedDate)
}

function formatBookingDate(value) {
  const { year, month, day } = getDateParts(value)
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`
}

async function selectBookingDate(page, dateValue) {
  const { year, month, day } = getDateParts(dateValue)
  const dateInput = page.locator('#txtdate')

  await page.locator('#img').click()

  const calendar = page.locator('#Calendar1')
  for (let attempt = 0; attempt < 24; attempt++) {
    const heading = (
      await calendar.locator('tr td[align="center"]').first().innerText()
    ).trim()
    const headingMatch = heading.match(/^([A-Za-z]+)\s+(\d{4})$/)

    if (!headingMatch) {
      throw new Error(`Could not read the calendar month: ${heading}`)
    }

    const displayedMonth = new Date(`${headingMatch[1]} 1, ${headingMatch[2]}`)
    const monthOffset =
      (year - displayedMonth.getFullYear()) * 12 +
      month -
      (displayedMonth.getMonth() + 1)

    if (monthOffset === 0) {
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', {
        month: 'long',
      })
      const dayLink = calendar.locator(`a[title="${monthName} ${day}"]`)
      const dayLinkCount = await dayLink.count()

      if (dayLinkCount === 0) {
        return false
      }

      if (dayLinkCount !== 1) {
        throw new Error(`Date ${monthName} ${day}, ${year} is not selectable`)
      }

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        dayLink.click(),
      ])

      const selectedDate = await dateInput.inputValue()
      const expectedDate = formatBookingDate(dateValue)
      if (selectedDate !== expectedDate) {
        throw new Error(
          `Expected booking date ${expectedDate}, but page shows ${selectedDate}`,
        )
      }

      return true
    }

    const direction = monthOffset > 0 ? 'next' : 'previous'
    const monthLink = calendar.locator(
      `a[title="Go to the ${direction} month"]`,
    )

    const monthLinkCount = await monthLink.count()

    if (monthLinkCount === 0 && direction === 'next') {
      return false
    }

    if (monthLinkCount !== 1) {
      throw new Error(
        `Cannot navigate the calendar to ${formatBookingDate(dateValue)}`,
      )
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      monthLink.click(),
    ])
  }

  throw new Error(`Could not navigate the calendar to ${dateValue}`)
}

function getBookingStart(dateValue, timeValue) {
  const { year, month, day } = getDateParts(dateValue)
  const timeText = String(timeValue).trim()
  const timeMatch = timeText.match(
    /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?/i,
  )

  if (!timeMatch) {
    throw new Error(`Invalid booking time: ${timeText}`)
  }

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2] || 0)
  const meridiem = timeMatch[3]?.toUpperCase()

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      throw new Error(`Invalid booking time: ${timeText}`)
    }
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0)
  }

  const bookingStart = new Date(Date.UTC(year, month - 1, day, hours, minutes))

  if (
    bookingStart.getUTCFullYear() !== year ||
    bookingStart.getUTCMonth() !== month - 1 ||
    bookingStart.getUTCDate() !== day ||
    bookingStart.getUTCHours() !== hours ||
    bookingStart.getUTCMinutes() !== minutes
  ) {
    throw new Error(`Invalid booking date or time: ${dateValue} ${timeText}`)
  }

  return bookingStart
}

test('Submit pending and failed future bookings', async ({ page }) => {
  const bookings = await getBookings()
  const bookingsToProcess = bookings.filter(
    (booking) => ['Pending', 'Failed'].includes(booking.Status),
  )
  const now = getCurrentDohaTime()

  test.skip(
    bookingsToProcess.length === 0,
    'No Pending or Failed bookings to process',
  )
  test.setTimeout(Math.max(30_000, bookingsToProcess.length * 60_000))

  let signedInUserName

  for (const booking of bookingsToProcess) {
    try {
      if (getBookingStart(booking.Date, booking.Time_Start) < now) {
        continue
      }

      const userName = booking['User_Name']
      const password = booking.Password

      if (
        typeof userName !== 'string' ||
        !userName.trim() ||
        typeof password !== 'string' ||
        !password
      ) {
        throw new Error(
          `Booking ${booking.id} is missing its User Name or Password`,
        )
      }

      const normalizedUserName = userName.trim()
      if (signedInUserName === normalizedUserName) {
        await page.goto(CHOOSE_LOCATION_URL)
      } else {
        await openBookingSignIn(page)
        await page.locator('#txtQatarID').fill(normalizedUserName)
        await page.locator('#txtPassword').fill(password)
        await page.getByRole('button', { name: /log\s*in/i }).click()
        signedInUserName = normalizedUserName
        await page.goto(CHOOSE_LOCATION_URL)
      }

      await page.getByRole('link', { name: /^Madinatna\b/i }).click()

      const sportPaths = {
        padel: 'MadinatnaPaddle.aspx',
        paddle: 'MadinatnaPaddle.aspx',
        basketball: 'MadinatnaBasketball.aspx',
        volleyball: 'MadinatnaVolleyball.aspx',
      }

      const sportPath = sportPaths[booking.Sport.trim().toLowerCase()]
      if (!sportPath) throw new Error(`Unsupported sport: ${booking.Sport}`)

      const sportLink = page.locator(`a[href$="${sportPath}"]`)
      try {
        await expect(sportLink).toBeVisible({ timeout: 10_000 })
      } catch (error) {
        throw new Error(
          `Sport link ${sportPath} was not available after opening Madinatna; current page: ${page.url()}`,
          { cause: error },
        )
      }
      await sportLink.click()

      const clusterLinks = page.locator(
        'a[href*="MadinatnaBookings.aspx"]',
      )
      const needsCourt =
        booking.Cluster.trim().toLowerCase() === 'i' &&
        ['paddle', 'padel'].includes(booking.Sport.trim().toLowerCase())
      let expectedCourtNo

      if (needsCourt) {
        const courtMatch = String(booking.Court ?? '')
          .trim()
          .match(/^(?:court\s*)?(\d+)$/i)

        if (!courtMatch) {
          throw new Error(
            `Invalid court for Paddle cluster I booking: ${booking.Court}`,
          )
        }

        expectedCourtNo = courtMatch[1]
      }

      const clusterHref = await clusterLinks.evaluateAll(
        (links, expected) => {
          const normalize = (value) => String(value ?? '').trim().toLowerCase()
          const expectedCluster = normalize(expected.cluster)
          const expectedSport =
            normalize(expected.sport) === 'padel'
              ? 'paddle'
              : normalize(expected.sport)

          return (
            links.find((link) => {
              const url = new URL(link.href)
              const linkSport = normalize(url.searchParams.get('Sport'))
              const linkSports = linkSport.split(/\s+with\s+/)
              return (
                normalize(url.searchParams.get('Cluster')) ===
                  expectedCluster &&
                (linkSport === expectedSport ||
                  linkSports.includes(expectedSport)) &&
                (!expected.courtNo ||
                  url.searchParams.get('CourtNo') === expected.courtNo)
              )
            })?.getAttribute('href') ?? null
          )
        },
        {
          cluster: booking.Cluster,
          sport: booking.Sport,
          courtNo: expectedCourtNo,
        },
      )

      if (!clusterHref) {
        throw new Error(
          `No cluster link found for ${booking.Cluster} / ${booking.Sport}`,
        )
      }

      await page.locator(`a[href=${JSON.stringify(clusterHref)}]`).click()

      const dateSelected = await selectBookingDate(page, booking.Date)
      if (!dateSelected) {
        continue
      }

      const timeSlotsSelected = await selectTimeSlot(
        page,
        booking.Time_Start,
        booking.Time_End,
      )
      if (!timeSlotsSelected) {
        await updateBookingStatus(booking.id, 'Failed')
        continue
      }

      const [submitResponse] = await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.locator('#btnSave').click(),
      ])

      if (!submitResponse?.ok()) {
        throw new Error(
          `Booking ${booking.id} submission failed${
            submitResponse
              ? ` with HTTP ${submitResponse.status()}`
              : ' without a page response'
          }`,
        )
      }

      await expect(page.locator('body.booking-detail-page')).toBeVisible()
      await expect(page.locator('#lblBookingReference')).toHaveText(/\S+/)
    } catch (flowError) {
      try {
        await updateBookingStatus(booking.id, 'Failed')
      } catch (statusError) {
        throw new AggregateError(
          [flowError, statusError],
          `Booking ${booking.id} failed and its status could not be updated`,
        )
      }

      throw flowError
    }

    await updateBookingStatus(booking.id, 'Complete')
  }
})
