import * as React from 'react'
import { Grid, Box } from '@mui/material'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { ConfigService } from '../../services'
import MovieFilterIcon from '@mui/icons-material/MovieFilter';

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
      } catch (e) { }
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
      } catch (e) { }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [isPolling])

  if (!status && !stoppedMessage) return null

  if (stoppedMessage && open) {
    return (
      <>
        <Box
          sx={{
            width: 222,
            m: 1,
            px: 2,
            py: 1.5,
            border: '1px solid rgba(194, 224, 255, 0.18)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#EBEBEB',
            fontWeight: 600,
            fontSize: 13,
            backgroundColor: 'transparent',
            ':hover': {
              backgroundColor: 'rgba(194, 224, 255, 0.08)',
            },
          }}
        >
          <Grid container alignItems="center">
            <Grid item>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 12,
                  color: '#EBEBEB',
                }}
              >
                {stoppedMessage}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </>
    )
  }

  if (open) {
    return (
      <>
        <Tooltip title={status.current_video || 'Not transcoding'} arrow placement="right">
          <Box
            sx={{
              width: 222,
              m: 1,
              px: 2,
              py: 1.5,
              border: '1px solid rgba(194, 224, 255, 0.18)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              color: '#EBEBEB',
              fontWeight: 600,
              fontSize: 13,
              backgroundColor: 'transparent',
              ':hover': {
                backgroundColor: 'rgba(194, 224, 255, 0.08)',
              },
            }}
          >
            <Grid container alignItems="center">
              <Grid item sx={{
                overflow: 'hidden'
              }}>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: 12,
                    color: '#EBEBEB',
                  }}
                >
                  {status.total === 0 ? (
                    'Preparing transcode...'
                  ) : (
                    <>
                      Transcoding:{' '}
                      <Box component="span" sx={{ color: '#2684FF' }}>
                        {status.current}/{status.total}
                      </Box>
                    </>
                  )}
                </Typography>
                {status.current_video && (

                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: 10,
                      color: '#999',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {status.current_video}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        </Tooltip >
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
            width: 42,
            mx: 1,
            height: 40,
            border: '1px solid rgba(194, 224, 255, 0.18)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ':hover': {
              backgroundColor: 'rgba(194, 224, 255, 0.08)',
            },
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
            <IconButton sx={{ p: 0.5, pointerEvents: 'all' }}>
              <MovieFilterIcon sx={{ color: '#EBEBEB' }} />
            </IconButton>
          </Typography>
        </Box>
      </Tooltip>
    </>
  )
}

export default TranscodingStatus
