"""
SteamGridDB API Integration
Handles game search and asset retrieval from SteamGridDB API
"""
import requests
import logging
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)


class SteamGridDBClient:
    """Client for interacting with SteamGridDB API"""

    BASE_URL = "https://www.steamgriddb.com/api/v2"

    def __init__(self, api_key: str):
        """
        Initialize SteamGridDB client

        Args:
            api_key: SteamGridDB API key
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}"
        }

    def search_games(self, query: str) -> List[Dict]:
        """
        Search for games by name

        Args:
            query: Game name to search for

        Returns:
            List of game dictionaries with id, name, release_date
        """
        try:
            url = f"{self.BASE_URL}/search/autocomplete/{query}"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data.get("success") and data.get("data"):
                return data["data"]
            return []

        except Exception as e:
            logger.error(f"Error searching SteamGridDB for '{query}': {e}")
            return []

    def get_game_by_id(self, game_id: int) -> Optional[Dict]:
        """
        Get game details by SteamGridDB game ID

        Args:
            game_id: SteamGridDB game ID

        Returns:
            Game dictionary or None
        """
        try:
            url = f"{self.BASE_URL}/games/id/{game_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data.get("success") and data.get("data"):
                return data["data"]
            return None

        except Exception as e:
            logger.error(f"Error fetching game {game_id} from SteamGridDB: {e}")
            return None

    def get_heroes(self, game_id: int, limit: int = 1) -> List[Dict]:
        """
        Get hero images for a game

        Args:
            game_id: SteamGridDB game ID
            limit: Number of results to return

        Returns:
            List of hero image dictionaries
        """
        try:
            url = f"{self.BASE_URL}/heroes/game/{game_id}"
            params = {"dimensions": "1920x620,3840x1240"}  # Standard hero sizes
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data.get("success") and data.get("data"):
                return data["data"][:limit]
            return []

        except Exception as e:
            logger.error(f"Error fetching heroes for game {game_id}: {e}")
            return []

    def get_logos(self, game_id: int, limit: int = 1) -> List[Dict]:
        """
        Get logo images for a game

        Args:
            game_id: SteamGridDB game ID
            limit: Number of results to return

        Returns:
            List of logo image dictionaries
        """
        try:
            url = f"{self.BASE_URL}/logos/game/{game_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data.get("success") and data.get("data"):
                return data["data"][:limit]
            return []

        except Exception as e:
            logger.error(f"Error fetching logos for game {game_id}: {e}")
            return []

    def get_icons(self, game_id: int, limit: int = 1) -> List[Dict]:
        """
        Get icon images for a game

        Args:
            game_id: SteamGridDB game ID
            limit: Number of results to return

        Returns:
            List of icon image dictionaries
        """
        try:
            url = f"{self.BASE_URL}/icons/game/{game_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            data = response.json()
            if data.get("success") and data.get("data"):
                return data["data"][:limit]
            return []

        except Exception as e:
            logger.error(f"Error fetching icons for game {game_id}: {e}")
            return []

    def get_game_assets(self, game_id: int) -> Dict:
        """
        Get all assets for a game (hero, logo, icon)

        Args:
            game_id: SteamGridDB game ID

        Returns:
            Dictionary with hero_url, logo_url, icon_url
        """
        assets = {
            "hero_url": None,
            "logo_url": None,
            "icon_url": None
        }

        # Get hero
        heroes = self.get_heroes(game_id, limit=1)
        if heroes:
            assets["hero_url"] = heroes[0].get("url")

        # Get logo
        logos = self.get_logos(game_id, limit=1)
        if logos:
            assets["logo_url"] = logos[0].get("url")

        # Get icon
        icons = self.get_icons(game_id, limit=1)
        if icons:
            assets["icon_url"] = icons[0].get("url")

        return assets
