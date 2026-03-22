import { ApiResponse } from '../../models/serviceProviders';

export const HEALTHCARE_BASE_URL = 'https://metromatrix-api-3445ddd9bd3a.herokuapp.com/api/healthcare';
export const USE_HEALTHCARE_DUMMY_DATA = true;

export async function healthcareApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${HEALTHCARE_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: null as any,
        message: errorData.message || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Success',
    };
  } catch (error: any) {
    return {
      success: false,
      data: null as any,
      message: error.message || 'Network error occurred',
    };
  }
}
