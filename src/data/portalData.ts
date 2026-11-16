import { PortalConfig } from '../types';

export const PORTALS: PortalConfig[] = [
  {
    id: 'admin',
    name: 'School Administration',
    shortTitle: 'Admin',
    accentColor: '#F5B301',
    securityPrompt: '🔒 Phone or Email + password',
    credentialType: 'adminCode',
    credentialPlaceholder: '0711121142 or kiiruelvis4@gmail.com',
    sampleCredential: '0711121142',
    roleBadge: 'Leadership & Operations',
    description: 'Centralized governance for executive directors, headteachers, accountants, and registrar staff.',
    features: [
      'Fee Collection & Real-time Banking Reconciliation',
      'Staff Payroll & CBC Teacher Appraisals',
      'Ministry of Education (NEMIS / CBA) Portal Sync',
      'Fleet & School Bus GPS Tracking Oversight',
      'Admission Registry & Class Placement'
    ]
  },
  {
    id: 'staff',
    name: 'Staff and Teachers',
    shortTitle: 'Teachers',
    accentColor: '#3B82F6',
    securityPrompt: '📱 Phone + password',
    credentialType: 'phone',
    credentialPlaceholder: 'Enter registered mobile (e.g. 0712 345 678)',
    sampleCredential: '0712 345 678',
    roleBadge: 'Academic Faculty',
    description: 'Empowering Little Roses educators with curriculum tools, attendance loggers, and learner assessment dashboards.',
    features: [
      'Competency-Based Curriculum (CBC) Scoring & Rubrics',
      'Daily Morning Roll-Call & Meal Registration',
      'Homework Upload & Digital Lesson Plans',
      'Direct SMS & In-app Guardian Messaging',
      'Termly Subject Performance Analytics'
    ]
  },
  {
    id: 'parents',
    name: 'Parents and Guardians',
    shortTitle: 'Parents',
    accentColor: '#14B8A6',
    securityPrompt: '📱 Phone + password',
    credentialType: 'phone',
    credentialPlaceholder: 'Enter registered mobile (e.g. 0711 223 344)',
    sampleCredential: '0711 223 344',
    roleBadge: 'Family Portal',
    description: 'Direct window into your child’s holistic development, financial statements, and daily school activities.',
    features: [
      'Instant Fee Balance & M-Pesa Payment Receipts',
      'Termly Report Cards & Teacher Feedback Notes',
      'Live School Van Route Location Updates',
      'School Calendar, Clinic & Event Notifications',
      'Downloadable Holiday Learning Packs'
    ]
  },
  {
    id: 'learners',
    name: 'Learners',
    shortTitle: 'Students',
    accentColor: '#A78BFA',
    securityPrompt: '🔢 ADM number + PIN',
    credentialType: 'admNumber',
    credentialPlaceholder: 'Enter admission number (e.g. LRA/0001)',
    sampleCredential: 'LRA/0001',
    roleBadge: 'Learner Center',
    description: 'Kid-friendly portal for Little Roses pupils to explore interactive learning, submit assignments, and track badges.',
    features: [
      'Fun Interactive CBC Revision Quizzes',
      'Digital Storybook Library & Phonics Corner',
      'Weekly Merit Badges & Star Achievements',
      'Extracurricular Club Schedules & Art Gallery',
      'Daily Class Timetable & Homework Tracker'
    ]
  }
];

export const SCHOOL_INFO = {
  name: 'Little Roses Academy',
  motto: 'Much from little',
  location: 'Along the Nakuru Highway 1KM from Kabazi center',
  phone: '0798193966',
  whatsapp: '+254 736 573 436',
  email: 'kiiruelvis4@gmail.com',
  facebook: 'Little Roses Juniorate Academy',
  instagram: '@little_roses_academy',
  levels: 'Playgroup to Grade 6',
  intakeNote: 'Nursery, Grade 1 - 6 Intake On-going',
  founded: 'Registered with Ministry of Education · CBC Compliant',
  whyLittleRoses: [
    'Quality Education',
    'Experienced Educators',
    'A Conducive Environment for Learning',
    'Encouraging Well Rounded Individuals with Discipline',
    'Providing the Best Foundation for Our Future Generation'
  ],
  coreValues: [
    'Quality Education',
    'Experienced Educators',
    'A Conducive Environment for Learning',
    'Encouraging Well Rounded Individuals with Discipline',
    'Providing the Best Foundation for Our Future Generation'
  ]
};
