import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SvgDefs } from './components/SvgDefs'
import { Calendar } from './screens/Calendar'
import { DayAgenda } from './screens/DayAgenda'
import { EmptyDay } from './screens/EmptyDay'
import { Milestone } from './screens/Milestone'
import { Missed } from './screens/Missed'
import { NewRoutine } from './screens/NewRoutine'
import { NewTask } from './screens/NewTask'
import { Notifications } from './screens/Notifications'
import { NotificationSettings } from './screens/NotificationSettings'
import { OriChat } from './screens/OriChat'
import { OriVoice } from './screens/OriVoice'
import { ProfileSelect } from './screens/ProfileSelect'
import { RoutineDetail } from './screens/RoutineDetail'
import { Routines } from './screens/Routines'
import { RunDone } from './screens/RunDone'
import { Runner } from './screens/Runner'
import { Settings } from './screens/Settings'
import { Streak } from './screens/Streak'
import { Tasks } from './screens/Tasks'
import { Today } from './screens/Today'
import { Together } from './screens/Together'

export default function App() {
  return (
    <>
      <SvgDefs />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ProfileSelect />} />
          <Route path="/today" element={<Today />} />
          <Route path="/welcome" element={<EmptyDay />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routines/new" element={<NewRoutine />} />
          <Route path="/routines/:id" element={<RoutineDetail />} />
          <Route path="/run" element={<Runner />} />
          <Route path="/run/done" element={<RunDone />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/calendar/:day" element={<DayAgenda />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/new" element={<NewTask />} />
          <Route path="/ori" element={<OriVoice />} />
          <Route path="/ori/chat" element={<OriChat />} />
          <Route path="/streak" element={<Streak />} />
          <Route path="/milestone" element={<Milestone />} />
          <Route path="/missed" element={<Missed />} />
          <Route path="/together" element={<Together />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notifications/settings" element={<NotificationSettings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}
