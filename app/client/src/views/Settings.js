import React from 'react'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  Typography,
} from '@mui/material'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import SaveIcon from '@mui/icons-material/Save'
import SensorsIcon from '@mui/icons-material/Sensors'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { ConfigService, VideoService } from '../services'
import LightTooltip from '../components/misc/LightTooltip'

import _ from 'lodash'
import WarningService from "../services/WarningService";

const isValidDiscordWebhook = (url) => {
  const regex = /^https:\/\/discord\.com\/api\/webhooks\/\d{17,20}\/[\w-]{60,}$/;
  return regex.test(url);
};

const Settings = ({ authenticated }) => {
  const [alert, setAlert] = React.useState({ open: false })
  const [config, setConfig] = React.useState()
  const [updatedConfig, setUpdatedConfig] = React.useState({})
  const [updateable, setUpdateable] = React.useState(false)
  const [discordUrl, setDiscordUrl] = React.useState('')
  const [showSteamGridKey, setShowSteamGridKey] = React.useState(false)
  const isDiscordUsed = discordUrl.trim() !== ''

  React.useEffect(() => {
    async function fetch() {
      try {
        const res = await ConfigService.getAdminConfig()
        const conf = _.cloneDeep(res.data)

        // Ensure rss_config exists and has default values for comparison
        if (!conf.rss_config) {
          conf.rss_config = { title: '', description: '' }
        }
        if (!conf.rss_config.title) conf.rss_config.title = ''
        if (!conf.rss_config.description) conf.rss_config.description = ''

        setConfig(_.cloneDeep(conf))
        setUpdatedConfig(_.cloneDeep(conf))
        await checkForWarnings()
      } catch (err) {
        console.error(err)
      }
    }
    fetch()
  }, [])

  React.useEffect(() => {
    if (config && updatedConfig) {
      setUpdateable(!_.isEqual(config, updatedConfig))
    }
  }, [updatedConfig, config])

  React.useEffect(() => {
    if (updatedConfig.integrations?.discord_webhook_url) {
      setDiscordUrl(updatedConfig.integrations.discord_webhook_url)
    }
  }, [updatedConfig])

  const handleSave = async () => {
    try {
      await ConfigService.updateConfig(updatedConfig)
      setUpdateable(false)
      setConfig(_.cloneDeep(updatedConfig))
      setAlert({ open: true, message: 'Settings Updated! Changes may take a minute to take effect.', type: 'success' })
    } catch (err) {
      console.error(err)
      setAlert({ open: true, message: err.response?.data || 'Error saving settings', type: 'error' })
    }
  }

  const handleScan = async () => {
    VideoService.scan().catch((err) =>
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data || 'Unknown Error',
      }),
    )
    setAlert({
      open: true,
      type: 'info',
      message: 'Scan initiated. This could take a few minutes.',
    })
  }

  const handleScanGames = async () => {
    try {
      const response = await VideoService.scanGames()
      if (response.status === 202) {
        // Scan started successfully
        localStorage.setItem('gameScanInProgress', 'true')
        // Dispatch storage event for same-tab updates
        window.dispatchEvent(new StorageEvent('storage', { key: 'gameScanInProgress' }))
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setAlert({
          open: true,
          type: 'warning',
          message: 'A game scan is already in progress.',
        })
      } else {
        setAlert({
          open: true,
          type: 'error',
          message: err.response?.data?.error || 'Failed to start game scan',
        })
      }
    }
  }

  const handleScanDates = async () => {
    try {
      const response = await VideoService.scanDates()
      setAlert({
        open: true,
        type: 'success',
        message: `Date scan complete! Extracted ${response.data.dates_extracted} dates from ${response.data.videos_scanned} videos.`,
      })
    } catch (err) {
      setAlert({
        open: true,
        type: 'error',
        message: err.response?.data?.error || 'Failed to scan videos for dates',
      })
    }
  }

  const checkForWarnings  = async () =>{
      let warnings = await WarningService.getAdminWarnings()

    if (Object.keys(warnings.data).length === 0)
      return;

    for (const warning of warnings.data) {
      // Check if this is the SteamGridDB warning
      if (warning.includes('SteamGridDB API key not configured')) {
        setAlert({
          open: true,
          type: 'warning',
          message: (
            <span>
              {warning.replace('Click here to set it up.', '')}
              <a
                href="#steamgrid-settings"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('steamgrid-api-key-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  document.getElementById('steamgrid-api-key-field')?.focus();
                }}
                style={{ color: '#2684FF', textDecoration: 'underline', cursor: 'pointer', marginLeft: '4px' }}
              >
                Click here to set it up.
              </a>
            </span>
          ),
        });
      } else {
        setAlert({
          open: true,
          type: 'warning',
          message: warning,
        });
      }
      await new Promise(r => setTimeout(r, 2000)); //Without this a second Warning would instantly overwrite the first...
    }
  }

  return (
    <>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      <Box sx={{ height: '100%' }}>
        <Grid container item justifyContent="center" spacing={2}>
          <Grid item xs={12}>
            <Grid container sx={{ pr: 2, pl: 2 }}>
              <Grid item xs sx={{ display: { xs: 'flex', sm: 'none' } }}></Grid>
            </Grid>
          </Grid>
          <Grid item>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                maxWidth: {
                  xs: 400,
                  sm: 500,
                },
                p: 4,
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Privacy & Upload
                  </Typography>
                </Box>
                <Box>
                  <LightTooltip
                    title={updatedConfig.app_config?.video_defaults?.private ? 'Private' : 'Public'}
                    placement="top"
                    enterDelay={500}
                    leaveDelay={500}
                    enterNextDelay={1000}
                  >
                    <ToggleButton
                      size="small"
                      value="check"
                      selected={updatedConfig.app_config?.video_defaults?.private || true}
                      onChange={() => {
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          app_config: {
                            ...prev.app_config,
                            video_defaults: { private: !prev.app_config.video_defaults.private },
                          },
                        }))
                      }}
                      sx={{ mr: 2 }}
                    >
                      {updatedConfig.app_config?.video_defaults?.private && <VisibilityOffIcon />}
                      {!updatedConfig.app_config?.video_defaults?.private && <VisibilityIcon />}
                    </ToggleButton>
                  </LightTooltip>

                  <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 14 }}>
                    Default Video Privacy
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.app_config?.allow_public_upload || false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          app_config: { ...prev.app_config, allow_public_upload: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Allow Public Upload"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.ui_config?.show_admin_upload || false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          ui_config: { ...prev.ui_config, show_admin_upload: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Show Admin Upload Card"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.app_config?.allow_public_game_tag || false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          app_config: { ...prev.app_config, allow_public_game_tag: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Allow Public Game Tagging"
                />
                <TextField
                  size="small"
                  label="Shareable Link Domain"
                  value={updatedConfig.ui_config?.shareable_link_domain || ''}
                  onChange={(e) =>
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      ui_config: { ...prev.ui_config, shareable_link_domain: e.target.value },
                    }))
                  }
                />
                <TextField
                  size="small"
                  label="Public Upload Folder Name"
                  value={updatedConfig.app_config?.public_upload_folder_name || ''}
                  disabled={!updatedConfig.app_config?.allow_public_upload}
                  onChange={(e) =>
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      app_config: { ...prev.app_config, public_upload_folder_name: e.target.value },
                    }))
                  }
                />
                <TextField
                  size="small"
                  label="Admin Upload Folder Name"
                  value={updatedConfig.app_config?.admin_upload_folder_name || ''}
                  onChange={(e) =>
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      app_config: { ...prev.app_config, admin_upload_folder_name: e.target.value },
                    }))
                  }
                />
                <Divider></Divider>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Video
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.ui_config?.autoplay || false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          ui_config: {
                            ...prev.ui_config,
                            autoplay: e.target.checked
                          }
                        }))
                      }
                    />
                  }
                  label="Auto Play Videos"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.ui_config?.show_date_groups !== false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          ui_config: {
                            ...prev.ui_config,
                            show_date_groups: e.target.checked
                          }
                        }))
                      }
                    />
                  }
                  label="Group Videos by Date"
                />
                <Divider />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Sidebar
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.ui_config?.show_my_videos !== false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          ui_config: { ...prev.ui_config, show_my_videos: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="My Videos"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.ui_config?.show_public_videos !== false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          ui_config: { ...prev.ui_config, show_public_videos: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Public Videos"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={updatedConfig.ui_config?.show_games !== false}
                      onChange={(e) =>
                        setUpdatedConfig((prev) => ({
                          ...prev,
                          ui_config: { ...prev.ui_config, show_games: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Games"
                />
                <Divider />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Integrations
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label="Discord Webhook URL"
                  value={discordUrl}
                  error={discordUrl !== '' && !isValidDiscordWebhook(discordUrl)}
                  helperText={
                    discordUrl !== '' && !isValidDiscordWebhook(discordUrl)
                      ? 'Webhook Format should look like: https://discord.com/api/webhooks/12345/fj8903k'
                      : ' '
                  }
                  onChange={(e) => {
                    const url = e.target.value
                    setDiscordUrl(url)
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        discord_webhook_url: url,
                      },
                    }))
                  }}
                />
                <TextField
                  id="steamgrid-api-key-field"
                  size="small"
                  label="SteamGridDB API Key"
                  type={showSteamGridKey ? 'text' : 'password'}
                  value={updatedConfig.integrations?.steamgriddb_api_key || ''}
                  helperText={
                    <span>
                      Get a free API key at{' '}
                      <a
                        href="https://www.steamgriddb.com/profile/preferences/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2684FF', textDecoration: 'none' }}
                      >
                        SteamGridDB
                      </a>
                    </span>
                  }
                  onChange={(e) => {
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        steamgriddb_api_key: e.target.value,
                      },
                    }))
                  }}
                  InputProps={{
                    endAdornment: (
                      <Box
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => setShowSteamGridKey(!showSteamGridKey)}
                      >
                        {showSteamGridKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </Box>
                    ),
                  }}
                />
                <Divider />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Feeds
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label="RSS Feed Title"
                  value={updatedConfig.rss_config?.title || ''}
                  onChange={(e) =>
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      rss_config: { ...(prev.rss_config || {}), title: e.target.value },
                    }))
                  }
                />
                <TextField
                  size="small"
                  label="RSS Feed Description"
                  multiline
                  rows={2}
                  value={updatedConfig.rss_config?.description || ''}
                  onChange={(e) =>
                    setUpdatedConfig((prev) => ({
                      ...prev,
                      rss_config: { ...(prev.rss_config || {}), description: e.target.value },
                    }))
                  }
                />
                <Button
                  variant="outlined"
                  startIcon={<RssFeedIcon />}
                  fullWidth
                  onClick={() => window.open('/api/feed/rss', '_blank')}
                  sx={{ borderColor: 'rgba(255, 255, 255, 0.23)', color: '#fff' }}
                >
                  Open RSS Feed
                </Button>
                <Divider />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={!updateable || (!isValidDiscordWebhook(discordUrl) && isDiscordUsed)}
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }} light />
            <Box sx={{ display: 'flex', width: '100%', pr: 2, gap: 2 }} justifyContent="flex-start">
              <Button variant="contained" startIcon={<SensorsIcon />} onClick={handleScan}>
                Scan Library
              </Button>
              <Button variant="contained" startIcon={<SportsEsportsIcon />} onClick={handleScanGames}>
                Start Manual Scan for Missing Games
              </Button>
              <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={handleScanDates}>
                Scan for Missing Dates
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  )
}

export default Settings
