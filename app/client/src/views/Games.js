import React from 'react'
import { Box, Grid, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameService } from '../services'
import LoadingSpinner from '../components/misc/LoadingSpinner'

const Games = () => {
  const [games, setGames] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [hoveredGame, setHoveredGame] = React.useState(null)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })
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

  if (loading) return <LoadingSpinner />

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2}>
        {games.map((game) => {
          const isHovered = hoveredGame === game.id
          const heroTransform = isHovered
            ? `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) scale(1.1)`
            : 'translate(0, 0) scale(1)'
          const logoTransform = isHovered
            ? `translate(calc(-50% + ${mousePos.x * 8}px), calc(-50% + ${mousePos.y * 8}px)) scale(1.05)`
            : 'translate(-50%, -50%) scale(1)'

          return (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Box
                onClick={() => navigate(`/games/${game.id}`)}
                onMouseMove={(e) => handleMouseMove(e, game.id)}
                onMouseLeave={handleMouseLeave}
                sx={{
                  position: 'relative',
                  height: 170,
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
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
    </Box>
  )
}

export default Games
