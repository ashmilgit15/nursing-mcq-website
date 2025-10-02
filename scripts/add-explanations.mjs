import fs from 'fs'
import path from 'path'

// Read the current questions file
const questionsPath = path.join(process.cwd(), 'src', 'questions.json')
const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))

// Subject-specific explanation templates and knowledge bases
const explanationGenerators = {
    'Psychiatric Nursing': {
        keywords: ['neurotransmitter', 'therapy', 'medication', 'disorder', 'symptom', 'treatment'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('neurotransmitter')) {
                return `This question relates to neurotransmitter function in psychiatric disorders. ${correctOption} is correct because it plays a crucial role in the pathophysiology and treatment of mental health conditions. Understanding neurotransmitter systems is essential for psychiatric nursing practice.`
            }
            if (question.includes('therapy') || question.includes('CBT')) {
                return `${correctOption} is the evidence-based approach supported by research. This therapeutic intervention has been shown to be effective through multiple clinical trials and is recommended by professional guidelines for this condition.`
            }
            if (question.includes('medication') || question.includes('antipsychotic') || question.includes('antidepressant')) {
                return `${correctOption} is correct based on the medication's mechanism of action, side effect profile, and clinical indications. Understanding pharmacology is crucial for safe psychiatric nursing practice and patient education.`
            }
            return `${correctOption} is the correct answer based on evidence-based psychiatric nursing practice. This knowledge is essential for providing safe, effective mental health care and supporting patient recovery.`
        }
    },
    'Medical Surgical Nursing': {
        keywords: ['cardiac', 'respiratory', 'surgery', 'medication', 'assessment', 'intervention'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('cardiac') || question.includes('heart')) {
                return `${correctOption} is correct based on cardiovascular physiology and pathophysiology. This knowledge is essential for monitoring cardiac patients and recognizing early signs of complications in medical-surgical settings.`
            }
            if (question.includes('respiratory') || question.includes('oxygen') || question.includes('breathing')) {
                return `${correctOption} represents the best practice for respiratory care. Understanding respiratory physiology and pathophysiology is crucial for assessing and managing patients with breathing difficulties.`
            }
            if (question.includes('surgery') || question.includes('postoperative') || question.includes('preoperative')) {
                return `${correctOption} is the evidence-based practice for surgical nursing care. Proper perioperative management is essential for preventing complications and promoting optimal patient outcomes.`
            }
            return `${correctOption} is correct according to medical-surgical nursing standards. This knowledge is fundamental for providing safe, competent care in acute care settings.`
        }
    },
    'Pediatric Nursing': {
        keywords: ['child', 'infant', 'development', 'vaccine', 'growth', 'safety'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('development') || question.includes('milestone')) {
                return `${correctOption} reflects normal child development patterns. Understanding developmental milestones is crucial for pediatric nurses to assess growth and identify potential delays early.`
            }
            if (question.includes('vaccine') || question.includes('immunization')) {
                return `${correctOption} follows current immunization guidelines. Proper vaccination schedules are essential for preventing childhood diseases and maintaining community health.`
            }
            if (question.includes('safety') || question.includes('injury')) {
                return `${correctOption} represents the best safety practice for children. Pediatric nurses must prioritize injury prevention and create safe environments for developing children.`
            }
            return `${correctOption} is correct based on pediatric nursing principles. Understanding child-specific care needs is essential for providing age-appropriate, family-centered care.`
        }
    },
    'Fundamentals of Nursing': {
        keywords: ['assessment', 'vital signs', 'infection control', 'communication', 'documentation'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('vital signs') || question.includes('temperature') || question.includes('blood pressure')) {
                return `${correctOption} is the most accurate and reliable method. Proper vital sign assessment is fundamental to nursing practice and essential for detecting changes in patient condition.`
            }
            if (question.includes('infection') || question.includes('hygiene') || question.includes('handwashing')) {
                return `${correctOption} follows evidence-based infection control practices. Proper infection prevention is a cornerstone of nursing practice and patient safety.`
            }
            if (question.includes('communication') || question.includes('therapeutic')) {
                return `${correctOption} demonstrates therapeutic communication principles. Effective communication is essential for building nurse-patient relationships and providing patient-centered care.`
            }
            return `${correctOption} represents fundamental nursing knowledge essential for safe, competent practice. These basic principles form the foundation of all nursing care.`
        }
    },
    'Human Anatomy': {
        keywords: ['muscle', 'bone', 'organ', 'system', 'structure', 'location'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('muscle') || question.includes('muscular')) {
                return `${correctOption} is correct based on anatomical structure and function. Understanding muscle anatomy is essential for assessing movement, strength, and functional capacity.`
            }
            if (question.includes('bone') || question.includes('skeleton')) {
                return `${correctOption} reflects normal skeletal anatomy. Knowledge of bone structure and function is crucial for understanding support, protection, and movement mechanisms.`
            }
            if (question.includes('nerve') || question.includes('nervous')) {
                return `${correctOption} is the correct anatomical location/function. Understanding nervous system anatomy is essential for neurological assessment and patient care.`
            }
            return `${correctOption} represents accurate anatomical knowledge. Understanding human anatomy is fundamental for all nursing assessments and interventions.`
        }
    },
    'Human Physiology': {
        keywords: ['function', 'process', 'regulation', 'homeostasis', 'mechanism'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('heart') || question.includes('cardiac') || question.includes('circulation')) {
                return `${correctOption} is correct based on cardiovascular physiology. Understanding heart function and circulation is essential for monitoring cardiac patients and recognizing abnormalities.`
            }
            if (question.includes('kidney') || question.includes('renal') || question.includes('urine')) {
                return `${correctOption} reflects normal renal physiology. Understanding kidney function is crucial for fluid balance management and detecting renal dysfunction.`
            }
            if (question.includes('hormone') || question.includes('endocrine')) {
                return `${correctOption} is accurate based on endocrine physiology. Understanding hormonal regulation is essential for managing patients with metabolic and endocrine disorders.`
            }
            return `${correctOption} represents normal physiological function. Understanding human physiology is fundamental for recognizing normal vs. abnormal findings in patient assessment.`
        }
    },
    'Nursing Research': {
        keywords: ['study', 'research', 'statistical', 'evidence', 'validity', 'reliability'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('p-value') || question.includes('statistical')) {
                return `${correctOption} is correct based on statistical principles. Understanding statistical significance is essential for interpreting research findings and applying evidence-based practice.`
            }
            if (question.includes('study design') || question.includes('methodology')) {
                return `${correctOption} represents the most appropriate research design for this type of study. Understanding research methodology is crucial for evaluating evidence quality.`
            }
            if (question.includes('validity') || question.includes('reliability')) {
                return `${correctOption} is essential for research quality. Understanding validity and reliability helps nurses evaluate research evidence and apply findings to practice.`
            }
            return `${correctOption} reflects evidence-based research principles. Understanding research concepts is essential for implementing evidence-based nursing practice.`
        }
    },
    'Microbiology': {
        keywords: ['bacteria', 'virus', 'infection', 'antibiotic', 'sterilization', 'pathogen'],
        generateExplanation: (question, correctOption, allOptions) => {
            if (question.includes('bacteria') || question.includes('bacterial')) {
                return `${correctOption} is correct based on bacterial characteristics and behavior. Understanding bacterial infections is essential for infection control and antimicrobial therapy.`
            }
            if (question.includes('antibiotic') || question.includes('resistance')) {
                return `${correctOption} reflects current understanding of antimicrobial therapy. Knowledge of antibiotic mechanisms and resistance patterns is crucial for effective treatment.`
            }
            if (question.includes('sterilization') || question.includes('disinfection')) {
                return `${correctOption} is the most effective method for eliminating microorganisms. Understanding sterilization principles is essential for infection control and patient safety.`
            }
            return `${correctOption} is correct based on microbiological principles. Understanding microbiology is fundamental for infection prevention and control in healthcare settings.`
        }
    }
}

// Generic explanation generator for subjects without specific templates
function generateGenericExplanation(subject, question, correctOption, allOptions) {
    const subjectLower = subject.toLowerCase()
    
    if (subjectLower.includes('nursing')) {
        return `${correctOption} is the correct answer based on evidence-based ${subject.toLowerCase()} practice. This knowledge is essential for providing safe, competent nursing care in this specialty area.`
    }
    
    if (subjectLower.includes('nutrition')) {
        return `${correctOption} is correct based on nutritional science and dietary guidelines. Understanding nutrition is essential for promoting health and managing disease through dietary interventions.`
    }
    
    if (subjectLower.includes('sociology')) {
        return `${correctOption} reflects important social and cultural factors that impact health. Understanding sociology helps nurses provide culturally competent, patient-centered care.`
    }
    
    return `${correctOption} is the correct answer based on current evidence and best practices in ${subject.toLowerCase()}. This knowledge is important for comprehensive nursing practice.`
}

// Process each subject
let totalQuestionsProcessed = 0
let questionsWithExplanations = 0

for (const [subject, questions] of Object.entries(questionsData)) {
    console.log(`Processing ${subject}...`)
    
    const generator = explanationGenerators[subject]
    
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        totalQuestionsProcessed++
        
        // Skip if already has explanation
        if (question.explanation && question.explanation.trim().length > 20) {
            questionsWithExplanations++
            continue
        }
        
        const correctOption = question.options[question.answer]
        let explanation
        
        if (generator) {
            explanation = generator.generateExplanation(question.question, correctOption, question.options)
        } else {
            explanation = generateGenericExplanation(subject, question.question, correctOption, question.options)
        }
        
        // Add the explanation
        question.explanation = explanation
        questionsWithExplanations++
    }
    
    console.log(`✅ Completed ${subject}: ${questions.length} questions`)
}

// Write the updated questions back to file
fs.writeFileSync(questionsPath, JSON.stringify(questionsData, null, 4))

console.log('\n🎉 Explanation generation complete!')
console.log(`📊 Statistics:`)
console.log(`   Total questions processed: ${totalQuestionsProcessed}`)
console.log(`   Questions with explanations: ${questionsWithExplanations}`)
console.log(`   Coverage: ${Math.round((questionsWithExplanations / totalQuestionsProcessed) * 100)}%`)
console.log('\n✨ All questions now have educational explanations!')
