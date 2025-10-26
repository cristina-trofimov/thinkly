
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AdminDashboard } from './components/AdminDashboard'
import { Button } from './components/ui/button'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/" element={
          <div>
            <Button variant="default">Click me</Button>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
