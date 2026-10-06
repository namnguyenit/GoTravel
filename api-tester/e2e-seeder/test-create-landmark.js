const ApiClient = require('./api-client');

async function test() {
  const baseURL = 'http://localhost:5555'; // APIGateway Port
  const admin = new ApiClient(baseURL);
  
  console.log('1. Logging in as admin...');
  try {
    await admin.login('admin', '12345678');
    console.log('   ✅ Login successful!');
    
    console.log('2. Fetching profile...');
    await admin.getProfile();
    console.log('   ✅ Profile fetched, userId:', admin.userId);
    
    console.log('3. Sending test landmark creation request...');
    const testPayload = {
      name: 'Địa danh Thử nghiệm E2E',
      description: 'Mô tả thử nghiệm hệ thống địa danh.',
      province: 'Hà Nội',
      latitude: 21.0285,
      longitude: 105.8542,
      radiusMeters: 5000,
      isFeatured: true,
      thumbnailUrl: 'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127916/admin-uploads/seeder/1f3106cead1a33834a8e17dfd904551ef7745bb359568cb0c3816396207c86f3.webp',
      galleryUrls: [
        'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp',
      ]
    };
    
    const res = await admin.createLandmark(testPayload);
    if (res && res.success) {
      console.log('   🎉 SUCCESS! The Admin Landmark Creation feature is working perfectly!');
    } else {
      console.log('   ❌ FAILED! Create landmark returned invalid response.');
    }
  } catch (err) {
    console.error('   ❌ ERROR:', err.message);
    if (err.response) {
      console.error('   Response Status:', err.response.status);
      console.error('   Response Data:', JSON.stringify(err.response.data));
    }
  }
}

test();
