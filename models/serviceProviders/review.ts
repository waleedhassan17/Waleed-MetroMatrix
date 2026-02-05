// ============================================
// REVIEW MODELS
// ============================================

export interface ReviewTag {
  id: string;
  label: string;
  icon: string;
}

export interface ReviewProvider {
  id: string;
  name: string;
  image: string;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
}

export interface ReviewServiceDetails {
  type: string;
  description: string;
  completedAt: string;
  amount: number;
}

export interface ReviewData {
  provider: ReviewProvider;
  serviceDetails: ReviewServiceDetails;
  availableTags: ReviewTag[];
}

export interface SubmittedReview {
  id: string;
  rating: number;
  feedback: string;
  tags: string[];
  createdAt: string;
}
