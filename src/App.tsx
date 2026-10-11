import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout, Only } from './components/Layout'
import { SvgDefs } from './components/SvgDefs'
import { useData } from './data/store'
import { Calendar } from './screens/Calendar'
import { EmptyDay } from './screens/EmptyDay'
import { Login } from './screens/Login'
import { Milestone } from './screens/Milestone'
import { Missed } from './screens/Missed'
import { NewRoutine } from './screens/NewRoutine'
import { Notifications } from './screens/Notifications'
import { NotificationSettings } from './screens/NotificationSettings'
import { OriChat } from './screens/OriChat'
import { OriVoice } from './screens/OriVoice'
import { Profile } from './screens/Profile'
import { RoutineDetail } from './screens/RoutineDetail'
import { Routines } from './screens/Routines'
import { RunDone } from './screens/RunDone'
import { Runner } from './screens/Runner'
import { SoniaToday } from './screens/SoniaToday'
import { Streak } from './screens/Streak'
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

          <Route path="/welcome" element={leo(<EmptyDay />)} />
          <Route path="/routines" element={leo(<Routines />)} />
          <Route path="/routines/new" element={leo(<NewRoutine />)} />
          <Route path="/routines/:id" element={leo(<RoutineDetail />)} />
          <Route path="/routines/:id/edit" element={leo(<NewRoutine />)} />
          <Route path="/run" element={leo(<Runner />)} />
          <Route path="/run/done" element={leo(<RunDone />)} />
          <Route path="/streak" element={leo(<Streak />)} />
          <Route path="/milestone" element={leo(<Milestone />)} />
          <Route path="/missed" element={leo(<Missed />)} />

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
