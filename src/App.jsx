import React, { useMemo, useState, useEffect, useCallback } from 'react'
import questionsData from './questions.json'
import questionService from './questionService.js'

const SUBJECTS = [
    "Psychiatric Nursing",
    "Pediatric Nursing",
    "Obstetrics and Gynecology Nursing",
    "Community Health Nursing",
    "Nursing Administration",
    "Nursing Research",
    "Medical Surgical Nursing",
    "Fundamentals of Nursing",
    "Human Anatomy",
    "Human Physiology",
    "Microbiology",
    "Sociology",
    "Nutrition"
]


// Local storage helpers
const getStoredStats = () => {
    try {
        return JSON.parse(localStorage.getItem('nursingMcqStats')) || {
            totalQuestions: 0,
            correctAnswers: 0,
            subjectStats: {},
            bookmarkedQuestions: []
        }
    } catch {
        return {
            totalQuestions: 0,
            correctAnswers: 0,
            subjectStats: {},
            bookmarkedQuestions: []
        }
    }
}

const saveStats = (stats) => {
    localStorage.setItem('nursingMcqStats', JSON.stringify(stats))
}

function shuffle(array) {
    const a = array.slice()
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// Timer component
function Timer({ timeLeft, isActive, onTimeUp, difficulty }) {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getTimerClass = () => {
        if (timeLeft <= 10) return 'timer danger'
        if (timeLeft <= 30) return 'timer warning'
        return 'timer'
    }

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            const interval = setInterval(() => {
                onTimeUp()
            }, 1000)
            return () => clearInterval(interval)
        } else if (timeLeft === 0) {
            onTimeUp()
        }
    }, [isActive, timeLeft, onTimeUp])

    if (!isActive) return null

    return (
        <div className="timer-container">
            <div className={getTimerClass()}>
                ⏱️ {formatTime(timeLeft)}
            </div>
            <div className="difficulty-indicator">
                <span className="difficulty-btn medium active">
                    60 Seconds
                </span>
            </div>
        </div>
    )
}

// Notification component
function Notification({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className={`notification ${type}`}>
            <span>{message}</span>
            <button className="notification-close" onClick={onClose}>×</button>
        </div>
    )
}


// Statistics component
function Statistics({ stats, onViewBookmarks }) {
    const [collectionStats, setCollectionStats] = useState({})
    const [notification, setNotification] = useState(null)

    const accuracy = stats.totalQuestions > 0
        ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
        : 0

    useEffect(() => {
        // Update collection stats
        setCollectionStats(questionService.getCollectionStats())

        // Listen for question updates
        const handleQuestionsUpdated = (event) => {
            const { subject, count } = event.detail
            setNotification({
                message: `✅ Added ${count} new questions to ${subject}!`,
                type: 'success'
            })
            setCollectionStats(questionService.getCollectionStats())
        }

        window.addEventListener('questionsUpdated', handleQuestionsUpdated)
        return () => window.removeEventListener('questionsUpdated', handleQuestionsUpdated)
    }, [])

    const subjectsNeedingQuestions = Object.entries(collectionStats)
        .filter(([_, stats]) => stats.needsMore)
        .length

    return (
        <div className="stats-container">
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <h3 className="subtitle">Your Progress</h3>
            <div className="stats-grid">
                <div className="stat-item">
                    <div className="stat-value">{stats.totalQuestions}</div>
                    <div className="stat-label">Total Questions</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.correctAnswers}</div>
                    <div className="stat-label">Correct Answers</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{accuracy}%</div>
                    <div className="stat-label">Accuracy</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.bookmarkedQuestions.length}</div>
                    <div className="stat-label">Bookmarked</div>
                </div>
            </div>

            {subjectsNeedingQuestions > 0 && (
                <div className="collection-status">
                    <p className="collection-info">
                        🔄 {subjectsNeedingQuestions} subjects are collecting new questions automatically
                    </p>
                </div>
            )}

            {stats.bookmarkedQuestions.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button className="btn secondary" onClick={onViewBookmarks}>
                        📚 Review Bookmarked Questions
                    </button>
                </div>
            )}
        </div>
    )
}

// Bookmarked Questions Review component
function BookmarkedReview({ onBack }) {
    const [stats] = useState(getStoredStats())

    const getQuestionFromId = (questionId) => {
        const [subject, index] = questionId.split('-')
        const idx = parseInt(index)
        return {
            subject,
            question: questionsData[subject]?.[idx],
            index: idx
        }
    }

    const removeBookmark = (questionId) => {
        const newBookmarks = stats.bookmarkedQuestions.filter(id => id !== questionId)
        const newStats = {
            ...stats,
            bookmarkedQuestions: newBookmarks
        }
        saveStats(newStats)
        // Force re-render by updating parent
        window.location.reload()
    }

    if (stats.bookmarkedQuestions.length === 0) {
        return (
            <div className="card">
                <h2 className="title">Bookmarked Questions</h2>
                <p className="subtitle">No bookmarked questions yet. Bookmark questions during practice to review them here!</p>
                <div className="actions">
                    <button className="btn primary" onClick={onBack}>Back to Subjects</button>
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <h2 className="title">📚 Bookmarked Questions ({stats.bookmarkedQuestions.length})</h2>
            <p className="subtitle">Review your saved questions</p>

            <div className="review-list">
                {stats.bookmarkedQuestions.map((questionId, idx) => {
                    const { subject, question, index } = getQuestionFromId(questionId)

                    if (!question) return null

                    return (
                        <div key={questionId} className="review-item" style={{ position: 'relative' }}>
                            <div className="review-q">
                                <strong>{subject}</strong> - Question {index + 1}
                            </div>
                            <div style={{ margin: '12px 0', fontSize: '1.1rem', fontWeight: '500' }}>
                                {question.question}
                            </div>
                            <div className="options" style={{ marginBottom: '12px' }}>
                                {question.options.map((opt, i) => (
                                    <div
                                        key={i}
                                        className={`btn option ${i === question.answer ? 'correct' : ''}`}
                                        style={{ cursor: 'default', marginBottom: '8px' }}
                                    >
                                        <span className="opt-index">{String.fromCharCode(65 + i)}.</span> {opt}
                                        {i === question.answer && <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>✓ Correct</span>}
                                    </div>
                                ))}
                            </div>
                            <button
                                className="bookmark-btn bookmarked"
                                onClick={() => removeBookmark(questionId)}
                                title="Remove bookmark"
                                style={{ position: 'absolute', top: '16px', right: '16px' }}
                            >
                                ★
                            </button>
                        </div>
                    )
                })}
            </div>

            <div className="actions">
                <button className="btn primary" onClick={onBack}>Back to Subjects</button>
            </div>
        </div>
    )
}

function SubjectPicker({ onPick, onViewBookmarks }) {
    const [stats] = useState(getStoredStats())

    return (
        <div className="card">
            <h1 className="title">Nursing MCQ Practice</h1>
            <p className="subtitle">Select a subject to begin • 60 seconds per question</p>
            
            <Statistics stats={stats} onViewBookmarks={onViewBookmarks} />
            
            <div className="subjects-grid">
                {SUBJECTS.map((s) => (
                    <button 
                        key={s} 
                        className="btn subject" 
                        onClick={() => onPick(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    )
}

function Quiz({ subject, onRestart }) {
    const [allQuestions, setAllQuestions] = useState([])
    const [seed, setSeed] = useState(() => Math.random())
    const [stats, setStats] = useState(getStoredStats())
    const [questionUpdateNotification, setQuestionUpdateNotification] = useState(null)

    // Load questions from service
    useEffect(() => {
        const loadQuestions = () => {
            const questions = questionService.getQuestions(subject)
            setAllQuestions(questions)
        }

        loadQuestions()

        // Listen for question updates
        const handleQuestionsUpdated = (event) => {
            if (event.detail.subject === subject) {
                loadQuestions()
                setQuestionUpdateNotification({
                    message: `🎉 ${event.detail.count} new questions added!`,
                    type: 'success'
                })
            }
        }

        window.addEventListener('questionsUpdated', handleQuestionsUpdated)
        return () => window.removeEventListener('questionsUpdated', handleQuestionsUpdated)
    }, [subject])

    // Generate a deterministic shuffled order of indices for the entire bank
    const order = useMemo(() => {
        const rng = mulberry32(Math.floor(seed * 1e9))
        const indices = Array.from({ length: allQuestions.length }, (_, i) => i)
        for (let i = indices.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1))
                ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }
        return indices
    }, [allQuestions.length, seed])

    const ROUND_SIZE = 50
    // chunkStart points to the first question of the current 50-question round in the shuffled order
    const [chunkStart, setChunkStart] = useState(0)
    const [currentInRound, setCurrentInRound] = useState(0)
    const [selectedIndex, setSelectedIndex] = useState(null)
    const [answers, setAnswers] = useState([]) // per-round answers
    const [showResult, setShowResult] = useState(false)

    // Timer states - always enabled with 60 seconds
    const [timeLeft, setTimeLeft] = useState(60)
    const [timerActive, setTimerActive] = useState(true)

    // Derive the question for the current round and position
    let q = null
    let questionId = null
    if (allQuestions.length === 0) {
        q = null
    } else if (allQuestions.length >= ROUND_SIZE) {
        const globalIndex = chunkStart + currentInRound
        const withinBank = globalIndex < order.length
        const idx = withinBank ? order[globalIndex] : order[globalIndex % order.length]
        q = allQuestions[idx]
        questionId = `${subject}-${idx}`
    } else {
        // Bank smaller than 50: sample with wrap-around over shuffled order
        const idx = order[currentInRound % order.length]
        q = allQuestions[idx]
        questionId = `${subject}-${idx}`
    }

    const total = ROUND_SIZE
    const isBookmarked = questionId && stats.bookmarkedQuestions.includes(questionId)

    // Timer callback
    const handleTimeUp = useCallback(() => {
        if (timerActive && timeLeft > 0) {
            setTimeLeft(prev => prev - 1)
        } else if (timerActive && timeLeft === 0 && selectedIndex === null) {
            // Auto-advance when time runs out
            nextQuestion()
        }
    }, [timerActive, timeLeft, selectedIndex])

    // Reset timer when moving to next question
    useEffect(() => {
        setTimeLeft(60) // Always 60 seconds
        setTimerActive(selectedIndex === null)
    }, [currentInRound, selectedIndex])

    function handlePick(i) {
        if (selectedIndex !== null) return
        setSelectedIndex(i)
        setTimerActive(false) // Stop timer when answer is selected

        const correct = q && i === q.answer
        setAnswers((prev) => {
            const next = prev.slice()
            next[currentInRound] = { picked: i, correct }
            return next
        })

        // Update stats
        const newStats = {
            ...stats,
            totalQuestions: stats.totalQuestions + 1,
            correctAnswers: stats.correctAnswers + (correct ? 1 : 0),
            subjectStats: {
                ...stats.subjectStats,
                [subject]: {
                    total: (stats.subjectStats[subject]?.total || 0) + 1,
                    correct: (stats.subjectStats[subject]?.correct || 0) + (correct ? 1 : 0)
                }
            }
        }
        setStats(newStats)
        saveStats(newStats)
    }

    function toggleBookmark() {
        if (!questionId) return

        const newBookmarks = isBookmarked
            ? stats.bookmarkedQuestions.filter(id => id !== questionId)
            : [...stats.bookmarkedQuestions, questionId]

        const newStats = {
            ...stats,
            bookmarkedQuestions: newBookmarks
        }
        setStats(newStats)
        saveStats(newStats)
    }

    function nextQuestion() {
        if (currentInRound + 1 < total) {
            setCurrentInRound((c) => c + 1)
            setSelectedIndex(null)
            setTimeLeft(60) // Always 60 seconds
            setTimerActive(true)
        } else {
            setShowResult(true)
            setTimerActive(false)
        }
    }

    function previousQuestion() {
        if (currentInRound > 0) {
            setCurrentInRound((c) => c - 1)
            // Restore previous answer if it exists
            const previousAnswer = answers[currentInRound - 1]
            setSelectedIndex(previousAnswer ? previousAnswer.picked : null)
            setTimerActive(false) // Don't restart timer for previous questions
        }
    }

    function restart() {
        // Start a completely new randomized run from the first chunk
        setSeed(Math.random())
        setChunkStart(0)
        setCurrentInRound(0)
        setSelectedIndex(null)
        setAnswers([])
        setShowResult(false)
        setTimeLeft(60) // Always 60 seconds
        setTimerActive(true)
    }

    async function nextRound() {
        // First, try to fetch new questions from external APIs
        await questionService.collectQuestionsForSubject(subject)
        
        // Reload questions to include any new ones
        const updatedQuestions = questionService.getQuestions(subject)
        setAllQuestions(updatedQuestions)
        
        // Advance to the next non-overlapping 50-question block. If we reach the end, reshuffle.
        const nextStart = chunkStart + ROUND_SIZE
        if (updatedQuestions.length >= ROUND_SIZE && nextStart < order.length) {
            setChunkStart(nextStart)
        } else {
            // reshuffle and start over
            setSeed(Math.random())
            setChunkStart(0)
        }
        setCurrentInRound(0)
        setSelectedIndex(null)
        setAnswers([])
        setShowResult(false)
        setTimeLeft(60) // Always 60 seconds
        setTimerActive(true)
    }

    if (showResult) {
        const correctCount = answers.filter(Boolean).filter((a) => a.correct).length
        return (
            <div className="card">
                <h2 className="title">{subject}</h2>
                <p className="score">You scored {correctCount} / {total}</p>
                <div className="actions">
                    <button className="btn primary" onClick={nextRound}>Next 50 questions</button>
                    <button className="btn" onClick={restart}>Restart (new shuffle)</button>
                    <button className="btn" onClick={onRestart}>Back to subjects</button>
                </div>
                <h3 className="subtitle review-heading">Review answers</h3>
                <ol className="review-list">
                    {[...Array(total)].map((_, idx) => {
                        let question = null
                        if (allQuestions.length === 0) question = null
                        else if (allQuestions.length >= ROUND_SIZE) {
                            const gi = chunkStart + idx
                            const withinBank = gi < order.length
                            const qi = withinBank ? order[gi] : order[gi % order.length]
                            question = allQuestions[qi]
                        } else {
                            const qi = order[idx % order.length]
                            question = allQuestions[qi]
                        }
                        const user = answers[idx]
                        const isCorrect = user ? user.correct : false
                        return (
                            <li key={idx} className="review-item">
                                <div className="review-q">{idx + 1}. {question ? question.question : '—'}</div>
                                {question && (
                                    <div className="review-a">
                                        <span className={isCorrect ? 'badge correct' : 'badge incorrect'}>
                                            {isCorrect ? 'Correct' : 'Incorrect'}
                                        </span>
                                        <span className="correct-ans">Correct: {question.options[question.answer]}</span>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </div>
        )
    }

    return (
        <div className="card quiz-card">
            {questionUpdateNotification && (
                <Notification
                    message={questionUpdateNotification.message}
                    type={questionUpdateNotification.type}
                    onClose={() => setQuestionUpdateNotification(null)}
                />
            )}

            <div className="quiz-header">
                <h2 className="title subject-title">{subject}</h2>
                <div className="progress">
                    <div className="question-counter">
                        Question {Math.min(currentInRound + 1, total)} of {total}
                    </div>
                    <div className="question-bank-info">
                        ({allQuestions.length} questions available)
                    </div>
                </div>
            </div>

            <Timer 
                timeLeft={timeLeft}
                isActive={timerActive}
                onTimeUp={handleTimeUp}
                difficulty="fixed"
            />

            <div className="question" style={{ position: 'relative' }}>
                {q ? q.question : allQuestions.length === 0 ? 'Loading questions...' : 'No questions available.'}
                {q && (
                    <button
                        className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={toggleBookmark}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
                    >
                        {isBookmarked ? '★' : '☆'}
                    </button>
                )}
            </div>

            <div className="options">
                {q && q.options.map((opt, i) => {
                    const picked = selectedIndex === i
                    const showState = selectedIndex !== null
                    const isCorrect = q.answer === i
                    let cls = 'btn option'
                    if (showState && isCorrect) cls += ' correct'
                    else if (showState && picked && !isCorrect) cls += ' incorrect'
                    return (
                        <button key={i} className={cls} onClick={() => handlePick(i)} disabled={selectedIndex !== null}>
                            <span className="opt-index">{String.fromCharCode(65 + i)}.</span> {opt}
                        </button>
                    )
                })}
            </div>

            {allQuestions.length < 10 && (
                <div className="low-questions-warning">
                    ⚠️ Running low on questions. New questions are being collected automatically!
                </div>
            )}

            <div className="actions">
                <button 
                    className="btn secondary" 
                    onClick={previousQuestion} 
                    disabled={currentInRound === 0}
                    title="Go to previous question"
                >
                    ← Previous
                </button>
                <button className="btn primary" onClick={nextQuestion} disabled={selectedIndex === null || !q}>
                    {currentInRound + 1 === total ? 'Finish' : 'Next →'}
                </button>
                <button className="btn secondary" onClick={toggleBookmark} disabled={!q}>
                    {isBookmarked ? '★ Remove' : '☆ Bookmark'}
                </button>
                <button className="btn" onClick={onRestart}>Change subject</button>
            </div>
        </div>
    )
}

// Simple seeded RNG for deterministic in-run shuffle
function mulberry32(a) {
    return function () {
        let t = (a += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export default function App() {
    const [currentView, setCurrentView] = useState('subjects') // 'subjects', 'quiz', 'bookmarks'
    const [quizConfig, setQuizConfig] = useState(null)
    
    const handleSubjectPick = (subject) => {
        setQuizConfig({ subject })
        setCurrentView('quiz')
        
        // Scroll to top when starting quiz to ensure question is visible
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
    }
    
    const handleRestart = () => {
        setQuizConfig(null)
        setCurrentView('subjects')
    }
    
    const handleViewBookmarks = () => {
        setCurrentView('bookmarks')
    }
    
    const handleBackToSubjects = () => {
        setCurrentView('subjects')
    }
    
    return (
        <div className="app">
            {currentView === 'subjects' && (
                <SubjectPicker 
                    onPick={handleSubjectPick} 
                    onViewBookmarks={handleViewBookmarks}
                />
            )}
            {currentView === 'quiz' && quizConfig && (
                <Quiz 
                    subject={quizConfig.subject}
                    onRestart={handleRestart} 
                />
            )}
            {currentView === 'bookmarks' && (
                <BookmarkedReview onBack={handleBackToSubjects} />
            )}
            <footer className="footer">
                Enhanced MCQ Practice • 60 Second Timer • Progress Tracking • Bookmarks
                <div className="watermark">
                    Developed by <a href="https://github.com/ashmilgit15" target="_blank" rel="noopener noreferrer">@ashmilgit15</a>
                </div>
            </footer>
        </div>
    )
}


