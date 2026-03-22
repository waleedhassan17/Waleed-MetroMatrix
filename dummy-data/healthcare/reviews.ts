import type { DoctorReview } from '../../models/healthcare/types';

export const dummyReviews: DoctorReview[] = [
  // ═══════════════════════════════════════════
  //  Reviews for doc-1 (Dr. Ahmed Khan — GP)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-1',
    doctorId: 'doc-1',
    patientId: 'patient-2',
    appointmentId: 'apt-r-1',
    rating: 5,
    comment: 'Excellent doctor! Very thorough and caring. He explained everything clearly and made sure I understood my medication schedule.',
    isAnonymous: false,
    createdAt: '2026-03-10T09:30:00.000Z',
    response: { text: 'Thank you for your kind words! Wishing you good health.', respondedAt: '2026-03-11T14:00:00.000Z' },
  },
  {
    reviewId: 'rev-2',
    doctorId: 'doc-1',
    patientId: 'patient-3',
    appointmentId: 'apt-r-2',
    rating: 4,
    comment: 'Good experience overall. Wait time was a bit long but the consultation was great. Dr. sahab ne bohat achy se check kiya.',
    isAnonymous: true,
    createdAt: '2026-03-08T11:15:00.000Z',
  },
  {
    reviewId: 'rev-3',
    doctorId: 'doc-1',
    patientId: 'patient-5',
    appointmentId: 'apt-r-3',
    rating: 5,
    comment: 'Dr. Ahmed is the best GP in Islamabad. Went for fever that wasn\'t going away. He diagnosed typhoid immediately and started the right treatment.',
    isAnonymous: false,
    createdAt: '2026-02-28T16:45:00.000Z',
    response: { text: 'Glad you\'re feeling better now. Don\'t forget your follow-up!', respondedAt: '2026-03-01T10:00:00.000Z' },
  },
  {
    reviewId: 'rev-4',
    doctorId: 'doc-1',
    patientId: 'patient-8',
    appointmentId: 'apt-r-4',
    rating: 3,
    comment: 'Doctor is knowledgeable but the clinic could be better maintained. Had to wait for over an hour.',
    isAnonymous: true,
    createdAt: '2026-02-15T14:20:00.000Z',
  },
  {
    reviewId: 'rev-5',
    doctorId: 'doc-1',
    patientId: 'patient-12',
    appointmentId: 'apt-r-5',
    rating: 5,
    comment: 'My whole family visits Dr. Ahmed Khan. He genuinely cares about patients and never rushes through consultations. Highly recommended!',
    isAnonymous: false,
    createdAt: '2026-01-20T12:00:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-2 (Dr. Sara Ali — Cardiologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-6',
    doctorId: 'doc-2',
    patientId: 'patient-1',
    appointmentId: 'apt-r-6',
    rating: 5,
    comment: 'Best cardiologist in Islamabad. Very professional and knowledgeable. She saved my father\'s life with timely angioplasty.',
    isAnonymous: false,
    createdAt: '2026-03-05T10:30:00.000Z',
  },
  {
    reviewId: 'rev-7',
    doctorId: 'doc-2',
    patientId: 'patient-4',
    appointmentId: 'apt-r-7',
    rating: 5,
    comment: 'Exceptional cardiologist! Explained my ECG results in detail. Very patient with all my questions about heart health.',
    isAnonymous: false,
    createdAt: '2026-02-20T15:10:00.000Z',
    response: { text: 'Thank you! Regular check-ups are key to heart health.', respondedAt: '2026-02-21T09:30:00.000Z' },
  },
  {
    reviewId: 'rev-8',
    doctorId: 'doc-2',
    patientId: 'patient-9',
    appointmentId: 'apt-r-8',
    rating: 4,
    comment: 'Very competent doctor. The only issue was the high consultation fee, but the quality of care justifies it.',
    isAnonymous: true,
    createdAt: '2026-02-10T11:45:00.000Z',
  },
  {
    reviewId: 'rev-9',
    doctorId: 'doc-2',
    patientId: 'patient-15',
    appointmentId: 'apt-r-9',
    rating: 5,
    comment: 'Dr. Sara performed my mother\'s angiography and stent placement. Everything went smoothly. We are extremely grateful.',
    isAnonymous: false,
    createdAt: '2026-01-15T09:00:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-3 (Dr. Fatima Zahra — Dermatologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-10',
    doctorId: 'doc-3',
    patientId: 'patient-6',
    appointmentId: 'apt-r-10',
    rating: 5,
    comment: 'My acne cleared up completely after following her treatment plan. She\'s very detailed and thorough. Best skin doctor!',
    isAnonymous: false,
    createdAt: '2026-03-12T14:30:00.000Z',
    response: { text: 'So happy to hear that! Keep following the skincare routine.', respondedAt: '2026-03-13T11:00:00.000Z' },
  },
  {
    reviewId: 'rev-11',
    doctorId: 'doc-3',
    patientId: 'patient-7',
    appointmentId: 'apt-r-11',
    rating: 4,
    comment: 'Good dermatologist. Prescribed effective treatment for my eczema. The clinic is clean and modern. Slightly expensive but worth it.',
    isAnonymous: false,
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    reviewId: 'rev-12',
    doctorId: 'doc-3',
    patientId: 'patient-10',
    appointmentId: 'apt-r-12',
    rating: 5,
    comment: 'Dr. Fatima is amazing! Got laser treatment for pigmentation and the results are incredible. She takes time with each patient.',
    isAnonymous: true,
    createdAt: '2026-02-18T16:00:00.000Z',
  },
  {
    reviewId: 'rev-13',
    doctorId: 'doc-3',
    patientId: 'patient-14',
    appointmentId: 'apt-r-13',
    rating: 3,
    comment: 'Treatment was okay but took longer than expected to show results. Had to visit multiple times.',
    isAnonymous: true,
    createdAt: '2026-01-25T13:30:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-4 (Dr. Usman Tariq — Pediatrician)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-14',
    doctorId: 'doc-4',
    patientId: 'patient-11',
    appointmentId: 'apt-r-14',
    rating: 5,
    comment: 'Wonderful with children! My 3-year-old son was terrified of doctors but Dr. Usman made him comfortable. He\'s so gentle and caring.',
    isAnonymous: false,
    createdAt: '2026-03-14T10:00:00.000Z',
    response: { text: 'Children always come first! Glad your little one is doing well.', respondedAt: '2026-03-14T18:00:00.000Z' },
  },
  {
    reviewId: 'rev-15',
    doctorId: 'doc-4',
    patientId: 'patient-13',
    appointmentId: 'apt-r-15',
    rating: 4,
    comment: 'Good pediatrician. He diagnosed my daughter\'s ear infection quickly and the treatment worked within days. Recommended!',
    isAnonymous: false,
    createdAt: '2026-02-25T11:30:00.000Z',
  },
  {
    reviewId: 'rev-16',
    doctorId: 'doc-4',
    patientId: 'patient-16',
    appointmentId: 'apt-r-16',
    rating: 5,
    comment: 'Been taking all three kids to Dr. Usman for years. He remembers each child\'s history and always follows up. Exceptional doctor.',
    isAnonymous: false,
    createdAt: '2026-02-05T09:45:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-5 (Dr. Hassan Raza — Orthopedic)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-17',
    doctorId: 'doc-5',
    patientId: 'patient-17',
    appointmentId: 'apt-r-17',
    rating: 5,
    comment: 'I had a sports injury in my knee. Dr. Hassan accurately diagnosed ACL tear and the surgery went perfectly. Full recovery in 6 months!',
    isAnonymous: false,
    createdAt: '2026-03-08T15:00:00.000Z',
  },
  {
    reviewId: 'rev-18',
    doctorId: 'doc-5',
    patientId: 'patient-18',
    appointmentId: 'apt-r-18',
    rating: 4,
    comment: 'Good surgeon. My back pain significantly reduced after following his treatment plan. Would have preferred more follow-up calls.',
    isAnonymous: true,
    createdAt: '2026-02-14T14:15:00.000Z',
  },
  {
    reviewId: 'rev-19',
    doctorId: 'doc-5',
    patientId: 'patient-19',
    appointmentId: 'apt-r-19',
    rating: 3,
    comment: 'Competent surgeon but the waiting time is really long. I waited 2 hours past my appointment time.',
    isAnonymous: true,
    createdAt: '2026-01-30T12:00:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-6 (Dr. Amna Sheikh — Gynecologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-20',
    doctorId: 'doc-6',
    patientId: 'patient-20',
    appointmentId: 'apt-r-20',
    rating: 5,
    comment: 'Dr. Amna handled my entire high-risk pregnancy with such care and expertise. My baby was delivered safely. She is truly a blessing!',
    isAnonymous: false,
    createdAt: '2026-03-01T10:30:00.000Z',
    response: { text: 'Congratulations on the little one! Wishing you and the baby great health.', respondedAt: '2026-03-02T09:00:00.000Z' },
  },
  {
    reviewId: 'rev-21',
    doctorId: 'doc-6',
    patientId: 'patient-21',
    appointmentId: 'apt-r-21',
    rating: 5,
    comment: 'Best gynecologist in Karachi. She is thorough, compassionate, and always available for questions even after hours.',
    isAnonymous: false,
    createdAt: '2026-02-22T16:30:00.000Z',
  },
  {
    reviewId: 'rev-22',
    doctorId: 'doc-6',
    patientId: 'patient-22',
    appointmentId: 'apt-r-22',
    rating: 4,
    comment: 'Very professional and knowledgeable. The clinic staff could be more organized with appointments though.',
    isAnonymous: true,
    createdAt: '2026-02-05T13:00:00.000Z',
  },
  {
    reviewId: 'rev-23',
    doctorId: 'doc-6',
    patientId: 'patient-23',
    appointmentId: 'apt-r-23',
    rating: 5,
    comment: 'Dr. Amna performed my laparoscopic surgery with great skill. Minimal scarring and quick recovery. I\'m so grateful!',
    isAnonymous: false,
    createdAt: '2026-01-18T11:15:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-7 (Dr. Nabeel Akhtar — Neurologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-24',
    doctorId: 'doc-7',
    patientId: 'patient-24',
    appointmentId: 'apt-r-24',
    rating: 5,
    comment: 'My migraines have been under control since visiting Dr. Nabeel. He finally figured out the right combination of preventive medications.',
    isAnonymous: false,
    createdAt: '2026-03-11T14:45:00.000Z',
    response: { text: 'Glad the treatment is working. Let\'s keep monitoring progress at our next visit.', respondedAt: '2026-03-12T10:00:00.000Z' },
  },
  {
    reviewId: 'rev-25',
    doctorId: 'doc-7',
    patientId: 'patient-25',
    appointmentId: 'apt-r-25',
    rating: 4,
    comment: 'Very knowledgeable neurologist. He ordered the right tests for my father\'s tremor and diagnosed early Parkinson\'s. Good doctor.',
    isAnonymous: false,
    createdAt: '2026-02-28T10:30:00.000Z',
  },
  {
    reviewId: 'rev-26',
    doctorId: 'doc-7',
    patientId: 'patient-26',
    appointmentId: 'apt-r-26',
    rating: 5,
    comment: 'Excellent epilepsy specialist. After years of uncontrolled seizures, Dr. Nabeel adjusted my medication and I\'ve been seizure-free for 8 months!',
    isAnonymous: false,
    createdAt: '2026-02-10T09:00:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-9 (Dr. Asma Khalid — Ophthalmologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-27',
    doctorId: 'doc-9',
    patientId: 'patient-27',
    appointmentId: 'apt-r-27',
    rating: 5,
    comment: 'Got LASIK done by Dr. Asma. Perfect vision now! The entire process was smooth and she explained every step beforehand.',
    isAnonymous: false,
    createdAt: '2026-03-15T11:00:00.000Z',
  },
  {
    reviewId: 'rev-28',
    doctorId: 'doc-9',
    patientId: 'patient-28',
    appointmentId: 'apt-r-28',
    rating: 4,
    comment: 'Good eye doctor. Treated my mother\'s cataract successfully. Post-op care was excellent. Only issue was long wait for surgery date.',
    isAnonymous: false,
    createdAt: '2026-02-20T14:00:00.000Z',
  },
  {
    reviewId: 'rev-29',
    doctorId: 'doc-9',
    patientId: 'patient-29',
    appointmentId: 'apt-r-29',
    rating: 5,
    comment: 'Dr. Asma caught my glaucoma early during a routine checkup. Her thoroughness literally saved my vision. Can\'t thank her enough.',
    isAnonymous: false,
    createdAt: '2026-01-28T16:30:00.000Z',
    response: { text: 'Early detection is crucial. Keep up with your eye drops and regular check-ups!', respondedAt: '2026-01-29T10:30:00.000Z' },
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-10 (Prof. Dr. Tariq Mehmood — Orthopedic)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-30',
    doctorId: 'doc-10',
    patientId: 'patient-30',
    appointmentId: 'apt-r-30',
    rating: 5,
    comment: 'My mother had total knee replacement by Prof. Tariq. She\'s walking pain-free now after years of suffering. Truly a master surgeon!',
    isAnonymous: false,
    createdAt: '2026-03-13T12:30:00.000Z',
  },
  {
    reviewId: 'rev-31',
    doctorId: 'doc-10',
    patientId: 'patient-31',
    appointmentId: 'apt-r-31',
    rating: 5,
    comment: 'One of the best orthopedic surgeons in Lahore. He operated on my fractured hip and I was walking within a week. Amazing results.',
    isAnonymous: false,
    createdAt: '2026-02-25T09:15:00.000Z',
    response: { text: 'Keep doing your physiotherapy exercises regularly. You\'re doing great!', respondedAt: '2026-02-26T11:00:00.000Z' },
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-11 (Dr. Sadia Qureshi — Gynecologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-32',
    doctorId: 'doc-11',
    patientId: 'patient-32',
    appointmentId: 'apt-r-32',
    rating: 5,
    comment: 'After 4 years of trying, we finally had a successful pregnancy thanks to Dr. Sadia\'s IVF treatment. She is truly a miracle worker!',
    isAnonymous: true,
    createdAt: '2026-03-07T11:00:00.000Z',
  },
  {
    reviewId: 'rev-33',
    doctorId: 'doc-11',
    patientId: 'patient-33',
    appointmentId: 'apt-r-33',
    rating: 4,
    comment: 'Good doctor for PCOS treatment. She prescribed hormonal therapy that regulated my cycles within 3 months. Very patient with questions.',
    isAnonymous: false,
    createdAt: '2026-02-15T14:30:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-12 (Dr. Imran Saleem — ENT)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-34',
    doctorId: 'doc-12',
    patientId: 'patient-34',
    appointmentId: 'apt-r-34',
    rating: 5,
    comment: 'Had chronic sinus issues for years. Dr. Imran performed endoscopic sinus surgery and I can breathe freely now. Life changing!',
    isAnonymous: false,
    createdAt: '2026-03-09T10:45:00.000Z',
  },
  {
    reviewId: 'rev-35',
    doctorId: 'doc-12',
    patientId: 'patient-35',
    appointmentId: 'apt-r-35',
    rating: 4,
    comment: 'Good ENT doctor. Treated my son\'s recurring tonsils problem. He was very gentle with the child during examination.',
    isAnonymous: false,
    createdAt: '2026-02-18T13:30:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-15 (Dr. Mehreen Iqbal — Psychiatrist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-36',
    doctorId: 'doc-15',
    patientId: 'patient-36',
    appointmentId: 'apt-r-36',
    rating: 5,
    comment: 'Dr. Mehreen literally changed my life. I was suffering from severe anxiety and panic attacks. Her CBT sessions helped me regain control.',
    isAnonymous: true,
    createdAt: '2026-03-10T16:00:00.000Z',
    response: { text: 'You did all the hard work! Keep practicing the techniques we discussed.', respondedAt: '2026-03-11T10:30:00.000Z' },
  },
  {
    reviewId: 'rev-37',
    doctorId: 'doc-15',
    patientId: 'patient-37',
    appointmentId: 'apt-r-37',
    rating: 5,
    comment: 'The most compassionate doctor I\'ve ever visited. She listens without judgment and provides practical coping strategies. Highly recommended.',
    isAnonymous: true,
    createdAt: '2026-02-22T11:00:00.000Z',
  },
  {
    reviewId: 'rev-38',
    doctorId: 'doc-15',
    patientId: 'patient-38',
    appointmentId: 'apt-r-38',
    rating: 4,
    comment: 'Good psychiatrist. Helped me with OCD. The medication she prescribed had minimal side effects, which I appreciated.',
    isAnonymous: true,
    createdAt: '2026-01-30T14:45:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-18 (Prof. Dr. Shahzad Alam — Pulmonologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-39',
    doctorId: 'doc-18',
    patientId: 'patient-39',
    appointmentId: 'apt-r-39',
    rating: 5,
    comment: 'Best pulmonologist in Karachi. Managed my severe asthma excellently. He even followed up by phone after my first visit.',
    isAnonymous: false,
    createdAt: '2026-03-06T10:15:00.000Z',
  },
  {
    reviewId: 'rev-40',
    doctorId: 'doc-18',
    patientId: 'patient-40',
    appointmentId: 'apt-r-40',
    rating: 4,
    comment: 'Very experienced doctor. Did bronchoscopy on my father with great care. Recovery was faster than expected.',
    isAnonymous: false,
    createdAt: '2026-02-16T15:00:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-19 (Dr. Saira Batool — Gastroenterologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-41',
    doctorId: 'doc-19',
    patientId: 'patient-41',
    appointmentId: 'apt-r-41',
    rating: 5,
    comment: 'Dr. Saira treated my Hepatitis C successfully. She monitored every stage of the treatment carefully. Alhamdulillah virus-free now!',
    isAnonymous: false,
    createdAt: '2026-03-04T12:00:00.000Z',
    response: { text: 'Alhamdulillah! Continue with the follow-up tests as scheduled.', respondedAt: '2026-03-05T09:30:00.000Z' },
  },
  {
    reviewId: 'rev-42',
    doctorId: 'doc-19',
    patientId: 'patient-42',
    appointmentId: 'apt-r-42',
    rating: 4,
    comment: 'Good GI doctor. Endoscopy was done professionally. Wait time was manageable. Would recommend for stomach issues.',
    isAnonymous: true,
    createdAt: '2026-02-12T11:30:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-20 (Dr. Noman Akbar — Endocrinologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-43',
    doctorId: 'doc-20',
    patientId: 'patient-43',
    appointmentId: 'apt-r-43',
    rating: 5,
    comment: 'My HbA1c dropped from 11 to 6.8 in just 4 months under Dr. Noman\'s care. His diet and lifestyle advice really works.',
    isAnonymous: false,
    createdAt: '2026-03-02T09:30:00.000Z',
  },
  {
    reviewId: 'rev-44',
    doctorId: 'doc-20',
    patientId: 'patient-44',
    appointmentId: 'apt-r-44',
    rating: 4,
    comment: 'Dr. Noman diagnosed my thyroid issue and started treatment immediately. Feeling much better now. Good doctor.',
    isAnonymous: false,
    createdAt: '2026-02-08T14:15:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-21 (Dr. Rizwan ul Haq — Nephrologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-45',
    doctorId: 'doc-21',
    patientId: 'patient-45',
    appointmentId: 'apt-r-45',
    rating: 5,
    comment: 'Dr. Rizwan managed my father\'s kidney transplant case from start to finish. His expertise and dedication are unmatched. We owe him everything.',
    isAnonymous: false,
    createdAt: '2026-03-13T11:00:00.000Z',
    response: { text: 'Your father\'s recovery has been excellent. Keep up with the immunosuppressants as scheduled.', respondedAt: '2026-03-14T10:00:00.000Z' },
  },
  {
    reviewId: 'rev-46',
    doctorId: 'doc-21',
    patientId: 'patient-46',
    appointmentId: 'apt-r-46',
    rating: 4,
    comment: 'Good nephrologist. Manages my dialysis schedule well. The kidney function has stabilized under his care. Clinic staff is also very helpful.',
    isAnonymous: false,
    createdAt: '2026-02-20T10:45:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-13 (Dr. Ayesha Siddiqui — Neurologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-47',
    doctorId: 'doc-13',
    patientId: 'patient-47',
    appointmentId: 'apt-r-47',
    rating: 4,
    comment: 'Good neurologist. She takes her time with patients and explains things well. Helped with my chronic headaches significantly.',
    isAnonymous: false,
    createdAt: '2026-03-05T13:30:00.000Z',
  },
  {
    reviewId: 'rev-48',
    doctorId: 'doc-13',
    patientId: 'patient-48',
    appointmentId: 'apt-r-48',
    rating: 5,
    comment: 'Dr. Ayesha is wonderful. She diagnosed my mother\'s Parkinson\'s early and the treatment has slowed the progression. Very caring doctor.',
    isAnonymous: false,
    createdAt: '2026-02-01T10:00:00.000Z',
  },

  // ═══════════════════════════════════════════
  //  Reviews for doc-14 (Dr. Faisal Rehman — Urologist)
  // ═══════════════════════════════════════════
  {
    reviewId: 'rev-49',
    doctorId: 'doc-14',
    patientId: 'patient-49',
    appointmentId: 'apt-r-49',
    rating: 5,
    comment: 'Had kidney stones and was in immense pain. Dr. Faisal did ESWL and stones were gone within a week. Excellent treatment.',
    isAnonymous: false,
    createdAt: '2026-03-10T09:00:00.000Z',
  },
  {
    reviewId: 'rev-50',
    doctorId: 'doc-14',
    patientId: 'patient-50',
    appointmentId: 'apt-r-50',
    rating: 3,
    comment: 'Doctor is skilled but the hospital was crowded and chaotic. Had to wait a long time. Treatment itself was effective though.',
    isAnonymous: true,
    createdAt: '2026-01-22T15:30:00.000Z',
  },
];

// Helper to get reviews for a specific doctor
export const getReviewsByDoctorId = (doctorId: string): DoctorReview[] =>
  dummyReviews.filter((r) => r.doctorId === doctorId);

// Helper to compute average rating for a doctor
export const getAverageRating = (doctorId: string): number => {
  const reviews = getReviewsByDoctorId(doctorId);
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
};
