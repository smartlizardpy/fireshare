import React, { useState } from 'react'
import { Box, IconButton, Typography, Fade } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import VideoService from '../../services/VideoService'
import GameService from '../../services/GameService'

/**
 * GameDetectionCard - Shows automatic game detection suggestions
 * Appears below video thumbnails when a game is detected from the filename
 */
export default function GameDetectionCard({ videoId, suggestion, onComplete, cardWidth }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('pending') // 'pending', 'accepted', 'rejected'

  const handleAccept = async (e) => {
    e.stopPropagation() // Prevent triggering video card click
    setLoading(true)

    try {
      let gameId = suggestion.game_id

      // If game doesn't exist in our DB (came from SteamGridDB), create it first
      if (!gameId && suggestion.steamgriddb_id) {
        // Reuse the same logic as GameSearch.js
        const assets = (await GameService.getGameAssets(suggestion.steamgriddb_id)).data
        const gameData = {
          steamgriddb_id: suggestion.steamgriddb_id,
          name: suggestion.game_name,
          hero_url: assets.hero_url,
          logo_url: assets.logo_url,
          icon_url: assets.icon_url,
        }
        const createdGame = (await GameService.createGame(gameData)).data
        gameId = createdGame.id
      }

      // Link video to game using existing service
      await GameService.linkVideoToGame(videoId, gameId)

      // Remove the suggestion from cache
      await VideoService.rejectGameSuggestion(videoId)

      setStatus('accepted')
      // Auto-hide after showing success
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    } catch (err) {
      console.error('Failed to accept game suggestion:', err)
      setLoading(false)
    }
  }

  const handleReject = async (e) => {
    e.stopPropagation() // Prevent triggering video card click
    setLoading(true)

    try {
      await VideoService.rejectGameSuggestion(videoId)
      setStatus('rejected')
      // Hide immediately
      setTimeout(() => {
        onComplete?.()
      }, 300)
    } catch (err) {
      console.error('Failed to reject game suggestion:', err)
      setLoading(false)
    }
  }

  if (status === 'accepted') {
    return (
      <Fade in timeout={500}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 1,
            width: cardWidth,
            background: 'rgba(76, 175, 80, 0.2)',
            borderLeft: '1px solid rgba(76, 175, 80, 0.8)',
            borderRight: '1px solid rgba(76, 175, 80, 0.8)',
            borderBottom: '1px solid rgba(76, 175, 80, 0.8)',
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            lineHeight: 0,
          }}
        >
          <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
            Linked to {suggestion.game_name}
          </Typography>
        </Box>
      </Fade>
    )
  }

  if (status === 'rejected') {
    return null
  }

  return (
    <Fade in timeout={500}>
      <Box
        onClick={(e) => e.stopPropagation()} // Prevent triggering video card click
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          width: cardWidth,
          background: '#101c3c',
          borderLeft: '1px solid #3399FFAE',
          borderRight: '1px solid #3399FFAE',
          borderBottom: '1px solid #3399FFAE',
          borderBottomLeftRadius: '6px',
          borderBottomRightRadius: '6px',
          lineHeight: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <SportsEsportsIcon sx={{ color: '#3399FF', fontSize: 20, flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Detected: <strong>{suggestion.game_name}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={handleAccept}
            disabled={loading}
            sx={{
              color: '#4caf50',
              bgcolor: 'rgba(76, 175, 80, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.2)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s',
              width: 28,
              height: 28,
            }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleReject}
            disabled={loading}
            sx={{
              color: '#f44336',
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.2)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s',
              width: 28,
              height: 28,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Fade>
  )
}
