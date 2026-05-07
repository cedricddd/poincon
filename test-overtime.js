const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing automatic overtime detection...\n')

    // Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@poincon.be' }
    })

    if (!admin) {
      console.log('❌ Admin user not found')
      return
    }

    console.log(`✅ Admin user: ${admin.email} (${admin.id})`)

    // Get or create user schedule (8 hours standard)
    let schedule = await prisma.userSchedule.findUnique({
      where: { userId: admin.id }
    })

    if (!schedule) {
      schedule = await prisma.userSchedule.create({
        data: {
          userId: admin.id,
          hoursPerDay: 8
        }
      })
    }

    console.log(`✅ User schedule: ${schedule.hoursPerDay}h/day\n`)

    // Create a clock record (arrival)
    const today = new Date()
    today.setHours(8, 0, 0, 0)

    const clockRecord = await prisma.clockRecord.create({
      data: {
        userId: admin.id,
        arrivalTime: today,
        location: 'Sur site',
        date: today
      }
    })

    console.log(`✅ Clock in: ${clockRecord.arrivalTime.toLocaleTimeString()}`)

    // Simulate departure after 10 hours (should create overtime)
    const departure = new Date(today)
    departure.setHours(18, 0, 0, 0)
    const durationMinutes = 10 * 60 // 10 hours

    const updated = await prisma.clockRecord.update({
      where: { id: clockRecord.id },
      data: {
        departureTime: departure,
        duration: durationMinutes
      }
    })

    console.log(`✅ Clock out: ${updated.departureTime.toLocaleTimeString()}`)
    console.log(`✅ Duration: ${durationMinutes / 60}h\n`)

    // Check if overtime was detected
    const overtimes = await prisma.detectedOvertime.findMany({
      where: {
        userId: admin.id,
        date: today
      }
    })

    if (overtimes.length > 0) {
      console.log(`✅ OVERTIME DETECTED!`)
      overtimes.forEach(ot => {
        console.log(`   - Worked: ${ot.hoursWorked}h`)
        console.log(`   - Standard: ${ot.hoursStandard}h`)
        console.log(`   - Overtime: ${ot.overtimeHours}h`)
        console.log(`   - Status: ${ot.status}`)
      })
    } else {
      console.log(`❌ No overtime detected (should have detected 2h overtime)`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
