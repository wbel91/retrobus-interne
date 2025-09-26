import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyRBERedirect from './pages/MyRBERedirect'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/myrbe/landing/:parc" element={<MyRBERedirect />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
    </Routes>
  )
}
