import { Game } from './game/Game';
import { SkinSelector } from './ui/SkinSelector';

// DOM Elements
const menuScreen = document.getElementById('menuScreen') as HTMLDivElement;
const deathScreen = document.getElementById('deathScreen') as HTMLDivElement;
const playerNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
const playButton = document.getElementById('playButton') as HTMLButtonElement;
const playAgainButton = document.getElementById('playAgainButton') as HTMLButtonElement;
const loadingOverlay = document.getElementById('loadingOverlay') as HTMLDivElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const mobileControls = document.getElementById('mobileControls') as HTMLDivElement;
const fullscreenBtn = document.getElementById('fullscreenBtn') as HTMLButtonElement;
const finalScore = document.getElementById('finalScore') as HTMLSpanElement;
const finalLength = document.getElementById('finalLength') as HTMLSpanElement;
const leaderboardToggle = document.getElementById('leaderboardToggle') as HTMLButtonElement;
const leaderboard = document.getElementById('leaderboard') as HTMLDivElement;

if (leaderboardToggle && leaderboard) {
  leaderboardToggle.addEventListener('click', () => {
    leaderboard.classList.toggle('collapsed');
    leaderboardToggle.textContent = leaderboard.classList.contains('collapsed') ? '◀' : '▼';
  });
}

// Initialize game and skin selector
const game = new Game();
let skinSelector: SkinSelector | null = null;

// Server URL - use environment variable or default
const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;

// Check if mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Show mobile controls if needed
if (isMobile) {
  mobileControls.classList.remove('hidden');
}

// Initialize skin selector when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  skinSelector = new SkinSelector();
});

// Play button click
playButton.addEventListener('click', startGame);
playerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') startGame();
});

// Play again button - directly respawn
playAgainButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
  const skin = skinSelector?.getSkin();
  
  deathScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  
  game.respawn(playerName, skin);
});

// Fullscreen toggle
fullscreenBtn.addEventListener('click', toggleFullscreen);

async function startGame() {
  const playerName = playerNameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
  const skin = skinSelector?.getSkin();
  
  // Show loading
  loadingOverlay.classList.remove('hidden');
  menuScreen.classList.add('hidden');
  
  try {
    await game.connect(serverUrl);
    game.joinGame(playerName, skin);
    
    // Hide loading, show HUD
    loadingOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    
    // Start game loop
    game.start();
    
  } catch (error) {
    console.error('Failed to connect:', error);
    loadingOverlay.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    alert('Failed to connect to server. Please try again.');
  }
}

// Handle death event
game.onDeath = (score: number, length: number) => {
  hud.classList.add('hidden');
  deathScreen.classList.remove('hidden');
  finalScore.textContent = score.toString();
  finalLength.textContent = length.toString();
};

// Handle respawn
game.onRespawn = () => {
  deathScreen.classList.add('hidden');
  hud.classList.remove('hidden');
};

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.error);
    fullscreenBtn.textContent = '⛶';
  } else {
    document.exitFullscreen().catch(console.error);
    fullscreenBtn.textContent = '⛶';
  }
}

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

// Focus name input on load
window.addEventListener('load', () => {
  playerNameInput.focus();
});

// Handle visibility change (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.pause();
  } else {
    game.resume();
  }
});

// PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - that's okay
    });
  });
}

console.log('🐍 Snake.io Client initialized');
