import * as React from 'react'
import { Box, Typography, Tooltip, IconButton, Grid } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import SyncIcon from '@mui/icons-material/Sync'
import { StatsService } from '../../services'

const DiskSpaceIndicator = ({ open, visible }) => {
  const [folderSize, setFolderSize] = React.useState(null)

  React.useEffect(() => {
    const fetchFolderSize = async () => {
      try {
        const data = await StatsService.getFolderSize()
        setFolderSize(data.size_pretty)
      } catch (error) {
        console.error('Error fetching folder size:', error)
      }
    }
    if (visible) {
      fetchFolderSize()
    }
  }, [visible])

  if (!visible) {
    return null
  }

  if (folderSize !== null) {
    return open ? (
      <Box
        sx={{
          width: 222,
          mx: 1,
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
              Disk Usage:{' '}
              <Box component="span" sx={{ color: '#2684FF' }}>
                {folderSize}
              </Box>
            </Typography>
          </Grid>
        </Grid>
      </Box>
    ) : (
      <Tooltip title={`Disk Usage: ${folderSize}`} arrow placement="right">
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
              <StorageIcon sx={{ color: '#EBEBEB' }} />
            </IconButton>
          </Typography>
        </Box>
      </Tooltip>
    )
  } else {
    return (
      <Box
        sx={{
          width: open ? 222 : 42,
          mx: 1,
          height: 40,
          border: '1px solid rgba(194, 224, 255, 0.18)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {open ? (
          <Typography variant="body2" color="textSecondary">
            Loading Disk Usage...
          </Typography>
        ) : (
          <SyncIcon
            sx={{
              animation: 'spin 2s linear infinite',
              '@keyframes spin': {
                '0%': {
                  transform: 'rotate(360deg)',
                },
                '100%': {
                  transform: 'rotate(0deg)',
                },
              },
            }}
          />
        )}
      </Box>
    )
  }
}

export default DiskSpaceIndicator
