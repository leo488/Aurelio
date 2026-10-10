import { Navigate, Route, Routes } from 'react-router-dom'
import { Placeholder } from './screens/Placeholder'
import { ProfileSelect } from './screens/ProfileSelect'

// One route per screen from the design handoff; placeholders get replaced screen by screen.
const stubs: [string, string][] = [
  ['/today', 'Today'],
  ['/routines', 'Routines'],
  ['/routines/new', 'New routine'],
  ['/routines/:id', 'Routine'],
  ['/run', 'Focus'],
  ['/run/done', 'Routine complete'],
  ['/calendar', 'Calendar'],
  ['/calendar/:day', 'Day'],
  ['/tasks', 'Tasks'],
  ['/tasks/new', 'New task'],
  ['/ori', 'Ori'],
  ['/ori/chat', 'Ori chat'],
  ['/streak', 'Consistency'],
  ['/milestone', 'Milestone'],
  ['/missed', 'After a miss'],
  ['/together', 'Together'],
  ['/notifications', 'Inbox'],
  ['/notifications/settings', 'Notification settings'],
  ['/settings', 'Settings'],
  ['/welcome', 'Empty first day'],
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfileSelect />} />
      {stubs.map(([path, title]) => (
        <Route key={path} path={path} element={<Placeholder title={title} />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
