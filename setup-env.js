const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env')
const envContent = `# API Configuration
BASE_URL=http://127.0.0.1:8000

# Development Configuration
NODE_ENV=development
`

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Created .env file with default configuration')
  console.log('📝 Edit .env file to change BASE_URL to your API endpoint')
} else {
  console.log('⚠️  .env file already exists')
  console.log('📝 Check if BASE_URL is set correctly in .env file')
}

console.log('\n📋 Current .env content:')
if (fs.existsSync(envPath)) {
  console.log(fs.readFileSync(envPath, 'utf8'))
}
