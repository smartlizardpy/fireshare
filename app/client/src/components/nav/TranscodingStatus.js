import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { ConfigService } from '../../services'

const TranscodingStatus = ({ open, onComplete }) => {
  const [status, setStatus] = React.useState(null)
  const [isPolling, setIsPolling] = React.useState(false)
  const [stoppedMessage, setStoppedMessage] = React.useState(null)
  const completionHandledRef = React.useRef(false)

  // Check status once on mount to catch already-running transcodes
  React.useEffect(() => {
    const checkInitial = async () => {
      try {
        const res = await ConfigService.getTranscodingStatus()
        if (res.data.is_running) {
          setStatus(res.data)
          setIsPolling(true)
        }
      } catch (e) {
        console.error('[TranscodingStatus] Error checking initial status:', e)
      }
    }
    checkInitial()
  }, [])

  // Listen for event from Settings when transcoding starts
  React.useEffect(() => {
    const handleTranscodingStarted = () => {
      setStoppedMessage(null)
      setIsPolling(true)
      completionHandledRef.current = false
    }
    window.addEventListener('transcodingStarted', handleTranscodingStarted)
    return () => window.removeEventListener('transcodingStarted', handleTranscodingStarted)
  }, [])

  // Listen for event from Settings when transcoding is cancelled
  React.useEffect(() => {
    const handleTranscodingCancelled = () => {
      setIsPolling(false)
      setStatus(null)
      setStoppedMessage('Transcoding stopped')
      setTimeout(() => setStoppedMessage(null), 3000)
    }
    window.addEventListener('transcodingCancelled', handleTranscodingCancelled)
    return () => window.removeEventListener('transcodingCancelled', handleTranscodingCancelled)
  }, [])

  // Only poll when isPolling is true
  React.useEffect(() => {
    if (!isPolling) return

    const checkStatus = async () => {
      try {
        const res = await ConfigService.getTranscodingStatus()
        if (res.data.is_running) {
          completionHandledRef.current = false
          setStatus(res.data)
        } else if (!completionHandledRef.current) {
          // Transcoding finished
          completionHandledRef.current = true
          onComplete?.(res.data)
          setStatus(null)
          setIsPolling(false)
        }
      } catch (e) {
        console.error('[TranscodingStatus] Error checking status:', e)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [isPolling, onComplete])

  if (!status && !stoppedMessage) return null

  // Show stopped message briefly after cancellation
  if (stoppedMessage) {
    return (
      <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: open ? 15 : 12,
            color: '#999',
          }}
        >
          {stoppedMessage}
        </Typography>
      </Box>
    )
  }

  if (open) {
    return (
      <Box
        sx={{
          pl: 2,
          pr: 2,
          pb: 1,
          overflow: 'hidden',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: 15,
            color: '#EBEBEB',
          }}
        >
          {status.total === 0 ? (
            'Preparing transcode...'
          ) : (
            <>
              Transcoding{' '}
              <Box component="span" sx={{ color: '#FF9800' }}>
                {status.current}/{status.total}
              </Box>
            </>
          )}
        </Typography>
        {status.current_video && (
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#999',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {status.current_video}
          </Typography>
        )}
      </Box>
    )
  }

  const tooltipText = status.total === 0
    ? 'Preparing transcode...'
    : `Transcoding: ${status.current}/${status.total}${status.current_video ? `\n${status.current_video}` : ''}`

  return (
    <Tooltip title={tooltipText} arrow placement="right">
      <Box
        sx={{
          pl: 2,
          pr: 2,
          pb: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: 12,
            color: '#FF9800',
          }}
        >
          {status.total === 0 ? '...' : `${status.current}/${status.total}`}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default TranscodingStatus
