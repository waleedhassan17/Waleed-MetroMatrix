import axios from 'axios';

/**
 * Test API connectivity and response format
 * This helps debug signup issues
 */
export const testAPIConnection = async () => {
  try {
    console.log('🔧 Testing API connection...');
    
    const testData = {
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      password: 'TestPassword123!',
    };

    const response = await axios.post(
      'https://metromatrix-api-2e35f5f074df.herokuapp.com/api/auth/register',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ API Test Response Status:', response.status);
    console.log('✅ API Test Response Headers:', response.headers);
    console.log('✅ API Test Response Data:', JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error: any) {
    console.error('❌ API Test Error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
  }
};

/**
 * Validate API response structure
 */
export const validateAPIResponse = (response: any) => {
  console.log('🔍 Validating API response...');
  console.log('Response type:', typeof response);
  console.log('Response keys:', Object.keys(response));
  console.log('Full response:', JSON.stringify(response, null, 2));

  const checks = {
    hasData: !!response?.data,
    hasUser: !!response?.data?.user || !!response?.user,
    hasAccessToken: !!response?.data?.accessToken || !!response?.accessToken || !!response?.token,
    hasRefreshToken: !!response?.data?.refreshToken || !!response?.refreshToken,
  };

  console.log('Response validation checks:', checks);
  
  return checks;
};
