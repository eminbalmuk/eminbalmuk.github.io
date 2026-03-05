(() => {
  const STORAGE_KEY = "site_language";

  const routes = {
    index: { en: "index.html", tr: "index-tr.html" },
    about: { en: "about.html", tr: "about-tr.html" },
    contact: { en: "contact.html", tr: "contact-tr.html" },
    interests: { en: "interests.html", tr: "interests-tr.html" }
  };

  const visuals = {
    en: {
      flag: "./images/flag-en.svg",
      code: "EN",
      aria: "Switch language to Turkish"
    },
    tr: {
      flag: "./images/flag-tr.svg",
      code: "TR",
      aria: "Dili Ingilizceye cevir"
    }
  };

  const getCurrentFile = () => {
    const path = window.location.pathname.split("?")[0].split("#")[0];
    const file = path.substring(path.lastIndexOf("/") + 1);
    return file || "index.html";
  };

  const findRoute = (fileName) => {
    for (const [pageKey, pair] of Object.entries(routes)) {
      if (pair.en === fileName) {
        return { pageKey, lang: "en" };
      }
      if (pair.tr === fileName) {
        return { pageKey, lang: "tr" };
      }
    }
    return null;
  };

  const setSavedLanguage = (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_err) {
      // ignore storage errors
    }
  };

  const getSavedLanguage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_err) {
      return null;
    }
  };

  const applyToggleVisual = (buttons, lang) => {
    const visual = visuals[lang];
    if (!visual) {
      return;
    }

    buttons.forEach((button) => {
      const flagNode = button.querySelector(".lang-flag");
      const codeNode = button.querySelector(".lang-code");

      if (flagNode) {
        flagNode.style.backgroundImage = `url('${visual.flag}')`;
      }

      if (codeNode) {
        codeNode.textContent = visual.code;
      } else {
        button.textContent = visual.code;
      }

      button.setAttribute("aria-label", visual.aria);
      button.setAttribute("title", visual.aria);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    const fileName = getCurrentFile();
    const current = findRoute(fileName);
    if (!current) {
      return;
    }

    const desired = getSavedLanguage();
    if ((desired === "en" || desired === "tr") && desired !== current.lang) {
      const targetFile = routes[current.pageKey][desired];
      if (targetFile) {
        window.location.replace(targetFile + window.location.hash);
        return;
      }
    }

    const buttons = Array.from(document.querySelectorAll(".lang-toggle"));
    if (buttons.length === 0) {
      return;
    }

    setSavedLanguage(current.lang);
    applyToggleVisual(buttons, current.lang);

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const next = current.lang === "tr" ? "en" : "tr";
        const target = routes[current.pageKey][next];
        if (!target) {
          return;
        }

        setSavedLanguage(next);
        window.location.href = target + window.location.hash;
      });
    });
  });
})();