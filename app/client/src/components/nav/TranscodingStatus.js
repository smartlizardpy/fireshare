import * as React from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { ConfigService } from '../../services'

const TranscodingStatus = ({ open }) => {
  const [status, setStatus] = React.useState(null)
  const [isPolling, setIsPolling] = React.useState(false)
  const [stoppedMessage, setStoppedMessage] = React.useState(null)

  React.useEffect(() => {
    const checkInitial = async () => {
      try {
        const res = await ConfigService.getTranscodingStatus()
        if (res.data.is_running) {
          setStatus(res.data)
          setIsPolling(true)
        }
      } catch (e) {}
    }
    checkInitial()
  }, [])

  React.useEffect(() => {
    const handleStart = () => {
      setStoppedMessage(null)
      setIsPolling(true)
    }
    const handleCancel = () => {
      setIsPolling(false)
      setStatus(null)
      setStoppedMessage('Transcoding stopped')
      setTimeout(() => setStoppedMessage(null), 3000)
    }
    window.addEventListener('transcodingStarted', handleStart)
    window.addEventListener('transcodingCancelled', handleCancel)
    return () => {
      window.removeEventListener('transcodingStarted', handleStart)
      window.removeEventListener('transcodingCancelled', handleCancel)
    }
  }, [])

  React.useEffect(() => {
    if (!isPolling) return

    const checkStatus = async () => {
      try {
        const res = await ConfigService.getTranscodingStatus()
        if (res.data.is_running) {
          setStatus(res.data)
        } else {
          setStatus(null)
          setIsPolling(false)
        }
      } catch (e) {}
    }

    checkStatus()
    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [isPolling])

  if (!status && !stoppedMessage) return null

  if (stoppedMessage) {
    return (
      <>
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
        <Divider />
      </>
    )
  }

  if (open) {
    return (
      <>
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
            <Tooltip title={status.current_video} arrow placement="right">
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#999',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {status.current_video}
              </Typography>
            </Tooltip>
          )}
        </Box>
        <Divider />
      </>
    )
  }

  const tooltipText = status.total === 0
    ? 'Preparing transcode...'
    : `Transcoding: ${status.current}/${status.total}${status.current_video ? `\n${status.current_video}` : ''}`

  return (
    <>
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
      <Divider />
    </>
  )
}

export default TranscodingStatus
