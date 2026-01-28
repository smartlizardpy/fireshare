import React, { useRef } from 'react'
import { useIsVisible } from 'react-is-visible'
import { Grid, Typography } from '@mui/material'
import CompactVideoCard from './CompactVideoCard'

const VisibilityCard = ({
  video,
  openVideo,
  handleAlert,
  cardWidth,
  authenticated,
  openDetailsModal,
  deleted,
  editMode = false,
  isSelected = false,
  onSelect = () => {},
  dateLabel = null,
  reserveDateSpace = false,
}) => {
  const nodeRef = useRef()
  const isVisible = useIsVisible(nodeRef)

  const previewVideoHeight =
    video.info?.width && video.info?.height ? cardWidth * (video.info.height / video.info.width) : cardWidth / 1.77

  return (
    <Grid
      item
      sx={{
        width: cardWidth,
        ml: 0.75,
        mr: 0.75,
        mb: 1.5,
        mt: reserveDateSpace ? 3 : 0,
        position: 'relative',
      }}
      ref={nodeRef}
    >
      {dateLabel && (
        <Typography
          sx={{
            position: 'absolute',
            top: -32,
            left: 0,
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: -1,
          }}
        >
          {dateLabel}
        </Typography>
      )}
      {isVisible ? (
        <CompactVideoCard
          visible={false}
          video={video}
          openVideoHandler={openVideo}
          alertHandler={handleAlert}
          cardWidth={cardWidth}
          authenticated={authenticated}
          openDetailsModal={openDetailsModal}
          deleted={deleted}
          editMode={editMode}
          isSelected={isSelected}
          onSelect={onSelect}
        />
      ) : (
        <div
          // calculate the rendered cards height based on the video dimesions and our css styling heights
          style={{
            width: cardWidth,
            background: '#000e393b',
            height: previewVideoHeight + 32,
          }}
        />
      )}
    </Grid>
  )
}
export default VisibilityCard
