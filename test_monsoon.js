const http = require('http');
const serverProcess = require('./server.js'); // Starts the server

async function runTests() {
  console.log('Running MonsoonShield backend integration tests...');
  
  // Wait 1.5 seconds for the server to spin up
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // Test 1: Verify geocoding & weather fetching on Open-Meteo
    console.log('Test 1: Testing /api/weather for city "Mumbai"...');
    const response = await fetch('http://localhost:3000/api/weather?city=Mumbai');
    const status = response.status;
    const data = await response.json();

    if (status === 200 && data.cityName === 'Mumbai') {
      console.log('✅ Test 1 Passed: Weather proxy geocoding is fully operational.');
      console.log(`Current Temp in Mumbai: ${data.current?.temp}°C, Regional Rain: ${data.current?.rain}mm`);
    } else {
      console.error(`❌ Test 1 Failed: Expected status 200 for Mumbai, got status ${status}:`, data);
      process.exit(1);
    }

    // Test 2: Verify missing plan arguments validation
    console.log('Test 2: Testing /api/generate-plan validation...');
    const planRes = await fetch('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        houseType: 'Ground Floor',
        familySize: 3
      })
    });

    const planStatus = planRes.status;
    const planData = await planRes.json();

    if (planStatus === 400 && planData.error.includes('required')) {
      console.log('✅ Test 2 Passed: Server correctly returned 400 for missing plan parameters.');
    } else {
      console.error(`❌ Test 2 Failed: Expected status 400 with missing parameters error, got status ${planStatus}:`, planData);
      process.exit(1);
    }

    console.log('All MonsoonShield backend integration tests passed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test Execution Failed with Error:', error);
    process.exit(1);
  }
}

runTests();
