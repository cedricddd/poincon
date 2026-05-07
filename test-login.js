const { authOptions } = require('./src/auth')

// Simulate authorize call
const CredentialsProvider = authOptions.providers[0]

async function testLogin() {
  console.log('Testing login...')

  const result = await CredentialsProvider.authorize({
    email: 'admin@poincon.be',
    password: 'admin123456'
  }, null)

  console.log('Result:', result)
}

testLogin().catch(console.error)
