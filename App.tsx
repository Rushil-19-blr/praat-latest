
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./components/Dashboard'));
const VoiceAnalysisModal = lazy(() => import('./components/VoiceAnalysisModal'));
const AnalysisResultsScreen = lazy(() => import('./components/AnalysisResultsScreen'));
const CalibrationScreen = lazy(() => import('./components/CalibrationScreen'));
const VoiceCalibrationScreen = lazy(() => import('./components/VoiceCalibrationScreen'));
const PostAnalysisSuggestionsScreen = lazy(() => import('./components/PostAnalysisSuggestionsScreen'));
const ConnectTheDots = lazy(() => import('./components/ConnectTheDots'));
const ConfirmationPopup = lazy(() => import('./components/ConfirmationPopup'));
const EnrollmentNumber = lazy(() => import('./components/EnrollmentNumber'));
const ScratchCard = lazy(() => import('./components/ScratchCard'));
const PasswordSetup = lazy(() => import('./components/PasswordSetup'));
const SuccessPopup = lazy(() => import('./components/SuccessPopup'));
const SignInScreen = lazy(() => import('./components/SignInScreen'));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const StudentDetailScreen = lazy(() => import('./components/StudentDetailScreen'));
const StudentReportScreen = lazy(() => import('./components/StudentReportScreen'));
const PreRecordingQuestionnaire = lazy(() => import('./components/PreRecordingQuestionnaire'));
const SessionPlanningPage = lazy(() => import('./components/SessionPlanningPage'));
import StreamChatProvider from './components/StreamChatProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { BeamsBackground } from './components/ui/beams-background';
import { GlassFilter } from './components/ui/liquid-radio';
import type { AnalysisData, Student, PreAnalysisSession } from './types';
import type { QuestionnaireAnswers } from './components/PreRecordingQuestionnaire';
// Import storage utilities - makes clearAllStorage() available globally
import './utils/storageUtils';

type AppState = 'SIGNIN' | 'SIGNUP' | 'CONFIRMATION' | 'ENROLLMENT' | 'SCRATCH_CARD' | 'PASSWORD_SETUP' | 'SUCCESS' | 'DASHBOARD' | 'QUESTIONNAIRE' | 'RECORDING' | 'CALIBRATION_FLOW' | 'RESULTS' | 'SUGGESTIONS' | 'TEACHER_DASHBOARD' | 'STUDENT_DETAIL' | 'STUDENT_REPORT' | 'SESSION_PLANNING';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SIGNIN');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [baselineData, setBaselineData] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [preAnalysisSession, setPreAnalysisSession] = useState<PreAnalysisSession | null>(null);
  const [planningStudentId, setPlanningStudentId] = useState<string | null>(null);

  // Signup flow state
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loadStudentData = useCallback(() => {
    // Get all student data from localStorage
    const allStudentsData = localStorage.getItem('allStudentsData');
    if (allStudentsData) {
      try {
        const studentsData = JSON.parse(allStudentsData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Error parsing student data:', error);
        // Fallback to empty array if data is corrupted
        setStudents([]);
      }
    } else {
      // Initialize with empty array if no data exists
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    const storedBaseline = localStorage.getItem('voiceBaseline');
    if (storedBaseline) {
      setBaselineData(storedBaseline);
    }

    // Load real student data from localStorage on initial mount
    loadStudentData();
  }, [loadStudentData]);

  // Reload student data when teacher dashboard is shown
  useEffect(() => {
    if (appState === 'TEACHER_DASHBOARD') {
      loadStudentData();
    }
  }, [appState, loadStudentData]);

  // Sign-in handlers
  const handleSignIn = useCallback(async (code: string, password: string, userType: 'student' | 'teacher') => {
    setUserType(userType);

    if (userType === 'teacher') {
      // Teacher authentication with admin credentials
      const adminCode = '9999';
      const adminPassword = 'admin123';

      if (code === adminCode && password === adminPassword) {
        localStorage.setItem('isTeacherSignedIn', 'true');
        // Reload student data to get latest students including newly created ones
        loadStudentData();
        setAppState('TEACHER_DASHBOARD');
      } else {
        throw new Error('Invalid admin credentials');
      }
    } else {
      // Student authentication - check all student accounts

      // HARDCODED LOGIN CHECK
      if (code === '9999' && password === 'asdfgh') {
        // Create a default student session
        const defaultStudent = {
          accountNumber: '9999',
          password: 'asdfgh',
          enrollment: 'Student', // Default name
          class: 10,
          section: 'A'
        };

        localStorage.setItem('userData', JSON.stringify(defaultStudent));
        localStorage.setItem('isSignedIn', 'true');
        setAppState('DASHBOARD');
        return;
      }

      let studentAccountsData = localStorage.getItem('studentAccounts');
      let studentAccounts: any[] = [];

      // Backward compatibility: Migrate old userData to studentAccounts if it exists
      if (!studentAccountsData) {
        const oldUserData = localStorage.getItem('userData');
        if (oldUserData) {
          try {
            const parsedOldData = JSON.parse(oldUserData);
            // Migrate old account to new format
            studentAccounts = [parsedOldData];
            localStorage.setItem('studentAccounts', JSON.stringify(studentAccounts));
          } catch (error) {
            console.error('Error migrating old user data:', error);
          }
        }
      } else {
        try {
          const parsed = JSON.parse(studentAccountsData);
          // Ensure it's an array - if it's an object, convert it to an array
          if (Array.isArray(parsed)) {
            studentAccounts = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // If it's a single object, convert to array
            studentAccounts = [parsed];
          } else {
            // If it's not an array or object, start fresh
            studentAccounts = [];
          }
        } catch (error) {
          console.error('Error parsing studentAccounts from localStorage:', error);
          // If parsing fails, start with empty array
          studentAccounts = [];
        }
      }

      if (studentAccounts.length === 0) {
        throw new Error('No account found. Please create an account first.');
      }

      // Find the account matching the provided credentials
      const matchingAccount = studentAccounts.find((account: any) =>
        account.accountNumber === code && account.password === password
      );

      if (matchingAccount) {
        // Store the current user's data for the session
        localStorage.setItem('userData', JSON.stringify(matchingAccount));
        localStorage.setItem('isSignedIn', 'true');
        setAppState('DASHBOARD');
      } else {
        throw new Error('Invalid credentials');
      }
    }
  }, [loadStudentData]);

  const handleCreateAccount = useCallback(() => {
    setAppState('SIGNUP');
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('isSignedIn');
    localStorage.removeItem('isTeacherSignedIn');
    setAppState('SIGNIN');
  }, []);

  const handleSelectStudent = useCallback((studentCode: string) => {
    const student = students.find(s => s.code === studentCode);
    if (student) {
      setSelectedStudent(student);
      setAppState('STUDENT_DETAIL');
    }
  }, [students]);

  const handleBackToTeacherDashboard = useCallback(() => {
    loadStudentData();
    setSelectedStudent(null);
    setAppState('TEACHER_DASHBOARD');
  }, [loadStudentData]);

  // Signup flow handlers
  const handleClassSectionConnect = useCallback((classNum: number, section: string) => {
    setSelectedClass(classNum);
    setSelectedSection(section);
    setShowConfirmation(true);
  }, []);

  const handleConfirmationConfirm = useCallback(() => {
    setShowConfirmation(false);
    setAppState('ENROLLMENT');
  }, []);

  const handleConfirmationRetry = useCallback(() => {
    setShowConfirmation(false);
    setSelectedClass(null);
    setSelectedSection(null);
  }, []);

  const handleEnrollmentSubmit = useCallback((enrollment: string) => {
    setEnrollmentNumber(enrollment);
    // Generate a 4-digit account number based on enrollment
    const accountNum = Math.floor(1000 + Math.random() * 9000).toString();
    setAccountNumber(accountNum);
    setAppState('SCRATCH_CARD');
  }, []);

  const handleScratchCardComplete = useCallback(() => {
    setAppState('PASSWORD_SETUP');
  }, []);

  const handlePasswordSetupComplete = useCallback((password: string) => {
    // Store signup data in the accounts array to support multiple accounts
    const newAccountData = {
      class: selectedClass,
      section: selectedSection,
      enrollment: enrollmentNumber,
      accountNumber: accountNumber,
      password: password
    };

    // Get existing student accounts or create new array
    const studentAccountsData = localStorage.getItem('studentAccounts');
    let studentAccounts: any[] = [];

    if (studentAccountsData) {
      try {
        const parsed = JSON.parse(studentAccountsData);
        // Ensure it's an array - if it's an object, convert it to an array
        if (Array.isArray(parsed)) {
          studentAccounts = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // If it's a single object, convert to array
          studentAccounts = [parsed];
        } else {
          // If it's not an array or object, start fresh
          studentAccounts = [];
        }
      } catch (error) {
        console.error('Error parsing studentAccounts from localStorage:', error);
        // If parsing fails, start with empty array
        studentAccounts = [];
      }
    }

    // Check if account already exists (shouldn't happen, but just in case)
    const accountIndex = studentAccounts.findIndex(acc => acc.accountNumber === accountNumber);

    if (accountIndex === -1) {
      // Add new account to the array
      studentAccounts.push(newAccountData);
      localStorage.setItem('studentAccounts', JSON.stringify(studentAccounts));
    } else {
      // Update existing account (shouldn't normally happen)
      studentAccounts[accountIndex] = newAccountData;
      localStorage.setItem('studentAccounts', JSON.stringify(studentAccounts));
    }

    // Store current user data for the session (auto-sign in after successful signup)
    localStorage.setItem('isSignedUp', 'true');
    localStorage.setItem('isSignedIn', 'true');
    localStorage.setItem('userData', JSON.stringify(newAccountData));

    // Add student to allStudentsData immediately so teacher can see them
    const allStudentsData = localStorage.getItem('allStudentsData');
    let studentsData: Student[] = allStudentsData ? JSON.parse(allStudentsData) : [];

    // Check if student already exists (shouldn't happen, but just in case)
    const studentIndex = studentsData.findIndex(s => s.code === accountNumber);

    if (studentIndex === -1) {
      // Create new student entry with empty analysisHistory
      const newStudent: Student = {
        code: accountNumber,
        name: enrollmentNumber || 'Unknown Student',
        class: selectedClass || 10,
        section: selectedSection || 'A',
        riskLevel: 'low', // Default to low risk until analysis is done
        analysisHistory: [] // Empty initially
      };
      studentsData.push(newStudent);

      // Save updated students data
      localStorage.setItem('allStudentsData', JSON.stringify(studentsData));

      // Update local state
      setStudents(studentsData);
    }

    setAppState('SUCCESS');
  }, [selectedClass, selectedSection, enrollmentNumber, accountNumber]);

  const handleSuccessProceed = useCallback(() => {
    setAppState('DASHBOARD');
  }, []);

  const handleStartSession = useCallback(() => setAppState('QUESTIONNAIRE'), []);
  const handleStartCalibration = useCallback(() => setAppState('CALIBRATION_FLOW'), []);

  const handleQuestionnaireSubmit = useCallback((answers: QuestionnaireAnswers, questions?: any[]) => {
    setQuestionnaireAnswers(answers);

    // Construct PreAnalysisSession object
    const session: PreAnalysisSession = {
      sessionId: `preanalysis_${Date.now()}`,
      date: new Date().toISOString(),
      questions: questions || [],
      answers: answers as { [questionId: string]: string | number }
    };
    setPreAnalysisSession(session);

    // Optionally store in localStorage for future reference
    localStorage.setItem('questionnaireAnswers', JSON.stringify(answers));
    localStorage.setItem('currentPreAnalysisSession', JSON.stringify(session));
    setAppState('RECORDING');
  }, []);

  const handleQuestionnaireBack = useCallback(() => {
    setAppState('DASHBOARD');
  }, []);

  const handleCloseModal = useCallback(() => setAppState('DASHBOARD'), []);


  const handleAnalysisComplete = useCallback((data: AnalysisData) => {
    const { aiSummary, ...rest } = data;
    // Get questionnaire answers from localStorage if available
    const storedAnswers = localStorage.getItem('questionnaireAnswers');
    const questionnaireAnswers = storedAnswers ? JSON.parse(storedAnswers) : null;

    const analysisDataWithDate = {
      ...rest,
      aiSummary,
      date: new Date().toISOString(),
      questionnaireAnswers: questionnaireAnswers || undefined
    };
    setAnalysisData(analysisDataWithDate);

    // Save analysis data to student's history
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        const studentCode = parsedUserData.accountNumber;
        const studentName = parsedUserData.enrollment || 'Unknown Student';
        const studentClass = parsedUserData.class || 10;
        const studentSection = parsedUserData.section || 'A';

        // Get existing students data
        const allStudentsData = localStorage.getItem('allStudentsData');
        let studentsData: Student[] = allStudentsData ? JSON.parse(allStudentsData) : [];

        // Find existing student or create new one
        let studentIndex = studentsData.findIndex(s => s.code === studentCode);

        if (studentIndex === -1) {
          // Create new student
          const newStudent: Student = {
            code: studentCode,
            name: studentName,
            class: studentClass,
            section: studentSection,
            riskLevel: data.stressLevel > 70 ? 'high' : data.stressLevel > 40 ? 'moderate' : 'low',
            analysisHistory: [analysisDataWithDate]
          };
          studentsData.push(newStudent);
        } else {
          // Update existing student
          studentsData[studentIndex].analysisHistory.push(analysisDataWithDate);
          // Update risk level based on latest analysis
          const latestStress = data.stressLevel;
          studentsData[studentIndex].riskLevel = latestStress > 70 ? 'high' : latestStress > 40 ? 'moderate' : 'low';
        }

        // Save updated students data
        localStorage.setItem('allStudentsData', JSON.stringify(studentsData));

        // Update local state
        setStudents(studentsData);
      } catch (error) {
        console.error('Error saving student data:', error);
      }
    }

    handleNextToSuggestions();
  }, []);

  const handleSelfReportSubmit = useCallback((score: number) => {
    setAnalysisData(prev => prev ? { ...prev, selfReportScore: score } : prev);
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) {
        return;
      }
      const { accountNumber } = JSON.parse(userData);
      if (!accountNumber) return;

      const allStudentsData = localStorage.getItem('allStudentsData');
      if (!allStudentsData) return;
      const students: Student[] = JSON.parse(allStudentsData);
      const studentIndex = students.findIndex(s => s.code === accountNumber);
      if (studentIndex === -1 || students[studentIndex].analysisHistory.length === 0) return;

      const latestIndex = students[studentIndex].analysisHistory.length - 1;
      students[studentIndex].analysisHistory[latestIndex] = {
        ...students[studentIndex].analysisHistory[latestIndex],
        selfReportScore: score,
      };
      localStorage.setItem('allStudentsData', JSON.stringify(students));
      setStudents(students);
    } catch (error) {
      console.error('Failed to store self-report score', error);
    }
  }, []);

  const handleCalibrationComplete = useCallback((baselineJson: string) => {
    localStorage.setItem('voiceBaseline', baselineJson);
    setBaselineData(baselineJson);
    setAppState('DASHBOARD');
  }, []);

  const handleVoiceCalibrationComplete = useCallback((baselineJson: string) => {
    localStorage.setItem('voiceBaseline', baselineJson);
    setBaselineData(baselineJson);
    setAppState('DASHBOARD');
  }, []);

  const handleResultsClose = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);

  const handleNewRecordingFromResults = useCallback(() => {
    setAnalysisData(null);
    setAppState('RECORDING');
  }, []);

  const handleNextToSuggestions = useCallback(async () => {
    // Trigger confetti when navigating to suggestions
    const { triggerSideCannonsConfetti } = await import('./utils/confetti');
    // Small delay to ensure page transition starts and suggestions screen is visible
    setTimeout(() => {
      triggerSideCannonsConfetti();
    }, 500);
    setAppState('SUGGESTIONS');
  }, []);

  const handleSuggestionsBack = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);

  const handleSuggestionsClose = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);

  const handleReportClick = useCallback((analysis: AnalysisData) => {
    if (selectedStudent && analysis) {
      setAnalysisData(analysis);
      setAppState('STUDENT_REPORT');
    }
  }, [selectedStudent]);

  const handleReportBack = useCallback(() => {
    setAppState('STUDENT_DETAIL');
  }, []);

  // Session Planning handlers
  const handlePlanSession = useCallback((studentId: string) => {
    setPlanningStudentId(studentId);
    setAppState('SESSION_PLANNING');
  }, []);

  const handlePlanningBack = useCallback(() => {
    setPlanningStudentId(null);
    setAppState('TEACHER_DASHBOARD');
  }, []);

  const handlePlanningSave = useCallback(() => {
    setPlanningStudentId(null);
    setAppState('TEACHER_DASHBOARD');
  }, []);

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.4, ease: 'easeInOut' }
  };

  return (
    <StreamChatProvider>
      <GlassFilter />
      <BeamsBackground intensity="medium" />
      <div className="min-h-screen w-full overflow-hidden relative">
        <Suspense fallback={<div>Loading...</div>}>
          <AnimatePresence initial={false}>
            {/* Sign-in Screen */}
            {appState === 'SIGNIN' && (
              <motion.div
              key="signin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <SignInScreen
                onSignIn={handleSignIn}
                onCreateAccount={handleCreateAccount}
              />
            </motion.div>
          )}

          {/* Signup Flow Components */}
          {appState === 'SIGNUP' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <ConnectTheDots
                onConnect={handleClassSectionConnect}
                isEnabled={true}
              />
            </motion.div>
          )}

          {appState === 'ENROLLMENT' && (
            <motion.div
              key="enrollment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <EnrollmentNumber onSubmit={handleEnrollmentSubmit} />
            </motion.div>
          )}

          {appState === 'SCRATCH_CARD' && (
            <motion.div
              key="scratch-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <ScratchCard
                accountNumber={accountNumber}
                onComplete={handleScratchCardComplete}
              />
            </motion.div>
          )}

          {appState === 'PASSWORD_SETUP' && (
            <motion.div
              key="password-setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <PasswordSetup
                accountNumber={accountNumber}
                onSubmit={handlePasswordSetupComplete}
              />
            </motion.div>
          )}

          {appState === 'DASHBOARD' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <Dashboard
                onStartVoiceSession={handleStartSession}
                onStartCalibration={handleStartCalibration}
                onSignOut={handleSignOut}
              />
            </motion.div>
          )}

          {appState === 'QUESTIONNAIRE' && (
            <motion.div
              key="questionnaire"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <PreRecordingQuestionnaire
                onSubmit={handleQuestionnaireSubmit}
                onBack={handleQuestionnaireBack}
                studentId={userType === 'student' ? accountNumber : (selectedStudent?.code || planningStudentId || undefined)}
              />
            </motion.div>
          )}

          {appState === 'TEACHER_DASHBOARD' && (
            <motion.div
              key="teacher-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <TeacherDashboard
                students={students}
                onSelectStudent={handleSelectStudent}
                onSignOut={handleSignOut}
                onRefresh={loadStudentData}
                onPlanSession={handlePlanSession}
              />
            </motion.div>
          )}

          {appState === 'STUDENT_DETAIL' && selectedStudent && (
            <motion.div
              key="student-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <StudentDetailScreen
                student={selectedStudent}
                onBack={handleBackToTeacherDashboard}
                isTeacherView={true}
                onReportClick={handleReportClick}
              />
            </motion.div>
          )}

          {appState === 'STUDENT_REPORT' && selectedStudent && analysisData && (
            <motion.div
              key="student-report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <StudentReportScreen
                student={selectedStudent}
                analysisData={analysisData}
                onBack={handleReportBack}
              />
            </motion.div>
          )}

          {appState === 'SESSION_PLANNING' && planningStudentId && (
            <motion.div
              key="session-planning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <SessionPlanningPage
                studentId={planningStudentId}
                studentName={students.find(s => s.code === planningStudentId)?.name}
                onBack={handlePlanningBack}
                onSave={handlePlanningSave}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popup Components */}
        <AnimatePresence>
          {showConfirmation && selectedClass && selectedSection && (
            <ConfirmationPopup
              classNumber={selectedClass}
              section={selectedSection}
              onConfirm={handleConfirmationConfirm}
              onRetry={handleConfirmationRetry}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'SUCCESS' && (
            <SuccessPopup
              accountNumber={accountNumber}
              onProceed={handleSuccessProceed}
            />
          )}
        </AnimatePresence>


        <AnimatePresence>
          {appState === 'RECORDING' && (
            <VoiceAnalysisModal
              onClose={handleCloseModal}
              onAnalysisReady={handleAnalysisComplete}
              baselineData={baselineData}
              audioBlob={recordedAudioBlob}
              preAnalysisSession={preAnalysisSession || undefined}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'CALIBRATION_FLOW' && (
            <motion.div
              key="calibration-screen"
              className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VoiceCalibrationScreen
                onClose={handleCloseModal}
                onCalibrationComplete={handleVoiceCalibrationComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'RESULTS' && analysisData && (
            <motion.div
              key="results-page"
              className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
            >
              <AnalysisResultsScreen
                analysisData={analysisData}
                onNewRecording={handleNewRecordingFromResults}
                onClose={handleResultsClose}
                onNext={handleNextToSuggestions}
                onSelfReportSubmit={handleSelfReportSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'SUGGESTIONS' && analysisData && (
            <motion.div
              key="suggestions-page"
              className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
            >
              <PostAnalysisSuggestionsScreen
                analysisData={analysisData}
                onBack={handleSuggestionsBack}
                onClose={handleSuggestionsClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>
      </div>
    </StreamChatProvider>
  );
};

export default App;
