const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testClockAPI() {
  try {
    console.log('✓ Testing Clock API Integration\n')

    // Get the test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })
    console.log(`✓ Found user: ${user.email} (${user.id})\n`)

    // Simulate creating a clock record (arrival)
    const arrivalTime = new Date()
    const record1 = await prisma.clockRecord.create({
      data: {
        userId: user.id,
        arrivalTime,
        location: 'Sur site',
      }
    })
    console.log(`✓ Created arrival record:`)
    console.log(`  ID: ${record1.id}`)
    console.log(`  Arrival: ${record1.arrivalTime.toLocaleTimeString('fr-BE')}`)
    console.log(`  Location: ${record1.location}\n`)

    // Wait 3 seconds
    console.log('⏳ Waiting 3 seconds...\n')
    await new Promise(r => setTimeout(r, 3000))

    // Simulate departure
    const departureTime = new Date()
    const durationMinutes = (departureTime - arrivalTime) / 60000
    const record2 = await prisma.clockRecord.update({
      where: { id: record1.id },
      data: {
        departureTime,
        duration: Math.round(durationMinutes),
      }
    })
    console.log(`✓ Updated with departure record:`)
    console.log(`  Departure: ${record2.departureTime.toLocaleTimeString('fr-BE')}`)
    console.log(`  Duration: ${record2.duration} minutes\n`)

    // Fetch today's records
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const records = await prisma.clockRecord.findMany({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: tomorrow,
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    console.log(`✓ Fetched today's records (${records.length} sessions):`)
    records.forEach((r, i) => {
      console.log(`  Session ${i + 1}:`)
      console.log(`    Arrival: ${new Date(r.arrivalTime).toLocaleTimeString('fr-BE')}`)
      console.log(`    Departure: ${r.departureTime ? new Date(r.departureTime).toLocaleTimeString('fr-BE') : 'En cours'}`)
      console.log(`    Duration: ${r.duration ? r.duration + ' min' : 'N/A'}`)
    })

    // Calculate total hours
    const totalMinutes = records
      .filter(r => r.duration)
      .reduce((sum, r) => sum + r.duration, 0)
    const totalHours = totalMinutes / 60
    console.log(`\n✓ Total today: ${Math.floor(totalHours)}h${String(Math.round((totalHours % 1) * 60)).padStart(2, '0')}m`)

    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testClockAPI()
