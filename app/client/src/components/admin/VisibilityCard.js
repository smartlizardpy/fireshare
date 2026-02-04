import React, { useRef } from 'react'
import { useIsVisible } from 'react-is-visible'
import { Box, Grid } from '@mui/material'
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
        mb: 3,
        position: 'relative',
      }}
      ref={nodeRef}
    >
      {reserveDateSpace && (
        <Box
          sx={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: -1,
            opacity: 0.8,
            mb: 1,
            height: 20,
          }}
        >
          {dateLabel || ''}
        </Box>
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
