(() => {
  if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
    import("https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js").catch(() => {});
  }

  const STORAGE_THEME_KEY = "color-scheme";
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const docLang = (document.documentElement.lang || "en").toLowerCase();
  const isTurkish = docLang.startsWith("tr");

  /* --------------------------------------------------------------------------
   * 1. Responsive Header (ResizeObserver is-wide + Popover navigation)
   * ------------------------------------------------------------------------ */
  const header = document.querySelector(".site-header");
  const headerInner = header ? header.querySelector(".header-inner") : null;
  const menuButton = header ? header.querySelector(".menu-button") : null;
  const siteMenu = header ? header.querySelector(".site-menu") : null;

  if (header && headerInner && menuButton && siteMenu) {
    let wasWide = false;
    let lastWidth = 0;

    const syncHeaderLayout = (forceMeasure = false) => {
      const currentWidth = header.getBoundingClientRect().width;
      if (!forceMeasure && !wasWide && currentWidth <= lastWidth) {
        return;
      }
      lastWidth = currentWidth;

      const wasOpen =
        !wasWide &&
        (siteMenu.matches(":popover-open") || siteMenu.classList.contains(":popover-open"));

      header.classList.add("is-measuring", "is-wide");
      siteMenu.removeAttribute("popover");

      const fitsInline = headerInner.scrollWidth <= headerInner.clientWidth + 1;

      if (fitsInline) {
        wasWide = true;
      } else {
        wasWide = false;
        header.classList.remove("is-wide");
        siteMenu.setAttribute("popover", "auto");
        if (wasOpen && typeof siteMenu.showPopover === "function") {
          try {
            siteMenu.showPopover();
          } catch (_err) {
            // ignore if polyfill not ready yet
          }
        }
      }

      requestAnimationFrame(() => {
        header.classList.remove("is-measuring");
      });
    };

    syncHeaderLayout(true);

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        syncHeaderLayout(wasWide);
      });
      ro.observe(header);
      ro.observe(siteMenu);
    } else {
      window.addEventListener("resize", () => syncHeaderLayout(true), { passive: true });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => syncHeaderLayout(true));
    }

    siteMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (!wasWide && typeof siteMenu.hidePopover === "function") {
          try {
            if (siteMenu.matches(":popover-open") || siteMenu.classList.contains(":popover-open")) {
              siteMenu.hidePopover();
            }
          } catch (_err) {
            // ignore
          }
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
   * 2. Header Scroll Elevation & Back-to-Top
   * ------------------------------------------------------------------------ */
  const toTopButton = document.querySelector(".to-top");

  const onScrollUI = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 12);
    }
    if (toTopButton) {
      toTopButton.classList.toggle("visible", y > 420);
    }
  };

  window.addEventListener("scroll", onScrollUI, { passive: true });
  onScrollUI();

  if (toTopButton) {
    toTopButton.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: reducedMotionQuery.matches ? "auto" : "smooth"
      });
    });
  }

  /* --------------------------------------------------------------------------
   * 3. Theme Toggle (Two-state override over system preference)
   * ------------------------------------------------------------------------ */
  const themeMeta = document.querySelector('meta[name="color-scheme"]');
  const themeToggle = document.querySelector(".theme-toggle");

  const getStoredScheme = () => {
    try {
      const val = localStorage.getItem(STORAGE_THEME_KEY);
      return val === "light" || val === "dark" ? val : null;
    } catch (_err) {
      return null;
    }
  };

  const getRenderedScheme = () => {
    const stored = getStoredScheme();
    if (stored) {
      return stored;
    }
    return darkSchemeQuery.matches ? "dark" : "light";
  };

  const applyThemeMeta = (schemeOrAuto) => {
    if (themeMeta) {
      themeMeta.setAttribute("content", schemeOrAuto || "light dark");
    }
    if (themeToggle) {
      const current = getRenderedScheme();
      const label = isTurkish
        ? current === "dark"
          ? "Açık temaya geç"
          : "Koyu temaya geç"
        : current === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme";
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("title", label);
    }
  };

  applyThemeMeta(getStoredScheme() || "light dark");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = getRenderedScheme();
      const target = current === "dark" ? "light" : "dark";
      const systemScheme = darkSchemeQuery.matches ? "dark" : "light";

      try {
        if (target !== systemScheme) {
          localStorage.setItem(STORAGE_THEME_KEY, target);
        } else {
          localStorage.removeItem(STORAGE_THEME_KEY);
        }
      } catch (_err) {
        // ignore storage restrictions
      }

      applyThemeMeta(target !== systemScheme ? target : "light dark");
    });

    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_THEME_KEY) {
        const next = event.newValue === "light" || event.newValue === "dark" ? event.newValue : "light dark";
        applyThemeMeta(next);
      }
    });

    darkSchemeQuery.addEventListener("change", () => {
      if (!getStoredScheme()) {
        applyThemeMeta("light dark");
      }
    });
  }

  /* --------------------------------------------------------------------------
   * 4. Scroll Progress Fallback (when CSS scroll() timeline unsupported)
   * ------------------------------------------------------------------------ */
  const scrollProgressEl = document.querySelector(".scroll-progress");
  if (scrollProgressEl && !CSS.supports("animation-timeline", "scroll()")) {
    let ticking = false;
    const updateProgress = () => {
      ticking = false;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      document.documentElement.style.setProperty("--scroll-progress", ratio.toFixed(4));
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateProgress);
        }
      },
      { passive: true }
    );
    updateProgress();
  }

  /* --------------------------------------------------------------------------
   * 5. Anchor links use native hash navigation; mobile menu auto-closes in #1.
   * ------------------------------------------------------------------------ */

  /* --------------------------------------------------------------------------
   * 6. Experience Timeline Progress & Active Node
   * ------------------------------------------------------------------------ */
  const timelines = document.querySelectorAll(".timeline");
  if (timelines.length > 0) {
    let timelineRaf = false;

    const updateTimelines = () => {
      timelineRaf = false;
      const viewportAnchor = window.innerHeight * 0.42;

      timelines.forEach((timeline) => {
        const rect = timeline.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0.12, (viewportAnchor - rect.top) / Math.max(1, rect.height)));
        timeline.style.setProperty("--timeline-progress", progress.toFixed(3));

        const cards = timeline.querySelectorAll(".role-card");
        cards.forEach((card) => {
          const cRect = card.getBoundingClientRect();
          const isActive = cRect.top <= viewportAnchor && cRect.bottom >= viewportAnchor * 0.55;
          card.classList.toggle("is-active-role", isActive);
        });
      });
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!timelineRaf) {
          timelineRaf = true;
          requestAnimationFrame(updateTimelines);
        }
      },
      { passive: true }
    );
    updateTimelines();
  }

  /* --------------------------------------------------------------------------
   * 7. Project Category Filter (with View Transitions API when supported)
   * ------------------------------------------------------------------------ */
  const filterBar = document.querySelector(".filter-bar");
  const projectGrid = document.querySelector("#projects .project-grid");

  if (filterBar && projectGrid) {
    const filterButtons = Array.from(filterBar.querySelectorAll(".filter-btn"));
    const projectCards = Array.from(projectGrid.querySelectorAll(".project-card"));
    const filterStatus = document.querySelector("#project-filter-status");

    projectCards.forEach((card, idx) => {
      card.style.setProperty("--vt-name", `project-card-${idx + 1}`);
    });

    const applyFilter = (category) => {
      let visibleCount = 0;

      projectCards.forEach((card) => {
        const tags = (card.dataset.tags || "").split(/\s+/).filter(Boolean);
        const matches = category === "all" || tags.includes(category);
        card.hidden = !matches;
        if (matches) {
          card.classList.add("is-visible");
          visibleCount += 1;
        }
      });

      filterButtons.forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.dataset.filter === category));
      });

      if (filterStatus) {
        filterStatus.textContent = isTurkish
          ? `${visibleCount} proje gösteriliyor.`
          : `Showing ${visibleCount} projects.`;
      }
    };

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.dataset.filter || "all";
        if (button.getAttribute("aria-pressed") === "true") {
          return;
        }

        if (
          typeof document.startViewTransition === "function" &&
          !reducedMotionQuery.matches
        ) {
          document.startViewTransition(() => applyFilter(category));
        } else {
          applyFilter(category);
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
   * 8. Subtle Pointer Sheen on Cards (fine pointer + motion ok)
   * ------------------------------------------------------------------------ */
  if (finePointerQuery.matches && !reducedMotionQuery.matches) {
    document.querySelectorAll(".project-card").forEach((card) => {
      let cardRaf = false;
      card.addEventListener("pointermove", (event) => {
        if (cardRaf) {
          return;
        }
        cardRaf = true;
        requestAnimationFrame(() => {
          cardRaf = false;
          const rect = card.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
          const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
          card.style.setProperty("--pointer-x", `${x.toFixed(1)}%`);
          card.style.setProperty("--pointer-y", `${y.toFixed(1)}%`);
        });
      });
    });
  }

  /* --------------------------------------------------------------------------
   * 9. Copy Email Micro-Interaction
   * ------------------------------------------------------------------------ */
  const liveAnnouncer = document.querySelector("#live-announcer");
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const defaultLabel = btn.textContent.trim();
    let timerId = null;

    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-copy");
      if (!value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
      } catch (_err) {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      const copiedLabel = isTurkish ? "Kopyalandı" : "Copied";
      btn.textContent = copiedLabel;
      btn.classList.add("is-copied");

      if (liveAnnouncer) {
        liveAnnouncer.textContent = isTurkish
          ? `${value} panoya kopyalandı.`
          : `${value} copied to clipboard.`;
      }

      clearTimeout(timerId);
      timerId = setTimeout(() => {
        btn.textContent = defaultLabel;
        btn.classList.remove("is-copied");
      }, 2000);
    });
  });

  /* --------------------------------------------------------------------------
   * 10. Reveal Animations (IntersectionObserver)
   * ------------------------------------------------------------------------ */
  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window && !reducedMotionQuery.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observerInstance) => {
        let batchIndex = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.style.transitionDelay = `${Math.min(batchIndex * 55, 220)}ms`;
          entry.target.classList.add("is-visible");
          observerInstance.unobserve(entry.target);
          batchIndex += 1;
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -4% 0px"
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* --------------------------------------------------------------------------
   * 11. Subtle Architectural Signal-Grid Canvas (Full-Page Background)
   * ------------------------------------------------------------------------ */
  const bgCanvas = document.querySelector(".bg-canvas");
  if (bgCanvas && bgCanvas.getContext) {
    const ctx = bgCanvas.getContext("2d");
    const STEP = 44;
    const MAX_PULSES = 10;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let activeCount = 6;
    let rafId = 0;
    let pointer = { x: -9999, y: -9999, active: false };

    const pulses = Array.from({ length: MAX_PULSES }, (_, idx) => ({
      col: idx * 3 + 2,
      row: idx * 2 + 2,
      dir: idx % 2 === 0 ? 1 : 0, // 0: horizontal, 1: vertical
      sign: idx % 3 === 0 ? -1 : 1,
      progress: Math.random(),
      speed: 0.011 + Math.random() * 0.009,
      amber: idx % 3 === 0
    }));

    const getCanvasColors = () => {
      const dark = getRenderedScheme() === "dark";
      return {
        crosshair: dark ? "rgba(148, 165, 184, 0.14)" : "rgba(15, 28, 46, 0.085)",
        accent: dark ? "rgba(45, 212, 191, " : "rgba(12, 114, 105, ",
        amber: dark ? "rgba(251, 146, 60, " : "rgba(217, 100, 18, "
      };
    };

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      bgCanvas.width = width * dpr;
      bgCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(4, Math.floor(width / STEP));
      rows = Math.max(4, Math.floor(height / STEP));
      activeCount = Math.max(6, Math.min(MAX_PULSES, Math.round((width * height) / 145000)));
      pulses.forEach((p) => {
        p.col = Math.max(1, Math.min(cols - 1, p.col));
        p.row = Math.max(1, Math.min(rows - 1, p.row));
      });
    };

    const drawFrame = (animate) => {
      ctx.clearRect(0, 0, width, height);
      const colors = getCanvasColors();

      // Subtle coordinate crosshairs aligned with the 44px background grid
      for (let c = 1; c < cols; c += 1) {
        for (let r = 1; r < rows; r += 1) {
          const x = c * STEP;
          const y = r * STEP;
          let boost = 0;

          if (pointer.active) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 155) {
              boost = (1 - dist / 155) * 0.3;
            }
          }

          ctx.strokeStyle =
            boost > 0.02 ? `${colors.accent}${(0.14 + boost).toFixed(2)})` : colors.crosshair;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + 3, y);
          ctx.moveTo(x, y - 3);
          ctx.lineTo(x, y + 3);
          ctx.stroke();
        }
      }

      // Quiet orthogonal signal traces traversing the grid
      for (let i = 0; i < activeCount; i += 1) {
        const p = pulses[i];
        if (animate) {
          p.progress += p.speed;
          if (p.progress >= 1) {
            p.progress = 0;
            if (p.dir === 0) {
              p.col = (p.col + p.sign + cols) % Math.max(2, cols - 1);
            } else {
              p.row = (p.row + p.sign + rows) % Math.max(2, rows - 1);
            }
            if (Math.random() < 0.45) {
              p.dir = p.dir === 0 ? 1 : 0;
              p.sign = Math.random() < 0.5 ? 1 : -1;
            }
            p.col = Math.max(1, Math.min(cols - 1, p.col));
            p.row = Math.max(1, Math.min(rows - 1, p.row));
          }
        }

        const startX = p.col * STEP;
        const startY = p.row * STEP;
        const dx = p.dir === 0 ? p.sign * STEP : 0;
        const dy = p.dir === 1 ? p.sign * STEP : 0;
        const headX = startX + dx * p.progress;
        const headY = startY + dy * p.progress;
        const tailProgress = Math.max(0, p.progress - 0.65);
        const tailX = startX + dx * tailProgress;
        const tailY = startY + dy * tailProgress;

        const baseColor = p.amber ? colors.amber : colors.accent;
        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, `${baseColor}0)`);
        grad.addColorStop(1, `${baseColor}0.38)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        ctx.fillStyle = `${baseColor}0.48)`;
        ctx.beginPath();
        ctx.arc(headX, headY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      if (document.hidden || reducedMotionQuery.matches) {
        rafId = 0;
        return;
      }
      drawFrame(true);
      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (reducedMotionQuery.matches) {
        drawFrame(false);
        return;
      }
      if (!rafId && !document.hidden) {
        rafId = requestAnimationFrame(tick);
      }
    };

    resizeCanvas();
    startLoop();

    window.addEventListener(
      "resize",
      () => {
        resizeCanvas();
        if (reducedMotionQuery.matches) {
          drawFrame(false);
        }
      },
      { passive: true }
    );

    if (finePointerQuery.matches) {
      window.addEventListener(
        "pointermove",
        (e) => {
          pointer = { x: e.clientX, y: e.clientY, active: true };
        },
        { passive: true }
      );
      document.addEventListener("pointerleave", () => {
        pointer.active = false;
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!document.hidden) {
        startLoop();
      }
    });

    reducedMotionQuery.addEventListener("change", () => {
      if (reducedMotionQuery.matches && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        drawFrame(false);
      } else {
        startLoop();
      }
    });

    if (themeMeta && "MutationObserver" in window) {
      new MutationObserver(() => {
        if (reducedMotionQuery.matches) {
          drawFrame(false);
        }
      }).observe(themeMeta, { attributes: true, attributeFilter: ["content"] });
    }
  }
})();
