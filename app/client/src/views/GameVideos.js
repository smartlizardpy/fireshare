import React from 'react'
import ReactDOM from 'react-dom'
import { Box } from '@mui/material'
import { useParams } from 'react-router-dom'
import Select from 'react-select'
import { GameService } from '../services'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import GameVideosHeader from '../components/game/GameVideosHeader'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { SORT_OPTIONS } from '../common/constants'
import selectSortTheme from '../common/reactSelectSortTheme'

const GameVideos = ({ cardSize, listStyle, authenticated, searchText }) => {
  const { gameId } = useParams()
  const [videos, setVideos] = React.useState([])
  const [filteredVideos, setFilteredVideos] = React.useState([])
  const [search, setSearch] = React.useState(searchText)
  const [game, setGame] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [alert, setAlert] = React.useState({ open: false })
  const [sortOrder, setSortOrder] = React.useState(SORT_OPTIONS?.[0] || { value: 'newest', label: 'Newest' })
  const [toolbarTarget, setToolbarTarget] = React.useState(null)

  // Filter videos when searchText changes
  if (searchText !== search) {
    setSearch(searchText)
    setFilteredVideos(videos.filter((v) => v.info.title.search(new RegExp(searchText, 'i')) >= 0))
  }

  React.useEffect(() => {
    Promise.all([
      GameService.getGames(),
      GameService.getGameVideos(gameId)
    ])
      .then(([gamesRes, videosRes]) => {
        const foundGame = gamesRes.data.find(g => g.steamgriddb_id === parseInt(gameId))
        setGame(foundGame)
        setVideos(videosRes.data)
        setFilteredVideos(videosRes.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching game videos:', err)
        setLoading(false)
      })
  }, [gameId])

  React.useEffect(() => {
    setToolbarTarget(document.getElementById('navbar-toolbar-extra'))
  }, [])

  function fetchVideos() {
    GameService.getGameVideos(gameId)
      .then((res) => setVideos(res.data))
      .catch((err) => console.error(err))
  }

  const sortedVideos = React.useMemo(() => {
    if (!filteredVideos || !Array.isArray(filteredVideos)) return []
    const [field, direction] = (sortOrder?.value || 'updated_at desc').split(' ')
    return [...filteredVideos].sort((a, b) => {
      let aVal, bVal
      if (field === 'video_info.title') {
        aVal = a.info?.title?.toLowerCase() || ''
        bVal = b.info?.title?.toLowerCase() || ''
      } else if (field === 'views') {
        aVal = a.view_count || 0
        bVal = b.view_count || 0
      } else {
        aVal = new Date(a[field] || a.created_at || 0)
        bVal = new Date(b[field] || b.created_at || 0)
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredVideos, sortOrder])

  if (loading) return <LoadingSpinner />

  return (
    <Box>
      <SnackbarAlert alert={alert} setAlert={setAlert} />
      {toolbarTarget && ReactDOM.createPortal(
        <Box sx={{ minWidth: 200 }}>
          <Select
            value={sortOrder}
            options={SORT_OPTIONS}
            onChange={setSortOrder}
            styles={selectSortTheme}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            blurInputOnSelect
            isSearchable={false}
          />
        </Box>,
        toolbarTarget,
      )}
      <GameVideosHeader
        game={game}
      />
      <Box sx={{ p: 3 }}>
        {listStyle === 'list' ? (
          <VideoList
            videos={sortedVideos}
            authenticated={authenticated}
            feedView={false}
          />
        ) : (
          <VideoCards
            videos={sortedVideos}
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
