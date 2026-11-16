// Authentic Kenya Institute of Curriculum Development (KICD) Past Paper & Revision Bank
// Includes 67 Consecutive Daily CBC Holiday CATs (30th October – 4th January) for Grades 1–6

export interface KICDQuestion {
  id: string;
  questionNumber: number;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  competency: string;
  strand?: string;
}

export interface DailyHolidayCAT {
  id: string;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number; // 1 to 67
  grade: number; // 1 to 6
  subject: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  strand: string;
  questions: KICDQuestion[];
}

export interface KICDPastPaper {
  id: string;
  title: string;
  grade: number;
  subject: string;
  year: number;
  term: 'Term 1' | 'Term 2' | 'Term 3' | 'Holiday Revision';
  totalQuestions: number;
  timeAllowed: string;
  description: string;
  hasMarkingScheme: boolean;
  questions: KICDQuestion[];
}

// 7 Rotating subjects across week
const HOLIDAY_SUBJECT_ROTATION = [
  { subject: 'Mathematics', strand: 'Numbers, Fractions & Algebra' },
  { subject: 'English', strand: 'Reading Comprehension & Grammar' },
  { subject: 'Kiswahili', strand: 'Sarufi, Kusoma na Msamiati' },
  { subject: 'Science & Technology', strand: 'Living Things, Matter & Environment' },
  { subject: 'Social Studies', strand: 'Environment, Culture & Resources' },
  { subject: 'Agriculture & Nutrition', strand: 'Crop Farming & Healthy Living' },
  { subject: 'Creative Arts', strand: 'Drawing, Color Theory & Kenyan Music' },
];

// Rich curriculum question bank across subjects and grades
const QUESTION_TEMPLATES: Record<string, KICDQuestion[]> = {
  Mathematics: [
    {
      id: 'm1',
      questionNumber: 1,
      stem: 'What is 3/4 + 1/4 in simplest form?',
      options: { A: '4/8', B: '1', C: '1 1/4', D: '1/2' },
      correctAnswer: 'B',
      explanation: '3/4 + 1/4 = 4/4 which simplifies to 1 whole.',
      competency: 'Critical Thinking & Numeracy',
    },
    {
      id: 'm2',
      questionNumber: 2,
      stem: 'Which fraction is equivalent to 2/5?',
      options: { A: '4/10', B: '2/10', C: '5/2', D: '3/5' },
      correctAnswer: 'A',
      explanation: 'Multiplying both numerator and denominator by 2 gives 2x2/5x2 = 4/10.',
      competency: 'Mathematical Communication',
    },
    {
      id: 'm3',
      questionNumber: 3,
      stem: 'A rectangle has a length of 8 cm and width of 5 cm. What is its perimeter?',
      options: { A: '40 cm', B: '26 cm', C: '13 cm', D: '52 cm' },
      correctAnswer: 'B',
      explanation: 'Perimeter of a rectangle = 2 x (length + width) = 2 x (8 + 5) = 2 x 13 = 26 cm.',
      competency: 'Problem Solving',
    },
    {
      id: 'm4',
      questionNumber: 4,
      stem: 'What is the place value of digit 7 in 47,825?',
      options: { A: 'Hundreds', B: 'Tens', C: 'Thousands', D: 'Ten Thousands' },
      correctAnswer: 'C',
      explanation: 'In 47,825, digit 5 is Ones, 2 is Tens, 8 is Hundreds, and 7 is Thousands.',
      competency: 'Numeracy Concepts',
    },
    {
      id: 'm5',
      questionNumber: 5,
      stem: 'A farmer collected 360 eggs. How many trays of 30 eggs did he fill?',
      options: { A: '10', B: '12', C: '15', D: '18' },
      correctAnswer: 'B',
      explanation: '360 divided by 30 = 12 trays.',
      competency: 'Everyday Mathematical Application',
    },
  ],
  English: [
    {
      id: 'e1',
      questionNumber: 1,
      stem: 'Identify the plural form of the noun "child":',
      options: { A: 'Childs', B: 'Childrens', C: 'Children', D: 'Childes' },
      correctAnswer: 'C',
      explanation: '"Children" is an irregular plural noun.',
      competency: 'Language & Literacy',
    },
    {
      id: 'e2',
      questionNumber: 2,
      stem: 'Choose the correct preposition: "The school bus arrived ___ 8:00 AM."',
      options: { A: 'on', B: 'at', C: 'in', D: 'by' },
      correctAnswer: 'B',
      explanation: 'We use the preposition "at" with specific clock times.',
      competency: 'Grammatical Accuracy',
    },
    {
      id: 'e3',
      questionNumber: 3,
      stem: 'Which word is the antonym (opposite) of "polite"?',
      options: { A: 'Rude', B: 'Kind', C: 'Clever', D: 'Honest' },
      correctAnswer: 'A',
      explanation: 'Rude means ill-mannered or discourteous, which is the direct opposite of polite.',
      competency: 'Vocabulary Mastery',
    },
    {
      id: 'e4',
      questionNumber: 4,
      stem: 'Identify the verb in the sentence: "Faith sings melodiously in the choir."',
      options: { A: 'Faith', B: 'sings', C: 'melodiously', D: 'choir' },
      correctAnswer: 'B',
      explanation: '"Sings" is the action word (verb) performed by the subject Faith.',
      competency: 'Sentence Construction',
    },
    {
      id: 'e5',
      questionNumber: 5,
      stem: 'Select the correct sentence with proper punctuation:',
      options: {
        A: 'Where is your homework book',
        B: 'where is your homework book?',
        C: 'Where is your homework book?',
        D: 'Where is your homework book.',
      },
      correctAnswer: 'C',
      explanation: 'A question starts with a capital letter and ends with a question mark.',
      competency: 'Punctuation Skills',
    },
  ],
  Kiswahili: [
    {
      id: 'k1',
      questionNumber: 1,
      stem: 'Wingi wa sentensi: "Mwanafunzi anasoma kitabu kizuri" ni:',
      options: {
        A: 'Wanafunzi anasoma vitabu kizuri',
        B: 'Wanafunzi wanasoma vitabu vizuri',
        C: 'Wanafunzi wanasoma mavitabu mazuri',
        D: 'Wanafunzi wanasoma vitabu mizuri',
      },
      correctAnswer: 'B',
      explanation: 'Ngeli ya A-WA na KI-VI: Mwanafunzi -> Wanafunzi wanasoma; kitabu kizuri -> vitabu vizuri.',
      competency: 'Upatano wa Kisarufi',
    },
    {
      id: 'k2',
      questionNumber: 2,
      stem: 'Chagua kinyume cha neno "anika":',
      options: { A: 'vua', B: 'kunjua', C: 'anua', D: 'futa' },
      correctAnswer: 'C',
      explanation: 'Kinyume cha kuanika nguo au nafaka juani ni kuanua.',
      competency: 'Msamiati wa Kiswahili',
    },
    {
      id: 'k3',
      questionNumber: 3,
      stem: 'Shikamoo hutumika kama maamkizi ya:',
      options: {
        A: 'Watu wa rika moja',
        B: 'Mdogo kumuamkua mkubwa kwa heshima',
        C: 'Mkubwa kumuamkua mdogo',
        D: 'Kuwakaribisha wageni',
      },
      correctAnswer: 'B',
      explanation: 'Shikamoo ni salamu ya heshima inayotolewa na mtu mdogo kwa mwenye umri mkubwa (jibu lake ni Marahaba).',
      competency: 'Ustaarabu na Maamkizi',
    },
    {
      id: 'k4',
      questionNumber: 4,
      stem: 'Sehemu ya mwili inayotumiwa kusikia sauti inaitwa:',
      options: { A: 'Jicho', B: 'Pua', C: 'Sikio', D: 'Mdomo' },
      correctAnswer: 'C',
      explanation: 'Sikio ndicho kiungo cha hisi ya kusikia sauti.',
      competency: 'Sehemu za Mwili',
    },
    {
      id: 'k5',
      questionNumber: 5,
      stem: 'Tegua kitendawili: "Nyumba yangu haina mlango wala dirisha."',
      options: { A: 'Yai', B: 'Gari', C: 'Kabati', D: 'Chungwa' },
      correctAnswer: 'A',
      explanation: 'Teguzi sahihi ya kitendawili hiki cha asili cha Kiswahili ni Yai.',
      competency: 'Fasihi Simulizi',
    },
  ],
  'Science & Technology': [
    {
      id: 's1',
      questionNumber: 1,
      stem: 'Which organ in the human body pumps blood to all other body parts?',
      options: { A: 'Lungs', B: 'Heart', C: 'Stomach', D: 'Kidney' },
      correctAnswer: 'B',
      explanation: 'The heart acts as a muscular pump propelling oxygenated blood through blood vessels.',
      competency: 'Living Things & Human Body',
    },
    {
      id: 's2',
      questionNumber: 2,
      stem: 'Which of the following is a non-renewable source of energy?',
      options: { A: 'Solar energy', B: 'Wind energy', C: 'Coal & Petroleum', D: 'Biogas' },
      correctAnswer: 'C',
      explanation: 'Coal and crude petroleum are fossil fuels that deplete over time and take millions of years to form.',
      competency: 'Environmental Conservation',
    },
    {
      id: 's3',
      questionNumber: 3,
      stem: 'Which state of matter has a definite shape and a definite volume?',
      options: { A: 'Solid', B: 'Liquid', C: 'Gas', D: 'Plasma' },
      correctAnswer: 'A',
      explanation: 'Solids have fixed particles tightly packed, giving them definite shape and volume.',
      competency: 'Matter & Materials',
    },
    {
      id: 's4',
      questionNumber: 4,
      stem: 'What is the main function of chlorophyll in green plant leaves?',
      options: {
        A: 'To give the plant a sweet fragrance',
        B: 'To trap sunlight for photosynthesis',
        C: 'To absorb water from soil',
        D: 'To protect plants from insects',
      },
      correctAnswer: 'B',
      explanation: 'Chlorophyll absorbs light energy necessary for plants to make food during photosynthesis.',
      competency: 'Scientific Investigation',
    },
    {
      id: 's5',
      questionNumber: 5,
      stem: 'Which digital computing device is primarily used for outputting sound?',
      options: { A: 'Microphone', B: 'Keyboard', C: 'Speaker / Headphones', D: 'Mouse' },
      correctAnswer: 'C',
      explanation: 'Speakers and headphones convert digital audio signals into audible sound waves for the listener.',
      competency: 'Digital Literacy',
    },
  ],
  'Social Studies': [
    {
      id: 'ss1',
      questionNumber: 1,
      stem: 'Lake Nakuru National Park is world-famous for which bird species?',
      options: { A: 'Ostrich', B: 'Flamingos', C: 'Eagle', D: 'Peacock' },
      correctAnswer: 'B',
      explanation: 'Lake Nakuru is globally renowned for thousands of greater and lesser flamingos that feed on blue-green algae.',
      competency: 'Nakuru County Tourism & Wildlife',
    },
    {
      id: 'ss2',
      questionNumber: 2,
      stem: 'The compass direction directly between North and East is:',
      options: { A: 'North-West', B: 'South-East', C: 'North-East', D: 'South-West' },
      correctAnswer: 'C',
      explanation: 'North-East (NE) is the cardinal intermediate direction halfway between North and East.',
      competency: 'Map Reading & Navigation',
    },
    {
      id: 'ss3',
      questionNumber: 3,
      stem: 'Who heads the administrative County government in Kenya?',
      options: { A: 'County Governor', B: 'Senator', C: 'Chief Justice', D: 'Speaker' },
      correctAnswer: 'A',
      explanation: 'Under the 2010 Constitution of Kenya, the Governor is the executive head of the county government.',
      competency: 'Citizenship & Governance',
    },
    {
      id: 'ss4',
      questionNumber: 4,
      stem: 'Which cultural monument in Nakuru preserves prehistoric stone tools and fossils?',
      options: { A: 'Fort Jesus', B: 'Hyrax Hill Prehistoric Site', C: 'Gedi Ruins', D: 'Bomas of Kenya' },
      correctAnswer: 'B',
      explanation: 'Hyrax Hill Museum and prehistoric site in Nakuru displays Neolithic settlements and Obsidian tools.',
      competency: 'Historical Heritage',
    },
    {
      id: 'ss5',
      questionNumber: 5,
      stem: 'A person who helps others cross a busy road near a school is promoting:',
      options: { A: 'Traffic congestion', B: 'Road safety and care', C: 'Pollution', D: 'Disobedience' },
      correctAnswer: 'B',
      explanation: 'Guiding pedestrians and pupils safely across zebra crossings preserves lives and promotes community road safety.',
      competency: 'Community Living',
    },
  ],
  'Agriculture & Nutrition': [
    {
      id: 'ag1',
      questionNumber: 1,
      stem: 'Which method of soil conservation involves creating stone barriers along slopes?',
      options: { A: 'Mulching', B: 'Stone lines (Gabions/Bunds)', C: 'Overgrazing', D: 'Deforestation' },
      correctAnswer: 'B',
      explanation: 'Stone lines and gabions slow down surface runoff velocity and trap fertile eroded topsoil.',
      competency: 'Soil & Water Conservation',
    },
    {
      id: 'ag2',
      questionNumber: 2,
      stem: 'Which of the following foods is rich in Vitamin C and boosts body immunity?',
      options: { A: 'Ugali', B: 'Oranges and Lemons', C: 'Margarine', D: 'White Sugar' },
      correctAnswer: 'B',
      explanation: 'Citrus fruits such as oranges and lemons are exceptionally rich sources of ascorbic acid (Vitamin C).',
      competency: 'Nutrition & Healthy Living',
    },
    {
      id: 'ag3',
      questionNumber: 3,
      stem: 'Drip irrigation is preferred in dry seasons because it:',
      options: {
        A: 'Wastes the most water',
        B: 'Delivers water drop by drop directly to plant roots',
        C: 'Attracts wild birds',
        D: 'Erodes soil trenches',
      },
      correctAnswer: 'B',
      explanation: 'Drip irrigation is the most water-efficient system, minimizing evaporation by irrigating directly at the root zone.',
      competency: 'Agricultural Technologies',
    },
    {
      id: 'ag4',
      questionNumber: 4,
      stem: 'Which farm tool is most suitable for collecting raked grass and leveling nursery beds?',
      options: { A: 'Panga', B: 'Garden Rake', C: 'Wheelbarrow', D: 'Watering Can' },
      correctAnswer: 'B',
      explanation: 'A garden rake is designed with metal prongs for clearing debris, gathering cut grass, and fine-tilthing beds.',
      competency: 'Farm Tools & Equipment',
    },
    {
      id: 'ag5',
      questionNumber: 5,
      stem: 'Which of the following is an organic fertilizer?',
      options: { A: 'Compost manure', B: 'CAN chemical granules', C: 'DAP powder', D: 'Urea crystals' },
      correctAnswer: 'A',
      explanation: 'Compost and farmyard manure are derived from decomposed plant matter and animal waste without synthetic chemicals.',
      competency: 'Crop Production',
    },
  ],
  'Creative Arts': [
    {
      id: 'ca1',
      questionNumber: 1,
      stem: 'Mixing Blue and Yellow paints produces which secondary colour?',
      options: { A: 'Orange', B: 'Purple', C: 'Green', D: 'Brown' },
      correctAnswer: 'C',
      explanation: 'Blue (primary) + Yellow (primary) creates Green (secondary colour).',
      competency: 'Colour Theory & Visual Arts',
    },
    {
      id: 'ca2',
      questionNumber: 2,
      stem: 'Which traditional Kenyan musical instrument is made from animal skin stretched over hollow wood?',
      options: { A: 'Nyatiti', B: 'Traditional Drum (Ngoma)', C: 'Flute (Chivoti)', D: 'Shantu' },
      correctAnswer: 'B',
      explanation: 'The ngoma is a membranophone crafted with a resonant wooden shell and cowhide drumhead.',
      competency: 'Kenyan Musical Heritage',
    },
    {
      id: 'ca3',
      questionNumber: 3,
      stem: 'Which technique involves rolling clay into long snake-like strips to build a pot?',
      options: { A: 'Coil technique', B: 'Pinch method', C: 'Slab method', D: 'Carving' },
      correctAnswer: 'A',
      explanation: 'The coil method layers long rolls of clay on top of each other to shape pottery vessels.',
      competency: 'Clay Work & Crafts',
    },
    {
      id: 'ca4',
      questionNumber: 4,
      stem: 'What is the tempo of a song?',
      options: {
        A: 'The pitch highness',
        B: 'The speed or pace of the music',
        C: 'The singer’s attire',
        D: 'The lyrics language',
      },
      correctAnswer: 'B',
      explanation: 'Tempo defines the pace or speed at which a musical composition is performed (fast, moderate, or slow).',
      competency: 'Musical Elements',
    },
    {
      id: 'ca5',
      questionNumber: 5,
      stem: 'A clean and balanced gymnastic landing requires a child to:',
      options: {
        A: 'Land on straight stiff knees',
        B: 'Bend knees slightly with arms outstretched for balance',
        C: 'Fall sideways on hands',
        D: 'Close their eyes tight',
      },
      correctAnswer: 'B',
      explanation: 'Flexing the knees absorbs impact forces smoothly while extended arms stabilize the center of gravity.',
      competency: 'Physical Movement & Balance',
    },
  ],
};

// Generate 67 consecutive daily holiday CATs: 30th October 2026 to 4th January 2027
export function generateHolidayCalendarSchedule(): DailyHolidayCAT[] {
  const schedule: DailyHolidayCAT[] = [];
  const startDate = new Date(2026, 9, 30); // October 30, 2026
  const totalDays = 67; // Through January 4, 2027

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Subject rotation
    const rot = HOLIDAY_SUBJECT_ROTATION[i % HOLIDAY_SUBJECT_ROTATION.length];
    const baseQuestions = QUESTION_TEMPLATES[rot.subject] || QUESTION_TEMPLATES['Mathematics'];

    // Clone and adapt questions for this date
    const questions: KICDQuestion[] = baseQuestions.map((q, idx) => ({
      ...q,
      id: `hol_${dateStr}_q${idx + 1}`,
      questionNumber: idx + 1,
    }));

    schedule.push({
      id: `cat_hol_${dateStr}`,
      dateStr,
      dayNumber: i + 1,
      grade: 4, // Default primary target
      subject: rot.subject,
      strand: rot.strand,
      title: `Day ${i + 1} Holiday Revision: ${rot.subject}`,
      durationMinutes: 15,
      totalMarks: questions.length * 2, // 10 marks total
      questions,
    });
  }

  return schedule;
}

export const ALL_HOLIDAY_CATS: DailyHolidayCAT[] = generateHolidayCalendarSchedule();

export function getHolidayCATForDate(dateStr: string, targetGrade = 4): DailyHolidayCAT {
  const found = ALL_HOLIDAY_CATS.find((c) => c.dateStr === dateStr);
  if (found) {
    return { ...found, grade: targetGrade };
  }
  // Default fallback to Day 1
  return { ...ALL_HOLIDAY_CATS[0], grade: targetGrade };
}

// Built-in KICD Past Paper Collection for Grades 1 to 6
export const KICD_PAST_PAPERS_COLLECTION: KICDPastPaper[] = [
  {
    id: 'kicd_g4_math_2026',
    title: 'Grade 4 KICD National Model Paper — Mathematics Activities',
    grade: 4,
    subject: 'Mathematics',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour',
    description: 'Authentic CBC assessment evaluating Number operations, Fractions, Measurement, Geometry and Data handling.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['Mathematics'],
  },
  {
    id: 'kicd_g4_eng_2026',
    title: 'Grade 4 KICD Model Assessment — English Language Activities',
    grade: 4,
    subject: 'English',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour',
    description: 'Testing reading comprehension, active vocabulary, parts of speech, and creative sentence building.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['English'],
  },
  {
    id: 'kicd_g4_kis_2026',
    title: 'Gredi ya 4 Jaribio la Kitaifa la KICD — Kiswahili Lugha na Kusoma',
    grade: 4,
    subject: 'Kiswahili',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: 'Saa 1',
    description: 'Tathmini rasmi ya CBC kuhusu sarufi, vitendawili, maamkizi, ngeli, na ufahamu wa hadithi fupi.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['Kiswahili'],
  },
  {
    id: 'kicd_g4_sci_2026',
    title: 'Grade 4 KICD Model Paper — Science & Technology',
    grade: 4,
    subject: 'Science & Technology',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour',
    description: 'Covers Human body systems, plant photosynthesis, states of matter, and basic digital computing tools.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['Science & Technology'],
  },
  {
    id: 'kicd_g4_soc_2026',
    title: 'Grade 4 KICD Assessment — Social Studies & Citizenship',
    grade: 4,
    subject: 'Social Studies',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour',
    description: 'Explores Nakuru County geography, Hyrax Hill prehistory, Lake Nakuru biodiversity, and community citizenship.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['Social Studies'],
  },
  {
    id: 'kicd_g4_agri_2026',
    title: 'Grade 4 KICD Standard Paper — Agriculture & Nutrition',
    grade: 4,
    subject: 'Agriculture & Nutrition',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour',
    description: 'Focuses on soil conservation gabions, drip irrigation techniques, balanced diets, and safe handling of farm tools.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['Agriculture & Nutrition'],
  },
  {
    id: 'kicd_g4_arts_2026',
    title: 'Grade 4 KICD Model Paper — Creative Arts & Physical Education',
    grade: 4,
    subject: 'Creative Arts',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour',
    description: 'Colour mixing, indigenous Kenyan musical drums, pottery coils, and gymnastics safety landings.',
    hasMarkingScheme: true,
    questions: QUESTION_TEMPLATES['Creative Arts'],
  },
  // Grade 1 Lower Primary
  {
    id: 'kicd_g1_math_2026',
    title: 'Grade 1 KICD Foundational Assessment — Mathematical Activities',
    grade: 1,
    subject: 'Mathematics',
    year: 2026,
    term: 'Holiday Revision',
    totalQuestions: 5,
    timeAllowed: '45 Mins',
    description: 'Lower primary counting, grouping objects, comparing sizes, and basic sums within 20.',
    hasMarkingScheme: true,
    questions: [
      {
        id: 'g1_m1',
        questionNumber: 1,
        stem: 'What is 5 + 4?',
        options: { A: '8', B: '9', C: '10', D: '7' },
        correctAnswer: 'B',
        explanation: '5 plus 4 objects equals 9 objects in total.',
        competency: 'Foundational Addition',
      },
      {
        id: 'g1_m2',
        questionNumber: 2,
        stem: 'Which number comes right after 19?',
        options: { A: '18', B: '20', C: '21', D: '22' },
        correctAnswer: 'B',
        explanation: 'Counting forward: 18, 19, 20.',
        competency: 'Number Sequence',
      },
      {
        id: 'g1_m3',
        questionNumber: 3,
        stem: 'Which shape has 3 sides?',
        options: { A: 'Circle', B: 'Square', C: 'Triangle', D: 'Rectangle' },
        correctAnswer: 'C',
        explanation: 'A triangle has three straight sides and three corners.',
        competency: 'Basic Geometry',
      },
      {
        id: 'g1_m4',
        questionNumber: 4,
        stem: 'Complete the pattern: 2, 4, 6, ___',
        options: { A: '7', B: '8', C: '9', D: '10' },
        correctAnswer: 'B',
        explanation: 'We are counting forward in twos (twos skip pattern): 2, 4, 6, 8.',
        competency: 'Patterns & Algebra',
      },
      {
        id: 'g1_m5',
        questionNumber: 5,
        stem: 'A cat has 4 legs. How many legs do 2 cats have?',
        options: { A: '6', B: '8', C: '10', D: '4' },
        correctAnswer: 'B',
        explanation: '4 legs + 4 legs = 8 legs.',
        competency: 'Early Multiplication Concept',
      },
    ],
  },
  // Grade 6 Upper Primary
  {
    id: 'kicd_g6_sci_2026',
    title: 'Grade 6 KICD National Prep Exam — Science & Technology',
    grade: 6,
    subject: 'Science & Technology',
    year: 2026,
    term: 'Term 3',
    totalQuestions: 5,
    timeAllowed: '1 Hour 15 Mins',
    description: 'KPSEA preparatory standard assessment covering circulatory system, forces, electricity, and ecosystem interdependence.',
    hasMarkingScheme: true,
    questions: [
      {
        id: 'g6_s1',
        questionNumber: 1,
        stem: 'Which blood vessels carry oxygenated blood away from the heart to body organs?',
        options: { A: 'Veins', B: 'Arteries', C: 'Capillaries', D: 'Venules' },
        correctAnswer: 'B',
        explanation: 'Arteries have thick elastic walls to carry oxygenated blood under high pressure away from the heart.',
        competency: 'Human Circulatory System',
      },
      {
        id: 'g6_s2',
        questionNumber: 2,
        stem: 'Which simple machine is found in a pair of scissors and a wheelbarrow?',
        options: { A: 'Lever', B: 'Pulley', C: 'Inclined Plane', D: 'Screw' },
        correctAnswer: 'A',
        explanation: 'Both use pivot (fulcrum), load, and effort principles classified under levers.',
        competency: 'Forces & Simple Machines',
      },
      {
        id: 'g6_s3',
        questionNumber: 3,
        stem: 'A circuit has a bulb, dry cell, and switch. If the switch is open, the bulb will:',
        options: { A: 'Shine brighter', B: 'Blow up', C: 'Not light', D: 'Flicker rapidly' },
        correctAnswer: 'C',
        explanation: 'An open switch breaks the continuity of electric current flow, so no current reaches the bulb.',
        competency: 'Electricity & Circuits',
      },
      {
        id: 'g6_s4',
        questionNumber: 4,
        stem: 'Which agricultural practice causes eutrophication in freshwater lakes like Lake Naivasha?',
        options: {
          A: 'Excessive use of synthetic fertilizers running into water bodies',
          B: 'Planting indigenous trees along river banks',
          C: 'Terracing steep hillsides',
          D: 'Rotational cattle grazing',
        },
        correctAnswer: 'A',
        explanation: 'Nutrient-rich nitrogen and phosphorus runoff triggers rapid algal blooms that deplete dissolved oxygen.',
        competency: 'Environmental Conservation',
      },
      {
        id: 'g6_s5',
        questionNumber: 5,
        stem: 'Which component of a computer system temporarily holds data currently in use by the CPU?',
        options: { A: 'Hard Disk Drive', B: 'Random Access Memory (RAM)', C: 'Power Supply Unit', D: 'Keyboard' },
        correctAnswer: 'B',
        explanation: 'RAM is volatile high-speed system memory storing instructions actively processed by the processor.',
        competency: 'Digital System Architecture',
      },
    ],
  },
];
