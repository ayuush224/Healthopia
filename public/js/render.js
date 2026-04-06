const refs = {
  alertsButton: document.getElementById("alertsButton"),
  categoryTabs: document.getElementById("categoryTabs"),
  circleList: document.getElementById("circleList"),
  communitySelect: document.getElementById("communitySelect"),
  composerAvatar: document.getElementById("composerAvatar"),
  feedMeta: document.getElementById("feedMeta"),
  feedStatus: document.getElementById("feedStatus"),
  headerAvatar: document.getElementById("headerAvatar"),
  postsFeed: document.getElementById("postsFeed"),
  stepCount: document.getElementById("stepCount"),
  stepRingFill: document.getElementById("stepRingFill"),
  stepTrend: document.getElementById("stepTrend"),
  themeButton: document.getElementById("themeButton"),
  toast: document.getElementById("toast"),
  trendingList: document.getElementById("trendingList"),
  userStats: document.getElementById("userStats"),
  waterGoalLiters: document.getElementById("waterGoalLiters"),
  waterProgress: document.getElementById("waterProgress"),
  waterSummary: document.getElementById("waterSummary"),
  dailySteps: document.getElementById("dailySteps"),
  dailyWaterLiters: document.getElementById("dailyWaterLiters")
};

const icons = {
  heart: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20L5.8 13.8C4.3 12.3 4.3 9.9 5.8 8.4C7.3 6.9 9.7 6.9 11.2 8.4L12 9.2L12.8 8.4C14.3 6.9 16.7 6.9 18.2 8.4C19.7 9.9 19.7 12.3 18.2 13.8L12 20Z"></path>
    </svg>
  `,
  message: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15C21 16.1 20.1 17 19 17H6Z"></path>
    </svg>
  `,
  share: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 8L21 3"></path>
      <path d="M21 3H16"></path>
      <path d="M21 3V8"></path>
      <path d="M10 14L21 3"></path>
      <path d="M18 14V18C18 19.66 16.66 21 15 21H6C4.34 21 3 19.66 3 18V9C3 7.34 4.34 6 6 6H10"></path>
    </svg>
  `,
  bookmark: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3H18V21L12 17L6 21V3Z"></path>
    </svg>
  `
};

let toastTimer = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (typeof text === "string") {
    node.textContent = text;
  }
  return node;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0);
}

function formatRelativeTime(dateString) {
  const deltaMs = new Date(dateString).getTime() - Date.now();
  const minutes = Math.round(deltaMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  return formatter.format(Math.round(hours / 24), "day");
}

function getToneClass(tone) {
  return tone ? ` tone--${tone}` : "";
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("softHealthTheme", theme);
}

function setButtonBusy(button, busy, label) {
  button.disabled = busy;
  if (label) {
    button.textContent = busy ? label.busy : label.idle;
  }
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => refs.toast.classList.remove("is-visible"), 2200);
}

function setFeedLoading(loading) {
  refs.feedStatus.classList.toggle("is-loading", loading);
  refs.feedStatus.textContent = loading ? "" : refs.feedStatus.textContent;
}

function createCircleCopy(title, subtitle) {
  const copy = element("span", "circle-item__copy");
  copy.append(element("strong", "", title), element("span", "", subtitle));
  return copy;
}

function renderComposer(data) {
  const selectedCommunity = refs.communitySelect.value;
  const avatarClass = `avatar avatar--user${getToneClass(data.currentUser.tone)}`;
  refs.headerAvatar.className = avatarClass;
  refs.composerAvatar.className = avatarClass;
  refs.headerAvatar.textContent = data.currentUser.initials;
  refs.composerAvatar.textContent = data.currentUser.initials;

  refs.communitySelect.innerHTML = "";
  data.communities.forEach((community) => {
    const option = document.createElement("option");
    option.value = community.id;
    option.textContent = community.name;
    refs.communitySelect.appendChild(option);
  });

  if (selectedCommunity && data.communities.some((community) => community.id === selectedCommunity)) {
    refs.communitySelect.value = selectedCommunity;
  }
}

function renderCategories(data, state) {
  refs.categoryTabs.innerHTML = "";
  data.categories.forEach((category) => {
    const button = element(
      "button",
      `category-tab${state.category === category.id ? " category-tab--active" : ""}`,
      category.label
    );
    button.type = "button";
    button.dataset.category = category.id;
    refs.categoryTabs.appendChild(button);
  });
}

function renderCircles(data, state) {
  refs.circleList.innerHTML = "";

  const allButton = element(
    "button",
    `circle-item${state.community === "all" ? " circle-item--active" : ""}`
  );
  allButton.type = "button";
  allButton.dataset.community = "all";
  allButton.append(
    element("span", "circle-dot tone--forest"),
    createCircleCopy("All Communities", `${data.communities.length} active groups`)
  );
  refs.circleList.appendChild(allButton);

  data.communities.forEach((community) => {
    const button = element(
      "button",
      `circle-item${state.community === community.id ? " circle-item--active" : ""}`
    );
    button.type = "button";
    button.dataset.community = community.id;
    button.append(
      element("span", `circle-dot${getToneClass(community.tone)}`),
      createCircleCopy(community.name, community.membersLabel)
    );
    refs.circleList.appendChild(button);
  });

  document.querySelectorAll(".sidebar-nav .nav-link").forEach((button) => {
    button.classList.toggle("nav-link--active", button.dataset.community === "all" && state.community === "all");
  });
}

function renderFeedMeta(data, state) {
  const filters = [];

  if (state.community !== "all") {
    const community = data.communities.find((item) => item.id === state.community);
    if (community) {
      filters.push(community.name);
    }
  }

  if (state.category !== "all") {
    const category = data.categories.find((item) => item.id === state.category);
    if (category) {
      filters.push(category.label);
    }
  }

  if (state.search) {
    filters.push(`Search: "${state.search}"`);
  }

  refs.feedMeta.textContent = filters.length
    ? `${data.feedSummary.totalPosts} posts matched - ${filters.join(" - ")}`
    : `${data.feedSummary.totalPosts} posts in the sanctuary`;

  refs.feedStatus.textContent = "";
}

function renderTracker(tracker) {
  refs.dailyWaterLiters.value = tracker.dailyWaterLiters;
  refs.waterGoalLiters.value = tracker.waterGoalLiters;
  refs.dailySteps.value = tracker.dailySteps;
  refs.waterSummary.textContent = `${tracker.dailyWaterLiters.toFixed(1)} / ${tracker.waterGoalLiters.toFixed(1)} L`;
  refs.waterProgress.value = Math.min((tracker.dailyWaterLiters / tracker.waterGoalLiters) * 100, 100);
  refs.stepCount.textContent = tracker.dailySteps.toLocaleString("en-US");
  refs.stepTrend.textContent = `${tracker.stepTrendPercent >= 0 ? "+" : ""}${tracker.stepTrendPercent}% from yesterday`;

  const circumference = 289;
  const progress = Math.min(tracker.dailySteps / 10000, 1);
  refs.stepRingFill.setAttribute("stroke-dashoffset", `${circumference - circumference * progress}`);
}

function renderStats(user) {
  refs.userStats.innerHTML = "";
  [
    { label: "Posts", value: user.posts.toLocaleString("en-US") },
    { label: "Followers", value: formatCompactNumber(user.followers) },
    { label: "Streak", value: `${user.streak}` }
  ].forEach((stat) => {
    const pill = element("div", "stat-pill");
    pill.append(element("strong", "", stat.value), element("span", "", stat.label));
    refs.userStats.appendChild(pill);
  });
}

function renderTrending(items) {
  refs.trendingList.innerHTML = "";
  items.forEach((item) => {
    const row = element("div", "trending-item");
    const info = element("div", "trending-item__info");
    const icon = element("span", `trending-icon${getToneClass(item.tone)}`);
    const copy = element("div");
    const joinButton = element("button", "join-button", "Join");

    joinButton.type = "button";
    joinButton.dataset.communityName = item.name;
    copy.append(element("strong", "", item.name), element("span", "", item.label));
    info.append(icon, copy);
    row.append(info, joinButton);
    refs.trendingList.appendChild(row);
  });
}

function buildTip(tip) {
  const card = element("div", "tip-card");
  const icon = element("div", "tip-card__icon", "i");
  const copy = element("div");
  copy.append(element("h4", "", tip.title), element("p", "", tip.body));
  card.append(icon, copy);
  return card;
}

function buildMedia(theme) {
  const media = element("div", `post-media post-media--${theme}`);
  media.append(
    element("span", "post-media__label", theme === "trail" ? "TRAIL" : theme.toUpperCase()),
    element("div", "post-media__hill"),
    element("div", "post-media__palm")
  );
  return media;
}

function buildComment(comment) {
  const wrapper = element("div", "comment");
  const avatar = element("div", `avatar avatar--small${getToneClass(comment.authorTone)}`, comment.authorInitials);
  const body = element("div", "comment-body");
  const copy = element("div", "comment-copy");
  copy.append(element("strong", "", comment.authorName), element("p", "", comment.body));
  body.append(copy);
  wrapper.append(avatar, body);
  return wrapper;
}

function buildCommentForm(postId) {
  const form = element("form", "comment-form");
  const input = document.createElement("input");
  const button = element("button", "button button--secondary", "Reply");

  form.dataset.postId = postId;
  input.name = "message";
  input.type = "text";
  input.maxLength = 160;
  input.placeholder = "Add an encouraging note...";
  input.required = true;
  button.type = "submit";

  form.append(input, button);
  return form;
}

function buildActionButton(action, postId, icon, label, active = false) {
  const button = element("button", `action-button${active ? " is-active" : ""}`);
  button.type = "button";
  button.dataset.action = action;
  button.dataset.postId = postId;
  button.innerHTML = `${icon}<span>${label}</span>`;
  return button;
}

function buildPost(post) {
  const article = element("article", "card post-card");
  const header = element("div", "post-header");
  const identity = element("div", "post-header__identity");
  const avatar = element("div", `avatar avatar--small${getToneClass(post.authorTone)}`, post.authorInitials);
  const copy = element("div", "post-header__copy");
  const moreButton = element("button", "action-button", "...");
  const body = element("div", "post-body");
  const actionRow = element("div", "action-row");
  const actionGroup = element("div", "action-group");

  moreButton.type = "button";
  copy.append(
    element("strong", "", post.authorName),
    element("p", "meta-line", `${formatRelativeTime(post.createdAt)} | ${post.communityName}`)
  );

  identity.append(avatar, copy);
  header.append(identity, moreButton);
  body.append(element("p", "", post.content));

  if (post.tags?.length) {
    const tagRow = element("div", "tag-row");
    post.tags.forEach((tag) => tagRow.appendChild(element("span", "tag", tag)));
    body.appendChild(tagRow);
  }

  if (post.tip) {
    body.appendChild(buildTip(post.tip));
  }

  if (post.mediaTheme) {
    body.appendChild(buildMedia(post.mediaTheme));
  }

  actionGroup.append(
    buildActionButton("like", post.id, icons.heart, formatCompactNumber(post.likes), post.likedByCurrentUser),
    buildActionButton("comment", post.id, icons.message, `${post.commentsCount}`),
    buildActionButton("share", post.id, icons.share, `${post.shares}`)
  );

  actionRow.append(
    actionGroup,
    buildActionButton("bookmark", post.id, icons.bookmark, "Save", post.bookmarked)
  );

  body.appendChild(actionRow);

  if (post.comments?.length) {
    const stack = element("div", "comment-stack");
    post.comments.forEach((comment) => stack.appendChild(buildComment(comment)));
    body.appendChild(stack);
  }

  body.appendChild(buildCommentForm(post.id));
  article.append(header, body);
  return article;
}

function renderPosts(posts) {
  refs.postsFeed.innerHTML = "";
  if (!posts.length) {
    const empty = element("div", "card empty-state");
    empty.append(
      element("h3", "", "No posts matched this view"),
      element("p", "", "Try another community, remove a filter, or write the first post for this topic.")
    );
    refs.postsFeed.appendChild(empty);
    return;
  }

  posts.forEach((post) => refs.postsFeed.appendChild(buildPost(post)));
}

function renderApp(data, state) {
  renderComposer(data);
  renderCategories(data, state);
  renderCircles(data, state);
  renderFeedMeta(data, state);
  renderTracker(data.tracker);
  renderStats(data.currentUser);
  renderTrending(data.trendingCommunities);
  renderPosts(data.posts);
}

export { applyTheme, refs, renderApp, setButtonBusy, setFeedLoading, showToast };
