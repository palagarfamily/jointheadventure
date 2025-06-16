// Auto dark mode detection
const landingInitTheme = () => {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    document.body.classList.add("dark");
  }

  // Listen for theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      document.body.classList.toggle("dark", e.matches);
    });
};

// Music functionality
const landingInitMusic = () => {
  const musicWave = document.getElementById("musicWave");
  const musicControl = document.querySelector(".music-control");
  const musicIcon = document.getElementById("music-icon");
  const bgMusic = document.getElementById("bg-music");
  let isPlaying = false;

  window.toggleMusic = () => {
    if (isPlaying) {
      bgMusic.pause();
      musicIcon.src = "assets/music-icon.svg";
      musicControl.classList.remove("playing");
      musicWave.classList.remove("playing");
    } else {
      // Load and play music
      bgMusic.load();
      bgMusic.play().catch((e) => {
        console.log("Audio play failed:", e);
      });
      musicIcon.src = "assets/music-on.svg";
      musicControl.classList.add("playing");
      musicWave.classList.add("playing");
    }
    isPlaying = !isPlaying;
  };
};

// Create music wave bars
const landingInitMusicWave = () => {
  const musicWaveContainer = document.getElementById("musicWave");
  const barCount = window.innerWidth < 768 ? 60 : 100; // Fewer bars on mobile

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.setProperty("--i", i);
    musicWaveContainer.appendChild(bar);
  }
};

// Initialize particles
const landingInitParticles = () => {
  const isMobile = window.innerWidth < 768;

  tsParticles.load("tsparticles", {
    background: {
      color: "transparent",
    },
    fpsLimit: isMobile ? 30 : 60, // Lower FPS on mobile for performance
    interactivity: {
      events: {
        onHover: {
          enable: !isMobile, // Disable hover on mobile
          mode: "repulse",
        },
      },
      modes: {
        repulse: {
          distance: isMobile ? 50 : 100,
          duration: 0.4,
        },
      },
    },
    particles: {
      number: {
        value: isMobile ? 40 : 80, // Fewer particles on mobile
      },
      color: { value: "#ff6b6b" },
      shape: {
        type: "char",
        character: {
          value: ["🏝️", "🚤", "🚶", "🎈", "✈️", "📸"],
          font: "Verdana",
          style: "",
          weight: "400",
        },
      },
      opacity: { value: 0.5 },
      size: {
        value: {
          min: isMobile ? 2 : 4,
          max: isMobile ? 4 : 8,
        },
      },
      move: {
        enable: true,
        speed: isMobile ? 0.5 : 1,
        direction: "none",
        outMode: "out",
      },
    },
  });
};

// Handle window resize
const landingHandleResize = () => {
  // Reinitialize particles on significant size changes
  const newIsMobile = window.innerWidth < 768;
  if (window.currentIsMobile !== newIsMobile) {
    window.currentIsMobile = newIsMobile;
    landingInitParticles();
  }
};

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  window.currentIsMobile = window.innerWidth < 768;

  landingInitTheme();
  landingInitMusic();
  landingInitMusicWave();
  landingInitParticles();

  // Add resize listener with throttling
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(landingHandleResize, 250);
  });
});

// Performance optimization: Pause particles when page is not visible
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pause animations when page is hidden
    document.body.style.animationPlayState = "paused";
  } else {
    // Resume animations when page is visible
    document.body.style.animationPlayState = "running";
  }
});
