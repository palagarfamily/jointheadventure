// Auto dark mode based on system preference
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark');
}

// Music toggle
const musicWave = document.querySelector('.music-wave');
const musicControl = document.querySelector('.music-control');
const musicIcon = document.getElementById('music-icon');
const bgMusic = document.getElementById('bg-music');
let isPlaying = false;

function toggleMusic() {
  if (isPlaying) {
    bgMusic.pause();
    musicIcon.src = 'assets/music-off.svg';
    musicControl.classList.remove('playing');
    musicWave.classList.remove('playing');
  } else {
    bgMusic.muted = false;
    bgMusic.play();
    musicIcon.src = 'assets/music-on.svg';
    musicControl.classList.add('playing');
    musicWave.classList.add('playing');
  }
  isPlaying = !isPlaying;
}