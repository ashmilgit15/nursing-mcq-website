// Question Service - Handles automatic question collection and management
import questionsData from './questions.json'

// Configuration for question collection
const QUESTION_CONFIG = {
    MIN_QUESTIONS_THRESHOLD: 10, // Trigger collection when below this number
    BATCH_SIZE: 20, // Number of questions to fetch at once
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
        name: 'QuizAPI',
        url: 'https://quizapi.io/api/v1/questions',
        category: 'medical',
        active: true
    },
    {
        name: 'Trivia',
        url: 'https://the-trivia-api.com/api/questions',
        category: 'science',
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
                return await this.fetchFromOpenTDB(keywords)
            } else if (source.name === 'QuizAPI') {
                return await this.fetchFromQuizAPI(keywords)
            } else if (source.name === 'Trivia') {
                return await this.fetchFromTriviaAPI(keywords)
            }
        } catch (error) {
            console.warn(`Error fetching from ${source.name}:`, error)
        }

        return questions
    }

    // Fetch from Open Trivia Database
    async fetchFromOpenTDB(keywords) {
        const questions = []

        try {
            // Map keywords to OpenTDB categories
            const categoryMap = {
                'medical': 17, 'science': 17, 'biology': 17,
                'psychology': 22, 'sociology': 22,
                'management': 9, 'general': 9
            }

            const category = categoryMap[keywords[0]] || 9
            const response = await fetch(
                `https://opentdb.com/api.php?amount=10&category=${category}&type=multiple&encode=url3986`
            )

            if (response.ok) {
                const data = await response.json()

                if (data.results) {
                    for (const item of data.results) {
                        const question = {
                            question: decodeURIComponent(item.question),
                            options: [
                                decodeURIComponent(item.correct_answer),
                                ...item.incorrect_answers.map(ans => decodeURIComponent(ans))
                            ].sort(() => Math.random() - 0.5),
                            answer: 0 // Will be updated after shuffling
                        }

                        // Find correct answer index after shuffling
                        const correctAnswer = decodeURIComponent(item.correct_answer)
                        question.answer = question.options.indexOf(correctAnswer)

                        questions.push(question)
                    }
                }
            }
        } catch (error) {
            console.warn('OpenTDB fetch error:', error)
        }

        return questions
    }

    // Fetch from Quiz API (mock implementation - would need API key)
    async fetchFromQuizAPI(keywords) {
        // This would require an API key and proper implementation
        // For now, return empty array
        return []
    }

    // Fetch from Trivia API
    async fetchFromTriviaAPI(keywords) {
        const questions = []

        try {
            const response = await fetch(
                `https://the-trivia-api.com/api/questions?categories=science,medicine&limit=10&type=multiple`
            )

            if (response.ok) {
                const data = await response.json()

                for (const item of data) {
                    const allOptions = [item.correctAnswer, ...item.incorrectAnswers]
                    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5)

                    const question = {
                        question: item.question,
                        options: shuffledOptions,
                        answer: shuffledOptions.indexOf(item.correctAnswer)
                    }

                    questions.push(question)
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
                    answer: 1
                },
                {
                    question: "Which leadership style involves shared decision-making?",
                    options: ["Autocratic", "Democratic", "Laissez-faire", "Bureaucratic"],
                    answer: 1
                }
            ],
            'Nursing Research': [
                {
                    question: "What does a p-value of 0.05 indicate?",
                    options: ["5% chance of Type I error", "95% confidence", "Significant result", "All of the above"],
                    answer: 3
                }
            ],
            'Human Physiology': [
                {
                    question: "What is the normal resting heart rate range?",
                    options: ["40-60 bpm", "60-100 bpm", "100-120 bpm", "120-140 bpm"],
                    answer: 1
                }
            ],
            'Microbiology': [
                {
                    question: "Which organism is gram-positive?",
                    options: ["E. coli", "Staphylococcus aureus", "Pseudomonas", "Salmonella"],
                    answer: 1
                }
            ],
            'Sociology': [
                {
                    question: "What are social determinants of health?",
                    options: ["Genetic factors", "Environmental and social factors", "Medical treatments", "Individual choices"],
                    answer: 1
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
