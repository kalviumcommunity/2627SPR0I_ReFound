import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Welcome from "./pages/Welcome.jsx";
import Browse from "./pages/Browse.jsx";
import ItemDetail from "./pages/ItemDetail.jsx";
import Claim from "./pages/Claim.jsx";
import MyClaims from "./pages/MyClaims.jsx";
import StaffDesk from "./pages/staff/StaffDesk.jsx";
import RegisterItem from "./pages/staff/RegisterItem.jsx";
import ReviewClaims from "./pages/staff/ReviewClaims.jsx";
import Logbook from "./pages/staff/Logbook.jsx";

const STAFF = ["staff", "supervisor"];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/items" element={<Browse />} />
          <Route path="/items/:ref" element={<ItemDetail />} />
          <Route
            path="/items/:ref/claim"
            element={
              <ProtectedRoute role="student">
                <Claim />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims"
            element={
              <ProtectedRoute role="student">
                <MyClaims />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute role={STAFF}>
                <StaffDesk />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/items/new"
            element={
              <ProtectedRoute role={STAFF}>
                <RegisterItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/claims"
            element={
              <ProtectedRoute role={STAFF}>
                <ReviewClaims />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/logbook"
            element={
              <ProtectedRoute role="supervisor">
                <Logbook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
