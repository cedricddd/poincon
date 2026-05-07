const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setupAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email)
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123456', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@poincon.be',
        name: 'Admin',
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
      }
    })

    console.log('✅ Admin user created:')
    console.log('   Email: admin@poincon.be')
    console.log('   Password: admin123456')
    console.log('   ID:', admin.id)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

setupAdmin()
