use anyhow::Result;
use rspotify::{
    model::{AdditionalType, PlayableItem},
    prelude::*,
    scopes, AuthCodePkceSpotify, Credentials, OAuth, Config,
};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone, Debug)]
pub struct SpotifyManager {
    // Arc<Mutex> allows sharing this client across threads if needed, 
    // though rspotify client is internally thread-safe, 
    // we wrap the whole manager or specific mutable state if we had any.
    // For now, we just hold the client.
    client: Option<AuthCodePkceSpotify>,
    pub current_track: String,
    pub current_artist: String,
    pub is_playing: bool,
}

impl Default for SpotifyManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SpotifyManager {
    pub fn new() -> Self {
        Self {
            client: None,
            current_track: "OFFLINE".to_string(),
            current_artist: "NO SIGNAL".to_string(),
            is_playing: false,
        }
    }

    /// Initialize the Spotify Client using PKCE flow (best for CLI apps)
    pub async fn init(&mut self) -> Result<()> {
        // We look for SPOTIFY_CLIENT_ID in env. 
        // Redirect URI usually needs to be http://localhost:8888/callback for local apps
        
        let creds = Credentials::from_env();
        if creds.is_none() {
            self.current_track = "NO CREDENTIALS".to_string();
            return Ok(());
        }

        let oauth = OAuth {
            redirect_uri: "http://localhost:8888/callback".to_string(),
            scopes: scopes!(
                "user-read-playback-state", 
                "user-modify-playback-state", 
                "user-read-currently-playing"
            ),
            ..Default::default()
        };

        let config = Config {
            token_cached: true,
            ..Default::default()
        };

        let mut spotify = AuthCodePkceSpotify::with_config(creds.unwrap(), oauth, config);

        // This opens a browser window to auth
        let url = spotify.get_authorize_url(None)?;
        
        // In a real TUI, we might want to display this URL nicely or instruct the user.
        // For this "setup" phase, prompt_for_token works but interacts with stdin/stdout.
        // We will do this carefully.
        match spotify.prompt_for_token(&url).await {
            Ok(_) => {
                self.client = Some(spotify);
                self.current_track = "CONNECTED".to_string();
                self.current_artist = "WAITING FOR DATA".to_string();
            }
            Err(e) => {
                self.current_track = "AUTH FAILED".to_string();
                eprintln!("Spotify Auth failed: {}", e);
            }
        }

        Ok(())
    }

    pub async fn update_status(&mut self) {
        if let Some(client) = &self.client {
            // Get currently playing
            let additional_types = vec![AdditionalType::Track];
            match client.current_playing(None, Some(&additional_types)).await {
                Ok(Some(playing)) => {
                    self.is_playing = playing.is_playing;
                    
                    if let Some(item) = playing.item {
                        match item {
                            PlayableItem::Track(track) => {
                                self.current_track = track.name;
                                self.current_artist = track.artists
                                    .first()
                                    .map(|a| a.name.clone())
                                    .unwrap_or("Unknown".to_string());
                            }
                            PlayableItem::Episode(ep) => {
                                self.current_track = ep.name;
                                self.current_artist = "Podcast".to_string();
                            }
                            _ => {
                                self.current_track = "Unknown Media".to_string();
                                self.current_artist = "".to_string();
                            }
                        }
                    }
                }
                Ok(None) => {
                    self.is_playing = false;
                    self.current_track = "IDLE".to_string();
                    self.current_artist = "".to_string();
                }
                Err(_) => {
                    // API Error (maybe rate limit or token expired)
                    // Silently fail for TUI smoothness
                }
            }
        }
    }

    pub async fn toggle_play(&self) {
        if let Some(client) = &self.client {
            if self.is_playing {
                let _ = client.pause_playback(None).await;
            } else {
                 // start_context_playback args: context_uri, device_id, offset, position_ms
                 // We just want to resume user's active context so we pass None to all or use start_playback
                 // rspotify 0.13+ vs 0.15 changes signature often.
                 // let's try resume_playback which handles 'play' command without specific context
                 let _ = client.resume_playback(None, None).await;
            }
        }
    }

    pub async fn next_track(&self) {
        if let Some(client) = &self.client {
            let _ = client.next_track(None).await;
        }
    }
    
    pub async fn previous_track(&self) {
        if let Some(client) = &self.client {
             let _ = client.previous_track(None).await;
        }
    }
}
