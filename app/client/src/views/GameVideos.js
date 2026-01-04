import React from 'react'
import { Box, Divider } from '@mui/material'
import { useParams } from 'react-router-dom'
import { GameService } from '../services'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import SnackbarAlert from '../components/alert/SnackbarAlert'

const GameVideos = ({ cardSize, listStyle, authenticated }) => {
  const { gameId } = useParams()
  const [videos, setVideos] = React.useState([])
  const [game, setGame] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [alert, setAlert] = React.useState({ open: false })

  React.useEffect(() => {
    Promise.all([
      GameService.getGames(),
      GameService.getGameVideos(gameId)
    ])
      .then(([gamesRes, videosRes]) => {
        const foundGame = gamesRes.data.find(g => g.steamgriddb_id === parseInt(gameId))
        setGame(foundGame)
        setVideos(videosRes.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching game videos:', err)
        setLoading(false)
      })
  }, [gameId])

  function fetchVideos() {
    GameService.getGameVideos(gameId)
      .then((res) => setVideos(res.data))
      .catch((err) => console.error(err))
  }

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <SnackbarAlert alert={alert} setAlert={setAlert} />
      <Box sx={{ p: 3 }}>
        {game?.logo_url && (
          <Box sx={{ mb: 3 }}>
            <Box
              component="img"
              src={game.logo_url}
              sx={{
                maxHeight: 80,
                maxWidth: 300,
                objectFit: 'contain',
              }}
            />
            <Divider sx={{ mt: 2 }} />
          </Box>
        )}
        {listStyle === 'list' ? (
          <VideoList
            videos={videos}
            authenticated={authenticated}
            feedView={false}
          />
        ) : (
          <VideoCards
            videos={videos}
            authenticated={authenticated}
            size={cardSize}
            feedView={false}
            fetchVideos={fetchVideos}
            handleAlert={setAlert}
          />
        )}
      </Box>
    </Box>
  )
}

export default GameVideos
