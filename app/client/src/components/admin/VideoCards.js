import React, { useCallback } from 'react'
import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import SnackbarAlert from '../alert/SnackbarAlert'
import VisibilityCard from './VisibilityCard'
import VideoModal from '../modal/VideoModal'
import SensorsIcon from '@mui/icons-material/Sensors'
import { VideoService } from '../../services'
import UploadCard from './UploadCard'
import { formatDate } from '../../common/utils'

const getDateKey = (video) => {
  return video.recorded_at
    ? new Date(video.recorded_at).toISOString().split('T')[0]
    : 'unknown'
}

const VideoCards = ({
  videos,
  loadingIcon = null,
  feedView = false,
  showUploadCard = false,
  fetchVideos,
  authenticated,
  size,
  editMode = false,
  selectedVideos = new Set(),
  onVideoSelect = () => {},
  showDateHeaders = false,
}) => {
  const [vids, setVideos] = React.useState(videos)
  const [alert, setAlert] = React.useState({ open: false })
  const [videoModal, setVideoModal] = React.useState({
    open: false,
  })

  const previousVideosRef = React.useRef()
  const previousVideos = previousVideosRef.current
  if (videos !== previousVideos && videos !== vids) {
    setVideos(videos)
  }
  React.useEffect(() => {
    previousVideosRef.current = videos
  })

  const openVideo = (id) => {
    setVideoModal({
      open: true,
      id,
    })
  }

  const onModalClose = () => {
    setVideoModal({ open: false })
  }

  const memoizedHandleAlert = useCallback((alert) => {
    setAlert(alert)
  }, [])

  const handleScan = () => {
    VideoService.scan().catch((err) =>
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Unknown Error',
      }),
    )
    setAlert({
      open: true,
      type: 'info',
      message: 'Scan initiated. This could take a few minutes.',
    })
  }

  const handleUpdate = (update) => {
    const { id, ...rest } = update
    setVideos((vs) => vs.map((v) => (v.video_id === id ? { ...v, info: { ...v.info, ...rest } } : v)))
  }

  const handleDelete = (id) => {
    setVideos((vs) => vs.filter((v) => v.video_id !== id))
  }

  const EMPTY_STATE = () => (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Grid
        sx={{ p: 2, height: 200 }}
        container
        item
        spacing={2}
        direction="column"
        justifyContent="center"
        alignItems="center"
      >
        {!loadingIcon && (
          <>
            <Grid item>
              <Typography
                variant="h4"
                align="center"
                color="primary"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  letterSpacing: '.2rem',
                  textDecoration: 'none',
                }}
              >
                NO VIDEOS FOUND
              </Typography>
            </Grid>

            {!feedView && (
              <Grid item>
                <Button variant="contained" size="large" startIcon={<SensorsIcon />} onClick={handleScan}>
                  Scan Library
                </Button>
              </Grid>
            )}
          </>
        )}
        {loadingIcon}
      </Grid>
      {!loadingIcon && (
        <Grid container justifyContent="center">
          <UploadCard
            authenticated={authenticated}
            feedView={feedView}
            cardWidth={250}
            handleAlert={memoizedHandleAlert}
            publicUpload={feedView}
          />
        </Grid>
      )}
    </Paper>
  )

  return (
    <Box>
      <VideoModal
        open={videoModal.open}
        onClose={onModalClose}
        videoId={videoModal.id}
        feedView={feedView}
        authenticated={authenticated}
        updateCallback={handleUpdate}
      />
      <SnackbarAlert
        severity={alert.type}
        open={alert.open}
        onClose={alert.onClose}
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>

      {(!vids || vids.length === 0) && EMPTY_STATE()}
      {vids && vids.length !== 0 && (
        <Grid container justifyContent="flex-start">
          {showUploadCard && (
            <UploadCard
              authenticated={authenticated}
              feedView={feedView}
              cardWidth={size}
              handleAlert={memoizedHandleAlert}
              fetchVideos={fetchVideos}
              publicUpload={feedView}
              reserveDateSpace={showDateHeaders}
            />
          )}
          {(() => {
            // Pre-compute counts per date
            const dateCounts = {}
            vids.forEach((video) => {
              const key = getDateKey(video)
              dateCounts[key] = (dateCounts[key] || 0) + 1
            })
            const firstDateKey = vids.length > 0 ? getDateKey(vids[0]) : null

            return vids.map((v, index) => {
              const currentDateKey = getDateKey(v)
              const prevDateKey = index > 0 ? getDateKey(vids[index - 1]) : null
              const nextDateKey = index < vids.length - 1 ? getDateKey(vids[index + 1]) : null
              const isNewDate = showDateHeaders && currentDateKey !== prevDateKey
              const isLastOfDate = currentDateKey !== nextDateKey
              const formattedDate = currentDateKey !== 'unknown' ? formatDate(currentDateKey) : 'Unknown Date'
              const hasManyclips = dateCounts[currentDateKey] >= 6
              // When upload card is shown, first date group uses inline labels to flow with it
              const isFirstDateGroup = showUploadCard && currentDateKey === firstDateKey
              // Insert flex break after a large date group ends to keep it isolated
              // (applies even to first date group - it flows with upload card but still needs isolation from next date)
              const needsBreakAfter = showDateHeaders && isLastOfDate && hasManyclips && nextDateKey !== null

              return (
                <React.Fragment key={v.path + v.video_id}>
                  {isNewDate && hasManyclips && !isFirstDateGroup && (
                    <Box
                      sx={{
                        width: '100%',
                        mt: index > 0 ? 3 : 0,
                        mb: 1,
                        color: '#ffffff',
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: -1,
                        opacity: 0.8,
                      }}
                    >
                      {formattedDate}
                    </Box>
                  )}
                  <VisibilityCard
                    video={v}
                    handleAlert={memoizedHandleAlert}
                    openVideo={openVideo}
                    cardWidth={size}
                    authenticated={authenticated}
                    deleted={handleDelete}
                    editMode={editMode}
                    isSelected={selectedVideos.has(v.video_id)}
                    onSelect={onVideoSelect}
                    dateLabel={isNewDate && (!hasManyclips || isFirstDateGroup) ? formattedDate : null}
                    reserveDateSpace={showDateHeaders && (!hasManyclips || isFirstDateGroup)}
                  />
                  {needsBreakAfter && (
                    <Box sx={{ flexBasis: '100%', height: 0 }} />
                  )}
                </React.Fragment>
              )
            })
          })()}
        </Grid>
      )}
    </Box>
  )
}

export default VideoCards
