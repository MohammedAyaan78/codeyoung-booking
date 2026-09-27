import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { BookingPage } from './pages/BookingPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { LoginPage } from './pages/LoginPage';
import { ParentDashboard } from './pages/ParentDashboard';
import { ParentProfilePage } from './pages/ParentProfilePage';
import { MentorDashboard } from './pages/MentorDashboard';
import { ClassroomPage } from './pages/ClassroomPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage defaultTab="parent" />} />
        <Route path="/mentor/login" element={<LoginPage defaultTab="mentor" />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />

        {/* Parent protected */}
        <Route path="/parent" element={
          <ProtectedRoute role="PARENT"><ParentDashboard /></ProtectedRoute>
        } />
        <Route path="/parent/book" element={
          <ProtectedRoute role="PARENT"><BookingPage /></ProtectedRoute>
        } />
        <Route path="/parent/profile" element={
          <ProtectedRoute role="PARENT"><ParentProfilePage /></ProtectedRoute>
        } />
        <Route path="/parent/bookings" element={
          <ProtectedRoute role="PARENT"><ParentDashboard /></ProtectedRoute>
        } />

        {/* Classroom — accessible by both PARENT and MENTOR, auth enforced by backend */}
        <Route path="/class/:bookingId" element={<ClassroomPage />} />

        {/* Mentor protected */}
        <Route path="/mentor" element={
          <ProtectedRoute role="MENTOR"><MentorDashboard /></ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
