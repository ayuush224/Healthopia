import {
  createComment,
  createPost,
  fetchBootstrap,
  togglePostAction,
  updateTracker
} from "./api.js";
import {
  applyTheme,
  refs,
  renderApp,
  setButtonBusy,
  setFeedLoading,
  showToast
} from "./render.js";

const state = {
  category: "all",
  community: "all",
  search: "",
  theme: localStorage.getItem("softHealthTheme") || "light",
  requestId: 0
};

function debounce(callback, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

async function loadFeed() {
  const requestId = ++state.requestId;
  setFeedLoading(true);

  try {
    const data = await fetchBootstrap({
      category: state.category,
      community: state.community,
      search: state.search
    });

    if (requestId !== state.requestId) {
      return;
    }

    renderApp(data, state);
  } catch (error) {
    showToast(error.message);
  } finally {
    if (requestId === state.requestId) {
      setFeedLoading(false);
    }
  }
}

async function handlePostSubmit(event) {
  event.preventDefault();
  const postButton = document.getElementById("postButton");

  setButtonBusy(postButton, true, { idle: "Post", busy: "Posting..." });

  try {
    await createPost({
      content: document.getElementById("postContent").value,
      communityId: document.getElementById("communitySelect").value,
      tags: document.getElementById("tagInput").value,
      tipTitle: document.getElementById("tipTitle").value,
      tipBody: document.getElementById("tipBody").value
    });

    event.currentTarget.reset();
    showToast("Your post is live.");
    await loadFeed();
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonBusy(postButton, false, { idle: "Post", busy: "Posting..." });
  }
}

async function handleTrackerSubmit(event) {
  event.preventDefault();
  const trackerButton = document.getElementById("trackerButton");

  setButtonBusy(trackerButton, true, { idle: "Save tracker", busy: "Saving..." });

  try {
    await updateTracker({
      dailyWaterLiters: refs.dailyWaterLiters.value,
      waterGoalLiters: refs.waterGoalLiters.value,
      dailySteps: refs.dailySteps.value
    });

    showToast("Tracker updated.");
    await loadFeed();
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonBusy(trackerButton, false, { idle: "Save tracker", busy: "Saving..." });
  }
}

async function handlePostAction(button) {
  const { action, postId } = button.dataset;
  if (!action || !postId) {
    return;
  }

  try {
    if (action === "comment") {
      button.closest(".post-card")?.querySelector(".comment-form input")?.focus();
      return;
    }

    await togglePostAction(postId, action);
    showToast(action === "share" ? "Post shared inside your activity." : "Post updated.");
    await loadFeed();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleCommentSubmit(form) {
  const input = form.querySelector("input[name='message']");
  const submitButton = form.querySelector("button");
  if (!input || !submitButton) {
    return;
  }

  setButtonBusy(submitButton, true, { idle: "Reply", busy: "Sending..." });

  try {
    await createComment(form.dataset.postId, input.value);
    input.value = "";
    showToast("Comment added.");
    await loadFeed();
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonBusy(submitButton, false, { idle: "Reply", busy: "Sending..." });
  }
}

function bindEvents() {
  refs.alertsButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18H5"></path>
      <path d="M18 14V11C18 7.69 15.31 5 12 5C8.69 5 6 7.69 6 11V14L4 18H20L18 14Z"></path>
      <path d="M10 20C10.4 21.2 11.17 22 12 22C12.83 22 13.6 21.2 14 20"></path>
    </svg>
  `;
  refs.themeButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.79A9 9 0 0 1 11.21 3A7 7 0 1 0 21 12.79Z"></path>
    </svg>
  `;

  applyTheme(state.theme);

  refs.alertsButton.addEventListener("click", () => showToast("You have 2 new community nudges."));

  refs.themeButton.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme(state.theme);
  });

  document.getElementById("searchForm").addEventListener("submit", (event) => event.preventDefault());
  document.getElementById("searchInput").addEventListener(
    "input",
    debounce(async (event) => {
      state.search = event.target.value.trim();
      await loadFeed();
    }, 250)
  );

  refs.categoryTabs.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }

    state.category = button.dataset.category;
    await loadFeed();
  });

  refs.circleList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-community]");
    if (!button) {
      return;
    }

    state.community = button.dataset.community;
    await loadFeed();
  });

  document.querySelector(".sidebar-nav").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-community]");
    if (button) {
      state.community = button.dataset.community;
      await loadFeed();
      return;
    }

    const panelButton = event.target.closest("[data-panel]");
    if (panelButton) {
      showToast(`${panelButton.textContent.trim()} is ready for the next backend phase.`);
    }
  });

  document.getElementById("composerForm").addEventListener("submit", handlePostSubmit);
  document.getElementById("trackerForm").addEventListener("submit", handleTrackerSubmit);

  refs.postsFeed.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (button) {
      await handlePostAction(button);
    }
  });

  refs.postsFeed.addEventListener("submit", async (event) => {
    const form = event.target.closest(".comment-form");
    if (!form) {
      return;
    }

    event.preventDefault();
    await handleCommentSubmit(form);
  });

  refs.trendingList.addEventListener("click", (event) => {
    const joinButton = event.target.closest(".join-button");
    if (joinButton) {
      showToast(`You are following ${joinButton.dataset.communityName}.`);
    }
  });

  document.getElementById("mobileComposeButton").addEventListener("click", () => {
    document.getElementById("postContent").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

async function init() {
  bindEvents();
  await loadFeed();
}

init();
