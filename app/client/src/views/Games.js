import React from 'react'
import {
  Box,
  Grid,
  Typography,
  IconButton,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import { useNavigate } from 'react-router-dom'
import { GameService } from '../services'
import LoadingSpinner from '../components/misc/LoadingSpinner'

const Games = ({ authenticated }) => {
  const [games, setGames] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [hoveredGame, setHoveredGame] = React.useState(null)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })
  const [editMode, setEditMode] = React.useState(false)
  const [selectedGames, setSelectedGames] = React.useState(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteAssociatedVideos, setDeleteAssociatedVideos] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    GameService.getGames()
      .then((res) => {
        setGames(res.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching games:', err)
        setLoading(false)
      })
  }, [])

  const handleMouseMove = (e, gameId) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePos({ x, y })
    setHoveredGame(gameId)
  }

  const handleMouseLeave = () => {
    setHoveredGame(null)
    setMousePos({ x: 0, y: 0 })
  }

  const handleEditModeToggle = () => {
    setEditMode(!editMode)
    if (editMode) {
      setSelectedGames(new Set())
    }
  }

  const handleGameSelect = (gameId) => {
    const newSelected = new Set(selectedGames)
    if (newSelected.has(gameId)) {
      newSelected.delete(gameId)
    } else {
      newSelected.add(gameId)
    }
    setSelectedGames(newSelected)
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const deletePromises = Array.from(selectedGames).map((gameId) =>
        GameService.deleteGame(gameId, deleteAssociatedVideos)
      )
      await Promise.all(deletePromises)

      // Refresh games list
      const res = await GameService.getGames()
      setGames(res.data)

      // Reset state
      setSelectedGames(new Set())
      setDeleteDialogOpen(false)
      setDeleteAssociatedVideos(false)
      setEditMode(false)
    } catch (err) {
      console.error('Error deleting games:', err)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setDeleteAssociatedVideos(false)
  }

  const handleGameClick = (gameId) => {
    if (editMode) {
      handleGameSelect(gameId)
    } else {
      navigate(`/games/${gameId}`)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <Box sx={{ p: 3 }}>
      {/* Edit button and Delete button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2, alignItems: 'flex-start' }}>
        {editMode && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            disabled={selectedGames.size === 0}
            sx={{
              borderRadius: '8px',
            }}
          >
            Delete {selectedGames.size > 0 && `(${selectedGames.size})`}
          </Button>
        )}
        {authenticated && (
          <IconButton
            onClick={handleEditModeToggle}
            sx={{
              bgcolor: editMode ? 'primary.main' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              '&:hover': {
                bgcolor: editMode ? 'primary.dark' : 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            {editMode ? <CheckIcon /> : <EditIcon />}
          </IconButton>
        )}
      </Box>

      <Grid container spacing={2}>
        {games.map((game) => {
          const isHovered = hoveredGame === game.steamgriddb_id
          const heroTransform = isHovered
            ? `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) scale(1.1)`
            : 'translate(0, 0) scale(1)'
          const logoTransform = isHovered
            ? `translate(calc(-50% + ${mousePos.x * 8}px), calc(-50% + ${mousePos.y * 8}px)) scale(1.05)`
            : 'translate(-50%, -50%) scale(1)'

          const isSelected = selectedGames.has(game.steamgriddb_id)

          return (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Box
                onClick={() => handleGameClick(game.steamgriddb_id)}
                onMouseMove={(e) => handleMouseMove(e, game.steamgriddb_id)}
                onMouseLeave={handleMouseLeave}
                sx={{
                  position: 'relative',
                  height: 170,
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.3s ease, border 0.3s ease',
                  border: isSelected ? '3px solid' : '3px solid transparent',
                  borderColor: isSelected ? 'primary.main' : 'transparent',
                  '&:hover': {
                    boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
                {/* Checkbox for edit mode */}
                {editMode && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleGameSelect(game.steamgriddb_id)
                    }}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 2,
                      color: 'white',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: '4px',
                      '&.Mui-checked': {
                        color: 'primary.main',
                      },
                    }}
                  />
                )}

                {game.hero_url && (
                  <Box
                    component="img"
                    src={game.hero_url}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                      transform: heroTransform,
                      transition: 'transform 0.2s ease-out',
                      filter: 'brightness(0.7)',
                    }}
                  />
                )}
                {game.logo_url && (
                  <Box
                    component="img"
                    src={game.logo_url}
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: logoTransform,
                      maxWidth: '65%',
                      maxHeight: '65%',
                      objectFit: 'contain',
                      zIndex: 1,
                      transition: 'transform 0.2s ease-out',
                    }}
                  />
                )}
              </Box>
            </Grid>
          )
        })}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete {selectedGames.size} Game{selectedGames.size > 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the selected game{selectedGames.size > 1 ? 's' : ''}?
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteAssociatedVideos}
                onChange={(e) => setDeleteAssociatedVideos(e.target.checked)}
                sx={{
                  color: 'error.main',
                  '&.Mui-checked': {
                    color: 'error.main',
                  },
                }}
              />
            }
            label="Also delete associated videos"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Games
