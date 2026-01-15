import React from 'react'
import {
  Box,
  Grid,
  Stack,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Autocomplete,
  TextField,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import LinkIcon from '@mui/icons-material/Link'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import GameSearch from '../components/game/GameSearch'
import { VideoService, GameService } from '../services'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import { getSetting, setSetting } from '../common/utils'
import Select from 'react-select'
import SnackbarAlert from '../components/alert/SnackbarAlert'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

const Dashboard = ({ authenticated, searchText, cardSize, listStyle }) => {
  const [videos, setVideos] = React.useState([])
  const [search, setSearch] = React.useState(searchText)
  const [filteredVideos, setFilteredVideos] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [folders, setFolders] = React.useState(['All Videos'])
  const [selectedFolder, setSelectedFolder] = React.useState(
    getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  )
  const [selectedSort, setSelectedSort] = React.useState(getSetting('sortOption') || SORT_OPTIONS[0])

  const [alert, setAlert] = React.useState({ open: false })

  const [prevCardSize, setPrevCardSize] = React.useState(cardSize)
  const [prevListStyle, setPrevListStyle] = React.useState(listStyle)

  // Edit mode state
  const [editMode, setEditMode] = React.useState(false)
  const [selectedVideos, setSelectedVideos] = React.useState(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [linkGameDialogOpen, setLinkGameDialogOpen] = React.useState(false)
  const [games, setGames] = React.useState([])
  const [selectedGame, setSelectedGame] = React.useState(null)
  const [showAddNewGame, setShowAddNewGame] = React.useState(false)

  if (searchText !== search) {
    setSearch(searchText)
    setFilteredVideos(videos.filter((v) => v.info.title.search(new RegExp(searchText, 'i')) >= 0))
  }
  if (cardSize !== prevCardSize) {
    setPrevCardSize(cardSize)
  }
  if (listStyle !== prevListStyle) {
    setPrevListStyle(listStyle)
  }

  function fetchVideos() {
    VideoService.getVideos(selectedSort.value)
      .then((res) => {
        setVideos(res.data.videos)
        setFilteredVideos(res.data.videos)
        const tfolders = []
        res.data.videos.forEach((v) => {
          const split = v.path
            .split('/')
            .slice(0, -1)
            .filter((f) => f !== '')
          if (split.length > 0 && !tfolders.includes(split[0])) {
            tfolders.push(split[0])
          }
        })
        tfolders.sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)).unshift('All Videos')
        setFolders(tfolders)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false)
        setAlert({
          open: true,
          type: 'error',
          message: err.response?.data || 'Unknown Error',
        })
        console.log(err)
      })
  }

  React.useEffect(() => {
    fetchVideos()
    // eslint-disable-next-line
  }, [selectedSort])

  const handleFolderSelection = (folder) => {
    setSetting('folder', folder)
    setSelectedFolder(folder)
  }

  const handleSortSelection = (sortOption) => {
    setSetting('sortOption', sortOption)
    setSelectedSort(sortOption)
  }

  const handleEditModeToggle = () => {
    setEditMode(!editMode)
    if (editMode) {
      setSelectedVideos(new Set())
    }
  }

  const handleVideoSelect = (videoId) => {
    const newSelected = new Set(selectedVideos)
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId)
    } else {
      newSelected.add(videoId)
    }
    setSelectedVideos(newSelected)
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const deletePromises = Array.from(selectedVideos).map((videoId) => VideoService.delete(videoId))
      await Promise.all(deletePromises)

      setAlert({
        open: true,
        type: 'success',
        message: `Successfully deleted ${selectedVideos.size} video${selectedVideos.size > 1 ? 's' : ''}`,
      })

      // Refresh videos list
      fetchVideos()

      // Reset state
      setSelectedVideos(new Set())
      setDeleteDialogOpen(false)
      setEditMode(false)
    } catch (err) {
      console.error('Error deleting videos:', err)
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Error deleting videos',
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
  }

  const handleLinkGameClick = async () => {
    // Fetch games when opening dialog
    try {
      const res = await GameService.getGames()
      setGames(res.data)
      setLinkGameDialogOpen(true)
      setShowAddNewGame(false)
      setSelectedGame(null)
    } catch (err) {
      console.error('Error fetching games:', err)
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Error fetching games',
      })
    }
  }

  const handleNewGameCreated = async (game) => {
    // Link all selected videos to the newly created game
    try {
      const linkPromises = Array.from(selectedVideos).map((videoId) =>
        GameService.linkVideoToGame(videoId, game.id),
      )
      await Promise.all(linkPromises)

      setAlert({
        open: true,
        type: 'success',
        message: `Successfully linked ${selectedVideos.size} video${selectedVideos.size > 1 ? 's' : ''} to ${game.name}`,
      })

      // Reset state
      setSelectedVideos(new Set())
      setLinkGameDialogOpen(false)
      setShowAddNewGame(false)
      setEditMode(false)
    } catch (err) {
      console.error('Error linking videos to game:', err)
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Error linking videos to new game',
      })
    }
  }

  const handleLinkGameConfirm = async () => {
    if (!selectedGame) return

    try {
      const linkPromises = Array.from(selectedVideos).map((videoId) =>
        GameService.linkVideoToGame(videoId, selectedGame.id),
      )
      await Promise.all(linkPromises)

      setAlert({
        open: true,
        type: 'success',
        message: `Successfully linked ${selectedVideos.size} video${selectedVideos.size > 1 ? 's' : ''} to ${selectedGame.name}`,
      })

      // Reset state
      setSelectedVideos(new Set())
      setLinkGameDialogOpen(false)
      setSelectedGame(null)
      setEditMode(false)
    } catch (err) {
      console.error('Error linking videos to game:', err)
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Error linking videos to game',
      })
    }
  }

  const handleLinkGameCancel = () => {
    setLinkGameDialogOpen(false)
    setSelectedGame(null)
  }

  return (
    <>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      <Box sx={{ height: '100%' }}>
        <Grid container item justifyContent="center">
          <Grid item xs={12}>
            <Grid container justifyContent="center">
              <Grid item xs={11} sm={9} md={7} lg={5} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Select
                      value={selectedFolder}
                      options={createSelectFolders(folders)}
                      onChange={handleFolderSelection}
                      styles={selectFolderTheme}
                      blurInputOnSelect
                      isSearchable={false}
                    />
                  </Box>
                  <Select
                    value={selectedSort}
                    options={SORT_OPTIONS}
                    onChange={handleSortSelection}
                    styles={selectSortTheme}
                    blurInputOnSelect
                    isSearchable={false}
                  />
                </Stack>
              </Grid>
            </Grid>
            {/* Edit mode buttons */}
            {authenticated && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2, px: 3 }}>
                {editMode && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<LinkIcon />}
                      onClick={handleLinkGameClick}
                      disabled={selectedVideos.size === 0}
                      sx={{
                        borderRadius: '8px',
                      }}
                    >
                      Link to Game {selectedVideos.size > 0 && `(${selectedVideos.size})`}
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteClick}
                      disabled={selectedVideos.size === 0}
                      sx={{
                        borderRadius: '8px',
                      }}
                    >
                      Delete {selectedVideos.size > 0 && `(${selectedVideos.size})`}
                    </Button>
                  </>
                )}
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
              </Box>
            )}
            <Box>
              {listStyle === 'list' && (
                <VideoList
                  authenticated={authenticated}
                  loadingIcon={loading ? <LoadingSpinner /> : null}
                  videos={
                    selectedFolder.value === 'All Videos'
                      ? filteredVideos
                      : filteredVideos?.filter(
                          (v) =>
                            v.path
                              .split('/')
                              .slice(0, -1)
                              .filter((f) => f !== '')[0] === selectedFolder.value,
                        )
                  }
                />
              )}
              {listStyle === 'card' && (
                <VideoCards
                  authenticated={authenticated}
                  loadingIcon={loading ? <LoadingSpinner /> : null}
                  size={cardSize}
                  showUploadCard={selectedFolder.value === 'All Videos'}
                  fetchVideos={fetchVideos}
                  editMode={editMode}
                  selectedVideos={selectedVideos}
                  onVideoSelect={handleVideoSelect}
                  videos={
                    selectedFolder.value === 'All Videos'
                      ? filteredVideos
                      : filteredVideos?.filter(
                          (v) =>
                            v.path
                              .split('/')
                              .slice(0, -1)
                              .filter((f) => f !== '')[0] === selectedFolder.value,
                        )
                  }
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>
          Delete {selectedVideos.size} Video{selectedVideos.size > 1 ? 's' : ''}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the selected video{selectedVideos.size > 1 ? 's' : ''}? This will
            permanently delete the video file{selectedVideos.size > 1 ? 's' : ''}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link to Game Dialog */}
      <Dialog open={linkGameDialogOpen} onClose={handleLinkGameCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Link {selectedVideos.size} Clip{selectedVideos.size !== 1 ? 's' : ''} to Game</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {!showAddNewGame ? (
            <>
              <Autocomplete
                options={[...games, { id: 'add-new', name: 'Add a new game...', isAddNew: true }]}
                getOptionLabel={(option) => option.name || ''}
                value={selectedGame}
                onChange={(_, newValue) => {
                  if (newValue?.isAddNew) {
                    setShowAddNewGame(true)
                    setSelectedGame(null)
                  } else {
                    setSelectedGame(newValue)
                  }
                }}
                renderInput={(params) => <TextField {...params} placeholder="Select a game..." />}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontStyle: option.isAddNew ? 'italic' : 'normal',
                      color: option.isAddNew ? 'primary.main' : 'inherit',
                    }}
                  >
                    {option.icon_url && (
                      <img src={option.icon_url} alt={option.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    )}
                    <Typography>{option.name}</Typography>
                  </Box>
                )}
              />
            </>
          ) : (
            <>
              <GameSearch
                onGameLinked={handleNewGameCreated}
                onError={(err) =>
                  setAlert({
                    open: true,
                    type: 'error',
                    message: err.response?.data || 'Error adding game',
                  })
                }
                placeholder="Search SteamGridDB..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {showAddNewGame && (
            <Button onClick={() => setShowAddNewGame(false)} sx={{ mr: 'auto' }}>
              Back to List
            </Button>
          )}
          <Button onClick={handleLinkGameCancel}>Cancel</Button>
          {!showAddNewGame && (
            <Button onClick={handleLinkGameConfirm} variant="contained" disabled={!selectedGame}>
              Link
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}

export default Dashboard
