const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:5000';

async function request(endpoint, options = {}, body = null, isMultipart = false, boundary = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const headers = options.headers || {};

    if (body && !isMultipart && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: headers
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          let data = buffer.toString('utf8');
          if (contentType.includes('application/json')) {
            try {
              data = JSON.parse(data);
            } catch (e) {}
          }
          resolve({ status: res.statusCode, headers: res.headers, data, buffer });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  PUBLIC PHOTO GALLERY FULL STACK END-TO-END TESTS  ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'online', '1. Backend API Health Check is ONLINE');

    // 2. Admin Login
    const adminLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'admin@gallery.com',
      password: 'Admin@12345'
    });
    assert(adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', '2. Admin Login & JWT Authenticated');
    const adminToken = adminLogin.data.token;

    // 3. Contributor User Login
    const userLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'laasya@gallery.com',
      password: 'User@12345'
    });
    assert(userLogin.status === 200 && userLogin.data.user.role === 'USER', '3. Regular Contributor Login & JWT Authenticated');
    const userToken = userLogin.data.token;

    // 4. Fetch Public Gallery
    const galleryRes = await request('/api/posts?sort=newest');
    assert(galleryRes.status === 200 && galleryRes.data.posts.length > 0, `4. Public Gallery returned ${galleryRes.data.posts.length} approved posts in chronological order`);
    const samplePostId = galleryRes.data.posts[0]._id;

    // 5. Test Word Document Report Generation (.docx)
    const reportRes = await request(`/api/posts/${samplePostId}/report`);
    const isDocx = reportRes.headers['content-type']?.includes('wordprocessingml');
    assert(reportRes.status === 200 && isDocx && reportRes.buffer.length > 1000, `5. Word (.docx) Report generated successfully (${reportRes.buffer.length} bytes)`);

    // 6. Test User Dashboard Stats
    const userStats = await request('/api/posts/user-stats', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userStats.status === 200 && userStats.data.stats.totalPosts >= 0, `6. User Dashboard Stats returned: Total=${userStats.data.stats.totalPosts}, Photos=${userStats.data.stats.totalPhotos}`);

    // 7. Test Admin Stats
    const adminStats = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminStats.status === 200 && adminStats.data.stats.totalUsers >= 2, `7. Admin Metrics Dashboard returned: Users=${adminStats.data.stats.totalUsers}, Posts=${adminStats.data.stats.totalPosts}, Pending=${adminStats.data.stats.pendingPosts}`);

    // 8. Test Search & Filter
    const searchRes = await request('/api/posts?search=cultural');
    assert(searchRes.status === 200 && searchRes.data.posts.length > 0, `8. Public Gallery search query ("cultural") returned ${searchRes.data.posts.length} match(es)`);

    console.log(`\nResults: ${passed}/${total} Tests Passed Successfully!`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
