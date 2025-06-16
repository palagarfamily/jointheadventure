// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

function preloadMedia(mediaArray) {
  const loaders = mediaArray.map((item) => {
    return new Promise((resolve) => {
      if (item.type === "image") {
        const img = new Image();
        img.src = item.src;
        img.onload = () => resolve();
        img.onerror = () => resolve(); // fail silently
      } else if (item.type === "video") {
        const video = document.createElement("video");
        video.src = item.src;
        video.preload = "auto";
        video.muted = true; // required for autoplay
        video.onloadeddata = () => resolve();
        video.onerror = () => resolve(); // fail silently
      } else {
        resolve(); // unknown type
      }
    });
  });

  return Promise.all(loaders);
}

const CONFIG = {
  totalCards: 12,
  wheelRadius: 35, // 35% of viewport (matching the basic implementation)
  media: [
    {
      type: "image",
      src: "./assets/carousel/1.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/2.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/3.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/4.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/5.JPG",
    },
    {
      type: "image",
      src: "./assets/carousel/6.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/7.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/8.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/9.jpg",
    },
    {
      type: "image",
      src: "./assets/carousel/10.JPG",
    },
    {
      type: "image",
      src: "./assets/carousel/11.jpeg",
    },
    {
      type: "image",
      src: "./assets/carousel/12.JPG",
    },
  ],
  animations: {
    initialDuration: 1,
    rotationDuration: 0.64,
    flipDuration: 0.64,
    transitionDuration: 1,
    circleTransitionDuration: 0.8,
  },
  autoplay: {
    enabled: true,
    patternDuration: 2000, // 2 seconds per pattern
    patterns: ["wave", "stagger", "grid", "depth"],
    fadeOutDuration: 2000, // 2 seconds fade out at the end
  },
};

// DOM Elements
const carouselItemsEl = document.querySelector(".carousel-items");
const carouselContainerEl = document.querySelector(".carousel-container");
const currentPatternEl = document.getElementById("currentPattern");
const progressFillEl = document.getElementById("progressFill");

// State variables
let currentAnimation = "circle";
let isTransitioning = false;
let activeAnimations = [];
let draggableInstance = null;
let originalZIndices = [];
let cardInitialAngles = [];

// Auto-play variables
let autoplayTimeline = null;
let currentPatternIndex = 0;
let progressInterval = null;
let patternStartTime = 0;

// Get viewport dimensions
const getViewportSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

// Get card dimensions
const getCardDimensions = () => {
  return {
    width: parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--card-width"
      )
    ),
    height: parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--card-height"
      )
    ),
  };
};

// Generate cards
function generateCards() {
  carouselItemsEl.innerHTML = "";
  for (let i = 1; i <= CONFIG.totalCards; i++) {
    const cardEl = document.createElement("div");
    cardEl.className = "carousel-item";
    // Format the number with leading zeros (001, 002, etc.)
    const formattedNumber = String(i).padStart(3, "0");
    const media = CONFIG.media[i % CONFIG.media.length]; // fallback loop

    if (media.type === "image") {
      cardEl.style.backgroundImage = `url(${media.src})`;
    } else if (media.type === "video") {
      const video = document.createElement("video");
      video.src = media.src;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.className = "carousel-video";
      video.setAttribute("muted", "");
      // Ensure it starts loading and playing ASAP
      video.addEventListener("loadeddata", () => {
        requestAnimationFrame(() => {
          video.play();
        });
      });
      cardEl.appendChild(video);
    }

    cardEl.innerHTML += `<div class="card__number">${formattedNumber}</div>`;
    carouselItemsEl.appendChild(cardEl);
    cardEl.style.zIndex = i + 1;
  }
  initializeZIndices();
}

// Initialize z-indices
function initializeZIndices() {
  const cards = gsap.utils.toArray(".carousel-item");
  originalZIndices = cards.map((card, index) => {
    // Higher index = higher z-index value = card appears on top
    const zIndex = 100 + (CONFIG.totalCards - index);
    gsap.set(card, {
      zIndex: zIndex,
    });
    return zIndex;
  });
}

// Kill active animations
function killActiveAnimations() {
  gsap.killTweensOf(".carousel-items");
  gsap.killTweensOf(".carousel-item");
  activeAnimations.forEach((animation) => {
    if (animation && animation.kill) {
      animation.kill();
    }
  });
  activeAnimations = [];
}

// Calculate circle positions
function setupCirclePositions(animated = true) {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewportSize = Math.min(window.innerWidth, window.innerHeight);
  const radius = viewportSize * (CONFIG.wheelRadius / 100);
  const totalAngle = 2 * Math.PI;
  const angleStep = totalAngle / CONFIG.totalCards;

  // Get current wheel rotation (if any)
  const currentWheelRotation =
    gsap.getProperty(".carousel-items", "rotation") || 0;
  const currentWheelRotationRad = currentWheelRotation * (Math.PI / 180);

  // Create a timeline for smooth transition
  const timeline = gsap.timeline();

  cards.forEach((card, i) => {
    const angle = i * angleStep + currentWheelRotationRad;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    if (animated) {
      // Animated transition to circle
      timeline.to(
        card,
        {
          x: x,
          y: y,
          rotation: -currentWheelRotation, // Keep cards upright relative to current wheel rotation
          scale: 0.8, // Consistent scale across patterns
          duration: CONFIG.animations.transitionDuration,
          ease: "power2.inOut",
        },
        0
      ); // Start all animations at the same time
    } else {
      // Immediate positioning (no animation)
      gsap.set(card, {
        x: x,
        y: y,
        rotation: -currentWheelRotation,
        scale: 0.8, // Consistent scale across patterns
      });
    }
  });

  return timeline;
}

// Calculate and store circle data
function calculateAndStoreCircleData() {
  const cards = gsap.utils.toArray(".carousel-item");
  const totalCards = cards.length;
  const degreePerCard = 360 / totalCards;
  const viewport = getViewportSize();
  const minDimension = Math.min(viewport.width, viewport.height);
  const radius = minDimension * (CONFIG.wheelRadius / 100);

  // Reset cardInitialAngles array
  cardInitialAngles = [];

  // Calculate and store initial angles
  cards.forEach((card, index) => {
    const angle = index * degreePerCard * (Math.PI / 180);
    cardInitialAngles[index] = angle;
  });
}

// Setup draggable for rotation with enhanced inertia
function setupDraggable(target = ".carousel-items") {
  // Don't setup draggable during autoplay
  if (CONFIG.autoplay.enabled) return;

  // Kill any existing draggable instance
  if (draggableInstance) {
    draggableInstance.kill();
    draggableInstance = null;
  }

  // Add draggable cursor class
  carouselItemsEl.classList.add("draggable");

  // Create draggable with enhanced inertia settings
  draggableInstance = Draggable.create(target, {
    type: "rotation",
    inertia: true,
    throwResistance: 0.3, // Lower value for more inertia (0.3 instead of 0.5)
    snap: function (endValue) {
      // Optional: snap to nearest multiple of X degrees
      // return Math.round(endValue / 15) * 15;
      return endValue; // No snapping for fluid motion
    },
    onDrag: updateCardRotations,
    onThrowUpdate: updateCardRotations,
    onThrowComplete: function () {
      console.log("Throw completed with velocity:", this.tween.data);
    },
  })[0];

  // Add additional inertia properties
  gsap.set(target, {
    overwrite: "auto",
  });
}

// Update card rotations to keep them facing forward
function updateCardRotations() {
  if (isTransitioning) return;

  const wheelRotation = this.rotation || 0;
  const cards = gsap.utils.toArray(".carousel-item");

  if (currentAnimation === "circle") {
    // For circle, keep cards upright
    cards.forEach((card) => {
      gsap.set(card, {
        rotation: -wheelRotation,
      });
    });
  } else if (currentAnimation === "fan") {
    // For fan, maintain the fan shape while rotating
    const viewport = getViewportSize();
    const maxFanAngle = Math.min(180, viewport.width / 5);
    const fanStartAngle = -maxFanAngle / 2;
    const fanEndAngle = maxFanAngle / 2;

    cards.forEach((card, index) => {
      const progress = index / (CONFIG.totalCards - 1);
      const fanAngle = fanStartAngle + progress * (fanEndAngle - fanStartAngle);
      // Apply fan angle + counter-rotation to maintain fan shape
      gsap.set(card, {
        rotation: fanAngle - wheelRotation,
      });
    });
  }
}

// Setup wave positions
function setupWavePositions() {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewport = getViewportSize();
  const cardWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-width")
  );
  const lineWidth = Math.min(
    viewport.width * 0.8,
    CONFIG.totalCards * cardWidth * 0.4
  );
  const cardSpacing = lineWidth / (CONFIG.totalCards - 1);
  const waveHeight = Math.min(viewport.height * 0.1, 80);

  // Create a timeline for smooth transition
  const timeline = gsap.timeline();

  cards.forEach((card, index) => {
    const xPos = (index - (CONFIG.totalCards - 1) / 2) * cardSpacing;
    const yPos =
      Math.sin((index / (CONFIG.totalCards - 1)) * Math.PI * 2) * waveHeight;

    // Animate from current position to wave position
    timeline.to(
      card,
      {
        x: xPos,
        y: yPos,
        rotation: 0,
        scale: 0.7,
        duration: CONFIG.animations.transitionDuration,
        ease: "power2.inOut",
      },
      0
    ); // Start all animations at the same time
  });

  return timeline;
}

// Start wave animation after transition
function startWaveAnimation() {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewport = getViewportSize();
  const waveHeight = Math.min(viewport.height * 0.1, 80);

  return gsap.to(cards, {
    y: (i) => {
      const normalizedIndex = i / (CONFIG.totalCards - 1);
      return Math.sin(normalizedIndex * Math.PI * 2 + Math.PI) * waveHeight;
    },
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

// Setup stagger positions
function setupStaggerPositions() {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewport = getViewportSize();
  const cardWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-width")
  );
  const cardHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-height")
  );
  const rows = 3;
  const cols = 4;
  const xSpacing = cardWidth * 0.7;
  const ySpacing = cardHeight * 0.7;

  // Create a timeline for smooth transition
  const timeline = gsap.timeline();

  cards.forEach((card, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const xOffset = row % 2 === 1 ? xSpacing / 2 : 0;
    const xPos = (col - (cols - 1) / 2) * xSpacing + xOffset;
    const yPos = (row - (rows - 1) / 2) * ySpacing;

    // Animate from current position to stagger position
    timeline.to(
      card,
      {
        x: xPos,
        y: yPos,
        rotation: 0,
        scale: 0.7,
        duration: CONFIG.animations.transitionDuration,
        ease: "power2.inOut",
      },
      0
    ); // Start all animations at the same time
  });

  return timeline;
}

// Setup stagger mouse tracking
function setupStaggerMouseTracking() {
  // Don't setup mouse tracking during autoplay
  if (CONFIG.autoplay.enabled) return;

  const viewport = getViewportSize();
  const cardWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-width")
  );
  const cardHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-height")
  );
  const rows = 3;
  const cols = 4;
  const xSpacing = cardWidth * 0.8;
  const ySpacing = cardHeight * 0.8;

  // Make a more subtle parallax effect with significantly reduced maxOffset
  const maxOffset = 40; // Reduced from 200 to 40 for a much more subtle effect

  carouselContainerEl.onmousemove = (e) => {
    if (currentAnimation !== "stagger" || isTransitioning) return;

    const mouseY = e.clientY / viewport.height;
    const offset = (mouseY - 0.5) * -maxOffset; // Removed multiplication by 2 for a gentler effect

    const cards = gsap.utils.toArray(".carousel-item");
    cards.forEach((card, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const xOffset = row % 2 === 1 ? xSpacing / 2 : 0;
      const xPos = (col - (cols - 1) / 2) * xSpacing + xOffset;
      const yPos = (row - (rows - 1) / 2) * ySpacing + offset;

      // Slower animation for smoother, more subtle movement
      gsap.to(card, {
        y: yPos,
        duration: 0.8, // Increased from 0.5 to 0.8 for smoother movement
        ease: "power2.out",
      });
    });
  };
}

// Setup grid positions
function setupGridPositions() {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewport = getViewportSize();
  const cardWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-width")
  );
  const cardHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--card-height")
  );
  const viewport_ratio = viewport.width / viewport.height;

  let rows, cols;
  if (viewport_ratio > 1) {
    rows = 3;
    cols = 4;
  } else {
    rows = 4;
    cols = 3;
  }

  const scale = Math.min(
    0.8,
    viewport.width / (cols * cardWidth * 1.2),
    viewport.height / (rows * cardHeight * 1.2)
  );

  const xSpacing = cardWidth * scale * 1.2;
  const ySpacing = cardHeight * scale * 1.2;

  // Create a timeline for smooth transition
  const timeline = gsap.timeline();

  cards.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const xPos = (col - (cols - 1) / 2) * xSpacing;
    const yPos = (row - (rows - 1) / 2) * ySpacing;

    // Animate from current position to grid position
    timeline.to(
      card,
      {
        x: xPos,
        y: yPos,
        rotation: 0,
        scale: scale,
        duration: CONFIG.animations.transitionDuration,
        ease: "power2.inOut",
      },
      0
    ); // Start all animations at the same time
  });

  return timeline;
}

// Setup fan positions
function setupFanPositions() {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewport = getViewportSize();
  const maxFanAngle = Math.min(180, viewport.width / 5);
  const fanStartAngle = -maxFanAngle / 2;
  const fanEndAngle = maxFanAngle / 2;

  // Create a timeline for smooth transition
  const timeline = gsap.timeline();

  cards.forEach((card, index) => {
    const progress = index / (CONFIG.totalCards - 1);
    const angle = fanStartAngle + progress * (fanEndAngle - fanStartAngle);
    const yOffset = Math.sin((progress - 0.5) * Math.PI) * 50;

    // Animate from current position to fan position
    timeline.to(
      card,
      {
        x: 0,
        y: yOffset,
        rotation: angle,
        scale: 0.8,
        duration: CONFIG.animations.transitionDuration,
        ease: "power2.inOut",
      },
      0
    ); // Start all animations at the same time
  });

  return timeline;
}

// Setup 3D depth positions
function setup3DDepthPositions() {
  const cards = gsap.utils.toArray(".carousel-item");
  const viewport = getViewportSize();
  // Positions for 3D depth effect - keeping the exact same values
  const positions = [
    // Front layer (closest to viewer)
    {
      x: -viewport.width * 0.25,
      y: -viewport.height * 0.2,
      z: -200,
      scale: 0.9,
      rotX: -5,
      rotY: 5,
    },
    {
      x: viewport.width * 0.25,
      y: -viewport.height * 0.25,
      z: -300,
      scale: 0.85,
      rotX: -3,
      rotY: -4,
    },
    {
      x: -viewport.width * 0.3,
      y: viewport.height * 0.2,
      z: -400,
      scale: 0.8,
      rotX: 4,
      rotY: 6,
    },
    {
      x: viewport.width * 0.3,
      y: viewport.height * 0.25,
      z: -500,
      scale: 0.75,
      rotX: 5,
      rotY: -5,
    },
    // Middle layer
    {
      x: 0,
      y: -viewport.height * 0.3,
      z: -700,
      scale: 0.7,
      rotX: -6,
      rotY: 0,
    },
    {
      x: -viewport.width * 0.35,
      y: 0,
      z: -800,
      scale: 0.65,
      rotX: 0,
      rotY: 7,
    },
    {
      x: viewport.width * 0.35,
      y: 0,
      z: -900,
      scale: 0.6,
      rotX: 0,
      rotY: -7,
    },
    {
      x: 0,
      y: viewport.height * 0.3,
      z: -1000,
      scale: 0.55,
      rotX: 6,
      rotY: 0,
    },
    // Back layer (furthest from viewer)
    {
      x: -viewport.width * 0.2,
      y: -viewport.height * 0.15,
      z: -1200,
      scale: 0.5,
      rotX: -3,
      rotY: 3,
    },
    {
      x: viewport.width * 0.2,
      y: -viewport.height * 0.15,
      z: -1300,
      scale: 0.45,
      rotX: -3,
      rotY: -3,
    },
    {
      x: -viewport.width * 0.2,
      y: viewport.height * 0.15,
      z: -1400,
      scale: 0.4,
      rotX: 3,
      rotY: 3,
    },
    {
      x: viewport.width * 0.2,
      y: viewport.height * 0.15,
      z: -1500,
      scale: 0.35,
      rotX: 3,
      rotY: -3,
    },
  ];
  // Create a timeline for smooth transition
  const timeline = gsap.timeline();
  cards.forEach((card, index) => {
    if (index >= positions.length) return;
    const pos = positions[index];
    // Update z-index based on depth
    const zIndex = 1000 - Math.round(Math.abs(pos.z));
    gsap.set(card, {
      zIndex: zIndex,
    });
    // Animate from current position to 3D position
    timeline.to(
      card,
      {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotationX: pos.rotX,
        rotationY: pos.rotY,
        scale: pos.scale,
        duration: CONFIG.animations.transitionDuration,
        ease: "power2.inOut",
      },
      0
    ); // Start all animations at the same time
  });
  return timeline;
}

// Setup 3D depth mouse tracking
function setup3DDepthMouseTracking() {
  const viewport = getViewportSize();
  carouselContainerEl.onmousemove = (e) => {
    if (currentAnimation !== "depth" || isTransitioning) return;
    const mouseX = e.clientX / viewport.width - 0.5;
    const mouseY = e.clientY / viewport.height - 0.5;
    // Using the exact same values as in the original code
    gsap.to(".carousel-items", {
      rotationY: mouseX * 3,
      rotationX: -mouseY * 3,
      duration: 1.2, // Slower response for smoother effect
      ease: "power1.out",
    });
  };
}

// Update z-indices for different patterns
function updateZIndices(pattern) {
  const cards = gsap.utils.toArray(".carousel-item");
  if (pattern === "depth") {
    // For 3D depth, z-index is based on z position
    const positions = setup3DDepthPositions();
    cards.forEach((card, index) => {
      if (index < CONFIG.totalCards) {
        const zIndex = 1000 - Math.round(Math.abs(positions[index]?.z || 0));
        gsap.set(card, {
          zIndex: zIndex,
        });
      }
    });
  } else {
    // For all other patterns, restore the original z-indices
    cards.forEach((card, index) => {
      if (index < originalZIndices.length) {
        gsap.set(card, {
          zIndex: originalZIndices[index],
        });
      }
    });
  }
}
// Transition to a different pattern
function transitionToPattern(newPattern) {
  if (isTransitioning) return;
  isTransitioning = true;
  // Kill active animations
  killActiveAnimations();
  // Save current wheel rotation before killing draggable
  const currentWheelRotation = draggableInstance
    ? draggableInstance.rotation
    : 0;
  // Kill draggable
  if (draggableInstance) {
    draggableInstance.kill();
    draggableInstance = null;
  }
  // Remove draggable cursor class
  carouselItemsEl.classList.remove("draggable");
  // Clear mouse tracking
  carouselContainerEl.onmousemove = null;
  // Save previous animation
  const prevAnimation = currentAnimation;
  // Update current animation
  currentAnimation = newPattern;
  // Create a master timeline for the transition
  const timeline = gsap.timeline({
    onComplete: () => {
      isTransitioning = false;
      // Setup additional features after transition
      if (newPattern === "circle") {
        setupDraggable();
      } else if (newPattern === "wave") {
        const waveAnim = startWaveAnimation();
        if (waveAnim) activeAnimations.push(waveAnim);
      } else if (newPattern === "stagger") {
        setupStaggerMouseTracking();
      } else if (newPattern === "fan") {
        // Add draggable to fan layout
        setupDraggable();
      } else if (newPattern === "depth") {
        setup3DDepthMouseTracking();
      }
    },
  });
  activeAnimations.push(timeline);
  // If coming from a pattern with rotation (like Fan), first reset all cards to normal orientation
  // This creates a cleaner transition, especially when going from Fan to 3D Depth
  if (prevAnimation === "fan") {
    const cards = gsap.utils.toArray(".carousel-item");
    const normalizeTimeline = gsap.timeline();
    cards.forEach((card) => {
      normalizeTimeline.to(
        card,
        {
          rotation: 0,
          rotationX: 0,
          rotationY: 0,
          duration: CONFIG.animations.transitionDuration / 2,
          ease: "power2.inOut",
        },
        0
      );
    });
    timeline.add(normalizeTimeline);
    // Add a small pause to let the cards normalize before transitioning
    timeline.to(
      {},
      {
        duration: 0.1,
      }
    );
  }
  // Handle pattern transition with master timeline
  let patternTimeline;
  // If we're coming from circle, keep the current wheel rotation
  // For other transitions, reset the wheel rotation
  if (newPattern !== "circle" && newPattern !== "fan") {
    // Reset carousel items (but keep current rotation if coming from circle)
    if (prevAnimation === "circle" || prevAnimation === "fan") {
      // Keep current rotation to start transition from
      timeline.set(".carousel-items", {
        rotationX: 0,
        rotationY: 0,
      });
    } else {
      // Coming from a non-circle pattern, reset rotation completely
      timeline.set(".carousel-items", {
        rotation: 0,
        rotationX: 0,
        rotationY: 0,
      });
    }
  }
  switch (newPattern) {
    case "circle":
      patternTimeline = setupCirclePositions(true);
      if (patternTimeline) timeline.add(patternTimeline, 0);
      break;
    case "wave":
      patternTimeline = setupWavePositions();
      if (patternTimeline) timeline.add(patternTimeline, 0);
      // Animate the wheel rotation to 0 if coming from circle or fan
      if (prevAnimation === "circle" || prevAnimation === "fan") {
        timeline.to(
          ".carousel-items",
          {
            rotation: 0,
            duration: CONFIG.animations.transitionDuration,
            ease: "power2.inOut",
          },
          0
        );
      }
      break;
    case "stagger":
      patternTimeline = setupStaggerPositions();
      if (patternTimeline) timeline.add(patternTimeline, 0);
      // Animate the wheel rotation to 0 if coming from circle or fan
      if (prevAnimation === "circle" || prevAnimation === "fan") {
        timeline.to(
          ".carousel-items",
          {
            rotation: 0,
            duration: CONFIG.animations.transitionDuration,
            ease: "power2.inOut",
          },
          0
        );
      }
      break;
    case "grid":
      patternTimeline = setupGridPositions();
      if (patternTimeline) timeline.add(patternTimeline, 0);
      // Animate the wheel rotation to 0 if coming from circle or fan
      if (prevAnimation === "circle" || prevAnimation === "fan") {
        timeline.to(
          ".carousel-items",
          {
            rotation: 0,
            duration: CONFIG.animations.transitionDuration,
            ease: "power2.inOut",
          },
          0
        );
      }
      break;
    case "fan":
      patternTimeline = setupFanPositions();
      if (patternTimeline) timeline.add(patternTimeline, 0);
      // Animate the wheel rotation to 0 if coming from circle
      if (prevAnimation === "circle") {
        timeline.to(
          ".carousel-items",
          {
            rotation: 0,
            duration: CONFIG.animations.transitionDuration,
            ease: "power2.inOut",
          },
          0
        );
      }
      break;
    case "depth":
      patternTimeline = setup3DDepthPositions();
      if (patternTimeline) timeline.add(patternTimeline, 0);
      // Animate the wheel rotation to 0 if coming from circle or fan
      if (prevAnimation === "circle" || prevAnimation === "fan") {
        timeline.to(
          ".carousel-items",
          {
            rotation: 0,
            duration: CONFIG.animations.transitionDuration,
            ease: "power2.inOut",
          },
          0
        );
      }
      break;
  }
}
// Initialize with a circle layout
function initializeCarousel() {
  const cards = gsap.utils.toArray(".carousel-item");
  const totalCards = cards.length;
  // Set initial opacity and scale
  gsap.set(cards, {
    x: 0,
    y: 0,
    rotation: 0,
    scale: 0,
    opacity: 0,
  });

  // Create timeline for intro animation
  const timeline = gsap.timeline({
    onComplete: () => {
      isTransitioning = false;
      setupDraggable();
    },
  });

  // Intro animation: cards appear stacked with last on top
  // Start with the last card (11) and end with the first card (0)
  for (let i = 0; i < totalCards; i++) {
    const card = cards[i];
    const delay = (totalCards - 1 - i) * 0.1; // Shorter delay per card
    // Set z-index in reverse order so last cards appear on top of first cards
    // Card 11 (last) gets highest z-index, Card 0 (first) gets lowest z-index
    gsap.set(card, {
      zIndex: 100 + (totalCards - 1 - i),
    });
    // Last card (11) appears first, first card (0) appears last
    timeline.to(
      card,
      {
        opacity: 1,
        scale: 0.8,
        duration: 0.5,
        ease: "power2.out",
      },
      delay
    );
  }
  // Add a pause before circle transition
  timeline.to(
    {},
    {
      duration: 0.3,
    }
  );
  // Transition to circle with animation
  const circleTimeline = setupCirclePositions(true);
  timeline.add(circleTimeline);
  // Set current animation and store timeline
  currentAnimation = "circle";
  activeAnimations.push(timeline);

  return timeline;
}

// Reset carousel
function resetCarousel() {
  killActiveAnimations();
  if (draggableInstance) {
    draggableInstance.kill();
    draggableInstance = null;
  }
  carouselContainerEl.onmousemove = null;
  gsap.set(".carousel-items", {
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
  });

  currentAnimation = "circle";
  isTransitioning = false;
}
// Handle resize
function handleResize() {
  if (!isTransitioning) {
    transitionToPattern(currentAnimation);
  }
}
// Auto-play functions
function startAutoplay() {
  if (!CONFIG.autoplay.enabled) return;

  const patterns = CONFIG.autoplay.patterns;
  const patternDuration = CONFIG.autoplay.patternDuration;

  function playNextPattern() {
    if (currentPatternIndex >= patterns.length) {
      // All patterns shown, start fade out
      startFadeOut();
      return;
    }

    const pattern = patterns[currentPatternIndex];
    transitionToPattern(pattern);

    setTimeout(() => {
      currentPatternIndex++;
      playNextPattern();
    }, patternDuration);
  }

  // Start with first pattern
  playNextPattern();
}

function startFadeOut() {
  // Fade out all cards
  gsap.to(".carousel-item", {
    opacity: 0,
    scale: 3,
    duration: CONFIG.autoplay.fadeOutDuration / 1000,
    ease: "power2.inOut",
    stagger: 0.1,
    onComplete: () => {
      // Reset and restart
      currentPatternIndex = 0;
      resetCarousel();
      carouselContainerEl.classList.add("carousel-container-fade-out");
      carouselContainerEl.style.backgroundColor = "transparent";
    },
  });
}

// Initialize
preloadMedia(CONFIG.media).then(() => {
  // Hide loader
  document.getElementById("loader").style.display = "none";

  // Now generate cards and start carousel
  generateCards();

  if (CONFIG.autoplay.enabled) {
    const cards = gsap.utils.toArray(".carousel-item");
    gsap.set(cards, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 0.8,
      opacity: 1,
    });
    isTransitioning = false;
    startAutoplay();
  } else {
    initializeCarousel();
  }
});

// Add event listeners
window.addEventListener("resize", handleResize);
