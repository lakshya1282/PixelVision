document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;

  if (window.Lenis) {
    lenis = new Lenis({
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 0.4,
      touchMultiplier: 0.6,
      duration: 3.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  function refreshScrollLayout() {
    if (lenis && typeof lenis.resize === "function") {
      lenis.resize();
    }
    ScrollTrigger.refresh();
  }

  const reelItems = document.querySelectorAll(".reel-item");
  const track = document.querySelector(".wave-track");
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");
  const reelVideos = Array.from(
    document.querySelectorAll(".reel-video-wrapper video"),
  );
  const brCaseStudyBtn = document.querySelector(".br-case-study-btn");
  const introOverlay = document.querySelector(".intro-overlay");
  const introScriptTitle = document.querySelector(".intro-script-title");
  const heroTitle = document.querySelector(".hero-title");
  const REEL_PLAY_THRESHOLD = 0.5;

  // Control variables for rendering layout
  let state = {
    virtualActive: Math.floor(reelItems.length / 2),
    progress: 0,
    exitProgress: 0,
    menuOpen: false,
  };

  if (brCaseStudyBtn) {
    brCaseStudyBtn.textContent = "VIEW FULL CASE STUDY";
  }

  reelVideos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.removeAttribute("autoplay");
    video.preload = "metadata";
    video.pause();
    video.currentTime = 0;
  });

  function updateReelPlayback() {
    if (!reelVideos.length) return;

    const shouldPlay = state.progress >= REEL_PLAY_THRESHOLD;
    const activeIndex = Math.max(
      0,
      Math.min(reelVideos.length - 1, Math.round(state.virtualActive)),
    );

    reelVideos.forEach((video, index) => {
      const shouldVideoPlay = shouldPlay && index === activeIndex;
      if (shouldVideoPlay) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } else {
        if (!video.paused) video.pause();
        if (!shouldPlay) video.currentTime = 0;
      }
    });
  }

  const menuBtn = document.querySelector(".menu-btn");
  const menuOverlay = document.querySelector(".menu-overlay");
  const menuLinks = document.querySelectorAll(".menu-nav li");

  const menuTl = gsap.timeline({
    paused: true,
    defaults: { ease: "power3.inOut" },
  });

  menuTl
    .to(menuOverlay, {
      autoAlpha: 1,
      duration: 0.5,
    })
    .fromTo(
      menuLinks,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
      "-=0.2",
    );

  menuBtn.addEventListener("click", () => {
    state.menuOpen = !state.menuOpen;
    if (state.menuOpen) {
      menuBtn.textContent = "Close";
      menuTl.timeScale(1).play();
    } else {
      menuBtn.textContent = "Menu";
      menuTl.timeScale(1.5).reverse();
    }
  });

  function getScale(dist) {
    const scales = [1, 0.7, 0.45, 0.28, 0.18, 0.1, 0.1, 0.1, 0.1, 0.1];
    const lower = Math.floor(dist);
    const upper = Math.ceil(dist);
    const frac = dist - lower;
    return scales[lower] * (1 - frac) + (scales[upper] || 0.1) * frac;
  }

  function renderLayout() {
    if (!reelItems.length) return;

    const isMobile = window.innerWidth < 768;
    const maxW = isMobile ? 200 : 300;
    const maxH = isMobile ? 340 : 450;
    const gap = isMobile ? 10 : 20;

    const positions = [];
    const xOffsets = [];

    for (let i = 0; i < reelItems.length; i++) {
      const signedDist = i - state.virtualActive;
      const dist = Math.abs(signedDist);
      const centerWeight = Math.max(0, 1 - dist);

      const currentScale = getScale(dist);
      const wrapperW =
        maxW * currentScale +
        (maxW * 1.5 - maxW) * centerWeight * state.progress;
      const wrapperH =
        maxH * currentScale +
        (maxH * 1.5 - maxH) * centerWeight * state.progress;

      const targetScale = 0.6 + 0.6 * centerWeight;
      const itemScale = 1 + (targetScale - 1) * state.progress;

      const targetMaxScale = 1.2;
      const currentMaxScale = 1 + (targetMaxScale - 1) * state.progress;
      const currentCenterWrapperH = maxH + (maxH * 1.5 - maxH) * state.progress;
      const currentCenterTrueH = currentCenterWrapperH * currentMaxScale;
      const currentTrueH = wrapperH * itemScale;
      const itemY = (currentCenterTrueH - currentTrueH) / 2;

      const blurAmount = 8 * (1 - centerWeight) * state.progress;
      const opacityAmount = 1 + (0.4 + 0.6 * centerWeight - 1) * state.progress;
      const zIndex = 100 - Math.round(dist * 10);
      const trueW = wrapperW * itemScale;

      positions.push({
        wrapperW,
        wrapperH,
        itemScale,
        itemY,
        blurAmount,
        opacityAmount,
        trueW,
        zIndex,
      });

      if (i === 0) {
        xOffsets[0] = 0;
      } else {
        xOffsets[i] =
          xOffsets[i - 1] + positions[i - 1].trueW / 2 + gap + trueW / 2;
      }
    }

    const lowerIdx = Math.floor(state.virtualActive);
    const upperIdx = Math.ceil(state.virtualActive);
    const frac = state.virtualActive - lowerIdx;
    let activeX = xOffsets[lowerIdx];
    if (upperIdx < reelItems.length && upperIdx !== lowerIdx) {
      activeX = xOffsets[lowerIdx] * (1 - frac) + xOffsets[upperIdx] * frac;
    }

    reelItems.forEach((item, i) => {
      const p = positions[i];
      const x = xOffsets[i] - activeX;
      const wrapper = item.querySelector(".reel-video-wrapper");
      const activeIndex = Math.round(state.virtualActive);
      const nonMiddleExit = i === activeIndex ? 0 : state.exitProgress;
      const extraScaleOut = 1 - 0.45 * nonMiddleExit;
      const extraY = 120 * nonMiddleExit;
      const extraBlur = 6 * nonMiddleExit;
      const extraOpacity = 0.4 * nonMiddleExit;
      gsap.set(wrapper, { width: p.wrapperW, height: p.wrapperH });
      gsap.set(item, {
        x,
        y: p.itemY + extraY,
        scale: p.itemScale * extraScaleOut,
        filter: `blur(${p.blurAmount + extraBlur}px)`,
        opacity: Math.max(0, p.opacityAmount - extraOpacity),
        zIndex: p.zIndex,
      });
    });

    gsap.set(".video-overlay", {
      backgroundColor: `rgba(0,0,0,${0.2 + 0.75 * state.progress})`,
    });
    gsap.set(".bottom-reels", {
      y: -window.innerHeight * 0.28 * state.progress,
    });

    const uiAlpha = Math.max(
      0,
      (state.progress - REEL_PLAY_THRESHOLD) / (1 - REEL_PLAY_THRESHOLD),
    );
    gsap.set(".bottom-right-details", {
      opacity: uiAlpha,
      y: 20 * (1 - uiAlpha),
    });
    gsap.set(".slider-controls", { opacity: uiAlpha });

    updateReelPlayback();
  }

  gsap.set(track, {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  reelItems.forEach((item) => {
    gsap.set(item, {
      position: "absolute",
      top: "50%",
      left: "50%",
      xPercent: -50,
      yPercent: -50,
    });
    const wrapper = item.querySelector(".reel-video-wrapper");
    item.addEventListener("mouseenter", () => {
      gsap.to(wrapper, {
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
    item.addEventListener("mouseleave", () => {
      gsap.to(wrapper, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  });

  renderLayout();
  window.addEventListener("resize", renderLayout);

  function initScrollAndControls() {
    gsap.to(".hero-title", {
      immediateRender: false,
      scrollTrigger: {
        trigger: ".intro-section",
        start: "top 82%",
        end: "top -18%",
        scrub: 2.2,
        invalidateOnRefresh: true,
      },
      x: () => {
        const target = document.querySelector(".logo").getBoundingClientRect();
        const source = document
          .querySelector(".hero-title")
          .getBoundingClientRect();
        const scale = target.height / source.height;
        return target.left - source.left - (source.width * (1 - scale)) / 2;
      },
      y: () => {
        const target = document.querySelector(".logo").getBoundingClientRect();
        const source = document
          .querySelector(".hero-title")
          .getBoundingClientRect();
        return (
          target.top + target.height / 2 - (source.top + source.height / 2)
        );
      },
      scale: () => {
        const target = document.querySelector(".logo").getBoundingClientRect();
        const source = document
          .querySelector(".hero-title")
          .getBoundingClientRect();
        return (target.height / source.height) * 1.9;
      },
      ease: "power2.inOut",
    });

    gsap.to(".logo", {
      immediateRender: false,
      scrollTrigger: {
        trigger: ".intro-section",
        start: "top 82%",
        end: "top -18%",
        scrub: 2.2,
      },
      opacity: 0,
      ease: "power2.inOut",
    });

    gsap.to(".section-header", {
      yPercent: -18,
      ease: "none",
      scrollTrigger: {
        trigger: ".intro-section",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    gsap.to(".intro-heading", {
      yPercent: 14,
      ease: "none",
      scrollTrigger: {
        trigger: ".intro-section",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    if (reelItems.length) {
      gsap.to(state, {
        progress: 1,
        scrollTrigger: {
          trigger: ".hero-fullscreen",
          start: "top top",
          end: "+=1500",
          scrub: true,
          pin: true,
          onUpdate: renderLayout,
        },
      });

      gsap.to(state, {
        exitProgress: 1,
        scrollTrigger: {
          trigger: ".intro-section",
          start: "top bottom",
          end: "top 20%",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: renderLayout,
        },
      });

      function updateDetails(index) {
        const descH3 = reelItems[index].querySelector(
          ".reel-description h3",
        ).innerText;
        document.querySelector(".br-title").innerText = descH3;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === reelItems.length - 1;
      }

      updateDetails(state.virtualActive);

      prevBtn.addEventListener("click", () => {
        const target = Math.max(0, Math.round(state.virtualActive) - 1);
        gsap.to(state, {
          virtualActive: target,
          duration: 0.5,
          ease: "power2.out",
          onUpdate: renderLayout,
        });
        updateDetails(target);
      });

      nextBtn.addEventListener("click", () => {
        const target = Math.min(
          reelItems.length - 1,
          Math.round(state.virtualActive) + 1,
        );
        gsap.to(state, {
          virtualActive: target,
          duration: 0.5,
          ease: "power2.out",
          onUpdate: renderLayout,
        });
        updateDetails(target);
      });
    }

    const expertiseSection = document.getElementById("expertise");
    if (expertiseSection) {
      gsap.to(".expertise-title-bg", {
        yPercent: -15,
        ease: "none",
        scrollTrigger: {
          trigger: expertiseSection,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: expertiseSection,
          start: "top top",
          end: "+=400%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Keep the cube block fixed-size; scale all backgrounds continuously as one flow.
      gsap.set(".exp-bg", { scale: 0.7, transformOrigin: "center center" });

      tl.to(".expertise-cube", {
        rotateX: -90,
        duration: 1,
        ease: "power2.inOut",
      });
      tl.to(
        ".exp-bg-1",
        { opacity: 0, duration: 1, ease: "power2.inOut" },
        "<",
      );
      tl.to(
        ".exp-bg-2",
        { opacity: 1, duration: 1, ease: "power2.inOut" },
        "<",
      );
      tl.to(
        ".exp-dot-1",
        { height: "4px", backgroundColor: "#fff", duration: 0.5 },
        "<",
      );
      tl.to(
        ".exp-dot-2",
        { height: "24px", backgroundColor: "#ff6b35", duration: 0.5 },
        "<",
      );

      tl.to(".expertise-cube", {
        rotateX: -180,
        duration: 1,
        ease: "power2.inOut",
      });
      tl.to(
        ".exp-bg-2",
        { opacity: 0, duration: 1, ease: "power2.inOut" },
        "<",
      );
      tl.to(
        ".exp-bg-3",
        { opacity: 1, duration: 1, ease: "power2.inOut" },
        "<",
      );
      tl.to(
        ".exp-dot-2",
        { height: "4px", backgroundColor: "#fff", duration: 0.5 },
        "<",
      );
      tl.to(
        ".exp-dot-3",
        { height: "24px", backgroundColor: "#ff6b35", duration: 0.5 },
        "<",
      );

      tl.to(".expertise-cube", {
        rotateX: -270,
        duration: 1,
        ease: "power2.inOut",
      });
      tl.to(
        ".exp-bg-3",
        { opacity: 0, duration: 1, ease: "power2.inOut" },
        "<",
      );
      tl.to(
        ".exp-bg-4",
        { opacity: 1, duration: 1, ease: "power2.inOut" },
        "<",
      );
      tl.to(
        ".exp-dot-3",
        { height: "4px", backgroundColor: "#fff", duration: 0.5 },
        "<",
      );
      tl.to(
        ".exp-dot-4",
        { height: "24px", backgroundColor: "#ff6b35", duration: 0.5 },
        "<",
      );
      tl.to(
        ".exp-bg",
        { scale: 1.1, duration: tl.duration(), ease: "none" },
        0,
      );

      // Final handoff phase: zoom out full expertise section before services appears.
      tl.to(expertiseSection, {
        scale: 0.82,
        y: -120,
        opacity: 0.88,
        transformOrigin: "center center",
        duration: 1.2,
        ease: "power1.inOut",
      });
    }

    ScrollTrigger.refresh();
  }

  setTimeout(initScrollAndControls, 500);
  window.addEventListener("load", refreshScrollLayout);
  setTimeout(refreshScrollLayout, 1200);

  function prepareIntroLetters() {
    if (!introScriptTitle) return [];

    const alreadyPrepared = introScriptTitle.querySelectorAll(
      ".intro-script-letter",
    );
    if (alreadyPrepared.length) return Array.from(alreadyPrepared);

    const childNodes = Array.from(introScriptTitle.childNodes);
    introScriptTitle.innerHTML = "";

    const letters = [];
    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        Array.from(node.textContent).forEach((char) => {
          const span = document.createElement("span");
          span.className = "intro-script-letter";
          span.innerHTML = char === " " ? "&nbsp;" : char;
          introScriptTitle.appendChild(span);
          letters.push(span);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        introScriptTitle.appendChild(node.cloneNode(true));
      }
    });

    return letters;
  }

  function runIntroSequence() {
    if (!introOverlay || !introScriptTitle || !heroTitle) return;

    const introLetters = prepareIntroLetters();

    document.body.classList.add("intro-lock");
    gsap.set(heroTitle, { opacity: 0, x: 0, y: 0, scale: 1 });
    gsap.set(".bg-video", { opacity: 0 });
    gsap.set(".bottom-reels", { opacity: 0 });
    gsap.set(introLetters, { opacity: 0 });

    let shiftX = 0;
    let shiftY = 0;
    let scaleFactor = 1;

    const calcHeroShift = () => {
      const source = introScriptTitle.getBoundingClientRect();
      const target = heroTitle.getBoundingClientRect();

      const sourceCenterX = source.left + source.width / 2;
      const sourceCenterY = source.top + source.height / 2;
      const targetCenterX = target.left + target.width / 2;
      const targetCenterY = target.top + target.height / 2;

      shiftX = targetCenterX - sourceCenterX;
      shiftY = targetCenterY - sourceCenterY;
      scaleFactor = target.height / source.height;
    };

    const introTl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        document.body.classList.remove("intro-lock");
        gsap.set(introOverlay, { display: "none" });
        requestAnimationFrame(() => {
          requestAnimationFrame(refreshScrollLayout);
        });
      },
    });

    introTl
      .to(introLetters, {
        opacity: 1,
        duration: 0.2,
        stagger: 0.18,
        ease: "none",
      })
      .to({}, { duration: 0.15 })
      .add(calcHeroShift)
      .to(introScriptTitle, {
        x: () => shiftX,
        y: () => shiftY,
        scale: () => scaleFactor,
        duration: 1.1,
        ease: "power3.inOut",
      })
      .set(heroTitle, { opacity: 1 })
      .to(introOverlay, { autoAlpha: 0, duration: 0.25 })
      .to(".bg-video", { opacity: 1, duration: 1.6, ease: "power1.out" })
      .to(
        ".bottom-reels",
        { opacity: 1, duration: 1.2, ease: "power2.out" },
        "<",
      );
  }

  runIntroSequence();

  const trailImages = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    "https://images.unsplash.com/photo-1604871000636-074fa5117945?w=800&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
    "https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=800&q=80",
    "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=800&q=80",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80",
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=80",
  ];
  if (window.initImageTrail) {
    window.initImageTrail(".intro-section", trailImages, 4);
  }

  // --- Scrollytelling Modal Logic ---
  const storyModal = document.getElementById("storyModal");
  const instaLightbox = document.getElementById("instaLightbox");
  const modalHeroImage = document.getElementById("modalHeroImage");
  const modalCategory = document.getElementById("modalCategory");
  const modalTitle = document.getElementById("modalTitle");
  const modalInstaImage = document.getElementById("modalInstaImage");
  const lightboxImage = document.getElementById("lightboxImage");

  const storyData = {
    storytelling: {
      title: "THE ART OF LIGHT",
      category: "/ STORYTELLING",
      img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&q=80",
    },
    creativity: {
      title: "FROM VISION TO REALITY",
      category: "/ CREATIVITY",
      img: "https://images.unsplash.com/photo-1549471013-3364d7220b75?w=1600&q=80",
    },
    planning: {
      title: "THE BEAUTY OF MINIMAL",
      category: "/ PLANNING",
      img: "https://images.unsplash.com/photo-1560087754-080ed712ccbb?w=1600&q=80",
    },
    fashion: {
      title: "URBAN ELEGANCE",
      category: "/ FASHION",
      img: "https://images.unsplash.com/photo-1509631179647-0c115ba39bf0?w=1600&q=80",
    },
  };

  window.openStoryModal = function (id) {
    const data = storyData[id];
    if (!data) return;

    modalTitle.innerText = data.title;
    modalCategory.innerText = data.category;
    modalHeroImage.src = data.img;
    modalInstaImage.src = data.img;

    storyModal.classList.add("active");
    document.body.style.overflow = "hidden";
    if (typeof lenis !== "undefined" && lenis) lenis.stop();
  };

  window.closeStoryModal = function () {
    storyModal.classList.remove("active");
    document.body.style.overflow = "";
    if (typeof lenis !== "undefined" && lenis) lenis.start();
  };

  window.openInstaModal = function (src) {
    lightboxImage.src = src;
    instaLightbox.classList.add("active");
  };

  window.closeInstaModal = function () {
    instaLightbox.classList.remove("active");
  };

  // --- Scroll to Top Logic ---
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
      }
    });

    scrollTopBtn.addEventListener("click", () => {
      if (typeof lenis !== "undefined" && lenis) {
        lenis.scrollTo(0, { duration: 1.5 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
});
