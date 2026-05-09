const bcrypt = require('bcryptjs')

async function test() {
  const hashedPassword = '$2a$10$/Ew/lKNHaQeFCbUIDQabTuenJRpAm9JiwAgo4GfMwjigkRlWWBu5C'
  const testPassword = 'cedric@ced-it'

  const isValid = await bcrypt.compare(testPassword, hashedPassword)
  console.log(`Password "${testPassword}" is ${isValid ? 'VALID ✓' : 'INVALID ✗'}`)

  // Try with different variations
  const variations = [
    'cedric@ced-it',
    'cedric@ced-it.be',
    'password123',
  ]

  for (const pwd of variations) {
    const result = await bcrypt.compare(pwd, hashedPassword)
    console.log(`  - "${pwd}": ${result ? '✓' : '✗'}`)
  }
}

test()
