import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import Features from "./Features";
import Contact from "./Contact";

export default function App() {
  return (
    <Router>
      <div className="relative min-h-screen bg-gradient-to-br from-white via-[#fafafa] to-[#f5f5f5] overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute -top-56 -left-56 w-[32rem] h-[32rem] rounded-full bg-teal-100 opacity-50 pointer-events-none" />
        <div className="absolute -bottom-64 -right-64 w-[38rem] h-[38rem] rounded-full bg-yellow-100 opacity-50 pointer-events-none" />

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center px-4">
          {/* Navbar */}
          <nav className="w-full flex items-center justify-between bg-white py-4 px-8 shadow">
            <h1 className="text-2xl font-extrabold text-gray-900">MinuteMate</h1>
            <div className="hidden md:flex gap-x-10 font-semibold text-gray-900">
              <Link to="/" className="hover:text-blue-600">Home</Link>
              <Link to="/features" className="hover:text-blue-600">Features</Link>
              <Link to="/contact" className="hover:text-blue-600">Contact</Link>
            </div>
          </nav>

          {/* Page Routing */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
