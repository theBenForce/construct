import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/tickets')({
  component: TicketsLayout,
})

function TicketsLayout() {
  return <Outlet />
}
