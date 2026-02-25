const http = require('http');

const data = JSON.stringify({
    name: 'Test User',
    email: 'test3@test.com',
    password: 'password'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let resData = '';
    res.on('data', d => resData += d);
    res.on('end', () => console.log('Response:', resData));
});

req.on('error', console.error);
req.write(data);
req.end();
