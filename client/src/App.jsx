import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';

// Common Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import FloatingChatbot from './components/ai/FloatingChatbot';

// Public & General Pages (eagerly loaded)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy loaded pages for better performance
const CropsPage = lazy(() => import('./pages/CropsPage'));
const CropDetailPage = lazy(() => import('./pages/CropDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MapSearchPage = lazy(() => import('./pages/MapSearchPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));
const RequirementsPage = lazy(() => import('./pages/RequirementsPage'));
const SchemesPage = lazy(() => import('./pages/SchemesPage'));

// Farmer Pages
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const FarmerAddCrop = lazy(() => import('./pages/farmer/FarmerAddCrop'));
const FarmerMyCrops = lazy(() => import('./pages/farmer/FarmerMyCrops'));
const FarmerOrders = lazy(() => import('./pages/farmer/FarmerOrders'));
const FarmerDiseaseCheck = lazy(() => import('./pages/farmer/FarmerDiseaseCheck'));

// Buyer Pages
const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'));
const BuyerOrders = lazy(() => import('./pages/buyer/BuyerOrders'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCrops = lazy(() => import('./pages/admin/AdminCrops'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="flex flex-col min-h-screen bg-[#FBFBFA]">
              <Navbar />
              <main className="flex-1">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/crops" element={<CropsPage />} />
                    <Route path="/crops/:id" element={<CropDetailPage />} />
                    <Route path="/map" element={<MapSearchPage />} />
                    <Route path="/assistant" element={<AssistantPage />} />
                    <Route path="/requirements" element={<RequirementsPage />} />
                    <Route path="/schemes" element={<SchemesPage />} />

                    {/* Common Protected Route */}
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

                    {/* Farmer Routes */}
                    <Route path="/farmer/dashboard" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['farmer', 'admin']}><FarmerDashboard /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/farmer/add-crop" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['farmer', 'admin']}><FarmerAddCrop /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/farmer/my-crops" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['farmer', 'admin']}><FarmerMyCrops /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/farmer/orders" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['farmer', 'admin']}><FarmerOrders /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/farmer/disease-check" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['farmer', 'admin']}><FarmerDiseaseCheck /></RoleRoute></ProtectedRoute>
                    } />

                    {/* Buyer Routes */}
                    <Route path="/buyer/dashboard" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['buyer', 'admin']}><BuyerDashboard /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/buyer/orders" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['buyer', 'admin']}><BuyerOrders /></RoleRoute></ProtectedRoute>
                    } />

                    {/* Admin Routes */}
                    <Route path="/admin/dashboard" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/admin/users" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminUsers /></RoleRoute></ProtectedRoute>
                    } />
                    <Route path="/admin/crops" element={
                      <ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminCrops /></RoleRoute></ProtectedRoute>
                    } />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
              <FloatingChatbot />
            </div>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderRadius: '16px',
                  padding: '12px 18px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                },
                success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
              }}
            />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
