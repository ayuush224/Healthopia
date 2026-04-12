import { apiFetch } from './api.js';
import {
  escapeHtml,
  formatCompactNumber,
  formatRelativeTime,
  formatWater,
  getAccentVars,
  matchesSearch,
  renderAvatar
} from './helpers.js';
import { createPostLikeManager } from './postLikeManager.js';

const MAX_POST_IMAGE_BYTES = 512 * 1024;

const state = {
  profile: null,
  profilePosts: [],
  profileStats: {
    postsCount: 0,
    communitiesCount: 0,
    commentsCount: 0,
    likesCount: 0
  },
  communities: [],
  health: null,
  homePosts: [],
  currentCommunity: null,
  communityPosts: [],
  currentPost: null,
  postModalOpen: false,
  postSubmitting: false,
  postImagePreviewUrl: '',
  shellHydrated: false,
  search: '',
  feedFilter: 'all'
};

const likeManager = createPostLikeManager();

const elements = {
  viewRoot: document.getElementById('view-root'),
  searchInput: document.getElementById('global-search'),
  joinedCommunitiesList: document.getElementById('joined-communities-list'),
  healthSidebar: document.getElementById('health-sidebar'),
  profileStatsSidebar: document.getElementById('profile-stats-sidebar'),
  trendingCommunitiesList: document.getElementById('trending-communities-list'),
  headerAvatar: document.getElementById('header-avatar'),
  profileMenuButton: document.getElementById('profile-menu-button'),
  profileMenu: document.getElementById('profile-menu'),
  signOutButton: document.getElementById('sign-out-button'),
  toastStack: document.getElementById('toast-stack'),
  postModal: document.getElementById('post-modal'),
  postModalDialog: document.getElementById('post-modal-dialog'),
  createPostForm: document.getElementById('create-post-form'),
  createPostSubmit: document.getElementById('create-post-submit'),
  postModalMessage: document.getElementById('post-modal-message'),
  postModalHelper: document.getElementById('post-modal-helper'),
  postTitleInput: document.getElementById('post-title-input'),
  postBodyInput: document.getElementById('post-body-input'),
  postCommunityInput: document.getElementById('post-community-input'),
  postTagsInput: document.getElementById('post-tags-input'),
  postImageInput: document.getElementById('post-image-input'),
  postImageLabel: document.getElementById('post-image-label'),
  postImageError: document.getElementById('post-image-error'),
  postImagePreview: document.getElementById('post-image-preview'),
  postImagePreviewImage: document.getElementById('post-image-preview-image'),
  postImageRemove: document.getElementById('post-image-remove')
};

function getRoute() {
  const path = window.location.pathname;

  if (path === '/') {
    return { name: 'home' };
  }

  if (path === '/profile') {
    return { name: 'profile' };
  }

  if (path === '/health') {
    return { name: 'health' };
  }

  const communityMatch = path.match(/^\/community\/([^/]+)$/);
  if (communityMatch) {
    return { name: 'community', id: communityMatch[1] };
  }

  const postMatch = path.match(/^\/post\/([^/]+)$/);
  if (postMatch) {
    return { name: 'post', id: postMatch[1] };
  }

  return { name: 'home' };
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3400);
}

function renderLoadingState(title = 'Loading your sanctuary...') {
  elements.viewRoot.innerHTML = `
    <section class="loading-card">
      <div class="page-heading">
        <h1>${escapeHtml(title)}</h1>
        <p>Gathering communities, feed activity, and your latest health snapshot.</p>
      </div>
      <div class="stack-grid">
        <div class="loading-shimmer"></div>
        <div class="loading-shimmer"></div>
        <div class="loading-shimmer"></div>
      </div>
    </section>
  `;
}

function renderErrorState(message) {
  elements.viewRoot.innerHTML = `
    <section class="empty-state">
      <h2>We hit a snag.</h2>
      <p>${escapeHtml(message)}</p>
      <div>
        <button class="button-primary" type="button" data-action="reload-view">Try again</button>
      </div>
    </section>
  `;
}

function getPostAuthor(post) {
  return post?.user || post?.createdBy || null;
}

function getPostCommunity(post) {
  return post?.community || post?.communityId || null;
}

function getPostTitle(post) {
  return String(post?.title || '').trim();
}

function getPostBody(post) {
  return String(post?.body || post?.description || '').trim();
}

function getPostImage(post) {
  return post?.image || post?.photo || '';
}

function setInlineMessage(element, text, type = 'error') {
  if (!element) {
    return;
  }

  if (!text) {
    element.textContent = '';
    element.className = 'inline-message is-hidden';
    return;
  }

  element.textContent = text;
  element.className = type === 'success' ? 'inline-message is-success' : 'inline-message';
}

function setHelperMessage(message) {
  elements.postModalHelper.textContent = message;
}

function setPostImageError(message = '') {
  elements.postImageError.textContent = message;
  elements.postImageError.classList.toggle('is-hidden', !message);
}

function revokePostImagePreview() {
  if (state.postImagePreviewUrl) {
    URL.revokeObjectURL(state.postImagePreviewUrl);
    state.postImagePreviewUrl = '';
  }
}

function clearPostImageSelection() {
  revokePostImagePreview();
  elements.postImageInput.value = '';
  elements.postImagePreviewImage.src = '';
  elements.postImagePreview.classList.add('is-hidden');
  elements.postImageRemove.classList.add('is-hidden');
  elements.postImageLabel.textContent = 'Upload image';
  setPostImageError('');
}

function populatePostCommunityOptions(selectedCommunityId = '') {
  const joinedCommunities = getJoinedCommunities();
  const requestedCommunityId = selectedCommunityId || elements.postCommunityInput.value;
  const resolvedCommunityId = joinedCommunities.some((community) => community._id === requestedCommunityId)
    ? requestedCommunityId
    : joinedCommunities[0]?._id || '';

  elements.postCommunityInput.innerHTML = `
    <option value="">Choose a community</option>
    ${joinedCommunities.map((community) => `
      <option value="${community._id}" ${community._id === resolvedCommunityId ? 'selected' : ''}>
        ${escapeHtml(community.communityName)}
      </option>
    `).join('')}
  `;

  elements.postCommunityInput.disabled = !joinedCommunities.length || state.postSubmitting;
  elements.createPostSubmit.disabled = state.postSubmitting || !joinedCommunities.length;
  setHelperMessage(
    joinedCommunities.length
      ? 'Your post will appear instantly at the top of the feed.'
      : 'Join a community first to unlock posting.'
  );
}

function getDefaultPostCommunityId(preferredCommunityId = '') {
  const joinedCommunities = getJoinedCommunities();

  if (preferredCommunityId && joinedCommunities.some((community) => community._id === preferredCommunityId)) {
    return preferredCommunityId;
  }

  const route = getRoute();
  if (route.name === 'community' && state.currentCommunity?.isJoined) {
    return state.currentCommunity._id;
  }

  if (state.feedFilter !== 'all' && joinedCommunities.some((community) => community._id === state.feedFilter)) {
    return state.feedFilter;
  }

  return joinedCommunities[0]?._id || '';
}

function setPostSubmitState(submitting) {
  state.postSubmitting = submitting;
  elements.createPostSubmit.disabled = submitting || !getJoinedCommunities().length;
  elements.createPostSubmit.textContent = submitting ? 'Posting...' : 'Post';
  elements.postTitleInput.disabled = submitting;
  elements.postBodyInput.disabled = submitting;
  elements.postTagsInput.disabled = submitting;
  elements.postImageInput.disabled = submitting;
  elements.postImageRemove.disabled = submitting;
  populatePostCommunityOptions(elements.postCommunityInput.value);
}

function openPostModal(preselectedCommunityId = '') {
  if (state.postModalOpen) {
    return;
  }

  populatePostCommunityOptions(getDefaultPostCommunityId(preselectedCommunityId));
  elements.postModal.classList.remove('is-hidden');
  requestAnimationFrame(() => {
    state.postModalOpen = true;
    elements.postModal.classList.add('is-open');
    elements.postModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body-scroll-lock');
    elements.postTitleInput.focus();
  });
}

function closePostModal(options = {}) {
  if (state.postSubmitting && !options.force) {
    return;
  }

  if (!state.postModalOpen && elements.postModal.classList.contains('is-hidden')) {
    return;
  }

  state.postModalOpen = false;
  elements.postModal.classList.remove('is-open');
  elements.postModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('body-scroll-lock');

  if (!options.preserveDraft) {
    elements.createPostForm.reset();
    clearPostImageSelection();
    setInlineMessage(elements.postModalMessage, '');
    populatePostCommunityOptions(getDefaultPostCommunityId());
  }

  window.setTimeout(() => {
    if (!state.postModalOpen) {
      elements.postModal.classList.add('is-hidden');
    }
  }, 200);
}

function handlePostImageSelection(file) {
  if (!file) {
    clearPostImageSelection();
    return true;
  }

  if (!file.type.startsWith('image/')) {
    clearPostImageSelection();
    setPostImageError('Please choose an image file.');
    return false;
  }

  if (file.size > MAX_POST_IMAGE_BYTES) {
    clearPostImageSelection();
    setPostImageError('Image must be 512KB or smaller.');
    return false;
  }

  revokePostImagePreview();
  state.postImagePreviewUrl = URL.createObjectURL(file);
  elements.postImagePreviewImage.src = state.postImagePreviewUrl;
  elements.postImagePreview.classList.remove('is-hidden');
  elements.postImageRemove.classList.remove('is-hidden');
  elements.postImageLabel.textContent = file.name;
  setPostImageError('');
  return true;
}

function getJoinedCommunities() {
  const joinedIds = new Set((state.profile?.communitiesJoined || []).map((community) => community._id));
  return state.communities.filter((community) => joinedIds.has(community._id));
}

function getTrendingCommunities() {
  const joinedIds = new Set((state.profile?.communitiesJoined || []).map((community) => community._id));
  return state.communities
    .filter((community) => !joinedIds.has(community._id))
    .slice(0, 3);
}

function getPostCollections() {
  return [state.homePosts, state.profilePosts, state.communityPosts];
}

function visitLocalPost(postId, visitor) {
  const normalizedPostId = String(postId);

  getPostCollections().forEach((posts) => {
    posts.forEach((post) => {
      if (post?._id === normalizedPostId) {
        visitor(post);
      }
    });
  });

  if (state.currentPost?._id === normalizedPostId) {
    visitor(state.currentPost);
  }
}

function getLocalPostSnapshot(postId) {
  let snapshot = null;

  visitLocalPost(postId, (post) => {
    if (!snapshot) {
      snapshot = {
        likesCount: post.likes || 0,
        authorId: getPostAuthor(post)?._id || null
      };
    }
  });

  return snapshot || {
    likesCount: 0,
    authorId: null
  };
}

function updateProfileLikesSummary(delta) {
  if (!delta) {
    return;
  }

  state.profileStats.likesCount = Math.max(0, (state.profileStats.likesCount || 0) + delta);

  const likesNode = elements.profileStatsSidebar.querySelector('[data-profile-likes]');
  if (likesNode) {
    likesNode.textContent = formatCompactNumber(state.profileStats.likesCount);
  }
}

function syncLikeButtons(postId) {
  const postSnapshot = getLocalPostSnapshot(postId);
  const liked = likeManager.isLiked(postId);
  const pending = likeManager.isPending(postId);

  document
    .querySelectorAll(`[data-action="like-post"][data-post-id="${postId}"]`)
    .forEach((button) => {
      const icon = button.querySelector('.material-symbols-outlined');
      const count = button.querySelector('[data-like-count]');

      button.classList.toggle('is-active', liked);
      button.disabled = pending;
      button.setAttribute('aria-pressed', String(liked));

      if (icon) {
        icon.style.fontVariationSettings = liked
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
      }

      if (count) {
        count.textContent = formatCompactNumber(postSnapshot.likesCount);
      }
    });
}

function applyLikeStateToLocalPosts(postId, liked, likesCount) {
  let previousLikesCount = null;
  let affectsCurrentUsersPost = false;

  visitLocalPost(postId, (post) => {
    if (previousLikesCount === null) {
      previousLikesCount = post.likes || 0;
    }

    post.likes = likesCount;
    post.likedByCurrentUser = liked;

    if (getPostAuthor(post)?._id === state.profile?._id) {
      affectsCurrentUsersPost = true;
    }
  });

  if (previousLikesCount !== null && affectsCurrentUsersPost) {
    updateProfileLikesSummary(likesCount - previousLikesCount);
  }

  syncLikeButtons(postId);
}

function renderSidebar() {
  const profileName = state.profile?.name || 'Soft Health';
  elements.headerAvatar.innerHTML = renderAvatar(state.profile || { name: profileName }, 'small');

  const joinedCommunities = getJoinedCommunities();
  elements.joinedCommunitiesList.innerHTML = joinedCommunities.length
    ? joinedCommunities.map((community) => `
        <li>
          <span class="circle-dot" style="${getAccentVars(community.communityName)}"></span>
          <button type="button" data-route="/community/${community._id}">${escapeHtml(community.communityName)}</button>
        </li>
      `).join('')
    : '<li><span class="muted-copy">No circles joined yet.</span></li>';

  const health = state.health || { waterIntake: 0, waterGoal: 2500, hydrationPercent: 0, steps: 0, stepsPercent: 0 };
  elements.healthSidebar.innerHTML = `
    <article class="health-card">
      <div class="progress-line">
        <span>Daily Water</span>
        <strong>${escapeHtml(formatWater(health.waterIntake))} / ${escapeHtml(formatWater(health.waterGoal))}</strong>
      </div>
      <div class="progress-bar">
        <span style="width:${health.hydrationPercent}%"></span>
      </div>
    </article>

    <article class="health-card">
      <div class="ring-row">
        <div class="ring__meta">
          <span class="mini-card__label">Daily Steps</span>
          <strong>${formatCompactNumber(health.steps)}</strong>
          <span>${health.stepsPercent}% of ${formatCompactNumber(health.stepsGoal || 10000)} goal</span>
        </div>
        <div class="ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#e6eaec" stroke-width="10"></circle>
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#0f5238"
              stroke-width="10"
              stroke-linecap="round"
              stroke-dasharray="301.59"
              stroke-dashoffset="${301.59 - (301.59 * health.stepsPercent) / 100}">
            </circle>
          </svg>
          <div class="ring__icon">
            <span class="material-symbols-outlined">directions_run</span>
          </div>
        </div>
      </div>
    </article>
  `;

  elements.profileStatsSidebar.innerHTML = `
    <div class="stat-panel__grid">
      <div class="profile-stat">
        <strong>${formatCompactNumber(state.profileStats.postsCount)}</strong>
        <span>Posts</span>
      </div>
      <div class="profile-stat">
        <strong>${formatCompactNumber(state.profileStats.communitiesCount)}</strong>
        <span>Circles</span>
      </div>
      <div class="profile-stat">
        <strong data-profile-likes>${formatCompactNumber(state.profileStats.likesCount)}</strong>
        <span>Likes</span>
      </div>
    </div>
  `;

  const trendingCommunities = getTrendingCommunities();
  elements.trendingCommunitiesList.innerHTML = trendingCommunities.length
    ? trendingCommunities.map((community) => `
        <li class="trending-item">
          <div class="trending-item__main">
            <span class="accent-tile" style="${getAccentVars(community.communityName)}">${escapeHtml(community.communityName.charAt(0))}</span>
            <div>
              <strong>${escapeHtml(community.communityName)}</strong>
              <p class="micro-copy">${formatCompactNumber(community.noOfActiveMembers)} members</p>
            </div>
          </div>
          <button class="join-button" type="button" data-action="join-community" data-community-id="${community._id}">
            Join
          </button>
        </li>
      `).join('')
    : '<li class="muted-copy">You have already joined the highlighted circles.</li>';

  document.querySelectorAll('.sidebar-nav__item').forEach((item) => {
    item.classList.remove('is-active');
    const route = item.dataset.route;
    if (route && window.location.pathname === route) {
      item.classList.add('is-active');
    }
    if (window.location.pathname.startsWith('/community/') && item.dataset.action === 'open-first-community') {
      item.classList.add('is-active');
    }
  });

  document.querySelectorAll('.mobile-nav__item').forEach((item) => {
    item.classList.remove('is-active');
    if (item.dataset.route === window.location.pathname) {
      item.classList.add('is-active');
    }
  });
}

function filterPosts(posts) {
  let filteredPosts = posts;

  if (state.feedFilter !== 'all') {
    filteredPosts = filteredPosts.filter((post) => getPostCommunity(post)?._id === state.feedFilter);
  }

  if (state.search.trim()) {
    filteredPosts = filteredPosts.filter((post) => matchesSearch(post, state.search.trim()));
  }

  return filteredPosts;
}

function prependUniquePost(posts, post) {
  const existingIndex = posts.findIndex((item) => item?._id === post._id);

  if (existingIndex !== -1) {
    posts.splice(existingIndex, 1);
  }

  posts.unshift(post);
}

function syncCreatedPost(post) {
  const communityId = getPostCommunity(post)?._id || '';

  prependUniquePost(state.profilePosts, post);
  prependUniquePost(state.homePosts, post);

  if (state.currentCommunity?._id === communityId) {
    prependUniquePost(state.communityPosts, post);
  }

  state.profileStats.postsCount += 1;
}

function renderPostCard(post, options = {}) {
  const author = getPostAuthor(post);
  const community = getPostCommunity(post);
  const title = getPostTitle(post);
  const body = getPostBody(post);
  const image = getPostImage(post);
  const isLiked = likeManager.isLiked(post._id);
  const showCommentPreview = options.showCommentPreview !== false;
  const commentPreview = showCommentPreview && post.comments?.length
    ? `
      <div class="comment-preview">
        ${post.comments.slice(0, 1).map((comment) => `
          <div class="comment-pill">
            ${renderAvatar(comment.userId || { name: 'Member' }, 'small')}
            <div class="comment-bubble">
              <strong>${escapeHtml(comment.userId?.name || 'Community Member')}</strong>
              <span>${escapeHtml(comment.description)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  return `
    <article class="post-card">
      <div class="post-card__body">
        <div class="post-card__header">
          <div class="post-card__meta">
            ${renderAvatar(author || { name: 'User' })}
            <div class="meta-copy">
              <h3>${escapeHtml(author?.name || 'Anonymous')}</h3>
              <p class="meta-line">
                ${escapeHtml(formatRelativeTime(post.updatedAt || post.createdAt))}
                ${community ? `&bull; <strong>${escapeHtml(community.communityName)}</strong>` : ''}
              </p>
            </div>
          </div>
          <button class="icon-ghost" type="button" data-route="/post/${post._id}" aria-label="Open post">
            <span class="material-symbols-outlined">more_horiz</span>
          </button>
        </div>

        <div class="post-card__content">
          ${title ? `<h2 class="post-card__title">${escapeHtml(title)}</h2>` : ''}
          ${body ? `<p>${escapeHtml(body)}</p>` : ''}
        </div>

        ${post.tags?.length ? `
          <div class="tag-row">
            ${post.tags.map((tag, index) => `
              <span class="tag-chip ${index % 2 ? 'tag-chip--soft' : ''}">${escapeHtml(tag)}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>

      ${image ? `<img class="post-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(title || body || 'Post image')}">` : ''}

      <div class="post-card__footer">
        <div class="post-card__actions">
          <button class="post-action ${isLiked ? 'is-active' : ''}" type="button" data-action="like-post" data-post-id="${post._id}" aria-pressed="${String(isLiked)}">
            <span class="material-symbols-outlined"${isLiked ? ' style="font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;"' : ''}>favorite</span>
            <span data-like-count>${formatCompactNumber(post.likes || 0)}</span>
          </button>
          <button class="post-action" type="button" data-route="/post/${post._id}">
            <span class="material-symbols-outlined">chat_bubble</span>
            <span>${formatCompactNumber(post.comments?.length || 0)}</span>
          </button>
          <button class="post-action" type="button" data-action="share-post" data-post-id="${post._id}">
            <span class="material-symbols-outlined">share</span>
          </button>
        </div>
        <button class="post-action" type="button" data-route="/post/${post._id}">
          <span class="material-symbols-outlined">bookmark</span>
        </button>
      </div>

      ${commentPreview}
    </article>
  `;
}

function renderPostFeed(posts, emptyTitle, emptyCopy) {
  if (!posts.length) {
    return `
      <section class="empty-state">
        <h3>${escapeHtml(emptyTitle)}</h3>
        <p>${escapeHtml(emptyCopy)}</p>
      </section>
    `;
  }

  return `<div class="feed-stack">${posts.map((post) => renderPostCard(post)).join('')}</div>`;
}

function renderCommunitySuggestions() {
  const communities = state.search
    ? state.communities.filter((community) => {
        const value = `${community.communityName} ${community.description}`.toLowerCase();
        return value.includes(state.search.toLowerCase());
      })
    : state.communities;

  return `
    <section class="empty-state">
      <h2>Your feed starts with the right circles.</h2>
      <p>Join a few communities to unlock the all-feed timeline, the profile stats card, and community-specific posting.</p>
      <div class="community-grid">
        ${communities.map((community) => `
          <article class="join-card">
            <div class="trending-item__main">
              <span class="accent-tile" style="${getAccentVars(community.communityName)}">${escapeHtml(community.communityName.charAt(0))}</span>
              <div>
                <h3>${escapeHtml(community.communityName)}</h3>
                <p class="micro-copy">${formatCompactNumber(community.noOfActiveMembers)} active members</p>
              </div>
            </div>
            <p>${escapeHtml(community.description)}</p>
            <div class="join-card__footer">
              <button class="join-button" type="button" data-action="join-community" data-community-id="${community._id}" ${community.isJoined ? 'disabled' : ''}>
                ${community.isJoined ? 'Joined' : 'Join'}
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderHomeView() {
  const joinedCommunities = getJoinedCommunities();
  const homePosts = filterPosts(state.homePosts);

  elements.viewRoot.innerHTML = `
    <section class="page-heading">
      <h1>Soft, social, and centered on your wellness rhythm.</h1>
      <p>The feed stays true to the Stitch reference while pulling real posts from the communities you have joined.</p>
    </section>

    <div class="filter-row">
      <button class="filter-pill ${state.feedFilter === 'all' ? 'is-active' : ''}" type="button" data-filter-community="all">All Feed</button>
      ${joinedCommunities.map((community) => `
        <button class="filter-pill ${state.feedFilter === community._id ? 'is-active' : ''}" type="button" data-filter-community="${community._id}">
          ${escapeHtml(community.communityName)}
        </button>
      `).join('')}
    </div>

    ${joinedCommunities.length ? renderPostFeed(homePosts, 'Nothing here yet', 'Posts from your joined communities will appear here once people start sharing.') : renderCommunitySuggestions()}
  `;
}

function renderProfileView() {
  const profilePosts = state.search
    ? state.profilePosts.filter((post) => matchesSearch(post, state.search))
    : state.profilePosts;

  elements.viewRoot.innerHTML = `
    <section class="profile-hero">
      <div class="profile-hero__header">
        <div class="post-card__meta">
          ${renderAvatar(state.profile || { name: 'Profile' }, 'large')}
          <div class="profile-hero__copy">
            <h1>${escapeHtml(state.profile?.name || 'Soft Health Member')}</h1>
            <p>@${escapeHtml(state.profile?.username || 'member')}</p>
            <p>${state.profileStats.communitiesCount} communities joined • ${state.profileStats.postsCount} posts created</p>
          </div>
        </div>
        <div class="profile-hero__stats">
          <span class="community-badge">${formatCompactNumber(state.profileStats.likesCount)} likes</span>
          <span class="community-badge">${formatCompactNumber(state.profileStats.commentsCount)} comments</span>
        </div>
      </div>

      <form id="profile-form" class="stack-form">
        <div class="field-grid">
          <label class="field">
            <span>Name</span>
            <input type="text" name="name" value="${escapeHtml(state.profile?.name || '')}" required>
          </label>

          <label class="field">
            <span>Username</span>
            <input type="text" name="username" value="${escapeHtml(state.profile?.username || '')}" required>
          </label>
        </div>

        <div class="health-inline-actions">
          <button class="button-primary" type="submit">Save profile</button>
          <span class="helper-text">Your initials are now used automatically anywhere an avatar appears.</span>
        </div>
      </form>
    </section>

    <section class="profile-grid">
      ${renderPostFeed(
        profilePosts,
        'No posts yet',
        'Your profile will show every post you create across joined communities.'
      )}
    </section>
  `;
}

function renderCommunityView() {
  const community = state.currentCommunity;

  if (!community) {
    renderErrorState('That community could not be found.');
    return;
  }

  const posts = state.search
    ? state.communityPosts.filter((post) => matchesSearch(post, state.search))
    : state.communityPosts;

  elements.viewRoot.innerHTML = `
    <section class="community-hero">
      <div class="community-hero__header">
        <div class="post-card__meta">
          <span class="accent-tile" style="${getAccentVars(community.communityName)}">${escapeHtml(community.communityName.charAt(0))}</span>
          <div class="community-hero__content">
            <span class="micro-chip">${formatCompactNumber(community.noOfActiveMembers)} active members</span>
            <h1>${escapeHtml(community.communityName)}</h1>
            <p>${escapeHtml(community.description)}</p>
          </div>
        </div>
        <button class="${community.isJoined ? 'soft-button' : 'button-primary'}" type="button" data-action="join-community" data-community-id="${community._id}" ${community.isJoined ? 'disabled' : ''}>
          ${community.isJoined ? 'Joined' : 'Join community'}
        </button>
      </div>

      ${!community.isJoined ? `
        <div class="empty-state">
          <h3>Join before you post</h3>
          <p>This keeps the feed relevant and matches the community-first data relationships in the provided schemas.</p>
        </div>
      ` : ''}
    </section>

    ${renderPostFeed(posts, 'No posts in this circle yet', 'Be the first person to share an update in this community.')}
  `;
}

function renderPostDetailView() {
  const post = state.currentPost;

  if (!post) {
    renderErrorState('That post could not be found.');
    return;
  }

  elements.viewRoot.innerHTML = `
    <section class="detail-card">
      <div class="detail-card__header">
        <div>
          <span class="micro-chip">${post.communityId ? escapeHtml(post.communityId.communityName) : 'Community post'}</span>
          <h2>${escapeHtml(post.createdBy?.name || 'Community Member')}</h2>
          <p class="muted-copy">${escapeHtml(formatRelativeTime(post.updatedAt || post.createdAt))}</p>
        </div>
        <button class="soft-button" type="button" data-route="${post.communityId ? `/community/${post.communityId._id}` : '/'}">Back</button>
      </div>

      ${renderPostCard(post, { showCommentPreview: false })}
    </section>

    <section class="detail-card">
      <div class="detail-card__header">
        <div>
          <h2>Comments</h2>
          <p class="muted-copy">Every reply is stored inside the post document exactly as the provided schema expects.</p>
        </div>
      </div>

      <form id="comment-form" class="stack-form" data-post-id="${post._id}">
        <label class="field">
          <span>Add a comment</span>
          <textarea name="description" rows="4" placeholder="Share an encouraging reply..." required></textarea>
        </label>
        <button class="button-primary" type="submit">Post comment</button>
      </form>

      <div class="feed-stack">
        ${post.comments?.length ? post.comments.map((comment) => `
          <article class="surface-panel">
            <div class="comment-pill">
              ${renderAvatar(comment.userId || { name: 'Member' }, 'small')}
              <div class="comment-bubble">
                <strong>${escapeHtml(comment.userId?.name || 'Community Member')}</strong>
                <span>${escapeHtml(comment.description)}</span>
              </div>
            </div>
          </article>
        `).join('') : `
          <section class="empty-state">
            <h3>No comments yet</h3>
            <p>Start the conversation with a supportive response.</p>
          </section>
        `}
      </div>
    </section>
  `;
}

function renderHealthView() {
  const health = state.health || { waterIntake: 0, waterGoal: 2500, hydrationPercent: 0, steps: 0, stepsPercent: 0, stepsGoal: 10000 };

  elements.viewRoot.innerHTML = `
    <section class="health-layout">
      <div class="page-heading">
        <h1>Health tracker</h1>
        <p>Water intake, water goal, and steps are persisted in the dedicated HealthTracker model linked to your user account.</p>
      </div>

      <div class="health-grid">
        <article class="health-card">
          <div class="progress-line">
            <span>Water progress</span>
            <strong>${escapeHtml(formatWater(health.waterIntake))} / ${escapeHtml(formatWater(health.waterGoal))}</strong>
          </div>
          <div class="progress-bar">
            <span style="width:${health.hydrationPercent}%"></span>
          </div>
          <p>${health.hydrationPercent}% of your hydration goal reached.</p>
        </article>

        <article class="health-card">
          <div class="ring-row">
            <div class="ring__meta">
              <span class="mini-card__label">Daily Steps</span>
              <strong>${formatCompactNumber(health.steps)}</strong>
              <span>${health.stepsPercent}% of ${formatCompactNumber(health.stepsGoal)} goal</span>
            </div>
            <div class="ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#e6eaec" stroke-width="10"></circle>
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="#0f5238"
                  stroke-width="10"
                  stroke-linecap="round"
                  stroke-dasharray="301.59"
                  stroke-dashoffset="${301.59 - (301.59 * health.stepsPercent) / 100}">
                </circle>
              </svg>
              <div class="ring__icon">
                <span class="material-symbols-outlined">monitoring</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <article class="detail-card">
        <div class="detail-card__header">
          <div>
            <h2>Update daily metrics</h2>
            <p class="muted-copy">Adjust your hydration goal or log the latest numbers from your day.</p>
          </div>
        </div>

        <form id="health-form" class="health-form">
          <div class="field-grid">
            <label class="field">
              <span>Water intake (ml)</span>
              <input type="number" min="0" name="waterIntake" value="${escapeHtml(String(health.waterIntake || 0))}" required>
            </label>

            <label class="field">
              <span>Water goal (ml)</span>
              <input type="number" min="0" name="waterGoal" value="${escapeHtml(String(health.waterGoal || 0))}" required>
            </label>
          </div>

          <label class="field">
            <span>Steps</span>
            <input type="number" min="0" name="steps" value="${escapeHtml(String(health.steps || 0))}" required>
          </label>

          <div class="health-inline-actions">
            <button class="button-primary" type="submit">Save metrics</button>
            <button class="soft-button" type="button" data-action="health-quick-add" data-field="waterIntake" data-amount="250">+250 ml</button>
            <button class="soft-button" type="button" data-action="health-quick-add" data-field="steps" data-amount="500">+500 steps</button>
          </div>
        </form>
      </article>
    </section>
  `;
}

function renderCurrentView() {
  const route = getRoute();

  if (route.name === 'home') {
    renderHomeView();
    return;
  }

  if (route.name === 'profile') {
    renderProfileView();
    return;
  }

  if (route.name === 'community') {
    renderCommunityView();
    return;
  }

  if (route.name === 'post') {
    renderPostDetailView();
    return;
  }

  if (route.name === 'health') {
    renderHealthView();
  }
}

async function loadShellData(options = {}) {
  if (state.shellHydrated && !options.force) {
    return;
  }

  const [profileData, communitiesData, healthData] = await Promise.all([
    apiFetch('/api/users/profile'),
    apiFetch('/api/communities'),
    apiFetch('/api/health')
  ]);

  state.profile = profileData.user;
  state.profilePosts = profileData.posts;
  state.profileStats = profileData.stats;
  state.communities = communitiesData.communities;
  state.health = healthData.health;
  likeManager.replaceLikedPosts(profileData.user?.likedPosts || []);
  state.shellHydrated = true;

  const validCommunityIds = new Set(getJoinedCommunities().map((community) => community._id));
  if (state.feedFilter !== 'all' && !validCommunityIds.has(state.feedFilter)) {
    state.feedFilter = 'all';
  }
}

async function loadViewData() {
  const route = getRoute();

  state.currentCommunity = null;
  state.currentPost = null;
  state.communityPosts = [];
  state.homePosts = [];

  if (route.name === 'home') {
    const { posts } = await apiFetch('/api/posts');
    state.homePosts = posts;
    return;
  }

  if (route.name === 'community') {
    const response = await apiFetch(`/api/communities/${route.id}`);
    state.currentCommunity = response.community;
    state.communityPosts = response.posts;
    return;
  }

  if (route.name === 'post') {
    const response = await apiFetch(`/api/posts/${route.id}`);
    state.currentPost = response.post;
  }
}

async function refreshView(options = {}) {
  if (!options.skipLoading) {
    renderLoadingState(options.loadingTitle);
  }

  try {
    await loadShellData({ force: options.refreshShell });
    await loadViewData();
    renderSidebar();
    renderCurrentView();
  } catch (error) {
    renderErrorState(error.message);
  }
}

async function navigateTo(path) {
  if (window.location.pathname === path) {
    return;
  }

  history.pushState({}, '', path);
  await refreshView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyPostLink(postId) {
  const url = `${window.location.origin}/post/${postId}`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Post link copied.');
    }).catch(() => {
      showToast('Could not copy the post link.', 'error');
    });
    return;
  }

  showToast(url);
}

async function handleJoinCommunity(communityId) {
  try {
    await apiFetch(`/api/communities/${communityId}/join`, {
      method: 'POST'
    });

    showToast('Community joined successfully.');
    await refreshView({ skipLoading: true, refreshShell: true });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleLikePost(postId) {
  const snapshot = getLocalPostSnapshot(postId);
  const optimisticState = likeManager.beginOptimisticToggle(postId, snapshot.likesCount);

  if (!optimisticState) {
    return;
  }

  applyLikeStateToLocalPosts(postId, optimisticState.liked, optimisticState.likesCount);

  try {
    const response = await apiFetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({
        liked: optimisticState.liked
      })
    });

    const confirmedState = likeManager.confirm(response.postId, response.liked, response.likesCount);
    applyLikeStateToLocalPosts(response.postId, confirmedState.liked, confirmedState.likesCount);
  } catch (error) {
    const rollbackState = likeManager.rollback(postId);

    if (rollbackState) {
      applyLikeStateToLocalPosts(postId, rollbackState.liked, rollbackState.likesCount);
    }

    showToast(error.message, 'error');
  }
}

async function handleCreatePost(form) {
  if (state.postSubmitting) {
    return;
  }

  setInlineMessage(elements.postModalMessage, '');
  setPostImageError('');

  const title = String(elements.postTitleInput.value || '').trim();
  const body = String(elements.postBodyInput.value || '').trim();
  const community = String(elements.postCommunityInput.value || '').trim();
  const selectedFile = elements.postImageInput.files?.[0] || null;

  if (!getJoinedCommunities().length) {
    setInlineMessage(elements.postModalMessage, 'Join a community before creating a post.');
    return;
  }

  if (!community) {
    setInlineMessage(elements.postModalMessage, 'Choose a community for this post.');
    elements.postCommunityInput.focus();
    return;
  }

  if (!title || !body) {
    setInlineMessage(elements.postModalMessage, 'Title and body are required.');
    (!title ? elements.postTitleInput : elements.postBodyInput).focus();
    return;
  }

  if (selectedFile && !handlePostImageSelection(selectedFile)) {
    return;
  }

  const formData = new FormData(form);
  formData.set('title', title);
  formData.set('body', body);
  formData.set('community', community);
  formData.set('tags', String(formData.get('tags') || '').trim());

  if (!selectedFile) {
    formData.delete('image');
  }

  setPostSubmitState(true);

  try {
    const response = await apiFetch('/api/posts', {
      method: 'POST',
      body: formData
    });

    syncCreatedPost(response.post);
    renderSidebar();
    renderCurrentView();
    closePostModal({ force: true });
    showToast('Post shared successfully.');
  } catch (error) {
    setInlineMessage(elements.postModalMessage, error.message);
  } finally {
    setPostSubmitState(false);
  }
}

async function handleProfileUpdate(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const formData = new FormData(form);

    await apiFetch('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: formData.get('name'),
        username: formData.get('username')
      })
    });

    showToast('Profile updated.');
    await refreshView({ skipLoading: true, refreshShell: true });
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save profile';
  }
}

async function handleComment(form) {
  const postId = form.dataset.postId;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Posting...';

  try {
    const formData = new FormData(form);

    await apiFetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        description: formData.get('description')
      })
    });

    showToast('Comment added.');
    form.reset();
    await refreshView({ skipLoading: true });
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Post comment';
  }
}

async function handleHealthUpdate(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const formData = new FormData(form);

    await apiFetch('/api/health', {
      method: 'PUT',
      body: JSON.stringify({
        waterIntake: Number(formData.get('waterIntake')),
        waterGoal: Number(formData.get('waterGoal')),
        steps: Number(formData.get('steps'))
      })
    });

    showToast('Health metrics updated.');
    await refreshView({ skipLoading: true, refreshShell: true });
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save metrics';
  }
}

async function handleSignOut() {
  try {
    await apiFetch('/api/auth/logout', {
      method: 'POST'
    });
  } finally {
    window.location.href = '/sign-in';
  }
}

function openFirstCommunity() {
  const joinedCommunities = getJoinedCommunities();
  const targetCommunity = joinedCommunities[0] || state.communities[0];

  if (!targetCommunity) {
    showToast('No communities are available yet.', 'error');
    return;
  }

  navigateTo(`/community/${targetCommunity._id}`);
}

document.addEventListener('click', async (event) => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) {
    event.preventDefault();
    const targetPath = routeButton.dataset.route;
    elements.profileMenu.classList.add('is-hidden');
    await navigateTo(targetPath);
    return;
  }

  const filterButton = event.target.closest('[data-filter-community]');
  if (filterButton) {
    state.feedFilter = filterButton.dataset.filterCommunity;
    renderCurrentView();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    if (!event.target.closest('.menu-shell')) {
      elements.profileMenu.classList.add('is-hidden');
      elements.profileMenuButton.setAttribute('aria-expanded', 'false');
    }
    return;
  }

  const { action } = actionButton.dataset;

  if (action === 'reload-view') {
    await refreshView();
    return;
  }

  if (action === 'join-community') {
    await handleJoinCommunity(actionButton.dataset.communityId);
    return;
  }

  if (action === 'like-post') {
    await handleLikePost(actionButton.dataset.postId);
    return;
  }

  if (action === 'share-post') {
    copyPostLink(actionButton.dataset.postId);
    return;
  }

  if (action === 'open-post-modal') {
    openPostModal(actionButton.dataset.communityId || '');
    return;
  }

  if (action === 'dismiss-post-modal') {
    closePostModal();
    return;
  }

  if (action === 'remove-post-image') {
    clearPostImageSelection();
    return;
  }

  if (action === 'open-first-community') {
    openFirstCommunity();
    return;
  }

  if (action === 'health-quick-add') {
    const form = document.getElementById('health-form');
    if (!form) {
      return;
    }
    const field = form.elements[actionButton.dataset.field];
    field.value = Number(field.value || 0) + Number(actionButton.dataset.amount || 0);
  }
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'create-post-form') {
    event.preventDefault();
    await handleCreatePost(event.target);
  }

  if (event.target.id === 'profile-form') {
    event.preventDefault();
    await handleProfileUpdate(event.target);
  }

  if (event.target.id === 'comment-form') {
    event.preventDefault();
    await handleComment(event.target);
  }

  if (event.target.id === 'health-form') {
    event.preventDefault();
    await handleHealthUpdate(event.target);
  }
});

elements.profileMenuButton.addEventListener('click', () => {
  elements.profileMenu.classList.toggle('is-hidden');
  const expanded = !elements.profileMenu.classList.contains('is-hidden');
  elements.profileMenuButton.setAttribute('aria-expanded', String(expanded));
});

elements.signOutButton.addEventListener('click', handleSignOut);

elements.searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderCurrentView();
});

elements.postImageInput.addEventListener('change', (event) => {
  handlePostImageSelection(event.target.files?.[0] || null);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.postModalOpen) {
    closePostModal();
  }
});

window.addEventListener('popstate', () => {
  refreshView();
});

renderLoadingState();
refreshView({ skipLoading: true });
