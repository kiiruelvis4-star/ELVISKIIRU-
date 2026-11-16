import { CBCSyllabusTopic, SchemeOfWorkItem, LessonPlanItem, LessonNoteItem, RecordOfWorkItem, TeacherCATUploadItem } from '../types/cbcDocuments';

export const CBC_SYLLABUS_TOPICS: CBCSyllabusTopic[] = [
  // --- MATHEMATICS (GRADE 4) ---
  {
    id: 'math_g4_w1_whole_numbers',
    subject: 'Mathematics',
    grade: 'Grade 4',
    strand: 'Numbers',
    subStrand: 'Whole Numbers (Place Value & Total Value)',
    term: 'Term 3',
    week: 1,
    lessons: 5,
    outcomes: [
      'Identify place value of digits up to ten thousands (10,000)',
      'State total values of digits in given numerals up to 10,000',
      'Read and write numbers up to 10,000 in symbols and words',
    ],
    inquiryQuestions: [
      'Why is the position of a digit in a number important?',
      'How do we use place value in our daily money calculations?',
    ],
    competencies: ['Critical thinking and problem solving', 'Digital literacy', 'Numeracy'],
    values: ['Integrity', 'Respect', 'Responsibility'],
    notes: `Place Value refers to the position of a digit in a number.
From right to left, the positions are:
1. Ones (O) — multiplied by 1
2. Tens (T) — multiplied by 10
3. Hundreds (H) — multiplied by 100
4. Thousands (Th) — multiplied by 1,000
5. Ten Thousands (T.Th) — multiplied by 10,000

Total Value is the actual quantity that the digit represents:
Total Value = (Digit) × (Its Place Value).

For example in 7,429:
- The place value of 7 is Thousands; its total value is 7 × 1,000 = 7,000.
- The place value of 4 is Hundreds; its total value is 4 × 100 = 400.
- The place value of 2 is Tens; its total value is 2 × 10 = 20.
- The place value of 9 is Ones; its total value is 9 × 1 = 9.`,
    workedExamples: [
      {
        title: 'Finding Total Value',
        problem: 'Find the total value of digit 5 in the number 35,821.',
        solution: 'The digit 5 is in the Thousands position. Total Value = 5 × 1,000 = 5,000.',
      },
      {
        title: 'Writing in Words',
        problem: 'Write 8,046 in words.',
        solution: 'Eight thousand and forty-six.',
      },
    ],
    practiceQuestions: [
      {
        q: 'What is the place value of digit 6 in 6,419?',
        options: ['Thousands', 'Hundreds', 'Tens', 'Ones'],
        correctIndex: 0,
        explanation: 'In 6,419, 6 is in the thousands position, 4 is hundreds, 1 is tens, and 9 is ones.',
      },
      {
        q: 'What is the total value of digit 8 in 3,825?',
        options: ['80', '800', '8,000', '8'],
        correctIndex: 1,
        explanation: '8 is in hundreds place, so 8 × 100 = 800.',
      },
      {
        q: 'Write 5,012 in words.',
        options: [
          'Five thousand and twelve',
          'Fifty twelve',
          'Five hundred and twelve',
          'Five thousand one hundred and two',
        ],
        correctIndex: 0,
        explanation: '5,012 is read as five thousand and twelve.',
      },
    ],
  },
  {
    id: 'math_g4_w2_fractions_intro',
    subject: 'Mathematics',
    grade: 'Grade 4',
    strand: 'Numbers',
    subStrand: 'Fractions (Numerator, Denominator & Equivalent Fractions)',
    term: 'Term 3',
    week: 2,
    lessons: 5,
    outcomes: [
      'Define a fraction as an equal part of a whole or group',
      'Identify and name the numerator (top) and denominator (bottom)',
      'Generate equivalent fractions using circular cutouts and multiplication',
    ],
    inquiryQuestions: [
      'How does sharing food fairly connect to fractions in real life?',
      'Why must parts of a whole be equal in size?',
    ],
    competencies: ['Communication and collaboration', 'Self-efficacy', 'Critical thinking'],
    values: ['Sharing', 'Peace', 'Unity'],
    notes: `A Fraction names equal parts of a whole:
- Top number (Numerator): How many parts we are considering.
- Bottom number (Denominator): The total number of equal parts into which the whole is divided.

Key Rules:
1. All divided parts must be equal in size.
2. Proper fractions have a numerator smaller than the denominator (e.g., 3/4, 2/5).
3. Equivalent Fractions: Fractions that look different but represent the exact same amount.
   Example: 1/2 = 2/4 = 3/6 = 4/8.
   To find an equivalent fraction, multiply (or divide) both top and bottom by the same number!`,
    workedExamples: [
      {
        title: 'Making Equivalent Fractions',
        problem: 'Find the missing number: 2/3 = ? / 9.',
        solution: 'Since 3 × 3 = 9, multiply the top numerator 2 × 3 = 6. So 2/3 = 6/9.',
      },
      {
        title: 'Word Problem on Sharing',
        problem: 'Faith divided an orange into 4 equal slices. She gave 3 slices to her friends. What fraction did she give away?',
        solution: 'Parts given = 3, Total equal parts = 4. Fraction = 3/4.',
      },
    ],
    practiceQuestions: [
      {
        q: 'What is 3/4 + 1/4?',
        options: ['1/2', '1', '1 1/4', '4/8'],
        correctIndex: 1,
        explanation: '3/4 + 1/4 = 4/4 = 1 whole.',
      },
      {
        q: 'Which fraction is equivalent to 1/2?',
        options: ['2/3', '2/4', '3/5', '1/3'],
        correctIndex: 1,
        explanation: '1/2 multiplied by 2/2 = 2/4.',
      },
      {
        q: 'How many quarters make 1 whole?',
        options: ['2', '3', '4', '8'],
        correctIndex: 2,
        explanation: '4 quarters (1/4 + 1/4 + 1/4 + 1/4 = 4/4) make 1 whole.',
      },
    ],
  },
  {
    id: 'math_g4_w3_decimals',
    subject: 'Mathematics',
    grade: 'Grade 4',
    strand: 'Numbers',
    subStrand: 'Decimals (Tenths & Hundredths)',
    term: 'Term 3',
    week: 3,
    lessons: 5,
    outcomes: [
      'Represent tenths as decimals using fraction strip models',
      'Convert fractions with denominator 10 to decimals (e.g. 3/10 = 0.3)',
      'Add and subtract decimals up to one decimal place in context',
    ],
    inquiryQuestions: [
      'Where do we see decimals used in supermarkets, clinics, and sports?',
      'What is the difference between 3 and 0.3?',
    ],
    competencies: ['Numeracy', 'Digital literacy'],
    values: ['Accuracy', 'Patience'],
    notes: `A decimal point (.) separates whole numbers from fractions of a whole.
Tenths means one part out of ten equal parts:
- 1/10 = 0.1
- 2/10 = 0.2
- 5/10 = 0.5 (half)
- 9/10 = 0.9
- 10/10 = 1.0 (one whole)

When adding or subtracting decimals, always line up the decimal points vertically!`,
    workedExamples: [
      {
        title: 'Decimal Addition',
        problem: 'Add 1.4 + 2.3.',
        solution: 'Line up decimal points: 1.4 + 2.3 = 3.7.',
      },
    ],
    practiceQuestions: [
      {
        q: 'Write 7/10 as a decimal.',
        options: ['7.0', '0.7', '0.07', '70'],
        correctIndex: 1,
        explanation: '7/10 is seven tenths, written as 0.7.',
      },
      {
        q: 'Solve: 0.4 + 0.5 = ?',
        options: ['0.9', '0.45', '9.0', '0.1'],
        correctIndex: 0,
        explanation: '4 tenths plus 5 tenths equals 9 tenths (0.9).',
      },
    ],
  },

  // --- SCIENCE & TECHNOLOGY (GRADE 4) ---
  {
    id: 'sci_g4_w1_living_things',
    subject: 'Science & Technology',
    grade: 'Grade 4',
    strand: 'Living Things',
    subStrand: 'Plants and Animals in Our Local Environment',
    term: 'Term 3',
    week: 1,
    lessons: 4,
    outcomes: [
      'Distinguish between living things and non-living things using characteristics of life',
      'Identify characteristics of plants: feeding (photosynthesis), growing, reproduction',
      'Observe and record safety precautions when handling plants with thorns and sap',
    ],
    inquiryQuestions: [
      'How do plants get food since they cannot walk to a supermarket?',
      'Why are plants essential for animals to breathe and survive?',
    ],
    competencies: ['Learning to learn', 'Environmental literacy'],
    values: ['Care for nature', 'Cooperation'],
    notes: `All living things share 7 basic characteristics (MRS GREN):
1. Movement
2. Respiration (breathing)
3. Sensitivity (responding to changes)
4. Growth
5. Reproduction (producing young ones)
6. Excretion (removing waste)
7. Nutrition (feeding)

Green plants make their own food through Photosynthesis, using sunlight, carbon dioxide, and water through chlorophyll.
Animals cannot make food; they depend on plants directly or indirectly.`,
    workedExamples: [
      {
        title: 'Plant Characteristics',
        problem: 'Why do plants turn their leaves towards the window?',
        solution: 'Plants exhibit phototropism — growing towards sunlight to maximize light absorption for photosynthesis.',
      },
    ],
    practiceQuestions: [
      {
        q: 'Which living thing makes its own food using sunlight?',
        options: ['Dog', 'Plant', 'Mushroom', 'Fish'],
        correctIndex: 1,
        explanation: 'Plants are autotrophs that make food through photosynthesis.',
      },
      {
        q: 'What do green plants need to grow healthy?',
        options: ['Sunlight, water and fertile soil', 'Plastic and darkness', 'Only stones', 'Cold soda'],
        correctIndex: 0,
        explanation: 'Plants require sunlight, water, air, and mineral nutrients.',
      },
    ],
  },
  {
    id: 'sci_g4_w2_human_body',
    subject: 'Science & Technology',
    grade: 'Grade 4',
    strand: 'Living Things',
    subStrand: 'Human Digestive & Breathing System Basics',
    term: 'Term 3',
    week: 2,
    lessons: 4,
    outcomes: [
      'Name external and internal organs of the body',
      'Describe the function of teeth, mouth, stomach, and lungs',
      'Demonstrate healthy habits for dental care and clean air',
    ],
    inquiryQuestions: [
      'What happens to an apple after you chew and swallow it?',
      'Why does your chest rise and fall when you run?',
    ],
    competencies: ['Self-efficacy', 'Critical thinking'],
    values: ['Responsibility for personal health'],
    notes: `The Human Body has vital systems:
1. Digestive System: Breaks down food into simple nutrients the body can absorb.
   - Mouth (teeth chew, saliva softens)
   - Gullet / Oesophagus (pushes food to stomach)
   - Stomach (acid and enzymes break food down)
   - Small Intestines (nutrients absorbed into blood)
   - Large Intestines (water absorbed, waste forms stool)
2. Breathing System: Lungs take in Oxygen and remove Carbon Dioxide.`,
    workedExamples: [
      {
        title: 'Teeth Care',
        problem: 'Name the four types of human teeth.',
        solution: 'Incisors (cutting), Canines (tearing), Premolars and Molars (grinding & crushing).',
      },
    ],
    practiceQuestions: [
      {
        q: 'Which organ is primarily responsible for pumping blood throughout the body?',
        options: ['Heart', 'Lungs', 'Stomach', 'Kidneys'],
        correctIndex: 0,
        explanation: 'The heart is the muscular pump that circulates blood.',
      },
      {
        q: 'Which gas do our lungs absorb during breathing in?',
        options: ['Carbon dioxide', 'Oxygen', 'Helium', 'Smoke'],
        correctIndex: 1,
        explanation: 'Oxygen is taken in from fresh air and used by cells.',
      },
    ],
  },

  // --- ENGLISH (GRADE 4) ---
  {
    id: 'eng_g4_w1_nouns',
    subject: 'English',
    grade: 'Grade 4',
    strand: 'Reading & Grammar',
    subStrand: 'Nouns (Common, Proper, Singular & Plural)',
    term: 'Term 3',
    week: 1,
    lessons: 5,
    outcomes: [
      'Identify nouns as naming words for people, places, animals, and things',
      'Differentiate between common and proper nouns (capitalization)',
      'Form plural forms of regular and irregular nouns correctly',
    ],
    inquiryQuestions: [
      'Why do names of people and towns start with capital letters?',
      'How does changing a noun to plural affect the sentence?',
    ],
    competencies: ['Communication', 'Literacy'],
    values: ['Respect', 'Honesty'],
    notes: `A Noun is a naming word.
- Proper Nouns: Names of specific people, places, days, or months. ALWAYS capitalize the first letter (e.g., Faith, Nairobi, Nakuru, Kenya, Monday, October).
- Common Nouns: General names of items (e.g., boy, school, book, dog, river).

Plural Rules:
- Add -s: book -> books, desk -> desks
- Add -es (words ending in -s, -sh, -ch, -x): box -> boxes, church -> churches
- Change -y to -ies: baby -> babies
- Irregular plurals: child -> children, man -> men, tooth -> teeth, ox -> oxen`,
    workedExamples: [
      {
        title: 'Plural Identification',
        problem: 'What is the plural of "ox" and "child"?',
        solution: 'Ox -> Oxen; Child -> Children.',
      },
    ],
    practiceQuestions: [
      {
        q: 'Choose the proper noun in this sentence: "Faith travels to Nakuru by bus."',
        options: ['bus', 'travels', 'Nakuru', 'by'],
        correctIndex: 2,
        explanation: 'Nakuru is the name of a specific town and starts with a capital letter.',
      },
      {
        q: 'What is the plural form of "box"?',
        options: ['boxs', 'boxes', 'boxies', 'boxen'],
        correctIndex: 1,
        explanation: 'Nouns ending in x take -es: boxes.',
      },
      {
        q: 'Which word is an irregular plural?',
        options: ['Pencils', 'Tables', 'Children', 'Desks'],
        correctIndex: 2,
        explanation: 'Child changes to children (irregular).',
      },
    ],
  },

  // --- KISWAHILI (GRADE 4) ---
  {
    id: 'kisw_g4_w1_nomino',
    subject: 'Kiswahili',
    grade: 'Grade 4',
    strand: 'Kusoma na Sarufi',
    subStrand: 'Nomino na Ngeli za Maneno',
    term: 'Term 3',
    week: 1,
    lessons: 5,
    outcomes: [
      'Kutambua nomino kama majina ya watu, vitu, na mahali',
      'Kubadilisha nomino kutoka umoja hadi wingi',
      'Kutumia viashiria sahihi katika sentensi',
    ],
    inquiryQuestions: [
      'Kwa nini ni muhimu kuelewa wingi wa maneno unapozungumza Kiswahili?',
    ],
    competencies: ['Uwezo wa kuwasiliana', 'Kujiamini'],
    values: ['Uzendo', 'Heshima'],
    notes: `Nomino ni jina la mtu, kitu, mahali au dhana.
Mifano ya Nomino:
- Watu: mtoto, mwalimu, daktari, Faith
- Vitu: kitabu, kalamu, meza, kiti
- Mahali: Nakuru, shule, darasa, nyumba

Umoja na Wingi:
- Mtoto -> Watoto (Ngeli ya A-WA)
- Kitabu -> Vitabu (Ngeli ya KI-VI)
- Mti -> Miti (Ngeli ya M-MI)`,
    workedExamples: [
      {
        title: 'Kubadilisha sentensi katika wingi',
        problem: 'Badilisha: "Mwanafunzi anasoma kitabu."',
        solution: 'Wanafunzi wanasoma vitabu.',
      },
    ],
    practiceQuestions: [
      {
        q: 'Wingi wa neno "kitabu" ni nini?',
        options: ['vitabu', 'mitabu', 'makitabu', 'kitabus'],
        correctIndex: 0,
        explanation: 'Katika ngeli ya KI-VI, kitabu huwa vitabu.',
      },
      {
        q: 'Kamilisha sentensi: "Mimi _____ mwanafunzi wa Little Roses Academy."',
        options: ['ni', 'wa', 'ya', 'za'],
        correctIndex: 0,
        explanation: 'Kitenzi "ni" kinatumika kueleza hali (Mimi ni mwanafunzi).',
      },
    ],
  },
];

// Helper: Generate a full term CBC Scheme of Work for any Subject and Grade
export function generateCBCSchemeOfWork(
  grade: string,
  subject: string,
  term: 'Term 1' | 'Term 2' | 'Term 3',
  teacherId: string,
  teacherName: string
): SchemeOfWorkItem {
  const topics = CBC_SYLLABUS_TOPICS.filter((t) => t.subject === subject);
  const rows = [];

  for (let week = 1; week <= 12; week++) {
    const topic = topics[(week - 1) % (topics.length || 1)] || {
      strand: 'Core Curriculum Strand',
      subStrand: `Sub-strand Week ${week}`,
      outcomes: ['Understand key principles', 'Apply learned skills in practical activities'],
      inquiryQuestions: ['How does this concept apply in daily life?'],
      competencies: ['Critical thinking', 'Creativity'],
      values: ['Responsibility', 'Integrity'],
    };

    for (let lesson = 1; lesson <= 5; lesson++) {
      rows.push({
        week,
        lesson,
        strand: topic.strand,
        subStrand: topic.subStrand,
        specificLearningOutcomes: topic.outcomes?.[lesson % (topic.outcomes.length || 1)] || 'By the end of the lesson, the learner should be able to apply concepts accurately.',
        keyInquiryQuestions: topic.inquiryQuestions?.[0] || 'How do we solve problems using this skill?',
        learningExperiences: `Learners work in pairs using charts, visual realia, and worksheets to explore ${topic.subStrand}.`,
        learningResources: 'KLB Approved Textbook, flashcards, teacher lesson notes, digital tablet/slate.',
        assessmentMethods: lesson === 5 ? 'Weekly CAT / Written Review' : 'Oral questions, observation, learner whiteboard work.',
        reflection: lesson === 5 ? '92% of learners achieved competency standards; remedial review planned for next week.' : undefined,
      });
    }
  }

  return {
    id: `scheme_${grade.replace(/\s+/g, '_')}_${subject.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}_${Date.now()}`,
    teacherId,
    teacherName,
    grade,
    subject,
    term,
    year: 2026,
    rows,
    approvedByHod: true,
    createdAt: 'Term Opening Week',
    updatedAt: new Date().toLocaleDateString('en-KE'),
  };
}

// Helper: Generate a CBC 5-Step Lesson Plan
export function generateCBCLessonPlan(
  grade: string,
  subject: string,
  topic: CBCSyllabusTopic,
  teacherId: string,
  teacherName: string
): LessonPlanItem {
  return {
    id: `lp_${Date.now()}`,
    teacherId,
    teacherName,
    grade,
    subject,
    date: new Date().toISOString().slice(0, 10),
    time: '08:20 – 09:00 (Lesson 1)',
    roll: '42 / 42 Learners Present',
    strand: topic.strand,
    subStrand: topic.subStrand,
    specificLearningOutcomes: topic.outcomes.join('; '),
    keyInquiryQuestion: topic.inquiryQuestions[0] || 'How do we demonstrate mastery of this topic?',
    learningResources: 'Chalkboard / Whiteboard, Charts, Learner Workbook, CBC Lesson Notes, Sample Models.',
    organization: 'Individual work, guided peer discussion, and whole class plenary.',
    introduction: 'Teacher greets the class and reviews the previous lesson with 2 rapid diagnostic questions. Learners recall core definitions (5 mins).',
    steps: [
      {
        step: 'Step 1: Concept Exposure',
        teacherActivity: 'Teacher demonstrates the principle using real-life examples on the chalkboard and asks inquiry questions.',
        learnerActivity: 'Learners listen, ask clarifying questions, and observe demonstrated illustrations.',
        duration: '10 mins',
      },
      {
        step: 'Step 2: Guided Practice',
        teacherActivity: 'Teacher walks around providing scaffolded support and checks learner rough work.',
        learnerActivity: 'Learners work in pairs to solve 3 guided examples in their exercise books.',
        duration: '15 mins',
      },
      {
        step: 'Step 3: Independent Review & Synthesis',
        teacherActivity: 'Teacher nominates learners to explain solutions on the board and affirms correct methodologies.',
        learnerActivity: 'Learners present solutions and note corrections.',
        duration: '5 mins',
      },
    ],
    conclusion: 'Teacher summarizes core points, assigns homework from the CBC worksheet, and dismisses the lesson (5 mins).',
    selfReflection: 'All learners actively engaged. Those requiring support paired with peer leaders for homework assistance.',
    createdAt: new Date().toLocaleDateString('en-KE'),
  };
}

// Initial Sample Professional Documents
export const INITIAL_CBC_SCHEMES: SchemeOfWorkItem[] = [
  generateCBCSchemeOfWork('Grade 4', 'Mathematics', 'Term 3', 't_kelvin', 'Tr. Peter Kibet'),
  generateCBCSchemeOfWork('Grade 5', 'Science & Technology', 'Term 3', 't_kelvin', 'Tr. Peter Kibet'),
];

export const INITIAL_CBC_LESSON_PLANS: LessonPlanItem[] = [
  generateCBCLessonPlan(
    'Grade 4',
    'Mathematics',
    CBC_SYLLABUS_TOPICS[1], // Fractions
    't_kelvin',
    'Tr. Peter Kibet'
  ),
  generateCBCLessonPlan(
    'Grade 5',
    'Science & Technology',
    CBC_SYLLABUS_TOPICS[3], // Living things
    't_kelvin',
    'Tr. Peter Kibet'
  ),
];

export const INITIAL_CBC_LESSON_NOTES: LessonNoteItem[] = [
  {
    id: 'note_frac_1',
    teacherId: 't_kelvin',
    teacherName: 'Tr. Peter Kibet',
    grade: 'Grade 4',
    subject: 'Mathematics',
    strand: 'Numbers',
    subStrand: 'Fractions (Equivalent Fractions & Addition)',
    title: 'Grade 4 Mathematics: Complete Fractions Masterclass Notes',
    content: `Fractions represent equal parts of a whole object or set of objects.
1. The Numerator represents parts taken or counted.
2. The Denominator shows the total equal parts making the whole.
3. Equivalent Fractions: Fractions with the same value even though they have different numbers (e.g., 1/2 = 2/4 = 4/8).
4. Addition of Like Fractions: Add the numerators while keeping the common denominator unchanged (e.g. 2/7 + 3/7 = 5/7).`,
    workedExamples: `Example 1:
Add 3/8 + 2/8.
Since denominators are both 8, add top: 3 + 2 = 5.
Answer: 5/8.

Example 2:
Find equivalent fraction: 2/5 = ?/15.
5 × 3 = 15, so 2 × 3 = 6.
Answer: 6/15.`,
    learnerExercises: `1. 4/9 + 3/9 = ____
2. Write two equivalent fractions for 1/3.
3. Which fraction is bigger: 1/2 or 1/4?`,
    publishedToFocusZone: true,
    publishedAt: '24 Oct, 09:30',
  },
  {
    id: 'note_sci_1',
    teacherId: 't_kelvin',
    teacherName: 'Tr. Peter Kibet',
    grade: 'Grade 5',
    subject: 'Science & Technology',
    strand: 'Living Things',
    subStrand: 'Human Respiratory System & Gas Exchange',
    title: 'Grade 5 Science: Breathing Mechanism & Lung Health Notes',
    content: `The human breathing system brings oxygen into our blood and expels carbon dioxide.
Key Organs:
1. Nose & Nostrils: Hair and mucus filter dust, warm and moisten incoming air.
2. Trachea (Windpipe): Tube with cartilage rings allowing smooth air passage.
3. Bronchi & Bronchioles: Branch into left and right lungs.
4. Alveoli (Air Sacs): Tiny thin-walled sacs where oxygen enters blood and carbon dioxide leaves.
5. Diaphragm: Muscular sheet beneath lungs. When breathing in, it flattens downward.`,
    workedExamples: `Inhaling (Breathing In):
- Diaphragm contracts and moves DOWN.
- Chest cavity expands.
- Air rushes into lungs.

Exhaling (Breathing Out):
- Diaphragm relaxes and arches UPWARD.
- Chest cavity contracts.
- Air is pushed out.`,
    learnerExercises: `1. Name the organ where gas exchange occurs.
2. State two ways to protect our lungs from pollution.
3. What is the role of nasal hairs during breathing?`,
    publishedToFocusZone: true,
    publishedAt: '23 Oct, 11:15',
  },
];

export const INITIAL_CBC_RECORDS_OF_WORK: RecordOfWorkItem[] = [
  {
    id: 'rec_01',
    teacherId: 't_kelvin',
    teacherName: 'Tr. Peter Kibet',
    grade: 'Grade 4',
    subject: 'Mathematics',
    term: 'Term 3',
    week: 1,
    date: '2026-10-16',
    workCovered: 'Place value up to 10,000, reading and writing numbers in symbols and words. Exercises 1-4 completed.',
    learnersPresent: 41,
    totalLearners: 42,
    teacherRemarks: 'Learners grasped place value charts effectively. One pupil absent with medical excuse.',
    hodStatus: 'Approved',
    hodRemarks: 'Accurate record. Well aligned with syllabus scheme.',
    createdAt: '16 Oct, 16:30',
  },
  {
    id: 'rec_02',
    teacherId: 't_kelvin',
    teacherName: 'Tr. Peter Kibet',
    grade: 'Grade 4',
    subject: 'Mathematics',
    term: 'Term 3',
    week: 2,
    date: '2026-10-23',
    workCovered: 'Fractions introduction, numerator and denominator naming, visual fraction strips, and equivalent fractions drills.',
    learnersPresent: 42,
    totalLearners: 42,
    teacherRemarks: 'Class achieved 100% attendance. Practical paper folding made equivalent fractions clear.',
    hodStatus: 'Approved',
    hodRemarks: 'Excellent practical engagement observed during lesson walkthrough.',
    createdAt: '23 Oct, 16:15',
  },
];

export const INITIAL_TEACHER_CAT_UPLOADS: TeacherCATUploadItem[] = [
  {
    id: 'cat_upload_frac_01',
    teacherId: 't_kelvin',
    teacherName: 'Tr. Peter Kibet',
    cls: 'Grade 4|Mathematics',
    grade: 'Grade 4',
    subject: 'Mathematics',
    strand: 'Numbers',
    subStrand: 'Fractions & Equivalent Halves',
    title: 'Grade 4 Mathematics Term 3 CAT 1 (Fractions & Decimals)',
    kind: 'CAT',
    dueDate: 'Friday, 2:00 PM',
    totalMarks: 10,
    questionsCount: 10,
    instructions: 'Pupils must solve all 10 problems on the question paper. Parents kindly sign at the bottom upon completion.',
    documents: [
      {
        id: 'doc_init_1',
        name: 'Grade4_Mathematics_Fractions_CAT1_QuestionPaper.pdf',
        size: 245000,
        type: 'application/pdf',
        ext: 'PDF',
        extractedText: `LITTLE ROSES ACADEMY — NAKURU
CONTINUOUS ASSESSMENT TEST (CAT 1) — TERM 3
Grade 4 | Learning Area: Mathematics Activities
Time: 40 Minutes | Maximum Marks: 10

Instructions: Answer all questions in the spaces provided.
1. What is the numerator in the fraction 3/5? (1 Mark)
2. Convert 1/2 into an equivalent fraction with denominator 8. (1 Mark)
3. Add the following fractions: 2/7 + 3/7 = ____ (1 Mark)
4. Shade 3/4 of the rectangular figure shown on the board. (1 Mark)
5. Subtract 1/5 from 4/5. (1 Mark)
6. Write 'zero point four' as a common decimal. (1 Mark)
7. Faith shared a pawpaw into 6 equal parts. She gave 2 parts to her brother. What fraction remains? (1 Mark)
8. Arrange the following fractions from smallest to largest: 1/8, 5/8, 3/8, 7/8. (1 Mark)
9. Which fraction is larger: 2/3 or 1/3? (1 Mark)
10. If 1 whole sugarcane is cut into tenths, how many tenths make one whole? (1 Mark)

Teacher Remark & Stamp: Little Roses Academic Faculty · Checked & Confirmed.`,
        wordCount: 172,
        pageCount: 1,
        uploadedAt: '20 Oct, 08:35',
      },
    ],
    status: 'published',
    publishedAt: '20 Oct, 08:45',
    sharedWithParents: true,
    whatsappMessage: `*LITTLE ROSES ACADEMY — TERM 3 ASSESSMENT ALERT* 🌹
Dear Grade 4 Parent / Guardian,
Teacher Peter Kibet has published *Grade 4 Mathematics CAT 1 (Fractions & Decimals)* online.

📋 *Assessment Details:*
• Total Marks: 10 Marks (CBC CAT 1)
• Due Date: Friday, 2:00 PM
• Topic: Fractions & Decimals (Strand: Numbers)
• Format: Printable Question Paper (PDF attached in Parent Portal)

Please log into your Parent Portal or check the attached question paper to supervise your child's review.
Thank you for partnering with Little Roses Academy!`,
    learnerSubmissionsCount: 38,
  },
  {
    id: 'cat_upload_sci_02',
    teacherId: 't_kelvin',
    teacherName: 'Tr. Peter Kibet',
    cls: 'Grade 5|Science & Technology',
    grade: 'Grade 5',
    subject: 'Science & Technology',
    strand: 'Living Things',
    subStrand: 'Human Respiratory System',
    title: 'Grade 5 Science Continuous Assessment 2 (Breathing & Lungs)',
    kind: 'CAT',
    dueDate: 'Monday, 8:00 AM',
    totalMarks: 10,
    questionsCount: 10,
    instructions: 'Answer all 10 diagnostic questions on lung models and gas exchange.',
    documents: [
      {
        id: 'doc_init_2',
        name: 'Grade5_Science_Respiratory_System_Worksheet.docx',
        size: 182000,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ext: 'DOCX',
        extractedText: `LITTLE ROSES ACADEMY
SCIENCE & TECHNOLOGY — GRADE 5 CONTINUOUS ASSESSMENT 2
Strand: Human Body Systems | Sub-Strand: Respiratory System

1. Name the main organ responsible for breathing in human beings.
2. What happens to the diaphragm when you breathe in (inhale)?
3. State two ways of keeping the breathing system healthy.
4. Why are the hair and mucus in our nostrils important during air filtration?
5. List the pathway of air from the nose to the lungs.
6. What gas is absorbed into the blood during gas exchange?
7. How does regular exercise benefit lung capacity in growing children?
8. Identify two harmful effects of air pollution on human health.
9. Describe the model built in class using a bottle, Y-tube, and balloons.
10. Mention one symptom of common respiratory infections and how to prevent it.`,
        wordCount: 145,
        pageCount: 1,
        uploadedAt: '23 Oct, 11:35',
      },
    ],
    status: 'published',
    publishedAt: '23 Oct, 11:45',
    sharedWithParents: true,
    whatsappMessage: `*LITTLE ROSES ACADEMY — TERM 3 ASSESSMENT ALERT* 🌹
Dear Grade 5 Parent / Guardian,
Teacher Peter Kibet has uploaded *Grade 5 Science Continuous Assessment 2 (Breathing & Lungs)* online.

📋 *Assessment Details:*
• Total Marks: 10 Marks
• Due Date: Monday, 8:00 AM
• Topic: Human Respiratory System (Strand: Living Things)
• Format: Word DOCX / PDF in Parent Portal

Kindly ensure your child revises their science notes before answering.`,
    learnerSubmissionsCount: 34,
  },
];
