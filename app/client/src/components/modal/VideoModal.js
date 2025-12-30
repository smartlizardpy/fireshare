import React, { useEffect, useState } from 'react'
import { Autocomplete, Button, ButtonGroup, Grid, IconButton, InputAdornment, Modal, Paper, Slide, TextField } from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { copyToClipboard, getPublicWatchUrl, getServedBy, getUrl, getVideoSources } from '../../common/utils'
import { ConfigService, VideoService, GameService } from '../../services'
import SnackbarAlert from '../alert/SnackbarAlert'
import VideoJSPlayer from '../misc/VideoJSPlayer'

const URL = getUrl()
const PURL = getPublicWatchUrl()
const SERVED_BY = getServedBy()

const VideoModal = ({ open, onClose, videoId, feedView, authenticated, updateCallback }) => {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [updateable, setUpdatable] = React.useState(false)
  const [privateView, setPrivateView] = React.useState(false)
  const [vid, setVideo] = React.useState(null)
  const [viewAdded, setViewAdded] = React.useState(false)
  const [alert, setAlert] = React.useState({ open: false })
  const [autoplay, setAutoplay] = useState(false)
  const [selectedGame, setSelectedGame] = React.useState(null)
  const [gameOptions, setGameOptions] = React.useState([])
  const [gameSearchLoading, setGameSearchLoading] = React.useState(false)

  const playerRef = React.useRef()

  const getRandomVideo = async () => {
    try {
      const res = !feedView
        ? (await VideoService.getRandomVideo()).data
        : (await VideoService.getRandomPublicVideo()).data

      setViewAdded(false)
      setVideo(res)
      setTitle(res.info?.title)
      setDescription(res.info?.description)
      setUpdatable(false)
      setPrivateView(res.info?.private)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const result = await ConfigService.getConfig();  
        setAutoplay(result.data?.autoplay || false);  
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };

    fetchConfig();  
  }, []);  

  React.useEffect(() => {
    async function fetch() {
      try {
        const details = (await VideoService.getDetails(videoId)).data
        setViewAdded(false)
        setVideo(details)
        setTitle(details.info?.title)
        setDescription(details.info?.description)
        setPrivateView(details.info?.private)
        setUpdatable(false)
        // Fetch linked game
        try {
          const gameData = (await GameService.getVideoGame(videoId)).data
          if (gameData) {
            setSelectedGame(gameData)
          } else {
            setSelectedGame(null)
          }
        } catch (err) {
          setSelectedGame(null)
        }
      } catch (err) {
        setAlert(
          setAlert({
            type: 'error',
            message: 'Unable to load video details',
            open: true,
          }),
        )
      }
    }
    if (videoId) {
      fetch()
    }
  }, [videoId])

  const searchGames = async (query) => {
    if (!query || query.length < 2) return setGameOptions([])
    setGameSearchLoading(true)
    try {
      setGameOptions((await GameService.searchSteamGrid(query)).data || [])
    } catch (err) {
      setGameOptions([])
    }
    setGameSearchLoading(false)
  }

  const handleGameChange = async (event, newValue) => {
    if (!authenticated) return

    if (newValue) {
      try {
        const allGames = (await GameService.getGames()).data
        let game = allGames.find(g => g.steamgriddb_id === newValue.id)

        if (!game) {
          const assets = (await GameService.getGameAssets(newValue.id)).data
          const gameData = {
            steamgriddb_id: newValue.id,
            name: newValue.name,
            release_date: newValue.release_date ? new Date(newValue.release_date * 1000).toISOString().split('T')[0] : null,
            hero_url: assets.hero_url,
            logo_url: assets.logo_url,
            icon_url: assets.icon_url,
          }
          game = (await GameService.createGame(gameData)).data
        }

        await GameService.linkVideoToGame(vid.video_id, game.id)

        setSelectedGame(game)
        setAlert({
          type: 'success',
          message: `Linked to ${newValue.name}`,
          open: true,
        })
      } catch (err) {
        console.error('Error linking game:', err)
        setAlert({
          type: 'error',
          message: 'Failed to link game',
          open: true,
        })
      }
    } else {
      try {
        await GameService.unlinkVideoFromGame(vid.video_id)
        setSelectedGame(null)
        setAlert({
          type: 'info',
          message: 'Game link removed',
          open: true,
        })
      } catch (err) {
        console.error('Error unlinking game:', err)
      }
    }
  }

  const handleMouseDown = (e) => {
    if (e.button === 1) {
      window.open(`${PURL}${vid.video_id}`, '_blank')
    }
  }

  const update = async () => {
    if (updateable && authenticated) {
      try {
        await VideoService.updateDetails(vid.video_id, { title, description })
        setUpdatable(false)
        updateCallback({ id: vid.video_id, title, description })
        setAlert({
          type: 'success',
          message: 'Details Updated',
          open: true,
        })
      } catch (err) {
        setAlert({
          type: 'error',
          message: 'An error occurred trying to update the title',
          open: true,
        })
      }
    }
  }

  const handlePrivacyChange = async () => {
    if (authenticated) {
      try {
        await VideoService.updatePrivacy(vid.video_id, !privateView)
        updateCallback({ id: vid.video_id, private: !privateView })
        setAlert({
          type: privateView ? 'info' : 'warning',
          message: privateView ? `Added to your public feed` : `Removed from your public feed`,
          open: true,
        })
        setPrivateView(!privateView)
      } catch (err) {
        console.log(err)
      }
    }
  }

  const handleTitleChange = (newValue) => {
    if (newValue) {
      setUpdatable(newValue !== vid.info?.title || description !== vid.info?.description)
    }
    setTitle(newValue)
  }

  const handleDescriptionChange = (newValue) => {
    if (newValue) {
      setUpdatable(newValue !== vid.info?.description || title !== vid.info?.title)
    }
    setDescription(newValue)
  }

  const copyTimestamp = () => {
    let currentTime = 0
    if (playerRef.current && typeof playerRef.current.currentTime === 'function') {
      const time = playerRef.current.currentTime()
      currentTime = (time && !isNaN(time)) ? time : 0
    }
    copyToClipboard(`${PURL}${vid.video_id}?t=${currentTime}`)
    setAlert({
      type: 'info',
      message: 'Time stamped link copied to clipboard',
      open: true,
    })
  }

  const handleTimeUpdate = (e) => {
    if (!viewAdded) {
      const currentTime = e.playedSeconds || 0
      if (!vid.info?.duration || vid.info?.duration < 10) {
        setViewAdded(true)
        VideoService.addView(vid?.video_id || videoId).catch((err) => console.error(err))
      } else if (currentTime >= 10) {
        setViewAdded(true)
        VideoService.addView(vid?.video_id || videoId).catch((err) => console.error(err))
      }
    }
  }



  const getPosterUrl = () => {
    if (SERVED_BY === 'nginx') {
      return `${URL}/_content/derived/${vid.video_id}/poster.jpg`
    }
    return `${URL}/api/video/poster?id=${vid.video_id}`
  }

  if (!vid) return null

  return (
    <>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      <Modal open={open} onClose={onClose} closeAfterTransition disableAutoFocus={true}>
        <Slide in={open}>
          <Paper sx={{ height: '100%', borderRadius: '0px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.4)', px: '20px', pt: '20px', pb: 0 }}>
            <IconButton
              color="inherit"
              onClick={onClose}
              aria-label="close"
              sx={{
                position: 'absolute',
                background: 'rgba(255,255,255,0.25)',
                ':hover': {
                  background: 'rgba(255,255,255,0.5)',
                },
                width: 50,
                height: 50,
                top: 16,
                right: 16,
                zIndex: 100,
                padding: 0,
              }}
            >
              <CloseIcon sx={{ width: 35, height: 35 }} />
            </IconButton>
            <Grid container justifyContent="center" sx={{ gap: '6px' }}>
              <Grid item xs={12}>
                <VideoJSPlayer
                  sources={getVideoSources(vid.video_id, vid?.info, vid.extension)}
                  poster={getPosterUrl()}
                  autoplay={autoplay}
                  controls={true}
                  onTimeUpdate={handleTimeUpdate}
                  onReady={(player) => {
                    playerRef.current = player
                  }}
                />
              </Grid>
              <Grid item>
                <ButtonGroup variant="contained" onClick={(e) => e.stopPropagation()}>
                  <Button onClick={getRandomVideo}>
                    <ShuffleIcon />
                  </Button>
                  {authenticated && (
                    <Button onClick={handlePrivacyChange} edge="end">
                      {privateView ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </Button>
                  )}
                  <TextField
                    sx={{
                      textAlign: 'center',
                      background: 'rgba(50, 50, 50, 0.9)',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                        width: {
                          xs: 'auto',
                          sm: 350,
                          md: 450,
                        },
                      },
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: '#fff',
                      },
                    }}
                    size="small"
                    value={title}
                    placeholder="Video Title"
                    disabled={!authenticated}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && update()}
                    InputProps={{
                      endAdornment: authenticated && (
                        <InputAdornment position="end">
                          <IconButton
                            disabled={!updateable}
                            sx={
                              updateable
                                ? {
                                    animation: 'blink-blue 0.5s ease-in-out infinite alternate',
                                  }
                                : {}
                            }
                            onClick={update}
                            edge="end"
                          >
                            <SaveIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <CopyToClipboard text={`${PURL}${vid.video_id}`}>
                    <Button
                      onMouseDown={handleMouseDown}
                      onClick={() =>
                        setAlert({
                          type: 'info',
                          message: 'Link copied to clipboard',
                          open: true,
                        })
                      }
                    >
                      <LinkIcon />
                    </Button>
                  </CopyToClipboard>
                  <Button onClick={copyTimestamp}>
                    <AccessTimeIcon />
                  </Button>
                </ButtonGroup>
                {(authenticated || description) && (
                  <Paper sx={{ mt: 1, background: 'rgba(50, 50, 50, 0.9)' }}>
                    <TextField
                      fullWidth
                      disabled={!authenticated}
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#fff',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: 'none',
                        },
                      }}
                      size="small"
                      placeholder="Enter a video description..."
                      value={description || ''}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      rows={2}
                      multiline
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Paper>
                )}
                {/* Game ID search bar */}
                {authenticated && (
                  <Paper sx={{ mt: 1, background: 'rgba(50, 50, 50, 0.9)' }}>
                    <Autocomplete
                      value={selectedGame}
                      onChange={handleGameChange}
                      onInputChange={(_, val) => searchGames(val)}
                      options={gameOptions}
                      getOptionLabel={(option) => option.name || ''}
                      loading={gameSearchLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search for a game..."
                          size="small"
                          sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                <SportsEsportsIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                          {option.name}
                          {option.release_date && ` (${new Date(option.release_date * 1000).getFullYear()})`}
                        </li>
                      )}
                      sx={{
                        '& .MuiAutocomplete-input, & .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
                          color: '#fff',
                          opacity: 0.7,
                        },
                      }}
                    />
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Slide>
      </Modal>
    </>
  )
}

export default VideoModal
