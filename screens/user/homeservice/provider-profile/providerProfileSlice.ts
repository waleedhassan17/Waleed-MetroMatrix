import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Review {
  id: string;
  reviewerName: string;
  reviewerInitial: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  avatarColor: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  icon: string;
}

export interface AvailabilitySlot {
  id: string;
  day: string;
  timeSlots: string[];
  available: boolean;
}

export interface GalleryItem {
  id: string;
  image: string;
  title: string;
  category: string;
}

export interface Provider {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  experience: string;
  verified: boolean;
  price: number;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
  specialty: string;
  bio: string;
  phoneNumber: string;
  email: string;
  address: string;
  responseTime: string;
  jobSuccessRate: number;
  jobsCompleted: number;
  certifications: string[];
  skills: string[];
  servicesOffered: Service[];
  availability: AvailabilitySlot[];
  reviewsList: Review[];
  gallery: GalleryItem[];
  languages: string[];
  isOnline: boolean;
}

export interface ProviderProfileState {
  provider: Provider | null;
  isLoading: boolean;
  error: string | null;
  selectedTab: 'overview' | 'reviews' | 'gallery' | 'availability';
}

// Initial State
const initialState: ProviderProfileState = {
  provider: null,
  isLoading: false,
  error: null,
  selectedTab: 'overview',
};

// Mock data for different service types
const MOCK_PROVIDERS: Record<string, Partial<Provider>> = {
  electricians: {
    name: 'Usman Ali',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    rating: 4.8,
    reviews: 189,
    experience: '10+ Years',
    verified: true,
    price: 3000,
    category: 'electricians',
    specialty: '⚡ Wiring • Installation • Repairs',
    bio: 'Licensed electrician with over 10 years of experience in residential and commercial electrical work.',
    phoneNumber: '+92 301 9876543',
    email: 'usman.ali@example.com',
    address: 'DHA Phase 5, Lahore, Punjab',
    responseTime: '~15 min',
    jobSuccessRate: 96,
    jobsCompleted: 178,
    certifications: ['Licensed Electrician', 'Safety Certified', 'Insurance Verified', 'OSHA Compliant'],
    skills: ['Home Rewiring', 'Panel Upgrades', 'LED Installation', 'Circuit Repairs', 'Smart Home Setup'],
    servicesOffered: [
      { id: '1', name: 'Complete Home Rewiring', description: 'Full electrical system upgrade', price: 15000, duration: '1-2 days', icon: 'flash' },
      { id: '2', name: 'Panel Upgrade', description: 'Electrical panel replacement', price: 8000, duration: '4-6 hours', icon: 'git-network' },
      { id: '3', name: 'LED & Lighting Installation', description: 'Modern lighting fixtures', price: 4000, duration: '2-3 hours', icon: 'bulb' },
      { id: '4', name: 'Emergency Repairs', description: '24/7 electrical emergency service', price: 5000, duration: '1-2 hours', icon: 'warning' },
    ],
    languages: ['English', 'Urdu', 'Punjabi'],
  },
  plumbers: {
    name: 'Ahmad Raza',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    rating: 4.9,
    reviews: 245,
    experience: '8+ Years',
    verified: true,
    price: 2500,
    category: 'plumbers',
    specialty: '🔧 Pipe Fitting • Leak Repairs • Installation',
    bio: 'Professional plumber with over 8 years of experience in residential and commercial plumbing.',
    phoneNumber: '+92 300 1234567',
    email: 'ahmad.raza@example.com',
    address: 'Model Town, Lahore, Punjab',
    responseTime: '~10 min',
    jobSuccessRate: 98,
    jobsCompleted: 156,
    certifications: ['Licensed Professional', 'Insurance Verified', 'Background Checked', 'Safety Certified'],
    skills: ['Residential Plumbing', 'Emergency Repairs', 'Pipe Installation', 'Drain Cleaning', 'Water Heater Service'],
    servicesOffered: [
      { id: '1', name: 'Emergency Leak Repair', description: 'Quick response for urgent leaks', price: 3000, duration: '1-2 hours', icon: 'water' },
      { id: '2', name: 'Pipe Installation', description: 'Professional pipe fitting', price: 5000, duration: '2-4 hours', icon: 'construct' },
      { id: '3', name: 'Drain Cleaning', description: 'Complete drain cleaning', price: 2500, duration: '1 hour', icon: 'funnel' },
      { id: '4', name: 'Water Heater Service', description: 'Installation and repair', price: 4500, duration: '2-3 hours', icon: 'flame' },
    ],
    languages: ['English', 'Urdu', 'Punjabi'],
  },
  'ac-repairers': {
    name: 'Bilal Ahmed',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    rating: 4.7,
    reviews: 167,
    experience: '6+ Years',
    verified: true,
    price: 3500,
    category: 'ac-repairers',
    specialty: '❄️ AC Installation • Cooling Issues • Gas Refilling',
    bio: 'Certified AC technician specializing in all types of air conditioning systems.',
    phoneNumber: '+92 302 5678901',
    email: 'bilal.ahmed@example.com',
    address: 'Gulberg III, Lahore, Punjab',
    responseTime: '~20 min',
    jobSuccessRate: 94,
    jobsCompleted: 134,
    certifications: ['EPA Certified', 'HVAC Licensed', 'Insurance Verified', 'Manufacturer Trained'],
    skills: ['Split AC', 'Window AC', 'Central AC', 'Gas Refilling', 'Compressor Repair'],
    servicesOffered: [
      { id: '1', name: 'AC Installation', description: 'Professional AC installation', price: 5000, duration: '2-3 hours', icon: 'snow' },
      { id: '2', name: 'Gas Refilling', description: 'AC gas top-up service', price: 3000, duration: '1 hour', icon: 'speedometer' },
      { id: '3', name: 'Deep Cleaning Service', description: 'Complete AC deep cleaning', price: 2500, duration: '2 hours', icon: 'water' },
      { id: '4', name: 'Compressor Repair', description: 'AC compressor diagnosis', price: 8000, duration: '2-3 hours', icon: 'build' },
    ],
    languages: ['English', 'Urdu'],
  },
};

// Common data for all providers
const commonData = {
  availability: [
    { id: '1', day: 'Monday', timeSlots: ['9:00 AM - 12:00 PM', '2:00 PM - 6:00 PM'], available: true },
    { id: '2', day: 'Tuesday', timeSlots: ['9:00 AM - 12:00 PM', '2:00 PM - 6:00 PM'], available: true },
    { id: '3', day: 'Wednesday', timeSlots: ['9:00 AM - 12:00 PM', '2:00 PM - 6:00 PM'], available: true },
    { id: '4', day: 'Thursday', timeSlots: ['9:00 AM - 12:00 PM', '2:00 PM - 6:00 PM'], available: true },
    { id: '5', day: 'Friday', timeSlots: ['9:00 AM - 12:00 PM'], available: true },
    { id: '6', day: 'Saturday', timeSlots: ['10:00 AM - 4:00 PM'], available: true },
    { id: '7', day: 'Sunday', timeSlots: [], available: false },
  ],
  reviewsList: [
    { id: '1', reviewerName: 'Ali Hassan', reviewerInitial: 'A', rating: 5, comment: 'Excellent service! Very professional.', date: '2 days ago', helpfulCount: 12, avatarColor: '#4F46E5' },
    { id: '2', reviewerName: 'Fatima Khan', reviewerInitial: 'F', rating: 4, comment: 'Good work quality. Arrived on time.', date: '1 week ago', helpfulCount: 8, avatarColor: '#EC4899' },
    { id: '3', reviewerName: 'Muhammad Ahmed', reviewerInitial: 'M', rating: 5, comment: 'Fixed the issue quickly. Very knowledgeable.', date: '2 weeks ago', helpfulCount: 15, avatarColor: '#10B981' },
    { id: '4', reviewerName: 'Sarah Ibrahim', reviewerInitial: 'S', rating: 5, comment: 'Professional and efficient. Will call again.', date: '3 weeks ago', helpfulCount: 10, avatarColor: '#F59E0B' },
  ],
  gallery: [
    { id: '1', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400', title: 'Recent Work', category: 'Installation' },
    { id: '2', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', title: 'Project', category: 'Renovation' },
    { id: '3', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400', title: 'Installation', category: 'Installation' },
    { id: '4', image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=400', title: 'Emergency Repair', category: 'Repair' },
  ],
  isOnline: true,
};

// Async Thunks
export const fetchProviderById = createAsyncThunk(
  'providerProfile/fetchById',
  async ({ providerId, category }: { providerId: string; category: 'electricians' | 'plumbers' | 'ac-repairers' }) => {
    // Simulate API call
    return new Promise<Provider>((resolve) => {
      setTimeout(() => {
        const mockData = MOCK_PROVIDERS[category] || MOCK_PROVIDERS.plumbers;
        
        resolve({
          id: providerId,
          ...mockData,
          ...commonData,
        } as Provider);
      }, 1000);
    });
  }
);

// Slice
const providerProfileSlice = createSlice({
  name: 'providerProfile',
  initialState,
  reducers: {
    setSelectedTab: (
      state,
      action: PayloadAction<'overview' | 'reviews' | 'gallery' | 'availability'>
    ) => {
      state.selectedTab = action.payload;
    },
    clearProvider: (state) => {
      state.provider = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProviderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProviderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.provider = action.payload;
      })
      .addCase(fetchProviderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch provider';
      });
  },
});

// Actions
export const { setSelectedTab, clearProvider } = providerProfileSlice.actions;

export default providerProfileSlice.reducer;
