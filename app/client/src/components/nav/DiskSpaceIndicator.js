import * as React from 'react'
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import { StatsService } from '../../services'

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const DiskSpaceIndicator = ({ open }) => {
  const [diskSpace, setDiskSpace] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchDiskSpace = async () => {
      try {
        const data = await StatsService.getFolderSize()
        setDiskSpace(data)
      } catch (error) {
        console.error('Failed to fetch disk space:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDiskSpace()
    // Refresh every 30 seconds
    const interval = setInterval(fetchDiskSpace, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !diskSpace) {
    return null
  }

  const usedPercent = diskSpace.percent_used || 0
  const usedSpace = formatBytes(diskSpace.used)
  const totalSpace = formatBytes(diskSpace.total)
  const freeSpace = formatBytes(diskSpace.free)

  return (
    <Box
      sx={{
        p: 1,
        borderTop: '1px solid rgba(194, 224, 255, 0.18)',
      }}
    >
      {open ? (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <StorageIcon sx={{ fontSize: 16, mr: 1, color: 'rgba(194, 224, 255, 0.7)' }} />
            <Typography sx={{ fontSize: 11, color: 'rgba(194, 224, 255, 0.7)' }}>Storage</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={usedPercent}
            sx={{
              height: 6,
              borderRadius: 1,
              mb: 0.5,
              backgroundColor: 'rgba(194, 224, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: usedPercent > 90 ? '#f44336' : usedPercent > 75 ? '#ff9800' : '#2684FF',
              },
            }}
          />
          <Typography sx={{ fontSize: 10, color: 'rgba(194, 224, 255, 0.6)' }}>
            {usedSpace} / {totalSpace} ({usedPercent}% used)
          </Typography>
        </Box>
      ) : (
        <Tooltip title={`Storage: ${usedSpace} / ${totalSpace} (${usedPercent}% used)`} placement="right">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <StorageIcon
              sx={{
                fontSize: 24,
                color: usedPercent > 90 ? '#f44336' : usedPercent > 75 ? '#ff9800' : 'rgba(194, 224, 255, 0.7)',
              }}
            />
            <Typography
              sx={{
                position: 'absolute',
                bottom: -2,
                fontSize: 8,
                fontWeight: 'bold',
                color: usedPercent > 90 ? '#f44336' : usedPercent > 75 ? '#ff9800' : 'rgba(194, 224, 255, 0.7)',
              }}
            >
              {usedPercent}%
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}

export default DiskSpaceIndicator
