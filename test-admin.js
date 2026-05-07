const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function test() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@poincon.be' }
    })

    console.log('User found:', user?.email, 'Role:', user?.role)

    if (user && user.password) {
      const isValid = await bcrypt.compare('admin123456', user.password)
      console.log('Password valid:', isValid)
    }

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
