import React from 'react';
import Navbar from './components/Navbar';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './components/pages/Homepage';
import About from './components/pages/About';
import Politicians from './components/pages/Politicians';
import PoliticianBio from './components/pages/PoliticianBio';
import Politician from "./components/pages/Politician";
<<<<<<< HEAD
import RecentTransactions from './components/pages/RecentTransactions';
=======
>>>>>>> e7649720... undo deleting everything

function App() {
  return (
    <>
      <Router>
        <Navbar />
        <Routes>
          <Route exact path='/' element={<Homepage/>} />
<<<<<<< HEAD
          <Route path='/recenttransactions' element={<RecentTransactions/>} />
=======
>>>>>>> e7649720... undo deleting everything
          <Route path='/about' element={<About/>} />
          <Route path='/politicians' element={<Politicians/>} />
          <Route path='politician' element={<Politician />} >
            <Route path=':politicianId' element={<Politician />} />
          </Route>
          <Route path='/politicianbio' element={<PoliticianBio/>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
