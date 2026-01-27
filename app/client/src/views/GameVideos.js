import React from 'react'
import ReactDOM from 'react-dom'
import { Box, Typography } from '@mui/material'
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
import { formatDate } from '../common/utils'

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
      GameService.getGameVideos(gameId),
    ])
      .then(([gamesRes, videosRes]) => {
        const foundGame = gamesRes.data.find((g) => g.steamgriddb_id === parseInt(gameId))
        setGame(foundGame)
        const fetchedVideos = videosRes.data || []
        setVideos(fetchedVideos)
        setFilteredVideos(fetchedVideos)
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
      .then((res) => {
        const fetchedVideos = res.data || []
        setVideos(fetchedVideos)
        setFilteredVideos(fetchedVideos)
      })
      .catch((err) => console.error(err))
  }

  const sortValue = sortOrder?.value || 'updated_at desc'
  const isDateSort = sortValue === 'newest'
    || sortValue === 'oldest'
    || sortValue.startsWith('recorded_at')
    || sortValue.startsWith('updated_at')
    || sortValue.startsWith('created_at')

  const sortedVideos = React.useMemo(() => {
    if (!filteredVideos || !Array.isArray(filteredVideos)) return []

    const getViews = (video) => video.view_count ?? video.views ?? 0
    const getRecordedDate = (video) => new Date(video.recorded_at || video.updated_at || video.created_at || 0)

    if (sortValue === 'most_views') {
      return [...filteredVideos].sort((a, b) => getViews(b) - getViews(a))
    }

    if (sortValue === 'least_views') {
      return [...filteredVideos].sort((a, b) => getViews(a) - getViews(b))
    }

    if (isDateSort) {
      const isAsc = sortValue === 'oldest' || sortValue.endsWith('asc')
      return [...filteredVideos].sort((a, b) => {
        const dateA = getRecordedDate(a)
        const dateB = getRecordedDate(b)
        return isAsc ? dateA - dateB : dateB - dateA
      })
    }

    const [field, direction] = sortValue.split(' ')
    return [...filteredVideos].sort((a, b) => {
      let aVal
      let bVal
      if (field === 'video_info.title') {
        aVal = a.info?.title?.toLowerCase() || ''
        bVal = b.info?.title?.toLowerCase() || ''
      } else if (field === 'views') {
        aVal = getViews(a)
        bVal = getViews(b)
      } else {
        aVal = new Date(a[field] || a.created_at || 0)
        bVal = new Date(b[field] || b.created_at || 0)
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredVideos, sortValue, isDateSort])

  const groupedVideos = React.useMemo(() => {
    if (!isDateSort) return null
    const groups = {}
    sortedVideos.forEach((video) => {
      const dateKey = video.recorded_at
        ? new Date(video.recorded_at).toISOString().split('T')[0]
        : 'unknown'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(video)
    })
    return groups
  }, [sortedVideos, isDateSort])

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
          isDateSort && groupedVideos && Object.keys(groupedVideos).length > 0 ? (
            Object.entries(groupedVideos).map(([dateKey, dateVideos]) => {
              const formattedDate = dateKey !== 'unknown' ? (formatDate(dateKey) || dateKey) : 'Unknown Date'

              return (
                <Box key={dateKey} sx={{ mb: 4 }}>
                  <Typography
                    sx={{
                      mb: 2,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {formattedDate}
                  </Typography>
                  <VideoCards
                    videos={dateVideos}
                    authenticated={authenticated}
                    size={cardSize}
                    feedView={false}
                    fetchVideos={fetchVideos}
                    handleAlert={setAlert}
                  />
                </Box>
              )
            })
          ) : (
            <VideoCards
              videos={sortedVideos}
              authenticated={authenticated}
              size={cardSize}
              feedView={false}
              fetchVideos={fetchVideos}
              handleAlert={setAlert}
            />
          )
        )}
      </Box>
    </Box>
  )
}

export default GameVideos
``