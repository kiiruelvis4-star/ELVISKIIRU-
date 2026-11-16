import { StudentCouncilRoleDef } from './types';

export const STUDENT_COUNCIL_ROLES: StudentCouncilRoleDef[] = [
  // Executive Roles
  {
    key: 'president',
    title: 'School President',
    category: 'executive',
    badge: '👑',
    color: '#7C3AED',
    duties: [
      'Represents all primary students in weekly administration liaison meetings.',
      'Leads morning parade assembly announcements alongside the duty teacher.',
      'Coordinates learner welfare initiatives and student peer mentorship.',
    ],
  },
  {
    key: 'deputy_president',
    title: 'Deputy President',
    category: 'executive',
    badge: '⭐',
    color: '#EC4899',
    duties: [
      'Assists the President and oversees the Student Prefect Council.',
      'Monitors dining etiquette and playground harmony during lunch hours.',
      'Manages student suggestion box with the Senior Guidance Teacher.',
    ],
  },
  // School-wide Prefects
  {
    key: 'academic_prefect',
    title: 'Academic Prefect',
    category: 'school',
    badge: '📚',
    color: '#2F6BFF',
    duties: [
      'Fosters reading culture and oversees junior reading & library corners.',
      'Assists teachers with distribution of revision materials and exercise books.',
      'Promotes participation in school debate and CBC academic clubs.',
    ],
  },
  {
    key: 'duty_prefect',
    title: 'Duty Prefect',
    category: 'school',
    badge: '🛡️',
    color: '#F59E0B',
    duties: [
      'Coordinates orderly hallway transitions between 40-minute CBC periods.',
      'Supports duty teachers during morning health breaks (9:40 & 11:20).',
      'Assists with orderly queueing at the dining hall and water points.',
    ],
  },
  {
    key: 'environment_prefect',
    title: 'Environment Prefect',
    category: 'school',
    badge: '🌿',
    color: '#10B981',
    duties: [
      'Supervises compound cleanliness and zero-litter policy across school grounds.',
      'Coordinates class flowerbed tending and tree-watering rotas.',
      'Ensures classroom waste bins are properly sorted and emptied daily.',
    ],
  },
  {
    key: 'sports_prefect',
    title: 'Sports Prefect',
    category: 'school',
    badge: '⚽',
    color: '#F97316',
    duties: [
      'Assists PE and Games Masters with equipment setup and collection.',
      'Encourages sportsmanship, teamwork, and fair play on the field.',
      'Maintains the sports gear inventory in the physical education store.',
    ],
  },
  {
    key: 'health_hygiene_prefect',
    title: 'Health and Hygiene Prefect',
    category: 'school',
    badge: '🧼',
    color: '#06B6D4',
    duties: [
      'Monitors handwashing stations to ensure clean water and soap are stocked.',
      'Inspects dining hall cleanliness before and after learner meals.',
      'Assists in reporting unwell pupils promptly to the school first-aid desk.',
    ],
  },
  // Grade-Specific Class Prefects (Grades 1 to 6)
  {
    key: 'class_prefect_g1',
    title: 'Class Prefect – Grade 1',
    category: 'class',
    targetGrade: 'Grade 1',
    badge: '📋',
    color: '#8B5CF6',
    duties: [
      'Assists Grade 1 class teacher with organizing learning resources & crayons.',
      'Leads pupils in lining up calmly for break time and departure.',
      'Reports any pupil distress or missing items to the class teacher.',
    ],
  },
  {
    key: 'class_prefect_g2',
    title: 'Class Prefect – Grade 2',
    category: 'class',
    targetGrade: 'Grade 2',
    badge: '📋',
    color: '#0EA5E9',
    duties: [
      'Maintains tidiness of reading corners and activity workbooks in Grade 2.',
      'Encourages quiet study when teachers transition between lessons.',
      'Monitors proper footwear and sweater placement during PE days.',
    ],
  },
  {
    key: 'class_prefect_g3',
    title: 'Class Prefect – Grade 3',
    category: 'class',
    targetGrade: 'Grade 3',
    badge: '📋',
    color: '#14B8A6',
    duties: [
      'Assists in collection and orderly return of CBC assessment books.',
      'Maintains clean chalkboards/whiteboards before subject teachers arrive.',
      'Oversees classroom window ventilation and end-of-day desk alignment.',
    ],
  },
  {
    key: 'class_prefect_g4',
    title: 'Class Prefect – Grade 4',
    category: 'class',
    targetGrade: 'Grade 4',
    badge: '📋',
    color: '#22C55E',
    duties: [
      'Coordinates learning groups for practical Agriculture and Science tasks.',
      'Collects daily homework assignments for teacher marking.',
      'Ensures all learning charts and classroom posters remain neatly pinned.',
    ],
  },
  {
    key: 'class_prefect_g5',
    title: 'Class Prefect – Grade 5',
    category: 'class',
    targetGrade: 'Grade 5',
    badge: '📋',
    color: '#EAB308',
    duties: [
      'Promotes focused private study during morning prep and afternoon slots.',
      'Assists with class roll calls and flags unexplained student absences.',
      'Represents Grade 5 learners in student council agenda submissions.',
    ],
  },
  {
    key: 'class_prefect_g6',
    title: 'Class Prefect – Grade 6',
    category: 'class',
    targetGrade: 'Grade 6',
    badge: '📋',
    color: '#F43F5E',
    duties: [
      'Leads candidate class learners with discipline and academic focus.',
      'Coordinates peer study circles and past paper discussion sessions.',
      'Liaises directly with the Senior Teacher on upper primary matters.',
    ],
  },
];
