import React from 'react'
import ReactDOM from 'react-dom'
import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import Select from 'react-select'
import { GameService } from '../services'
import VideoCards from '../components/admin/VideoCards'
import GameVideosHeader from '../components/game/GameVideosHeader'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import { SORT_OPTIONS } from '../common/constants'
import { formatDate } from '../common/utils'
import selectSortTheme from '../common/reactSelectSortTheme'

const GameVideos = ({ cardSize, authenticated, searchText }) => {
  const { gameId } = useParams()
  const [videos, setVideos] = React.useState([])
  const [filteredVideos, setFilteredVideos] = React.useState([])
  const [search, setSearch] = React.useState(searchText)
  const [game, setGame] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [sortOrder, setSortOrder] = React.useState(SORT_OPTIONS?.[0] || { value: 'newest', label: 'Newest' })
  const [toolbarTarget, setToolbarTarget] = React.useState(null)

  // Filter videos when searchText changes
  if (searchText !== search) {
    setSearch(searchText)
    setFilteredVideos(videos.filter((v) => v.info?.title?.search(new RegExp(searchText, 'i')) >= 0))
  }

  React.useEffect(() => {
    Promise.all([
      GameService.getGames(),
      GameService.getGameVideos(gameId)
    ])
      .then(([gamesRes, videosRes]) => {
        const foundGame = gamesRes.data.find(g => g.steamgriddb_id === parseInt(gameId))
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
      .then((res) => setVideos(res.data || []))
      .catch((err) => console.error(err))
  }

  // Check if sorting by views (no date grouping needed)
  const isSortingByViews = sortOrder.value === 'most_views' || sortOrder.value === 'least_views'

  const sortedVideos = React.useMemo(() => {
    if (!filteredVideos || !Array.isArray(filteredVideos)) return []
    return [...filteredVideos].sort((a, b) => {
      if (sortOrder.value === 'most_views') {
        return (b.view_count || 0) - (a.view_count || 0)
      } else if (sortOrder.value === 'least_views') {
        return (a.view_count || 0) - (b.view_count || 0)
      } else {
        const dateA = a.recorded_at ? new Date(a.recorded_at) : new Date(0)
        const dateB = b.recorded_at ? new Date(b.recorded_at) : new Date(0)
        return sortOrder.value === 'newest' ? dateB - dateA : dateA - dateB
      }
    })
  }, [filteredVideos, sortOrder])

  const groupedVideos = React.useMemo(() => {
    // Skip grouping when sorting by views
    if (isSortingByViews) return { all: sortedVideos }

    const groups = {}
    sortedVideos.forEach((video) => {
      // Use just the date part (YYYY-MM-DD) for grouping, not the full timestamp
      const dateKey = video.recorded_at
        ? new Date(video.recorded_at).toISOString().split('T')[0]
        : 'unknown'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(video)
    })
    return groups
  }, [sortedVideos, isSortingByViews])

  if (loading) return <LoadingSpinner />

  return (
    <Box>
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

        {sortedVideos.length === 0 && (
          <Typography color="text.secondary">No videos found for this game.</Typography>
        )}

        {isSortingByViews && groupedVideos.all && (
          <VideoCards
            videos={groupedVideos.all}
            authenticated={authenticated}
            size={cardSize}
            feedView={false}
            fetchVideos={fetchVideos}
          />
        )}

        {!isSortingByViews && Object.entries(groupedVideos).map(([dateKey, dateVideos]) => {
          const formattedDate = dateKey !== 'unknown' ? formatDate(dateKey) : 'Unknown Date'

          return (
            <Box key={dateKey} sx={{ mb: 4 }}>
              <Typography
                sx={{
                  mb: 2,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#2d7cff',
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
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default GameVideos
