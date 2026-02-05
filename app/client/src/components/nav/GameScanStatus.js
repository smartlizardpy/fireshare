import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import SyncIcon from '@mui/icons-material/Sync'
import { StatsService } from '../../services'

const spinAnimation = {
  animation: 'spin 1s linear infinite',
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  }
}

const GameScanStatus = ({ open, onComplete }) => {
  const [scanStatus, setScanStatus] = React.useState(null)
  const [pollKey, setPollKey] = React.useState(0)
  const completionHandledRef = React.useRef(false)

  React.useEffect(() => {
    const shouldPoll = localStorage.getItem('gameScanInProgress') === 'true'
    console.log('[GameScanStatus] shouldPoll:', shouldPoll)
    if (!shouldPoll) {
      setScanStatus(null)
      return
    }

    const checkStatus = async () => {
      try {
        console.log('[GameScanStatus] Checking status...')
        const res = await StatsService.getGameScanStatus()
        console.log('[GameScanStatus] Status response:', res.data)
        if (res.data.is_running) {
          completionHandledRef.current = false
          setScanStatus(res.data)
        } else if (!completionHandledRef.current) {
          // Scan finished
          completionHandledRef.current = true
          console.log('[GameScanStatus] Scan finished, calling onComplete')
          onComplete?.(res.data)
          setScanStatus(null)
          localStorage.removeItem('gameScanInProgress')
          setPollKey(prev => prev + 1)
        }
      } catch (e) {
        console.error('[GameScanStatus] Error checking status:', e)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [pollKey, onComplete])

  // Listen for localStorage changes from Settings page
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      console.log('[GameScanStatus] Storage event:', e.key)
      if (e.key === 'gameScanInProgress') {
        console.log('[GameScanStatus] gameScanInProgress changed, triggering poll')
        setPollKey(prev => prev + 1)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (!scanStatus) return null

  if (open) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          pl: 2,
          pr: 2,
          pb: 1,
          overflow: 'hidden',
        }}
      >
        <SyncIcon
          sx={{
            color: '#2684FF',
            mr: 1,
            fontSize: 18,
            flexShrink: 0,
            mt: 0.25,
            ...spinAnimation,
          }}
        />
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: 15,
            color: '#EBEBEB',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {scanStatus.total === 0 ? (
            'Preparing scan...'
          ) : (
            <>
              Scanning for games{' '}
              <Box component="span" sx={{ color: '#2684FF' }}>
                {scanStatus.current}/{scanStatus.total}
              </Box>
            </>
          )}
        </Typography>
      </Box>
    )
  }

  const tooltipText = scanStatus.total === 0
    ? 'Preparing scan...'
    : `Scanning: ${scanStatus.current}/${scanStatus.total}`

  return (
    <Tooltip title={tooltipText} arrow placement="right">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pb: 1,
        }}
      >
        <SyncIcon
          sx={{
            color: '#2684FF',
            fontSize: 18,
            ...spinAnimation,
          }}
        />
      </Box>
    </Tooltip>
  )
}

export default GameScanStatus
