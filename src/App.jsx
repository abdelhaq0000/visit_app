import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppSidebar from './components/AppSidebar'
import Home from './pages/Home'
import PlayerPerformance from './pages/PlayerPerformance'
import TeamPerformance from './pages/TeamPerformance'
import Tagger from './pages/Tagger'
import MatchSetup from './pages/MatchSetup'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <AppSidebar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<PlayerPerformance />} />
        <Route path="/team" element={<TeamPerformance />} />
        <Route path="/tagger" element={<Tagger />} />
        <Route path="/match-setup" element={<MatchSetup />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  )
}
