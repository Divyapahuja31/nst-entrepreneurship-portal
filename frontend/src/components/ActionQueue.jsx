import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

const ITEMS = [
  {
    key: 'proposals',
    label: 'Venture proposals to review',
    to: '/admin/venture',
    age: 'waiting',
  },
  {
    key: 'joinRequests',
    label: 'Join requests to review',
    to: '/admin/venture',
    age: 'waiting',
  },
  {
    key: 'kpisToGrade',
    label: 'KPIs waiting to be graded',
    to: '/admin/kpis',
    age: 'waiting',
  },
  {
    key: 'missedDeadlines',
    label: 'KPIs past their due date, never submitted',
    to: '/admin/kpis',
    age: 'overdue',
  },
]

const DAY_MS = 24 * 60 * 60 * 1000

const describeAge = (date, kind) => {
  if (!date) {
    return null
  }
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS)
  const span = days < 1 ? 'today' : `${days} day${days === 1 ? '' : 's'}`
  if (kind === 'overdue') {
    return days < 1 ? 'Oldest was due today' : `Oldest was due ${span} ago`
  }
  return days < 1 ? 'Oldest arrived today' : `Oldest has waited ${span}`
}

// Work waiting on admins, with a link to where it gets done. Only items
// that need action are listed.
export default function ActionQueue({ actions }) {
  const pending = ITEMS.filter(item => actions?.[item.key]?.count > 0)

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" component="h2" fontWeight={600}>
          Needs your attention
        </Typography>
        {pending.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nothing is waiting on you: no applications to review, no KPIs to
            grade and no missed deadlines.
          </Typography>
        ) : (
          <List disablePadding>
            {pending.map(item => {
              const { count, oldestAt } = actions[item.key]
              return (
                <ListItem
                  key={item.key}
                  disableGutters
                  secondaryAction={
                    <Button component={Link} to={item.to} size="small">
                      Open
                    </Button>
                  }
                >
                  <Chip
                    label={count}
                    color={item.age === 'overdue' ? 'error' : 'warning'}
                    size="small"
                    sx={{ mr: 2, minWidth: 40 }}
                  />
                  <ListItemText
                    primary={item.label}
                    secondary={describeAge(oldestAt, item.age)}
                  />
                </ListItem>
              )
            })}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
