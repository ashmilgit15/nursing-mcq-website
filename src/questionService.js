// Question Service - Handles automatic question collection and management
import questionsData from './questions.json'

// Configuration for question collection
const QUESTION_CONFIG = {
    MIN_QUESTIONS_THRESHOLD: 50, // Trigger collection when below this number
    BATCH_SIZE: 50, // Number of questions to fetch at once
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
}

// Question sources and APIs
const QUESTION_SOURCES = [
    {
        name: 'OpenTDB',
        url: 'https://opentdb.com/api.php',
        category: 'general',
        active: true
    },
    {
        name: 'Trivia',
        url: 'https://the-trivia-api.com/api/questions',
        category: 'science',
        active: true
    },
    {
        name: 'Fallback',
        url: 'fallback',
        category: 'generated',
        active: true
    }
]

// Subject mapping for external APIs
const SUBJECT_MAPPING = {
    'Nursing Administration': ['management', 'healthcare', 'administration'],
    'Nursing Research': ['research', 'statistics', 'methodology'],
    'Human Physiology': ['biology', 'physiology', 'anatomy'],
    'Microbiology': ['biology', 'microbiology', 'infectious_diseases'],
    'Sociology': ['sociology', 'social_sciences', 'psychology'],
    'Human Anatomy': ['anatomy', 'biology', 'medical'],
    'Fundamentals of Nursing': ['nursing', 'healthcare', 'medical'],
    'Medical Surgical Nursing': ['surgery', 'medical', 'nursing'],
    'Psychiatric Nursing': ['psychology', 'psychiatry', 'mental_health'],
    'Pediatric Nursing': ['pediatrics', 'children', 'nursing'],
    'Obstetrics and Gynecology Nursing': ['obstetrics', 'gynecology', 'women_health'],
    'Community Health Nursing': ['public_health', 'community', 'epidemiology'],
    'Nutrition': ['nutrition', 'dietetics', 'food_science']
}

// Local storage keys
const STORAGE_KEYS = {
    QUESTIONS: 'nursingMcqQuestions',
    LAST_UPDATE: 'nursingMcqLastUpdate',
    FAILED_SUBJECTS: 'nursingMcqFailedSubjects'
}

class QuestionService {
    constructor() {
        this.questions = this.loadQuestions()
        this.isCollecting = false
        this.collectionQueue = new Set()
    }

    // Load questions from storage or fallback to default
    loadQuestions() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.QUESTIONS)
            if (stored) {
                const parsedQuestions = JSON.parse(stored)
                // Merge with default questions, preferring stored versions
                return { ...questionsData, ...parsedQuestions }
            }
        } catch (error) {
            console.warn('Failed to load stored questions:', error)
        }
        return { ...questionsData }
    }

    // Save questions to storage
    saveQuestions() {
        try {
            localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(this.questions))
            localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString())
        } catch (error) {
            console.error('Failed to save questions:', error)
        }
    }

    // Seeded shuffle function for consistent results
    shuffleArray(array, seed) {
        const a = array.slice()
        const rng = this.mulberry32(seed)
        for (let i = a.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
        }
        return a
    }

    // Simple seeded RNG for deterministic shuffle
    mulberry32(a) {
        return function () {
            let t = (a += 0x6d2b79f5)
            t = Math.imul(t ^ (t >>> 15), t | 1)
            t = Math.imul(t ^ (t >>> 7), t | 61)
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
    }

    // Check if a question is nursing/medical related
    isNursingRelated(questionText, subject) {
        const text = questionText.toLowerCase()
        
        // Nursing and medical keywords
        const nursingKeywords = [
            'nurse', 'nursing', 'patient', 'medical', 'health', 'healthcare', 'hospital', 'clinic',
            'diagnosis', 'treatment', 'therapy', 'medication', 'drug', 'disease', 'illness', 'symptom',
            'anatomy', 'physiology', 'pathology', 'pharmacology', 'surgery', 'surgical', 'clinical',
            'vital signs', 'blood pressure', 'heart rate', 'temperature', 'pulse', 'respiration',
            'infection', 'bacteria', 'virus', 'immune', 'antibody', 'vaccine', 'epidemic', 'pandemic',
            'mental health', 'psychiatric', 'psychology', 'depression', 'anxiety', 'schizophrenia',
            'pediatric', 'child', 'infant', 'maternal', 'pregnancy', 'obstetric', 'gynecology',
            'community health', 'public health', 'epidemiology', 'prevention', 'wellness',
            'administration', 'management', 'leadership', 'research', 'evidence-based',
            'nutrition', 'diet', 'metabolism', 'vitamin', 'mineral', 'protein', 'carbohydrate'
        ]
        
        // Subject-specific keywords
        const subjectKeywords = {
            'Psychiatric Nursing': ['mental', 'psychiatric', 'psychology', 'behavior', 'cognitive', 'therapy', 'medication', 'antidepressant', 'antipsychotic'],
            'Pediatric Nursing': ['child', 'pediatric', 'infant', 'toddler', 'adolescent', 'growth', 'development', 'vaccination'],
            'Obstetrics and Gynecology Nursing': ['pregnancy', 'maternal', 'obstetric', 'gynecology', 'prenatal', 'postnatal', 'labor', 'delivery'],
            'Community Health Nursing': ['community', 'public health', 'epidemiology', 'prevention', 'health promotion', 'population'],
            'Nursing Administration': ['administration', 'management', 'leadership', 'policy', 'quality', 'safety', 'budget'],
            'Nursing Research': ['research', 'study', 'evidence', 'statistics', 'methodology', 'data', 'analysis'],
            'Medical Surgical Nursing': ['surgery', 'surgical', 'postoperative', 'preoperative', 'anesthesia', 'wound', 'healing'],
            'Fundamentals of Nursing': ['basic', 'fundamental', 'assessment', 'care', 'hygiene', 'comfort', 'safety'],
            'Human Anatomy': ['anatomy', 'structure', 'organ', 'system', 'tissue', 'cell', 'bone', 'muscle'],
            'Human Physiology': ['physiology', 'function', 'process', 'mechanism', 'homeostasis', 'regulation'],
            'Microbiology': ['microbiology', 'bacteria', 'virus', 'fungus', 'parasite', 'infection', 'pathogen'],
            'Sociology': ['society', 'social', 'culture', 'behavior', 'group', 'community', 'family'],
            'Nutrition': ['nutrition', 'diet', 'food', 'nutrient', 'vitamin', 'mineral', 'metabolism']
        }
        
        // Check for nursing keywords
        const hasNursingKeyword = nursingKeywords.some(keyword => text.includes(keyword))
        
        // Check for subject-specific keywords
        const subjectSpecificKeywords = subjectKeywords[subject] || []
        const hasSubjectKeyword = subjectSpecificKeywords.some(keyword => text.includes(keyword))
        
        // Exclude non-medical topics
        const excludeKeywords = [
            'sports', 'entertainment', 'movie', 'music', 'celebrity', 'politics', 'history', 'geography',
            'literature', 'art', 'fashion', 'technology', 'computer', 'internet', 'gaming', 'video game'
        ]
        const hasExcludeKeyword = excludeKeywords.some(keyword => text.includes(keyword))
        
        return (hasNursingKeyword || hasSubjectKeyword) && !hasExcludeKeyword
    }

    // Get questions for a subject
    getQuestions(subject) {
        const questions = this.questions[subject] || []

        // Check if we need to collect more questions
        if (questions.length < QUESTION_CONFIG.MIN_QUESTIONS_THRESHOLD) {
            this.collectQuestionsForSubject(subject)
        }

        return questions
    }

    // Get question count for a subject
    getQuestionCount(subject) {
        return (this.questions[subject] || []).length
    }

    // Check if a subject needs more questions
    needsMoreQuestions(subject) {
        return this.getQuestionCount(subject) < QUESTION_CONFIG.MIN_QUESTIONS_THRESHOLD
    }

    // Collect questions for a specific subject
    async collectQuestionsForSubject(subject) {
        if (this.collectionQueue.has(subject) || this.isCollecting) {
            return
        }

        this.collectionQueue.add(subject)

        try {
            console.log(`🔄 Collecting questions for ${subject}...`)

            const newQuestions = await this.fetchQuestionsFromSources(subject)

            if (newQuestions.length > 0) {
                this.addQuestionsToSubject(subject, newQuestions)
                console.log(`✅ Added ${newQuestions.length} questions to ${subject}`)

                // Dispatch custom event for UI updates
                window.dispatchEvent(new CustomEvent('questionsUpdated', {
                    detail: { subject, count: newQuestions.length }
                }))
            } else {
                console.log(`⚠️ No new questions found for ${subject}`)
                this.handleCollectionFailure(subject)
            }
        } catch (error) {
            console.error(`❌ Failed to collect questions for ${subject}:`, error)
            this.handleCollectionFailure(subject)
        } finally {
            this.collectionQueue.delete(subject)
        }
    }

    // Fetch questions from multiple sources
    async fetchQuestionsFromSources(subject) {
        const allQuestions = []
        const keywords = SUBJECT_MAPPING[subject] || [subject.toLowerCase()]

        for (const source of QUESTION_SOURCES) {
            if (!source.active) continue

            try {
                const questions = await this.fetchFromSource(source, keywords, subject)
                allQuestions.push(...questions)

                if (allQuestions.length >= QUESTION_CONFIG.BATCH_SIZE) {
                    break
                }
            } catch (error) {
                console.warn(`Failed to fetch from ${source.name}:`, error)
            }
        }

        // If no questions from APIs, generate fallback questions
        if (allQuestions.length === 0) {
            return this.generateFallbackQuestions(subject)
        }

        return allQuestions.slice(0, QUESTION_CONFIG.BATCH_SIZE)
    }

    // Fetch questions from a specific source
    async fetchFromSource(source, keywords, subject) {
        const questions = []

        try {
            // Try different API endpoints based on source
            if (source.name === 'OpenTDB') {
                return await this.fetchFromOpenTDB(keywords, subject)
            } else if (source.name === 'Trivia') {
                return await this.fetchFromTriviaAPI(keywords, subject)
            } else if (source.name === 'Fallback') {
                return this.generateFallbackQuestions(subject)
            }
        } catch (error) {
            console.warn(`Error fetching from ${source.name}:`, error)
        }

        return questions
    }

    // Fetch from Open Trivia Database
    async fetchFromOpenTDB(keywords, subject) {
        const questions = []

        try {
            // Map keywords to OpenTDB categories with better mapping for nursing subjects
            const categoryMap = {
                'medical': 17, 'science': 17, 'biology': 17, 'anatomy': 17, 'physiology': 17,
                'psychology': 22, 'sociology': 22, 'psychiatry': 22, 'mental_health': 22,
                'management': 9, 'general': 9, 'administration': 9,
                'nursing': 17, 'healthcare': 17, 'microbiology': 17,
                'nutrition': 17, 'food_science': 17, 'pediatrics': 17,
                'obstetrics': 17, 'gynecology': 17, 'community': 22,
                'public_health': 22, 'epidemiology': 17, 'research': 19
            }

            // Try multiple categories for better variety
            const possibleCategories = keywords.map(keyword => categoryMap[keyword]).filter(Boolean)
            const category = possibleCategories[0] || 17 // Default to science
            
            const response = await fetch(
                `https://opentdb.com/api.php?amount=25&category=${category}&type=multiple&encode=url3986`
            )

            if (response.ok) {
                const data = await response.json()

                if (data.results && data.results.length > 0) {
                    for (const item of data.results) {
                        const questionText = decodeURIComponent(item.question)
                        
                        // Filter for nursing/medical related questions only
                        if (this.isNursingRelated(questionText, subject)) {
                            const correctAnswer = decodeURIComponent(item.correct_answer)
                            const incorrectAnswers = item.incorrect_answers.map(ans => decodeURIComponent(ans))
                            
                            // Create all options and shuffle them with seeded randomization
                            const allOptions = [correctAnswer, ...incorrectAnswers]
                            const shuffleSeed = Date.now() + Math.random() * 1000
                            const shuffledOptions = this.shuffleArray(allOptions, shuffleSeed)
                            
                            const question = {
                                question: questionText,
                                options: shuffledOptions,
                                answer: shuffledOptions.indexOf(correctAnswer),
                                source: 'OpenTDB',
                                subject: subject,
                                difficulty: item.difficulty || 'medium'
                            }

                            questions.push(question)
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('OpenTDB fetch error:', error)
        }

        return questions
    }


    // Fetch from Trivia API
    async fetchFromTriviaAPI(keywords, subject) {
        const questions = []

        try {
            // Map subjects to appropriate categories
            const categoryMapping = {
                'Nursing Administration': 'medicine',
                'Nursing Research': 'science',
                'Human Physiology': 'science',
                'Human Anatomy': 'science',
                'Microbiology': 'science',
                'Sociology': 'society_and_culture',
                'Fundamentals of Nursing': 'medicine',
                'Medical Surgical Nursing': 'medicine',
                'Psychiatric Nursing': 'medicine',
                'Pediatric Nursing': 'medicine',
                'Obstetrics and Gynecology Nursing': 'medicine',
                'Community Health Nursing': 'medicine',
                'Nutrition': 'science'
            }

            const category = categoryMapping[subject] || 'science'
            const response = await fetch(
                `https://the-trivia-api.com/api/questions?categories=${category}&limit=25&type=multiple`
            )

            if (response.ok) {
                const data = await response.json()

                if (data && data.length > 0) {
                    for (const item of data) {
                        // Filter for nursing/medical related questions only
                        if (this.isNursingRelated(item.question, subject)) {
                            const allOptions = [item.correctAnswer, ...item.incorrectAnswers]
                            const shuffleSeed = Date.now() + Math.random() * 1000
                            const shuffledOptions = this.shuffleArray(allOptions, shuffleSeed)

                            const question = {
                                question: item.question,
                                options: shuffledOptions,
                                answer: shuffledOptions.indexOf(item.correctAnswer),
                                source: 'TriviaAPI',
                                subject: subject,
                                difficulty: item.difficulty || 'medium'
                            }

                            questions.push(question)
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Trivia API fetch error:', error)
        }

        return questions
    }

    // Generate fallback questions when APIs fail
    generateFallbackQuestions(subject) {
        const fallbackQuestions = []
        const templates = this.getFallbackTemplates(subject)

        for (let i = 0; i < Math.min(10, templates.length); i++) {
            const template = templates[i]
            fallbackQuestions.push({
                question: template.question,
                options: template.options,
                answer: template.answer,
                source: 'fallback'
            })
        }

        return fallbackQuestions
    }

    // Get fallback question templates for each subject
    getFallbackTemplates(subject) {
        const templates = {
            'Nursing Administration': [
                {
                    question: "What is the primary goal of nursing leadership?",
                    options: ["Cost reduction", "Quality patient care", "Staff satisfaction", "Efficiency"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "Which leadership style involves shared decision-making?",
                    options: ["Autocratic", "Democratic", "Laissez-faire", "Bureaucratic"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is the purpose of a nursing care plan?",
                    options: ["Documentation only", "Guide individualized patient care", "Legal protection", "Insurance requirements"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "Which principle is fundamental to nursing management?",
                    options: ["Profit maximization", "Patient-centered care", "Staff minimization", "Technology focus"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What does delegation in nursing involve?",
                    options: ["Giving up responsibility", "Transferring authority with accountability", "Avoiding work", "Reducing patient care"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Nursing Research': [
                {
                    question: "What does a p-value of 0.05 indicate?",
                    options: ["5% chance of Type I error", "95% confidence", "Significant result", "All of the above"],
                    answer: 3,
                    source: 'fallback'
                },
                {
                    question: "What is the gold standard for research design?",
                    options: ["Case study", "Randomized controlled trial", "Survey research", "Qualitative study"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is evidence-based practice?",
                    options: ["Using only research", "Integrating research, experience, and patient preferences", "Following protocols only", "Using intuition"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Human Physiology': [
                {
                    question: "What is the normal resting heart rate range?",
                    options: ["40-60 bpm", "60-100 bpm", "100-120 bpm", "120-140 bpm"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "Which system controls involuntary body functions?",
                    options: ["Somatic nervous system", "Autonomic nervous system", "Central nervous system", "Peripheral nervous system"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is the primary function of red blood cells?",
                    options: ["Fight infection", "Transport oxygen", "Clot blood", "Produce hormones"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Human Anatomy': [
                {
                    question: "How many chambers does the human heart have?",
                    options: ["2", "3", "4", "5"],
                    answer: 2,
                    source: 'fallback'
                },
                {
                    question: "Which bone is the longest in the human body?",
                    options: ["Tibia", "Fibula", "Femur", "Humerus"],
                    answer: 2,
                    source: 'fallback'
                },
                {
                    question: "Where is the liver located?",
                    options: ["Left upper abdomen", "Right upper abdomen", "Lower abdomen", "Behind the stomach"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Microbiology': [
                {
                    question: "Which organism is gram-positive?",
                    options: ["E. coli", "Staphylococcus aureus", "Pseudomonas", "Salmonella"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is the primary method of sterilization in healthcare?",
                    options: ["Alcohol wiping", "Autoclaving", "Air drying", "UV light"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "Which microorganism causes tuberculosis?",
                    options: ["Virus", "Bacteria", "Fungus", "Parasite"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Sociology': [
                {
                    question: "What are social determinants of health?",
                    options: ["Genetic factors", "Environmental and social factors", "Medical treatments", "Individual choices"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is health equity?",
                    options: ["Equal healthcare spending", "Same treatment for everyone", "Fair opportunity for health", "Identical health outcomes"],
                    answer: 2,
                    source: 'fallback'
                },
                {
                    question: "Which factor most influences health outcomes?",
                    options: ["Medical care", "Social and economic factors", "Genetics", "Personal behavior"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Fundamentals of Nursing': [
                {
                    question: "What is the first step in the nursing process?",
                    options: ["Planning", "Assessment", "Implementation", "Evaluation"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What does HIPAA protect?",
                    options: ["Patient privacy", "Nurse rights", "Hospital profits", "Medical research"],
                    answer: 0,
                    source: 'fallback'
                },
                {
                    question: "What is the most important infection control practice?",
                    options: ["Wearing gloves", "Hand hygiene", "Using masks", "Isolation"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Medical Surgical Nursing': [
                {
                    question: "What is the priority assessment for a post-operative patient?",
                    options: ["Pain level", "Airway and breathing", "Wound healing", "Mobility"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "Which vital sign indicates shock?",
                    options: ["High blood pressure", "Low heart rate", "Low blood pressure", "High temperature"],
                    answer: 2,
                    source: 'fallback'
                }
            ],
            'Psychiatric Nursing': [
                {
                    question: "What is the therapeutic relationship in psychiatric nursing?",
                    options: ["Friendship", "Professional helping relationship", "Casual interaction", "Personal relationship"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is the priority in suicide risk assessment?",
                    options: ["Past history", "Current plan", "Family history", "Social support"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Pediatric Nursing': [
                {
                    question: "What is the leading cause of death in children?",
                    options: ["Cancer", "Accidents/injuries", "Infections", "Birth defects"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "At what age can children begin to understand death?",
                    options: ["2-3 years", "5-7 years", "10-12 years", "Adolescence"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Obstetrics and Gynecology Nursing': [
                {
                    question: "What is the normal duration of pregnancy?",
                    options: ["38 weeks", "40 weeks", "42 weeks", "44 weeks"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is preeclampsia?",
                    options: ["High blood sugar", "High blood pressure in pregnancy", "Low iron", "Infection"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Community Health Nursing': [
                {
                    question: "What is primary prevention?",
                    options: ["Treating disease", "Preventing disease occurrence", "Rehabilitation", "Screening"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "What is herd immunity?",
                    options: ["Individual protection", "Community protection through vaccination", "Natural immunity", "Antibiotic resistance"],
                    answer: 1,
                    source: 'fallback'
                }
            ],
            'Nutrition': [
                {
                    question: "What is the recommended daily water intake?",
                    options: ["4-6 glasses", "8-10 glasses", "12-14 glasses", "16-18 glasses"],
                    answer: 1,
                    source: 'fallback'
                },
                {
                    question: "Which vitamin deficiency causes scurvy?",
                    options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"],
                    answer: 2,
                    source: 'fallback'
                }
            ]
        }

        return templates[subject] || []
    }

    // Add new questions to a subject
    addQuestionsToSubject(subject, newQuestions) {
        if (!this.questions[subject]) {
            this.questions[subject] = []
        }

        // Filter out duplicates
        const existingQuestions = new Set(
            this.questions[subject].map(q => q.question.toLowerCase())
        )

        const uniqueQuestions = newQuestions.filter(
            q => !existingQuestions.has(q.question.toLowerCase())
        )

        this.questions[subject].push(...uniqueQuestions)
        this.saveQuestions()
    }

    // Handle collection failure
    handleCollectionFailure(subject) {
        const failedSubjects = this.getFailedSubjects()
        failedSubjects[subject] = Date.now()

        try {
            localStorage.setItem(STORAGE_KEYS.FAILED_SUBJECTS, JSON.stringify(failedSubjects))
        } catch (error) {
            console.error('Failed to save failed subjects:', error)
        }
    }

    // Get subjects that failed collection
    getFailedSubjects() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.FAILED_SUBJECTS)
            return stored ? JSON.parse(stored) : {}
        } catch (error) {
            return {}
        }
    }

    // Bulk collect questions for all subjects that need them
    async bulkCollectQuestions() {
        if (this.isCollecting) return

        this.isCollecting = true
        const subjectsNeedingQuestions = Object.keys(this.questions).filter(
            subject => this.needsMoreQuestions(subject)
        )

        console.log(`🔄 Bulk collecting questions for ${subjectsNeedingQuestions.length} subjects...`)

        const promises = subjectsNeedingQuestions.map(subject =>
            this.collectQuestionsForSubject(subject)
        )

        await Promise.allSettled(promises)
        this.isCollecting = false

        console.log('✅ Bulk collection completed')
    }

    // Get statistics about question collection
    getCollectionStats() {
        const stats = {}

        for (const subject of Object.keys(this.questions)) {
            stats[subject] = {
                count: this.getQuestionCount(subject),
                needsMore: this.needsMoreQuestions(subject),
                isCollecting: this.collectionQueue.has(subject)
            }
        }

        return stats
    }

    // Reset questions to default (for testing/debugging)
    resetToDefault() {
        this.questions = { ...questionsData }
        this.saveQuestions()
        localStorage.removeItem(STORAGE_KEYS.FAILED_SUBJECTS)
    }
}

// Create singleton instance
const questionService = new QuestionService()

// Auto-collect questions on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            questionService.bulkCollectQuestions()
        }, 2000) // Delay to not interfere with initial page load
    })
}

export default questionService
