import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout, Only } from './components/Layout'
import { SvgDefs } from './components/SvgDefs'
import { useData } from './data/store'
import { Calendar } from './screens/Calendar'
import { Login } from './screens/Login'
import { Notifications } from './screens/Notifications'
import { NotificationSettings } from './screens/NotificationSettings'
import { OriChat } from './screens/OriChat'
import { OriVoice } from './screens/OriVoice'
import { Profile } from './screens/Profile'
import { SoniaToday } from './screens/SoniaToday'
import { Streak } from './screens/Streak'
import { Journal } from './screens/Journal'
import { NoteEdit } from './screens/NoteEdit'
import { Week } from './screens/Week'
import { TaskForm } from './screens/TaskForm'
import { Tasks } from './screens/Tasks'
import { Today } from './screens/Today'

const leo = (el: React.ReactNode) => <Only role="leo">{el}</Only>
const sonia = (el: React.ReactNode) => <Only role="sonia">{el}</Only>

/** One app, two experiences: the signed-in role decides what Today is and which screens exist. */
function Home() {
  const role = useData((s) => s.me?.role)
  return role === 'sonia' ? <SoniaToday /> : <Today />
}

/** Old links to a single day open the calendar on that day. */
function DayRedirect() {
  const { day = '' } = useParams()
  return <Navigate to={/^\d{4}-\d{2}-\d{2}$/.test(day) ? `/calendar?d=${day}` : '/calendar'} replace />
}

export default function App() {
  return (
    <>
      <SvgDefs />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Login />} />
          <Route path="/today" element={<Home />} />
          <Route path="/together" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notifications/settings" element={<NotificationSettings />} />
          <Route path="/ori" element={<OriVoice />} />
          <Route path="/ori/chat" element={<OriChat />} />

          <Route path="/week" element={leo(<Week />)} />
          <Route path="/streak" element={leo(<Streak />)} />
          <Route path="/journal" element={leo(<Journal />)} />
          <Route path="/notes" element={<Navigate to="/journal?tab=notes" replace />} />
          <Route path="/notes/:id" element={leo(<NoteEdit />)} />
          {/* Routines were retired for the weekly tracker; old links land on the week. */}
          {['/welcome', '/routines', '/routines/*', '/run', '/run/done', '/milestone', '/missed'].map((p) => <Route key={p} path={p} element={<Navigate to="/week" replace />} />)}

          <Route path="/calendar" element={sonia(<Calendar />)} />
          <Route path="/calendar/:day" element={sonia(<DayRedirect />)} />
          <Route path="/tasks" element={sonia(<Tasks />)} />
          <Route path="/tasks/new" element={sonia(<TaskForm />)} />
          <Route path="/tasks/:id" element={sonia(<TaskForm />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}
