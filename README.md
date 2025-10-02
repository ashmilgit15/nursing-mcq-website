# 🏥 Nursing MCQ Practice Website

A comprehensive, intelligent nursing MCQ practice platform with **automatic question collection** and advanced learning features.

## ✨ Features

### 🎯 **Core Learning Features**
- **603+ High-Quality Questions** across 13 nursing subjects
- **Timer System** with 3 difficulty levels (Easy: 120s, Medium: 90s, Hard: 60s)
- **Progress Tracking** with persistent statistics
- **Bookmark System** for difficult questions
- **Real-time Feedback** with immediate answer validation

### 🤖 **Intelligent Question Management**
- **Automatic Question Collection** when running low
- **Multiple API Integration** (OpenTDB, Trivia API)
- **Smart Fallback System** when APIs are unavailable
- **Real-time Notifications** when new questions are added
- **Persistent Storage** of collected questions

### 🎨 **Modern UI/UX**
- **Beautiful Responsive Design** works on all devices
- **Smooth Animations** and transitions
- **Professional Gradient Themes**
- **Mobile-First** responsive layout
- **Accessibility Features** with proper focus states

## 📚 Subjects Covered

- Psychiatric Nursing (52 questions)
- Pediatric Nursing (53 questions)
- Obstetrics and Gynecology Nursing (50 questions)
- Community Health Nursing (51 questions)
- Nursing Administration (50 questions)
- Nursing Research (50 questions)
- Medical Surgical Nursing (52 questions)
- Fundamentals of Nursing (49 questions)
- Human Anatomy (39 questions)
- Human Physiology (50 questions)
- Microbiology (30 questions)
- Sociology (20 questions)
- Nutrition (57 questions)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deploy for FREE

This website can be deployed for **FREE** on multiple platforms:

### 🌟 Vercel (Recommended)
1. Push to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Deploy automatically

### 🎯 Netlify
1. Build: `npm run build`
2. Drag `dist` folder to [Netlify](https://netlify.com)

### 📚 GitHub Pages
1. Install: `npm install --save-dev gh-pages`
2. Deploy: `npm run deploy`

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18.3.1** with modern hooks
- **Vite** for fast development and building
- **Vanilla CSS** with modern features
- **Local Storage** for data persistence

### Question Service
- **Intelligent Collection System** with configurable thresholds
- **Multiple API Sources** with automatic failover
- **Event-Driven Architecture** for real-time updates
- **Queue Management** to prevent duplicate requests
- **Error Handling** with retry logic

### Key Components
- `questionService.js` - Automatic question collection
- `App.jsx` - Main application with routing
- `styles.css` - Modern responsive styling
- `questions.json` - Comprehensive question database

## 🎓 Perfect For

- **Nursing Students** preparing for exams
- **NCLEX Preparation** and practice
- **Study Groups** and collaborative learning
- **Nursing Schools** as teaching resources
- **Professional Development** and continuing education

## 📊 Statistics & Analytics

- **Real-time Progress Tracking**
- **Subject-wise Performance**
- **Accuracy Calculations**
- **Question Collection Status**
- **Bookmark Management**

## 🔧 Configuration

The question collection system is configurable in `src/questionService.js`:

```javascript
const QUESTION_CONFIG = {
    MIN_QUESTIONS_THRESHOLD: 10, // Trigger collection when below this
    BATCH_SIZE: 20, // Number of questions to fetch at once
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000 // ms
}
```

## 🤝 Contributing

This is an open-source educational project. Contributions are welcome!

## 📄 License

MIT License - Feel free to use for educational purposes.

---

**Built with ❤️ for nursing students worldwide** 🌍👩‍⚕️👨‍⚕️


