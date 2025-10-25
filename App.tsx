
import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import VoiceAnalysisModal from './components/VoiceAnalysisModal';
import AnalysisResultsScreen from './components/AnalysisResultsScreen';
import CalibrationScreen from './components/CalibrationScreen';
import ConnectTheDots from './components/ConnectTheDots';
import ConfirmationPopup from './components/ConfirmationPopup';
import EnrollmentNumber from './components/EnrollmentNumber';
import ScratchCard from './components/ScratchCard';
import PasswordSetup from './components/PasswordSetup';
import SuccessPopup from './components/SuccessPopup';
import SignInScreen from './components/SignInScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDetailScreen from './components/StudentDetailScreen';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnalysisData, Student } from './types';

type AppState = 'SIGNIN' | 'SIGNUP' | 'CONFIRMATION' | 'ENROLLMENT' | 'SCRATCH_CARD' | 'PASSWORD_SETUP' | 'SUCCESS' | 'DASHBOARD' | 'RECORDING' | 'CALIBRATION_FLOW' | 'RESULTS' | 'TEACHER_DASHBOARD' | 'STUDENT_DETAIL';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SIGNIN');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [baselineData, setBaselineData] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  
  // Signup flow state
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const storedBaseline = localStorage.getItem('voiceBaseline');
    if (storedBaseline) {
      setBaselineData(storedBaseline);
    }
    
    // Load real student data from localStorage
    loadStudentData();
    
    // Always start with sign-in page - let users choose to sign in or create account
    // The dashboard will only be accessible after successful sign-in
  }, []);

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

  // Sign-in handlers
  const handleSignIn = useCallback(async (code: string, password: string, userType: 'student' | 'teacher') => {
    setUserType(userType);
    
    if (userType === 'teacher') {
      // Teacher authentication with admin credentials
      const adminCode = '9999';
      const adminPassword = 'admin123';
      
      if (code === adminCode && password === adminPassword) {
        localStorage.setItem('isTeacherSignedIn', 'true');
        setAppState('TEACHER_DASHBOARD');
      } else {
        throw new Error('Invalid admin credentials');
      }
    } else {
      // Student authentication
      const userData = localStorage.getItem('userData');
      if (!userData) {
        throw new Error('No account found. Please create an account first.');
      }

      const parsedUserData = JSON.parse(userData);
      
      // Simple validation - in a real app, you'd validate against a backend
      if (parsedUserData.accountNumber === code && parsedUserData.password === password) {
        // Set a flag to indicate user is signed in
        localStorage.setItem('isSignedIn', 'true');
        setAppState('DASHBOARD');
      } else {
        throw new Error('Invalid credentials');
      }
    }
  }, []);

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
    setSelectedStudent(null);
    setAppState('TEACHER_DASHBOARD');
  }, []);

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
    // Store signup data
    localStorage.setItem('isSignedUp', 'true');
    localStorage.setItem('isSignedIn', 'true'); // Auto-sign in after successful signup
    localStorage.setItem('userData', JSON.stringify({
      class: selectedClass,
      section: selectedSection,
      enrollment: enrollmentNumber,
      accountNumber: accountNumber,
      password: password
    }));
    setAppState('SUCCESS');
  }, [selectedClass, selectedSection, enrollmentNumber, accountNumber]);

  const handleSuccessProceed = useCallback(() => {
    setAppState('DASHBOARD');
  }, []);

  const handleStartSession = useCallback(() => setAppState('RECORDING'), []);
  const handleStartCalibration = useCallback(() => setAppState('CALIBRATION_FLOW'), []);
  
  const handleCloseModal = useCallback(() => setAppState('DASHBOARD'), []);


  const handleAnalysisComplete = useCallback((data: AnalysisData) => {
    const { aiSummary, ...rest } = data;
    const analysisDataWithDate = { ...rest, aiSummary, date: new Date().toISOString() };
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
    
    setAppState('RESULTS');
  }, []);
  
  const handleCalibrationComplete = useCallback((baselineJson: string) => {
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

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.4, ease: 'easeInOut' }
  };

  return (
    <div className="min-h-screen w-full bg-background-primary overflow-hidden relative">
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
              onSignOut={handleSignOut}
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
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'CALIBRATION_FLOW' && (
          <CalibrationScreen 
            onClose={handleCloseModal} 
            onComplete={handleCalibrationComplete}
          />
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
