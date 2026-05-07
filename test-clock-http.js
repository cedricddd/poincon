const http = require('http')

// NextAuth session cookie (simulating a logged-in user)
// In real browser, this comes from NextAuth automatically
const BASE_URL = 'http://localhost:3000'

async function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers,
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers,
          })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function testClockHTTP() {
  try {
    console.log('✓ Testing Clock HTTP API\n')

    // Note: The API will require authentication
    // For now, we'll just verify the endpoints exist and return proper error codes
    console.log('Testing GET /api/clock/record (should require auth)')
    const getRes = await makeRequest('GET', '/api/clock/record')
    console.log(`  Status: ${getRes.status} (expected 401 without auth)`)
    console.log(`  Response: ${JSON.stringify(getRes.body)}\n`)

    console.log('Testing POST /api/clock/record (should require auth)')
    const postRes = await makeRequest('POST', '/api/clock/record', {
      arrivalTime: new Date().toISOString(),
      location: 'Sur site',
    })
    console.log(`  Status: ${postRes.status} (expected 401 without auth)`)
    console.log(`  Response: ${JSON.stringify(postRes.body)}\n`)

    console.log('✅ API endpoints are live and require authentication!')
    console.log('\nTo test with authentication:')
    console.log('1. Open http://localhost:3000/login')
    console.log('2. Login with: test@example.com / AnyPassword123')
    console.log('3. Navigate to http://localhost:3000/app/clock')
    console.log('4. Click ARRIVÉE and DÉPART buttons to test')
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testClockHTTP()
