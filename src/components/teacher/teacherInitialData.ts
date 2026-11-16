import { TeacherState, Strand } from './types';

export const STARTER_CBC_STRANDS: Strand[] = [
  // --- GRADE 1: MATHEMATICS ---
  {
    id: 'strand_math_g1_numbers',
    name: 'Numbers & Number Concept',
    grade: 'Grade 1',
    subject: 'Mathematics',
    subStrands: [
      {
        id: 'sub_math_g1_counting',
        name: 'Counting & Number Sense (1 to 20)',
        strandId: 'strand_math_g1_numbers',
        term: 1,
        targetWeek: 2,
        totalLessons: 5,
        learnerNotes: `Numbers are names for how many objects we count!
1. When counting, point to one object at a time and say the number name in order: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 up to 20.
2. The last number you count tells how many items are in the whole group.
3. Zero (0) means there is nothing or an empty group.
4. Fun classroom game: Match 5 bottle tops to the number card 5!`,
        checkQuestions: [
          { question: 'What comes right after number 7 when counting forwards?', answer: 'Number 8.' },
          { question: 'If you have 4 pencils and buy 0 more, how many do you have?', answer: '4 pencils.' },
          { question: 'Which is greater: 9 stones or 6 stones?', answer: '9 stones.' },
        ],
        lessonPlans: [
          {
            lessonNumber: 1,
            title: 'Counting Concrete Objects 1 to 10',
            durationMinutes: 40,
            outcome: 'By the end of the lesson, the learner will be able to count objects accurately from 1 to 10 using bottle tops and counters.',
            keyInquiryQuestion: 'How do we know how many items are in a basket?',
            learningResources: 'Bottle tops, pebbles, number flashcards 1–10, tactile counting mat.',
            introduction: 'Sing number rhyme "One, two, buckle my shoe" (5 mins).',
            development: 'Teacher demonstrates counting 5 bottle tops aloud. Learners pair up with 10 pebbles each, practicing 1-to-1 correspondence (25 mins).',
            conclusion: 'Learners hold up flashcards corresponding to counted sets of chalk (5 mins).',
            reflection: 'All learners demonstrated accurate counting up to 10 with physical counters.',
          },
          {
            lessonNumber: 2,
            title: 'Representing Numbers with Numerals (1 to 10)',
            durationMinutes: 40,
            outcome: 'By the end of the lesson, the learner will be able to write numerals 1 to 10 in sand trays and exercise books.',
            keyInquiryQuestion: 'How do we write down the number of items we count?',
            learningResources: 'Sand trays, large printed number chart, slate boards.',
            introduction: 'Review counting forward to 10 using finger gestures (5 mins).',
            development: 'Teacher models numeral strokes on chalkboard. Learners trace numerals in sand trays then write in squared exercise books (25 mins).',
            conclusion: 'Learners swap books for peer praise on neat numeral formation (5 mins).',
            reflection: 'Number 3 and 7 reversals addressed with directional stroke arrows.',
          },
        ],
        assessments: [
          {
            id: 'as_m1_cat_1',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'CAT 1: Counting & Number Recognition (1 to 20)',
            maxMarks: 10,
            date: '2026-10-10',
            questionsList: [
              { number: 1, prompt: 'How many fingers are on both hands combined?', options: ['5', '8', '10', '12'], correctAnswer: '10', sourceExam: 'CBC Formative Bank' },
              { number: 2, prompt: 'What number comes immediately before 6?', options: ['4', '5', '7', '8'], correctAnswer: '5', sourceExam: 'CBC Formative Bank' },
              { number: 3, prompt: 'Count: 🍎 🍎 🍎. How many apples are there?', options: ['2', '3', '4', '5'], correctAnswer: '3', sourceExam: 'CBC Formative Bank' },
              { number: 4, prompt: 'Which group has the most: 4 beans or 7 beans?', options: ['4 beans', '7 beans', 'Equal', 'Neither'], correctAnswer: '7 beans', sourceExam: 'CBC Formative Bank' },
              { number: 5, prompt: 'Write the numeral for "Eight":', options: ['6', '7', '8', '9'], correctAnswer: '8', sourceExam: 'CBC Formative Bank' },
              { number: 6, prompt: 'What is 1 more than 9?', options: ['8', '10', '11', '12'], correctAnswer: '10', sourceExam: 'CBC Formative Bank' },
              { number: 7, prompt: 'Fill the blank: 12, 13, ___, 15', options: ['14', '16', '11', '10'], correctAnswer: '14', sourceExam: 'CBC Formative Bank' },
              { number: 8, prompt: 'Which number is smaller: 15 or 11?', options: ['15', '11', 'Equal', '16'], correctAnswer: '11', sourceExam: 'CBC Formative Bank' },
              { number: 9, prompt: 'If a basket has 0 mangoes, what does it mean?', options: ['It has 10', 'It has 1', 'It is empty', 'It is heavy'], correctAnswer: 'It is empty', sourceExam: 'CBC Formative Bank' },
              { number: 10, prompt: 'What comes after 19?', options: ['18', '20', '21', '22'], correctAnswer: '20', sourceExam: 'CBC Formative Bank' },
            ],
            scores: {
              'LRA/0001': 9, // Amina Ali Hassan
              'LRA/0002': 8, // Brian Kipkoech
            },
          },
          {
            id: 'as_m1_asg_1',
            type: 'Assignment',
            kind: 'Assignment',
            number: 1,
            title: 'Assignment 1: Drawing & Coloring Sets of 5',
            maxMarks: 10,
            date: '2026-10-12',
            scores: {
              'LRA/0001': 10,
              'LRA/0002': 9,
            },
          },
        ],
      },
      {
        id: 'sub_math_g1_addition',
        name: 'Whole Numbers: Addition & Putting Together',
        strandId: 'strand_math_g1_numbers',
        term: 1,
        targetWeek: 4,
        totalLessons: 5,
        learnerNotes: `Addition means joining or putting groups together to find the total!
1. The plus sign (+) means add or put together.
2. The equals sign (=) tells us how much both sides have.
3. Example: 3 red flowers and 2 yellow flowers make 5 flowers altogether. 3 + 2 = 5!`,
        checkQuestions: [
          { question: 'What is 2 + 3?', answer: '5.' },
          { question: 'If you have 4 marbles and find 1 more, how many do you have in total?', answer: '5 marbles.' },
        ],
        assessments: [
          {
            id: 'as_m1_cat_2',
            type: 'CAT',
            kind: 'CAT',
            number: 2,
            title: 'CAT 2: Single Digit Addition Within 10',
            maxMarks: 10,
            date: '2026-10-18',
            scores: {
              'LRA/0001': 9,
              'LRA/0002': 7,
            },
          },
        ],
      },
    ],
  },

  // --- GRADE 1: ENGLISH LANGUAGE ACTIVITIES ---
  {
    id: 'strand_eng_g1_listening',
    name: 'Listening, Speaking & Phonics',
    grade: 'Grade 1',
    subject: 'English',
    subStrands: [
      {
        id: 'sub_eng_g1_phonics',
        name: 'Letter Sound Recognition & Blends',
        strandId: 'strand_eng_g1_listening',
        term: 1,
        targetWeek: 3,
        totalLessons: 5,
        learnerNotes: `Every letter in the alphabet has a name and a sound!
1. Letter 'a' says /æ/ as in apple and ant.
2. Letter 'm' says /m/ as in mother and mango.
3. Letter 's' says /s/ like a hissing snake in the grass!
4. When we put sounds together: /s/ + /a/ + /t/ = sat!`,
        checkQuestions: [
          { question: 'What sound does the letter "m" make?', answer: '/m/ as in mango.' },
          { question: 'What word do you get when you blend /c/ /a/ /t/?', answer: 'Cat.' },
        ],
        assessments: [
          {
            id: 'as_e1_cat_1',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'CAT 1: Phonics & Initial Letter Sounds',
            maxMarks: 10,
            date: '2026-10-15',
            scores: {
              'LRA/0001': 10,
              'LRA/0002': 8,
            },
          },
        ],
      },
    ],
  },

  // --- GRADE 4: MATHEMATICS ---
  {
    id: 'strand_math_g4_numbers',
    name: 'Numbers',
    grade: 'Grade 4',
    subject: 'Mathematics',
    subStrands: [
      {
        id: 'sub_math_g4_whole_num',
        name: 'Whole Numbers & Place Value up to 10,000',
        strandId: 'strand_math_g4_numbers',
        term: 1,
        targetWeek: 2,
        totalLessons: 5,
        learnerNotes: `Place value tells us how much each digit is worth depending on where it sits in a number!
1. Place value chart columns: Thousands (Th), Hundreds (H), Tens (T), and Ones (O).
2. Example in 4,825:
   • 4 is in Thousands column -> Value = 4,000
   • 8 is in Hundreds column -> Value = 800
   • 2 is in Tens column -> Value = 20
   • 5 is in Ones column -> Value = 5
3. Reading large numbers: Group by three digits from right to left using commas or spaces. Example: 7,450 is read as 'Seven thousand, four hundred and fifty'.`,
        checkQuestions: [
          { question: 'What is the place value of digit 6 in 6,341?', answer: 'Thousands (its value is 6,000).' },
          { question: 'What is 5,000 + 300 + 40 + 7 written in short form?', answer: '5,347.' },
          { question: 'Which number is greater: 4,089 or 4,809?', answer: '4,809 because 8 hundreds is greater than 0 hundreds.' },
        ],
        lessonPlans: [
          {
            lessonNumber: 1,
            title: 'Place Value Identification up to Thousands',
            durationMinutes: 40,
            outcome: 'By the end of the lesson, the learner will be able to identify place value of digits in whole numbers up to 10,000 using an abacus.',
            keyInquiryQuestion: 'How does the position of a digit change how much it is worth?',
            learningResources: '4-spike abacus, place value pocket charts, number cards.',
            introduction: 'Review Ones, Tens, and Hundreds with spike abacus demonstrations (5 mins).',
            development: 'Teacher introduces Thousands spike on abacus. Learners construct 4-digit numbers in groups using base-ten blocks (25 mins).',
            conclusion: 'Oral quiz on place value of underlined digits on chalkboard (5 mins).',
            reflection: 'Learners readily mastered Thousands place value with tactile abacus work.',
          },
        ],
        assessments: [
          {
            id: 'as_m4_cat_1',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'CAT 1: Place Value up to 10,000',
            maxMarks: 20,
            date: '2026-10-14',
            questionsList: [
              { number: 1, prompt: 'What is the place value of digit 8 in 48,250?', options: ['Tens', 'Hundreds', 'Thousands', 'Ten Thousands'], correctAnswer: 'Thousands', sourceExam: 'KPSEA Past Paper' },
              { number: 2, prompt: 'Write in symbols: Six thousand, seven hundred and twelve.', options: ['6,712', '6,720', '60,712', '6,072'], correctAnswer: '6,712', sourceExam: 'KPSEA Past Paper' },
              { number: 3, prompt: 'What is the total value of digit 5 in 9,541?', options: ['5', '50', '500', '5,000'], correctAnswer: '500', sourceExam: 'KPSEA Past Paper' },
              { number: 4, prompt: 'Round off 3,847 to the nearest hundred:', options: ['3,800', '3,900', '3,850', '4,000'], correctAnswer: '3,800', sourceExam: 'KPSEA Past Paper' },
              { number: 5, prompt: 'Which of the following numbers is an even number?', options: ['2,415', '3,891', '4,568', '5,923'], correctAnswer: '4,568', sourceExam: 'KPSEA Past Paper' },
              { number: 6, prompt: 'What is 4,000 + 300 + 20 + 9?', options: ['43,290', '4,329', '432.9', '4,392'], correctAnswer: '4,329', sourceExam: 'KPSEA Past Paper' },
              { number: 7, prompt: 'Arrange in ascending order: 3410, 3140, 3401, 3014', options: ['3014, 3140, 3401, 3410', '3410, 3401, 3140, 3014', '3014, 3401, 3140, 3410', '3140, 3014, 3401, 3410'], correctAnswer: '3014, 3140, 3401, 3410', sourceExam: 'KPSEA Past Paper' },
              { number: 8, prompt: 'In a school there are 2,450 boys and 2,550 girls. How many learners are there altogether?', options: ['4,900', '5,000', '5,100', '4,000'], correctAnswer: '5,000', sourceExam: 'KPSEA Past Paper' },
              { number: 9, prompt: 'What is the difference between 8,000 and 3,450?', options: ['4,550', '5,550', '4,650', '5,450'], correctAnswer: '4,550', sourceExam: 'KPSEA Past Paper' },
              { number: 10, prompt: 'What is 35 multiplied by 100?', options: ['350', '3,500', '35,000', '35'], correctAnswer: '3,500', sourceExam: 'KPSEA Past Paper' },
            ],
            scores: {
              'LRA/0007': 18,
              'LRA/0008': 14,
            },
          },
          {
            id: 'as_m4_asg_1',
            type: 'Assignment',
            kind: 'Assignment',
            number: 1,
            title: 'Assignment 1: Number Sequences & Ordering',
            maxMarks: 15,
            date: '2026-10-18',
            scores: {
              'LRA/0007': 15,
              'LRA/0008': 11,
            },
          },
        ],
      },
      {
        id: 'sub_math_g4_fractions',
        name: 'Fractions & Decimals',
        strandId: 'strand_math_g4_numbers',
        term: 1,
        targetWeek: 5,
        totalLessons: 6,
        learnerNotes: `Fractions represent equal parts of a whole object or group!
1. Numerator (Top Number): Tells how many parts we are talking about or have shaded.
2. Denominator (Bottom Number): Tells how many equal parts the whole is divided into.
3. Proper fraction: Numerator is smaller than denominator (e.g., 3/4, 2/5).
4. Equivalent fractions: Fractions that have different numbers but equal the exact same amount. For example, 1/2 = 2/4 = 4/8.
5. Adding fractions with same denominator: Add numerators only; keep the denominator the same! Example: 2/7 + 3/7 = 5/7.`,
        checkQuestions: [
          { question: 'In the fraction 3/8, which number is the denominator?', answer: '8.' },
          { question: 'What is 2/5 + 1/5?', answer: '3/5.' },
          { question: 'Which fraction is equivalent to 1/3?', answer: '2/6 (or 3/9).' },
        ],
        lessonPlans: [
          {
            lessonNumber: 1,
            title: 'Concept of Numerator and Denominator',
            durationMinutes: 40,
            outcome: 'By the end of the lesson, the learner will be able to distinguish between numerator and denominator in proper fractions using circular fraction cutouts.',
            keyInquiryQuestion: 'How do we write down parts of a shared orange or pizza?',
            learningResources: 'Paper circular cutouts, colored markers, classroom chalkboard.',
            introduction: 'Teacher folds circular paper into 4 equal quarters, showing 1 quarter shaded (5 mins).',
            development: 'Learners fold their own paper plates into 8 equal sectors, shade 3 parts, and write 3/8 labeling numerator and denominator (25 mins).',
            conclusion: 'Rapid-fire check on naming top and bottom numbers (5 mins).',
            reflection: 'Visual folding eliminated confusion between numerator and denominator.',
          },
          {
            lessonNumber: 2,
            title: 'Addition of Fractions with Like Denominators',
            durationMinutes: 40,
            outcome: 'By the end of the lesson, the learner will be able to add two fractions with equal denominators accurately.',
            keyInquiryQuestion: 'Why does the bottom number stay the same when adding slices of bread?',
            learningResources: 'Fraction strip bars, flashcards with sums like 2/6 + 3/6.',
            introduction: 'Review fraction strips on the flannel board (5 mins).',
            development: 'Teacher guides learners: 1/5 + 2/5 = (1+2)/5 = 3/5. Learners complete 4 workbook exercises in pairs (25 mins).',
            conclusion: 'Learner representatives demonstrate solution on the board (5 mins).',
            reflection: 'Consolidated rule: Never add denominators when they are the same.',
          },
        ],
        assessments: [
          {
            id: 'as_m4_cat_2',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'CAT 1: Proper & Equivalent Fractions',
            maxMarks: 25,
            date: '2026-10-22',
            questionsList: [
              { number: 1, prompt: 'What is 3/8 + 2/8?', options: ['5/16', '5/8', '1/8', '6/8'], correctAnswer: '5/8', sourceExam: 'KPSEA Past Paper' },
              { number: 2, prompt: 'Which fraction is equivalent to 1/2?', options: ['2/3', '2/4', '3/5', '1/3'], correctAnswer: '2/4', sourceExam: 'KPSEA Past Paper' },
              { number: 3, prompt: 'In the fraction 4/9, the number 9 is called the:', options: ['Numerator', 'Denominator', 'Quotient', 'Factor'], correctAnswer: 'Denominator', sourceExam: 'KPSEA Past Paper' },
              { number: 4, prompt: 'What is 7/10 - 3/10?', options: ['4/10', '4/0', '10/10', '1/10'], correctAnswer: '4/10', sourceExam: 'KPSEA Past Paper' },
              { number: 5, prompt: 'Which is bigger: 1/2 or 1/4?', options: ['1/4', '1/2', 'They are equal', 'Neither'], correctAnswer: '1/2', sourceExam: 'KPSEA Past Paper' },
              { number: 6, prompt: 'How many quarters make 1 whole?', options: ['2', '3', '4', '8'], correctAnswer: '4', sourceExam: 'KPSEA Past Paper' },
              { number: 7, prompt: 'Express 0.5 as a simple fraction:', options: ['1/5', '1/2', '5/100', '2/5'], correctAnswer: '1/2', sourceExam: 'KPSEA Past Paper' },
              { number: 8, prompt: 'What fraction of an hour is 30 minutes?', options: ['1/4', '1/3', '1/2', '3/4'], correctAnswer: '1/2', sourceExam: 'KPSEA Past Paper' },
              { number: 9, prompt: 'Simplify 6/8 to lowest terms:', options: ['2/4', '3/4', '1/2', '6/4'], correctAnswer: '3/4', sourceExam: 'KPSEA Past Paper' },
              { number: 10, prompt: 'A pizza is cut into 8 equal slices. Kevin eats 3 slices. What fraction remains?', options: ['3/8', '5/8', '1/2', '8/5'], correctAnswer: '5/8', sourceExam: 'KPSEA Past Paper' },
            ],
            scores: {
              'LRA/0007': 22, // 88% -> EE
              'LRA/0008': 17, // 68% -> ME (Triggers Focus Zone remediation!)
            },
          },
          {
            id: 'as_m4_asg_2',
            type: 'Assignment',
            kind: 'Assignment',
            number: 1,
            title: 'Assignment 1: Adding Fractions with Same Denominators',
            maxMarks: 10,
            date: '2026-10-24',
            scores: {
              'LRA/0007': 9,
              'LRA/0008': 6,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'strand_math_g4_measurement',
    name: 'Measurement',
    grade: 'Grade 4',
    subject: 'Mathematics',
    subStrands: [
      {
        id: 'sub_math_g4_length',
        name: 'Length, Perimeter & Area',
        strandId: 'strand_math_g4_measurement',
        term: 2,
        targetWeek: 3,
        totalLessons: 5,
        learnerNotes: `Length measures how long an object is from one end to the other!
1. Standard units: Millimeters (mm), Centimeters (cm), Meters (m), and Kilometers (km).
   • 100 cm = 1 meter (m)
   • 1,000 meters = 1 kilometer (km)
2. Perimeter is the total distance all the way around the outside edge of a shape.
   • For a rectangle: Perimeter = 2 × (Length + Width).
   • For a square: Perimeter = 4 × Side length.`,
        checkQuestions: [
          { question: 'How many centimeters are in 3 meters?', answer: '300 cm.' },
          { question: 'What is the perimeter of a rectangle with length 6 cm and width 4 cm?', answer: '20 cm (6+4+6+4).' },
        ],
        assessments: [
          {
            id: 'as_m4_cat_3',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'CAT 1: Meters and Centimeters Conversion & Perimeter',
            maxMarks: 20,
            date: '2026-10-20',
            scores: {
              'LRA/0007': 17,
              'LRA/0008': 13,
            },
          },
        ],
      },
    ],
  },

  // --- GRADE 5: SCIENCE & TECHNOLOGY ---
  {
    id: 'strand_sci_g5_living',
    name: 'Living Things & Human Body Systems',
    grade: 'Grade 5',
    subject: 'Science & Technology',
    subStrands: [
      {
        id: 'sub_sci_g5_respiratory',
        name: 'Human Respiratory System & Breathing',
        strandId: 'strand_sci_g5_living',
        term: 1,
        targetWeek: 3,
        totalLessons: 4,
        learnerNotes: `The respiratory system takes oxygen from the air into our blood and expels carbon dioxide waste!
1. Breathing pathway: Nose / Mouth -> Trachea (Windpipe) -> Bronchi -> Lungs (Alveoli).
2. The nose has hair and mucus to trap dust particles and warm the incoming air.
3. The diaphragm is a dome-shaped muscle under the lungs:
   • Breathing In (Inhalation): Diaphragm moves down, chest expands, air rushes in.
   • Breathing Out (Exhalation): Diaphragm relaxes upward, chest contracts, air pushes out.
4. Health habits: Exercise regularly, avoid smoking and dusty areas, plant green trees.`,
        checkQuestions: [
          { question: 'What is the function of hairs inside the nose during breathing?', answer: 'To filter and trap dust and germs.' },
          { question: 'Which gas do our lungs absorb from the air?', answer: 'Oxygen.' },
          { question: 'What happens to the diaphragm during inhalation?', answer: 'It contracts and moves downward.' },
        ],
        lessonPlans: [
          {
            lessonNumber: 1,
            title: 'Organs of the Human Respiratory System',
            durationMinutes: 40,
            outcome: 'By the end of the lesson, the learner will be able to identify and label the main organs of breathing on a wall chart.',
            keyInquiryQuestion: 'What path does air follow from our nose into the lungs?',
            learningResources: 'Human anatomy chart, plastic torso model, learner notebooks.',
            introduction: 'Learners place hands on chests and take deep breaths, observing chest movement (5 mins).',
            development: 'Teacher explains nose, trachea, bronchi, lungs and diaphragm with chart. Learners draw and label organs in workbooks (25 mins).',
            conclusion: 'Learners explain function of the trachea to their desk partner (5 mins).',
            reflection: 'Excellent inquiry into why breathing through nose is healthier than mouth.',
          },
        ],
        assessments: [
          {
            id: 'as_s5_cat_1',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'CAT 1: Breathing Organs & Gas Exchange',
            maxMarks: 30,
            date: '2026-10-21',
            scores: {
              'LRA/0009': 27, // 90% -> EE
              'LRA/0010': 18, // 60% -> AE
            },
          },
          {
            id: 'as_s5_asg_1',
            type: 'Assignment',
            kind: 'Assignment',
            number: 1,
            title: 'Assignment 1: Lung Model Construction',
            maxMarks: 15,
            date: '2026-10-23',
            scores: {
              'LRA/0009': 14,
              'LRA/0010': 9,
            },
          },
        ],
      },
    ],
  },

  // --- GRADE 6: MATHEMATICS & KPSEA PREPARATION ---
  {
    id: 'strand_math_g6_kpsea',
    name: 'Numbers, Algebra & KPSEA Assessment',
    grade: 'Grade 6',
    subject: 'Mathematics',
    subStrands: [
      {
        id: 'sub_math_g6_ratios',
        name: 'Ratios, Percentages & Simple Equations',
        strandId: 'strand_math_g6_kpsea',
        term: 1,
        targetWeek: 4,
        totalLessons: 6,
        learnerNotes: `A ratio compares two quantities of the same kind by division!
1. Notation: 3 to 5 is written as 3:5.
2. Percentage means "out of 100". Symbol: %.
   • To convert a fraction to percentage: Multiply by 100%. (e.g. 3/4 × 100% = 75%).
3. Simple algebraic equations: Whatever you do to one side of the equal sign, you must do to the other side to keep it balanced!
   • Example: x + 7 = 15 -> x = 15 - 7 = 8!`,
        checkQuestions: [
          { question: 'Convert 2/5 to a percentage:', answer: '40%.' },
          { question: 'Solve for y: 2y = 18', answer: 'y = 9.' },
          { question: 'In a class of 40 learners, 24 are girls. What is the ratio of boys to girls in simplest form?', answer: 'Boys = 16. Ratio 16:24 = 2:3.' },
        ],
        assessments: [
          {
            id: 'as_m6_cat_kpsea_1',
            type: 'CAT',
            kind: 'CAT',
            number: 1,
            title: 'KPSEA Standard CAT 1: Algebra & Proportions',
            maxMarks: 10,
            date: '2026-10-25',
            questionsList: [
              { number: 1, prompt: 'What is 35% expressed as a fraction in its simplest form?', options: ['35/100', '7/20', '3/5', '7/10'], correctAnswer: '7/20', sourceExam: 'KPSEA Past Paper' },
              { number: 2, prompt: 'Solve for x: 3x - 5 = 16', options: ['5', '7', '9', '11'], correctAnswer: '7', sourceExam: 'KPSEA Past Paper' },
              { number: 3, prompt: 'The ratio of boys to girls in Grade 6 is 3:4. If there are 21 boys, how many girls are there?', options: ['24', '28', '32', '35'], correctAnswer: '28', sourceExam: 'KPSEA Past Paper' },
              { number: 4, prompt: 'Calculate the perimeter of a rectangular plot 25 m long and 15 m wide:', options: ['80 m', '375 m', '40 m', '100 m'], correctAnswer: '80 m', sourceExam: 'KPSEA Past Paper' },
              { number: 5, prompt: 'What is the square root of 144?', options: ['11', '12', '14', '16'], correctAnswer: '12', sourceExam: 'KPSEA Past Paper' },
              { number: 6, prompt: 'A shopkeeper bought a bag of sugar for KSh 4,000 and sold it for KSh 4,800. What was his percentage profit?', options: ['15%', '20%', '25%', '30%'], correctAnswer: '20%', sourceExam: 'KPSEA Past Paper' },
              { number: 7, prompt: 'Which of the following is a prime number?', options: ['21', '27', '29', '33'], correctAnswer: '29', sourceExam: 'KPSEA Past Paper' },
              { number: 8, prompt: 'Find the mean of the numbers: 6, 8, 10, 12, 14', options: ['9', '10', '11', '12'], correctAnswer: '10', sourceExam: 'KPSEA Past Paper' },
              { number: 9, prompt: 'How many minutes are in 2 1/2 hours?', options: ['120', '140', '150', '160'], correctAnswer: '150', sourceExam: 'KPSEA Past Paper' },
              { number: 10, prompt: 'A cylindrical tank has a radius of 7 m and height of 10 m. What is its volume? (Use π = 22/7)', options: ['1,540 m³', '770 m³', '440 m³', '2,200 m³'], correctAnswer: '1,540 m³', sourceExam: 'KPSEA Past Paper' },
            ],
            scores: {},
          },
        ],
      },
    ],
  },
];

export const INITIAL_TEACHER_STATE: TeacherState = {
  signedInId: 't_kelvin',
  theme: 'light',
  tab: 'home',
  classes: {
    'Grade 4|Mathematics': {
      lessons: [
        {
          date: '2026-10-23',
          stamp: '23 Oct, 09:15',
          topic: 'Addition & Subtraction of Proper Fractions',
          status: 'Taught',
          reflection: 'Learners used visual fraction strips with high engagement.',
        },
        {
          date: '2026-10-22',
          stamp: '22 Oct, 10:20',
          topic: 'Identification of Numerator and Denominator',
          status: 'Taught',
          reflection: 'All learners met expectations on practical whiteboard drills.',
        },
      ],
      marks: {},
      att: {
        '2026-10-24': {
          'LRA/0007': true,
          'LRA/0008': true,
        },
      },
    },
    'Grade 5|Science & Technology': {
      lessons: [
        {
          date: '2026-10-23',
          stamp: '23 Oct, 11:45',
          topic: 'Human Breathing Mechanism & Lung Model',
          status: 'Taught',
          reflection: 'Demonstrated lung expansion using plastic bottle and balloons.',
        },
      ],
      marks: {},
      att: {},
    },
  },
  strands: STARTER_CBC_STRANDS,
  focusRemediations: {
    'LRA/0008_sub_math_g4_fractions': {
      adm: 'LRA/0008',
      learnerName: 'Hilda Chepkemoi',
      grade: 'Grade 4',
      subject: 'Mathematics',
      subStrandId: 'sub_math_g4_fractions',
      subStrandName: 'Fractions & Decimals',
      rubric: 'ME',
      scorePct: 67.5,
      note: 'Provide concrete fraction disc cutouts and 5-minute daily shaded bar exercises.',
      status: 'pending',
      updatedAt: '2026-10-24',
    },
  },
  assessments: [],
  files: {},
  msgs: [
    {
      id: 'm1',
      from: 'elsie',
      text: 'Good morning, Mwalimu! ☀️ I am Elsie, your CBC Faculty Copilot. Assessment Records and Assessment Books are ready for your assigned classes. Attendance is synchronized with the academic registry.',
      stamp: '08:00 AM',
    },
  ],
  aiUse: { day: '2026-10-29', count: 0 },
  adminInbox: [
    {
      id: 'inbox_01',
      title: 'End of Term 3 Assessment Books Due',
      body: 'All subject teachers are reminded to confirm formative CAT and assignment marks before the upcoming promotion review.',
      stamp: '24 Oct, 09:00',
      unread: true,
    },
  ],
};

export const DEFAULT_CBC_STRANDS = STARTER_CBC_STRANDS;
