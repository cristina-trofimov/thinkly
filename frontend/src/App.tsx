
import './App.css'
import { Button } from './components/ui/button'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ManageAccountsPage from './manage-accounts/ManageAccountsPage'

function App() {

  return (
    <>
      <div>
        <Button variant="default">Click me</Button>
      </div>
    </>
    // <BrowserRouter>
    //   <Routes>
    //     <Route path="/manage-accounts" element={<ManageAccountsPage />} />
    //   </Routes>
    // </BrowserRouter>
  )
}

export default App
