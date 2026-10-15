const http = require('http');

async function testEndpoint(url, name) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`[TEST SUCCESS] ${name}: HTTP ${res.status}`);
    return true;
  } catch (err) {
    console.error(`[TEST FAILED] ${name}: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('--- NoteSync Automated Verification Script ---');
  await testEndpoint('http://localhost:5000/api/nodes', 'API Gateway Health');
  await testEndpoint('http://localhost:5001/health', 'Node CE Health');
  await testEndpoint('http://localhost:5002/health', 'Node IT Health');
  await testEndpoint('http://localhost:5003/health', 'Node E&TC Health');
  await testEndpoint('http://localhost:5000/api/resources', 'Resource Aggregation');
  console.log('--- Verification Complete ---');
}

runTests();
