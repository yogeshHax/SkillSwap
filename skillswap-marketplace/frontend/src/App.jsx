import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import FullPageLoader from './components/common/FullPageLoader'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const ProviderProfilePage = lazy(() => import('./pages/ProviderProfilePage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'))
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'))
const MessagingPage = lazy(() => import('./pages/MessagingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/providers/:id" element={<ProviderProfilePage />} />
              <Route path="/book/:providerId" element={<BookingPage />} />
              <Route path="/dashboard" element={<CustomerDashboard />} />
              <Route path="/provider-dashboard" element={<ProviderDashboard />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/messages/:chatId" element={<MessagingPage />} />
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </SocketProvider>
    </AuthProvider>
  )
}
