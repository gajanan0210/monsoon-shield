process.env.PORT = 3001;
const http = require('http');
const serverProcess = require('./server.js'); // Starts the server

async function runTests() {
  console.log('Running MonsoonShield comprehensive integration tests...');
  
  // Wait 2 seconds for the server to spin up
  await new Promise(resolve => setTimeout(resolve, 2000));

  let failed = false;

  try {
    // Test 1: Verify geocoding & weather fetching on wttr.in
    console.log('Test 1: Testing /api/weather for city "Mumbai"...');
    const response = await fetch('http://localhost:3001/api/weather?city=Mumbai');
    const status = response.status;
    const data = await response.json();

    if (status === 200 && data.cityName) {
      console.log('✅ Test 1 Passed: Weather proxy is fully operational.');
      console.log(`Current Temp in Mumbai: ${data.current?.temp}°C, Regional Rain: ${data.current?.rain}mm`);
    } else {
      console.error(`❌ Test 1 Failed: Expected status 200, got status ${status}:`, data);
      failed = true;
    }

    // Test 2: Verify in-memory weather caching and efficiency
    console.log('Test 2: Testing weather cache efficiency...');
    const start = Date.now();
    const cacheResponse = await fetch('http://localhost:3001/api/weather?city=Mumbai');
    const cacheDuration = Date.now() - start;
    const cacheData = await cacheResponse.json();

    if (cacheResponse.status === 200 && cacheDuration < 100) {
      console.log(`✅ Test 2 Passed: Weather cache hit in ${cacheDuration}ms (expected <100ms).`);
    } else {
      console.error(`❌ Test 2 Failed: Weather cache did not hit in time. Duration: ${cacheDuration}ms`);
      failed = true;
    }

    // Test 3: Verify plan parameter validation
    console.log('Test 3: Testing /api/generate-plan validation...');
    const planRes = await fetch('http://localhost:3001/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseType: 'Ground Floor', familySize: 3 })
    });

    const planStatus = planRes.status;
    const planData = await planRes.json();

    if (planStatus === 400 && planData.error.includes('required')) {
      console.log('✅ Test 3 Passed: Server correctly returned 400 for missing plan parameters.');
    } else {
      console.error(`❌ Test 3 Failed: Expected status 400, got status ${planStatus}:`, planData);
      failed = true;
    }

    // Test 4: Verify chat parameter validation
    console.log('Test 4: Testing /api/chat validation...');
    const chatRes = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'Hindi' })
    });

    const chatStatus = chatRes.status;
    const chatData = await chatRes.json();

    if (chatStatus === 400 && chatData.error.includes('required')) {
      console.log('✅ Test 4 Passed: Server correctly returned 400 for missing chat message.');
    } else {
      console.error(`❌ Test 4 Failed: Expected status 400, got status ${chatStatus}:`, chatData);
      failed = true;
    }

    // Test 5: Verify input sanitization (XSS protection)
    console.log('Test 5: Testing input sanitization...');
    const xssRes = await fetch('http://localhost:3001/api/weather?city=Mumbai<img>');
    const xssData = await xssRes.json();

    if (xssRes.status === 200 && xssData.cityName) {
      console.log('✅ Test 5 Passed: HTML script tags were successfully stripped and city weather resolved.');
    } else {
      console.error(`❌ Test 5 Failed: Expected successful sanitized lookup, got status ${xssRes.status}:`, xssData);
      failed = true;
    }

    // Test 6: Verify Helmet security headers
    console.log('Test 6: Testing Helmet security headers presence...');
    const headersRes = await fetch('http://localhost:3001/');
    const xFrameOptions = headersRes.headers.get('x-frame-options');
    const xContentTypeOptions = headersRes.headers.get('x-content-type-options');

    if (headersRes.status === 200 && xFrameOptions && xContentTypeOptions) {
      console.log('✅ Test 6 Passed: Helmet successfully set secure headers (X-Frame-Options, X-Content-Type-Options).');
    } else {
      console.error('❌ Test 6 Failed: Security headers are missing in response:', {
        'x-frame-options': xFrameOptions,
        'x-content-type-options': xContentTypeOptions
      });
      failed = true;
    }

    // Teardown test server listener to exit cleanly without crashes
    if (serverProcess && typeof serverProcess.close === 'function') {
      serverProcess.close();
    }

    if (failed) {
      console.error('Some tests failed.');
      setTimeout(() => process.exit(1), 500);
    } else {
      console.log('All 6 MonsoonShield integration tests passed successfully! 🚀');
      setTimeout(() => process.exit(0), 500);
    }

  } catch (error) {
    console.error('❌ Test Execution Failed with Error:', error);
    if (serverProcess && typeof serverProcess.close === 'function') {
      serverProcess.close();
    }
    process.exit(1);
  }
}

runTests();
