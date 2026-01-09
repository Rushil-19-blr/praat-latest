
import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import VoiceAnalysisModal from './components/VoiceAnalysisModal';
import AnalysisResultsScreen from './components/AnalysisResultsScreen';
import CalibrationScreen from './components/CalibrationScreen';
import VoiceCalibrationScreen from './components/VoiceCalibrationScreen';
import PostAnalysisSuggestionsScreen from './components/PostAnalysisSuggestionsScreen';
import ConnectTheDots from './components/ConnectTheDots';
import ConfirmationPopup from './components/ConfirmationPopup';
import EnrollmentNumber from './components/EnrollmentNumber';
import ScratchCard from './components/ScratchCard';
import PasswordSetup from './components/PasswordSetup';
import SuccessPopup from './components/SuccessPopup';
import SignInScreen from './components/SignInScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDetailScreen from './components/StudentDetailScreen';
import StudentReportScreen from './components/StudentReportScreen';
import PreRecordingQuestionnaire from './components/PreRecordingQuestionnaire';
import SessionPlanningPage from './components/SessionPlanningPage';
import StreamChatProvider from './components/StreamChatProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { BeamsBackground } from './components/ui/beams-background';
import { GlassFilter } from './components/ui/liquid-radio';
import type { AnalysisData, Student, PreAnalysisSession } from './types';
import type { QuestionnaireAnswers } from './components/PreRecordingQuestionnaire';
// Import storage utilities - makes clearAllStorage() available globally
import './utils/storageUtils';
import { OnboardingService } from './services/onboardingService';
import { HybridStorageService } from './services/hybridStorageService';

type AppState = 'SIGNIN' | 'SIGNUP' | 'CONFIRMATION' | 'ENROLLMENT' | 'SCRATCH_CARD' | 'PASSWORD_SETUP' | 'SUCCESS' | 'DASHBOARD' | 'QUESTIONNAIRE' | 'RECORDING' | 'CALIBRATION_FLOW' | 'RESULTS' | 'SUGGESTIONS' | 'TEACHER_DASHBOARD' | 'STUDENT_DETAIL' | 'STUDENT_REPORT' | 'SESSION_PLANNING';

// HACK: Cast motion components to 'any' to bypass type errors.
const MotionDiv = motion.div as any;

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

  const loadStudentData = useCallback(async () => {
    try {
      console.log('📥 Loading student data...');

      // 1. Load all users (students)
      const usersData = await HybridStorageService.getAllUsers();
      if (usersData && usersData.length > 0) {
        localStorage.setItem('allStudentsData', JSON.stringify(usersData));
        setStudents(usersData);
        console.log('✅ Loaded', usersData.length, 'students');
      } else {
        // Fallback to localStorage
        const localData = localStorage.getItem('allStudentsData');
        if (localData) {
          const studentsData = JSON.parse(localData);
          setStudents(studentsData);
        } else {
          setStudents([]);
        }
      }

      // 2. Load nicknames (Teacher Settings)
      if (HybridStorageService.isOnline()) {
        const nicknames = await HybridStorageService.pullFromFirebase('studentNicknames');
        if (nicknames) {
          localStorage.setItem('studentNicknames', JSON.stringify(nicknames));
          console.log('✅ Loaded nicknames from Firebase');
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      // Fallback
      const localData = localStorage.getItem('allStudentsData');
      if (localData) {
        try {
          setStudents(JSON.parse(localData));
        } catch {
          setStudents([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Expose HybridStorageService to window for manual migration
    (window as any).HybridStorageService = HybridStorageService;

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

        HybridStorageService.set('userData', defaultStudent);
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
            HybridStorageService.set('studentAccounts', studentAccounts);
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
        HybridStorageService.set('userData', matchingAccount);
        localStorage.setItem('isSignedIn', 'true');
        setAccountNumber(matchingAccount.accountNumber);

        // Pull latest data from Firebase if available
        if (HybridStorageService.isOnline()) {
          try {
            console.log('📥 Syncing student data from Firebase...');

            // Pull user-specific data
            const userBaseline = await HybridStorageService.pullFromFirebase(`voiceBaseline_${matchingAccount.accountNumber}`);
            if (userBaseline) {
              localStorage.setItem(`voiceBaseline_${matchingAccount.accountNumber}`, JSON.stringify(userBaseline));
              setBaselineData(JSON.stringify(userBaseline));
              console.log('✅ Synced voice baseline from Firebase');
            }

            // Pull suggestions data
            const suggestions = await HybridStorageService.pullFromFirebase(`suggestions_${matchingAccount.accountNumber}`);
            if (suggestions) {
              localStorage.setItem(`suggestions_${matchingAccount.accountNumber}`, JSON.stringify(suggestions));
              console.log('✅ Synced suggestions from Firebase');
            }

            // Pull student history
            const studentHistory = await HybridStorageService.pullFromFirebase(`awaaz_student_${matchingAccount.accountNumber}`);
            if (studentHistory) {
              localStorage.setItem(`awaaz_student_${matchingAccount.accountNumber}`, JSON.stringify(studentHistory));
              console.log('✅ Synced student history from Firebase');
            }
          } catch (error) {
            console.error('Error syncing from Firebase:', error);
          }
        } else {
          // Offline mode - load from localStorage
          const userBaseline = localStorage.getItem(`voiceBaseline_${matchingAccount.accountNumber}`);
          if (userBaseline) {
            setBaselineData(userBaseline);
          } else {
            setBaselineData(null);
          }
        }
        setAppState('DASHBOARD');
      } else {
        throw new Error('Invalid credentials');
      }
    }
  }, [loadStudentData]);

  const handleCreateAccount = useCallback(() => {
    setAppState('SIGNUP');
  }, []);

  const handleSignOut = useCallback(async () => {
    // Sync pending data to Firebase before logout
    await HybridStorageService.syncOnLogout();

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
      HybridStorageService.set('studentAccounts', studentAccounts);
    } else {
      // Update existing account (shouldn't normally happen)
      studentAccounts[accountIndex] = newAccountData;
      HybridStorageService.set('studentAccounts', studentAccounts);
    }

    // Store current user data for the session (auto-sign in after successful signup)
    localStorage.setItem('isSignedUp', 'true');
    localStorage.setItem('isSignedIn', 'true');
    HybridStorageService.set('userData', newAccountData);

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
      HybridStorageService.set('allStudentsData', studentsData);

      // Update local state
      setStudents(studentsData);
    }

    // Initialize Onboarding for this new student
    OnboardingService.initializeForNewUser(accountNumber);

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
        HybridStorageService.set('allStudentsData', studentsData);

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
      HybridStorageService.set('allStudentsData', students);
      setStudents(students);
    } catch (error) {
      console.error('Failed to store self-report score', error);
    }
  }, []);

  const handleCalibrationComplete = useCallback((baselineJson: string) => {
    HybridStorageService.set('voiceBaseline', baselineJson);
    setBaselineData(baselineJson);
    setAppState('DASHBOARD');
  }, []);

  const handleVoiceCalibrationComplete = useCallback((baselineJson: string) => {
    const baselineKey = accountNumber ? `voiceBaseline_${accountNumber}` : 'voiceBaseline';
    HybridStorageService.set(baselineKey, baselineJson);
    setBaselineData(baselineJson);

    // Save baseline to account data for persistence
    const storedAccounts = localStorage.getItem('studentAccounts');
    if (storedAccounts && accountNumber) {
      try {
        const accounts = JSON.parse(storedAccounts);
        const updatedAccounts = accounts.map((acc: any) =>
          acc.accountNumber === accountNumber ? { ...acc, voiceBaseline: baselineJson } : acc
        );
        HybridStorageService.set('studentAccounts', updatedAccounts);

        // Also update current userData in session
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          if (parsed.accountNumber === accountNumber) {
            HybridStorageService.set('userData', { ...parsed, voiceBaseline: baselineJson });
          }
        }

        // Advance onboarding state if needed
        OnboardingService.completeStep(accountNumber, 'calibration');
        const state = OnboardingService.getState(accountNumber);
        if (!state.hasSeenWelcome) {
          OnboardingService.completeStep(accountNumber, 'welcome');
        }
        // If they did calibration, they are fully setup
        OnboardingService.skipOnboarding(accountNumber);
      } catch (e) {
        console.error('Error updating account baseline:', e);
      }
    }
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
        <AnimatePresence initial={false}>
          {/* Sign-in Screen */}
          {appState === 'SIGNIN' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {/* Signup Flow Components */}
          {appState === 'SIGNUP' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'ENROLLMENT' && (
            <MotionDiv
              key="enrollment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <EnrollmentNumber onSubmit={handleEnrollmentSubmit} />
            </MotionDiv>
          )}

          {appState === 'SCRATCH_CARD' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'PASSWORD_SETUP' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'DASHBOARD' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'QUESTIONNAIRE' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'TEACHER_DASHBOARD' && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'STUDENT_DETAIL' && selectedStudent && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'STUDENT_REPORT' && selectedStudent && analysisData && (
            <MotionDiv
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
            </MotionDiv>
          )}

          {appState === 'SESSION_PLANNING' && planningStudentId && (
            <MotionDiv
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
            </MotionDiv>
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
            <MotionDiv
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
            </MotionDiv>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'RESULTS' && analysisData && (
            <MotionDiv
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
            </MotionDiv>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'SUGGESTIONS' && analysisData && (
            <MotionDiv
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
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </StreamChatProvider>
  );
};

export default App;
