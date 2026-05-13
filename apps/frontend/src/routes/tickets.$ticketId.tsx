import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tickets/$ticketId')({
  component: () => <div>Ticket Detail View</div>,
})
