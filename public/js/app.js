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
const THEME_STORAGE_KEY = 'soft-health-theme';
const SAVED_POSTS_STORAGE_KEY = 'soft-health-saved-posts';
const PROFILE_TABS = [
  { id: 'posts', label: 'Your Posts' },
  { id: 'liked', label: 'Liked Posts' },
  { id: 'saved', label: 'Saved Posts' }
];
const ACTIVITY_TARGETS = {
  walking: 10000,
  running: 5,
  sleep: 8
};
const ACTIVITY_METRICS = [
  { key: 'walking', label: 'Walking', unit: 'steps', colorClass: 'dashboard-stat--walking' },
  { key: 'running', label: 'Running', unit: 'km', colorClass: 'dashboard-stat--running' },
  { key: 'sleep', label: 'Sleep', unit: 'hours', colorClass: 'dashboard-stat--sleep' }
];
const MIN_ONBOARDING_COMMUNITIES = 3;

const state = {
  profile: null,
  profilePosts: [],
  likedPosts: [],
  savedPosts: [],
  profileStats: {
    postsCount: 0,
    communitiesCount: 0,
    commentsCount: 0,
    likesCount: 0
  },
  communities: [],
  health: null,
  wellnessPicks: [],
  wellnessPicksPage: 1,
  wellnessPicksTotalPages: 1,
  wellnessPicksLoading: false,
  weeklyData: [],
  selectedDay: '',
  healthLogDate: '',
  healthLogModalOpen: false,
  homePosts: [],
  currentCommunity: null,
  communityPosts: [],
  currentPost: null,
  postModalOpen: false,
  profileMenuOpen: false,
  postSubmitting: false,
  postImagePreviewUrl: '',
  shellHydrated: false,
  search: '',
  feedFilter: 'all',
  profileTab: 'posts',
  openCommentPostIds: new Set(),
  savedPostIds: new Set(),
  onboardingSelectedCommunityIds: new Set(),
  onboardingSubmitting: false,
  theme: 'light'
};

const likeManager = createPostLikeManager();

const elements = {
  viewRoot: document.getElementById('view-root'),
  onboardingRoot: document.getElementById('onboarding-root'),
  searchInput: document.getElementById('global-search'),
  joinedCommunitiesList: document.getElementById('joined-communities-list'),
  healthSidebar: document.getElementById('health-sidebar'),
  profileStatsSidebar: document.getElementById('profile-stats-sidebar'),
  communityRecommendationsSidebar: document.getElementById('community-recommendations-sidebar'),
  wellnessPicksList: document.getElementById('wellness-picks-list'),
  headerAvatar: document.getElementById('header-avatar'),
  themeToggleButton: document.getElementById('theme-toggle-button'),
  themeToggleIcon: document.getElementById('theme-toggle-icon'),
  profileMenuButton: document.getElementById('profile-menu-button'),
  profileMenu: document.getElementById('profile-menu'),
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

  if (path === '/wellness-picks') {
    return { name: 'wellness-picks' };
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

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (_error) {
    return null;
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_error) {
    // Ignore storage failures and keep the active in-memory theme.
  }
}

function getStoredSavedPostIds() {
  try {
    const rawValue = localStorage.getItem(SAVED_POSTS_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
  } catch (_error) {
    return [];
  }
}

function persistSavedPostIds() {
  try {
    localStorage.setItem(SAVED_POSTS_STORAGE_KEY, JSON.stringify([...state.savedPostIds]));
  } catch (_error) {
    // Saved posts are a convenience; ignore storage failures.
  }
}

function applyTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;

  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  elements.themeToggleButton?.setAttribute('aria-label', `Switch to ${nextTheme} mode`);

  if (elements.themeToggleIcon) {
    elements.themeToggleIcon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';
  }
}

function initializeTheme() {
  const storedTheme = getStoredTheme();

  if (storedTheme === 'light' || storedTheme === 'dark') {
    applyTheme(storedTheme);
    return;
  }

  const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(systemTheme);
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

function openProfileMenu() {
  if (state.profileMenuOpen) {
    return;
  }

  state.profileMenuOpen = true;
  elements.profileMenu.classList.add('is-open');
  elements.profileMenu.setAttribute('aria-hidden', 'false');
  elements.profileMenuButton.setAttribute('aria-expanded', 'true');
}

function closeProfileMenu() {
  if (!state.profileMenuOpen) {
    return;
  }

  state.profileMenuOpen = false;
  elements.profileMenu.classList.remove('is-open');
  elements.profileMenu.setAttribute('aria-hidden', 'true');
  elements.profileMenuButton.setAttribute('aria-expanded', 'false');
}

function toggleProfileMenu() {
  if (state.profileMenuOpen) {
    closeProfileMenu();
    return;
  }

  openProfileMenu();
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

function getPostImageUrl(post) {
  const image = getPostImage(post);

  if (!image) {
    return '';
  }

  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) {
    return image;
  }

  if (image.startsWith('/')) {
    return `${window.location.origin}${image}`;
  }

  return `${window.location.origin}/${image.replace(/^\.?\//, '')}`;
}

function isCurrentUserPostOwner(post) {
  const authorId = getPostAuthor(post)?._id;
  return Boolean(authorId && state.profile?._id && String(authorId) === String(state.profile._id));
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

  closeProfileMenu();
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

function normalizeCommunityCategory(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getJoinedCommunityCategories() {
  return [...new Set(
    getJoinedCommunities()
      .map((community) => normalizeCommunityCategory(community.communityName))
      .filter(Boolean)
  )];
}

function formatCommunityLabel(value = '') {
  return String(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadWellnessPicksPage(page = 1) {
  const joinedCommunityCategories = getJoinedCommunityCategories();

  if (!joinedCommunityCategories.length) {
    state.wellnessPicks = [];
    state.wellnessPicksPage = 1;
    state.wellnessPicksTotalPages = 1;
    state.wellnessPicksLoading = false;
    return;
  }

  state.wellnessPicksLoading = true;

  try {
    const resourceResponse = await apiFetch(`/api/resources?p=${page}`);
    state.wellnessPicks = Array.isArray(resourceResponse.data) ? resourceResponse.data : [];
    state.wellnessPicksPage = Number(resourceResponse.currentPage) || 1;
    state.wellnessPicksTotalPages = Math.max(1, Number(resourceResponse.totalPages) || 1);
  } catch (error) {
    state.wellnessPicks = [];
    state.wellnessPicksPage = 1;
    state.wellnessPicksTotalPages = 1;
    console.error('Failed to load wellness picks.', error);
  } finally {
    state.wellnessPicksLoading = false;
  }
}

function getTrendingCommunities() {
  const joinedIds = new Set((state.profile?.communitiesJoined || []).map((community) => community._id));
  return state.communities
    .filter((community) => !joinedIds.has(community._id))
    .slice(0, 3);
}

function getJoinedCommunityCount() {
  return getJoinedCommunities().length;
}

function needsOnboarding() {
  return state.shellHydrated && getJoinedCommunityCount() < MIN_ONBOARDING_COMMUNITIES;
}

function getOnboardingSelectedCount() {
  return state.onboardingSelectedCommunityIds.size;
}

function getOnboardingTotalCount() {
  return getJoinedCommunityCount() + getOnboardingSelectedCount();
}

function renderOnboardingGate() {
  elements.viewRoot.innerHTML = `
    <section class="empty-state empty-state--feed">
      <h2>Choose your communities</h2>
      <p>Join at least ${MIN_ONBOARDING_COMMUNITIES} communities to personalize your feed and unlock posts that match your wellness goals.</p>
    </section>
  `;
}

function renderOnboardingModal() {
  if (!elements.onboardingRoot) {
    return;
  }

  if (!needsOnboarding()) {
    elements.onboardingRoot.innerHTML = '';
    return;
  }

  const joinedIds = new Set(getJoinedCommunities().map((community) => community._id));
  const availableCommunities = state.communities.filter((community) => !joinedIds.has(community._id));
  const totalCount = getOnboardingTotalCount();
  const canContinue = totalCount >= MIN_ONBOARDING_COMMUNITIES && !state.onboardingSubmitting;
  const remainingCount = Math.max(0, MIN_ONBOARDING_COMMUNITIES - totalCount);

  elements.onboardingRoot.innerHTML = `
    <div class="modal-shell onboarding-modal is-open" aria-hidden="false">
      <div class="modal-shell__backdrop"></div>

      <div class="composer-card composer-modal onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-subtitle">
        <div class="composer-modal__header">
          <div class="composer-modal__heading">
            <h2 id="onboarding-title">Choose your communities</h2>
            <p id="onboarding-subtitle" class="muted-copy">Join at least ${MIN_ONBOARDING_COMMUNITIES} to personalize your feed</p>
          </div>
          <span class="community-badge">${totalCount}/${MIN_ONBOARDING_COMMUNITIES} selected</span>
        </div>

        <div class="onboarding-grid" role="listbox" aria-label="Available communities" aria-multiselectable="true">
          ${availableCommunities.map((community) => {
            const isSelected = state.onboardingSelectedCommunityIds.has(community._id);

            return `
              <button
                class="onboarding-choice ${isSelected ? 'is-selected' : ''}"
                type="button"
                role="option"
                aria-selected="${String(isSelected)}"
                data-action="toggle-onboarding-community"
                data-community-id="${community._id}">
                <span class="accent-tile" style="${getAccentVars(community.communityName)}">${escapeHtml(community.communityName.charAt(0))}</span>
                <span class="onboarding-choice__copy">
                  <strong>${escapeHtml(community.communityName)}</strong>
                  <span>${escapeHtml(community.description)}</span>
                </span>
                <span class="material-symbols-outlined">${isSelected ? 'check_circle' : 'add_circle'}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="composer-actions composer-actions--modal">
          <span class="helper-text">
            ${remainingCount ? `Select ${remainingCount} more ${remainingCount === 1 ? 'community' : 'communities'} to continue.` : 'Ready to build your personalized feed.'}
          </span>
          <button class="button-primary" type="button" data-action="submit-onboarding" ${canContinue ? '' : 'disabled'}>
            ${state.onboardingSubmitting ? 'Joining...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  `;
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

function getLocalPost(postId) {
  const normalizedPostId = String(postId);
  const collections = [...getPostCollections(), state.likedPosts, state.savedPosts];

  for (const posts of collections) {
    const post = posts.find((item) => item?._id === normalizedPostId);

    if (post) {
      return post;
    }
  }

  return state.currentPost?._id === normalizedPostId ? state.currentPost : null;
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

  const likedPost = getLocalPost(postId);
  if (liked && likedPost) {
    prependUniquePost(state.likedPosts, likedPost);
  } else if (!liked) {
    state.likedPosts = state.likedPosts.filter((post) => post?._id !== String(postId));
  }

  syncLikeButtons(postId);
}

function toggleSavedPost(postId) {
  const normalizedPostId = String(postId);

  if (state.savedPostIds.has(normalizedPostId)) {
    state.savedPostIds.delete(normalizedPostId);
    state.savedPosts = state.savedPosts.filter((post) => post?._id !== normalizedPostId);
    persistSavedPostIds();
    renderCurrentView();
    showToast('Post removed from saved.');
    return;
  }

  const post = getLocalPost(normalizedPostId);
  state.savedPostIds.add(normalizedPostId);

  if (post) {
    prependUniquePost(state.savedPosts, post);
  }

  persistSavedPostIds();
  renderCurrentView();
  showToast('Post saved.');
}

function renderEmptyState(title, copy = '', options = {}) {
  const toneClass = options.tone ? ` empty-state--${options.tone}` : '';
  const copyMarkup = copy ? `<p>${escapeHtml(copy)}</p>` : '';

  return `
    <section class="empty-state${toneClass}">
      <h3>${escapeHtml(title)}</h3>
      ${copyMarkup}
    </section>
  `;
}

function getProfilePostsByTab() {
  const searchedPosts = state.search
    ? state.profilePosts.filter((post) => matchesSearch(post, state.search))
    : [...state.profilePosts];

  if (state.profileTab === 'liked') {
    const likedPosts = state.search
      ? state.likedPosts.filter((post) => matchesSearch(post, state.search))
      : [...state.likedPosts];

    return likedPosts;
  }

  if (state.profileTab === 'saved') {
    const savedPosts = state.savedPosts.filter((post) => state.savedPostIds.has(String(post._id)));

    return state.search
      ? savedPosts.filter((post) => matchesSearch(post, state.search))
      : [...savedPosts];
  }

  return searchedPosts;
}

function renderProfileTabs() {
  return `
    <div class="profile-tabs" role="tablist" aria-label="Profile post filters">
      ${PROFILE_TABS.map((tab) => `
        <button
          class="profile-tab ${state.profileTab === tab.id ? 'is-active' : ''}"
          type="button"
          role="tab"
          aria-selected="${String(state.profileTab === tab.id)}"
          data-action="set-profile-tab"
          data-profile-tab="${tab.id}">
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderWellnessCard(resource) {
  const resourceUrl = String(resource?.url || '').trim();
  const communityTag = escapeHtml(resource?.communityTag || formatCommunityLabel(resource?.category));
  const sourceLabel = escapeHtml(resource?.source || 'Wellness Source');
  const title = escapeHtml(resource?.title || 'Untitled resource');
  const description = escapeHtml(resource?.description || '');
  const readTime = escapeHtml(resource?.readTime || '');
  const actionMarkup = resourceUrl
    ? `
        <a class="soft-button wellness-card__link" href="${escapeHtml(resourceUrl)}" target="_blank" rel="noopener noreferrer">
          <span>Read more</span>
          <span class="material-symbols-outlined">arrow_outward</span>
        </a>
      `
    : `
        <button class="soft-button wellness-card__link" type="button" disabled>
          <span>Read more</span>
          <span class="material-symbols-outlined">arrow_outward</span>
        </button>
      `;

  return `
    <article class="health-card wellness-card">
      <div class="wellness-card__meta">
        <div class="wellness-card__badges">
          <span class="micro-chip">${sourceLabel}</span>
          <span class="micro-chip">${communityTag}</span>
        </div>
        <span class="wellness-card__time">${readTime}</span>
      </div>
      <div class="wellness-card__copy">
        <h4>${title}</h4>
        <p class="wellness-card__description wellness-card__description--expanded">${description}</p>
      </div>
      <div class="wellness-card__footer">
        ${actionMarkup}
      </div>
    </article>
  `;
}

function renderWellnessPicksBody() {
  const joinedCategories = getJoinedCommunityCategories();

  if (!joinedCategories.length) {
    return `
      <article class="health-card wellness-card wellness-card--empty">
        <p>Join communities to see personalized wellness picks ✨</p>
      </article>
    `;
  }

  if (state.wellnessPicksLoading) {
    return `
      <article class="health-card wellness-card wellness-card--empty">
        <p>Loading wellness picks...</p>
      </article>
    `;
  }

  if (!state.wellnessPicks.length) {
    return `
      <article class="health-card wellness-card wellness-card--empty">
        <p>No resources available right now</p>
      </article>
    `;
  }

  return `
    <div class="wellness-picks-list">
      ${state.wellnessPicks.map((resource) => renderWellnessCard(resource)).join('')}
    </div>
    <div class="wellness-pagination">
      <button class="soft-button" type="button" data-action="wellness-prev-page" ${state.wellnessPicksPage <= 1 || state.wellnessPicksLoading ? 'disabled' : ''}>
        &larr; Prev
      </button>
      <span class="wellness-pagination__status">Page ${state.wellnessPicksPage} of ${state.wellnessPicksTotalPages}</span>
      <button class="soft-button" type="button" data-action="wellness-next-page" ${state.wellnessPicksPage >= state.wellnessPicksTotalPages || state.wellnessPicksLoading ? 'disabled' : ''}>
        Next &rarr;
      </button>
    </div>
  `;
}

function renderSidebar() {
  const profileName = state.profile?.name || 'Healthopia';
  elements.headerAvatar.innerHTML = renderAvatar(state.profile || { name: profileName }, 'small');
  elements.profileMenu.innerHTML = `
    <div class="profile-menu__card">
      <div class="profile-menu__header">
        ${renderAvatar(state.profile || { name: profileName }, 'large')}
        <div class="profile-menu__copy">
          <strong>${escapeHtml(state.profile?.name || 'Healthopia Member')}</strong>
          <span>@${escapeHtml(state.profile?.username || 'member')}</span>
        </div>
      </div>

      <div class="profile-menu__stats">
        <div class="profile-menu__stat">
          <strong>${formatCompactNumber(state.profileStats.postsCount)}</strong>
          <span>Total Posts</span>
        </div>
        <div class="profile-menu__stat">
          <strong>${formatCompactNumber(state.profileStats.likesCount)}</strong>
          <span>Total Likes</span>
        </div>
      </div>

      <div class="profile-menu__actions">
        <button type="button" data-route="/profile">Your Profile</button>
        <button type="button" data-action="logout">Logout</button>
      </div>
    </div>
  `;

  const joinedCommunities = getJoinedCommunities();
  elements.joinedCommunitiesList.innerHTML = joinedCommunities.length
    ? joinedCommunities.map((community) => `
        <li>
          <div class="circle-list__main">
            <span class="circle-dot" style="${getAccentVars(community.communityName)}"></span>
            <button type="button" data-route="/community/${community._id}">${escapeHtml(community.communityName)}</button>
          </div>
          <button class="circle-list__leave" type="button" data-action="leave-community" data-community-id="${community._id}" aria-label="Leave ${escapeHtml(community.communityName)}">
            <span class="material-symbols-outlined">close</span>
          </button>
        </li>
      `).join('')
    : '<li><span class="muted-copy">No circles joined yet.</span></li>';

  const health = state.health || { waterIntake: 0, waterGoal: 2500, hydrationPercent: 0, steps: 0, stepsPercent: 0 };
  elements.healthSidebar.innerHTML = `


    <article class="health-card">
      <div class="ring-row">
        <div class="ring__meta">
          <span class="mini-card__label">Daily Steps</span>
          <strong>${formatCompactNumber(health.steps)}</strong>
          <span>${health.stepsPercent}% of ${formatCompactNumber(health.stepsGoal || 10000)} goal</span>
        </div>
        <div class="ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="none" style="stroke:var(--ring-track);" stroke-width="10"></circle>
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              style="stroke:var(--ring-progress);"
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

  const recommendedCommunities = getTrendingCommunities();
  if (elements.communityRecommendationsSidebar) {
    elements.communityRecommendationsSidebar.innerHTML = recommendedCommunities.length
      ? recommendedCommunities.map((community) => `
          <article class="recommendation-card">
            <div class="recommendation-card__main">
              <span class="accent-tile" style="${getAccentVars(community.communityName)}">${escapeHtml(community.communityName.charAt(0))}</span>
              <div class="recommendation-card__copy">
                <h3>${escapeHtml(community.communityName)}</h3>
              </div>
            </div>
            <button class="join-button recommendation-card__button" type="button" data-action="join-community" data-community-id="${community._id}">
              Join
            </button>
          </article>
        `).join('')
      : `
          <article class="health-card wellness-card wellness-card--empty">
            <p>You have already explored every available community.</p>
          </article>
        `;
  }

  if (elements.wellnessPicksList) {
    elements.wellnessPicksList.innerHTML = renderWellnessPicksBody();
  }

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
    if (window.location.pathname.startsWith('/community/') && item.dataset.action === 'open-first-community') {
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

function syncUpdatedPost(updatedPost) {
  if (!updatedPost?._id) {
    return;
  }

  let previousCommentsCount = null;
  let affectsCurrentUsersPost = false;

  visitLocalPost(updatedPost._id, (post) => {
    if (previousCommentsCount === null) {
      previousCommentsCount = post.comments?.length || 0;
      affectsCurrentUsersPost = isCurrentUserPostOwner(post);
    }

    Object.assign(post, updatedPost);
  });

  if (state.currentPost?._id === updatedPost._id) {
    if (previousCommentsCount === null) {
      previousCommentsCount = state.currentPost.comments?.length || 0;
      affectsCurrentUsersPost = isCurrentUserPostOwner(state.currentPost);
    }

    state.currentPost = updatedPost;
  }

  if (previousCommentsCount !== null && affectsCurrentUsersPost) {
    state.profileStats.commentsCount = Math.max(
      0,
      (state.profileStats.commentsCount || 0) + ((updatedPost.comments?.length || 0) - previousCommentsCount)
    );
  }
}

function renderCommentPanel(post, isOpen) {
  if (!isOpen) {
    return '';
  }

  const comments = post.comments || [];
  const postId = String(post._id);

  return `
    <div class="comment-panel" id="comments-${postId}">
      <form class="comment-form" data-comment-form data-post-id="${postId}">
        <label class="field comment-field">
          <span>Add a comment</span>
          <textarea name="description" rows="2" placeholder="Share an encouraging reply..." required></textarea>
        </label>
        <button class="button-primary" type="submit">Post comment</button>
      </form>

      <div class="comment-list">
        ${comments.length ? comments.map((comment) => `
          <article class="surface-panel comment-surface">
            <div class="comment-pill">
              ${renderAvatar(comment.userId || { name: 'Member' }, 'small')}
              <div class="comment-bubble">
                <strong>${escapeHtml(comment.userId?.name || 'Community Member')}</strong>
                <span>${escapeHtml(comment.description)}</span>
              </div>
            </div>
          </article>
        `).join('') : `
          <section class="empty-state empty-state--comments">
            <h3>No comments yet</h3>
            <p>Start the conversation with a supportive response.</p>
          </section>
        `}
      </div>
    </div>
  `;
}

function renderPostCard(post, options = {}) {
  const author = getPostAuthor(post);
  const community = getPostCommunity(post);
  const title = getPostTitle(post);
  const body = getPostBody(post);
  const image = getPostImageUrl(post);
  const isLiked = likeManager.isLiked(post._id);
  const postId = String(post._id);
  const isCommentsOpen = state.openCommentPostIds.has(postId);
  const isSaved = state.savedPostIds.has(postId);
  const canDelete = isCurrentUserPostOwner(post);

  return `
    <article class="post-card">
      <div class="post-card__body">
        <div class="post-card__header">
          <div class="post-card__meta">
            <div class="meta-copy">
              <h3>
                ${community?._id
                  ? `<button class="post-community-link" type="button" data-route="/community/${community._id}">${escapeHtml(community.communityName)}</button>`
                  : (community ? escapeHtml(community.communityName) : 'Community')}
              </h3>
              <p class="meta-line">
                ${escapeHtml(formatRelativeTime(post.updatedAt || post.createdAt))}
                ${author ? `&bull; ${escapeHtml(author.username ? `@${author.username}` : author.name || 'Member')}` : ''}
              </p>
            </div>
          </div>
          <div class="post-card__header-actions">
            ${canDelete ? `
              <button class="icon-ghost icon-ghost--danger" type="button" data-action="delete-post" data-post-id="${postId}" aria-label="Delete post">
                <span class="material-symbols-outlined">delete</span>
              </button>
            ` : ''}
            <button class="icon-ghost" type="button" data-route="/post/${postId}" aria-label="Open post">
              <span class="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
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

        ${image ? `<img class="post-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(title || body || 'Post image')}" loading="lazy">` : ''}
      </div>

      <div class="post-card__footer">
        <div class="post-card__actions">
          <button class="post-action ${isLiked ? 'is-active' : ''}" type="button" data-action="like-post" data-post-id="${postId}" aria-pressed="${String(isLiked)}">
            <span class="material-symbols-outlined"${isLiked ? ' style="font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;"' : ''}>favorite</span>
            <span data-like-count>${formatCompactNumber(post.likes || 0)}</span>
          </button>
          <button class="post-action ${isCommentsOpen ? 'is-active' : ''}" type="button" data-action="toggle-comments" data-post-id="${postId}" aria-expanded="${String(isCommentsOpen)}" aria-controls="comments-${postId}">
            <span class="material-symbols-outlined">chat_bubble</span>
            <span>${formatCompactNumber(post.comments?.length || 0)}</span>
          </button>
          <button class="post-action" type="button" data-action="share-post" data-post-id="${postId}">
            <span class="material-symbols-outlined">share</span>
          </button>
        </div>
        <button class="post-action ${isSaved ? 'is-active' : ''}" type="button" data-action="toggle-save-post" data-post-id="${postId}" aria-pressed="${String(isSaved)}">
          <span class="material-symbols-outlined">bookmark</span>
        </button>
      </div>

      ${renderCommentPanel(post, isCommentsOpen)}
    </article>
  `;
}

function renderPostFeed(posts, emptyTitle, emptyCopy, options = {}) {
  if (!posts.length) {
    return renderEmptyState(emptyTitle, emptyCopy, options);
  }

  return `<div class="feed-stack">${posts.map((post) => renderPostCard(post, options)).join('')}</div>`;
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
    </section>

    <div class="filter-row">
      <button class="filter-pill ${state.feedFilter === 'all' ? 'is-active' : ''}" type="button" data-filter-community="all">All Feed</button>
      ${joinedCommunities.map((community) => `
        <button class="filter-pill ${state.feedFilter === community._id ? 'is-active' : ''}" type="button" data-filter-community="${community._id}">
          ${escapeHtml(community.communityName)}
        </button>
      `).join('')}
    </div>

    ${joinedCommunities.length
      ? renderPostFeed(
          homePosts,
          'No posts yet. Be the first to share your journey \u2728',
          'Fresh updates from your joined communities will appear here as soon as someone shares.',
          { tone: 'feed' }
        )
      : renderCommunitySuggestions()}
  `;
}

function renderWellnessPicksView() {
  elements.viewRoot.innerHTML = `
    <section class="page-heading">
      <h1>Wellness Picks</h1>
      <p>Personalized health resources curated from the communities you have joined.</p>
    </section>

    ${renderWellnessPicksBody()}
  `;
}

function renderProfileView() {
  const profilePosts = getProfilePostsByTab();
  const activeTab = PROFILE_TABS.find((tab) => tab.id === state.profileTab);
  const profileName = state.profile?.name || 'Healthopia Member';
  const profileUsername = state.profile?.username || 'member';
  const emptyTitle = state.profileTab === 'liked'
    ? "You haven't liked any of your visible posts yet"
    : state.profileTab === 'saved'
      ? 'No saved posts yet'
      : "You haven't posted anything yet";

  elements.viewRoot.innerHTML = `
    <section class="profile-hero">
      <div class="profile-hero__header">
        <div class="post-card__meta">
          ${renderAvatar(state.profile || { name: 'Profile' }, 'large')}
          <div class="profile-hero__copy">
            <h1>@${escapeHtml(profileUsername)}</h1>
            <p>${escapeHtml(profileName)}</p>
            <p>${formatCompactNumber(state.profileStats.communitiesCount)} communities joined &bull; ${formatCompactNumber(state.profileStats.postsCount)} posts created</p>
          </div>
        </div>
        <div class="profile-hero__stats">
          <span class="community-badge">${formatCompactNumber(state.profileStats.likesCount)} likes</span>
          <span class="community-badge">${formatCompactNumber(state.profileStats.commentsCount)} comments</span>
        </div>
      </div>
    </section>

    <section class="detail-card">
      <div class="detail-card__header detail-card__header--stacked">
        ${renderProfileTabs()}
      </div>
      <p class="micro-copy">Showing ${escapeHtml(activeTab?.label || 'All Posts')}</p>
    </section>

    <section class="profile-grid">
      ${renderPostFeed(
        profilePosts,
        emptyTitle,
        '',
        { tone: 'profile' }
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
        <button class="${community.isJoined ? 'soft-button' : 'button-primary'}" type="button" data-action="${community.isJoined ? 'leave-community' : 'join-community'}" data-community-id="${community._id}">
          ${community.isJoined ? 'Leave community' : 'Join community'}
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

      ${renderPostCard(post)}
    </section>
  `;
}

function getClientDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function parseActivityDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function getPreviousDateKey(dateKey) {
  const date = parseActivityDate(dateKey);
  date.setDate(date.getDate() - 1);

  return getClientDateKey(date);
}

function formatActivityDayLabel(dateKey, options = {}) {
  const date = parseActivityDate(dateKey);
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: options.long ? 'long' : 'short',
    month: options.long ? 'short' : undefined,
    day: options.long ? 'numeric' : undefined
  });

  return formatter.format(date);
}

function formatActivityMetric(key, value) {
  const numberValue = Number(value || 0);

  if (key === 'walking') {
    return `${formatCompactNumber(Math.round(numberValue))} steps`;
  }

  if (key === 'running') {
    return `${numberValue.toFixed(numberValue % 1 ? 1 : 0)} km`;
  }

  return `${numberValue.toFixed(numberValue % 1 ? 1 : 0)} h`;
}

function normalizeActivityDay(day = {}, fallbackDate = getClientDateKey()) {
  const walking = Number(day.walking ?? day.steps ?? 0);
  const running = Number(day.running ?? 0);
  const sleep = Number(day.sleep ?? 0);

  return {
    date: String(day.date || fallbackDate),
    walking: Number.isFinite(walking) ? walking : 0,
    running: Number.isFinite(running) ? running : 0,
    sleep: Number.isFinite(sleep) ? sleep : 0,
    hasData: Boolean(day.hasData)
  };
}

function getDashboardTodayKey() {
  return state.weeklyData[state.weeklyData.length - 1]?.date || getClientDateKey();
}

function getActivityDay(dateKey = state.selectedDay) {
  const resolvedDate = dateKey || getDashboardTodayKey();
  return state.weeklyData.find((day) => day.date === resolvedDate) || normalizeActivityDay({ date: resolvedDate });
}

function getActivityScores(day) {
  const walkingScore = Math.min(day.walking / ACTIVITY_TARGETS.walking, 1);
  const runningScore = Math.min(day.running / ACTIVITY_TARGETS.running, 1);
  const sleepScore = Math.min(day.sleep / ACTIVITY_TARGETS.sleep, 1);
  const totalScore = (walkingScore + runningScore + sleepScore) / 3;
  const scoreTotal = walkingScore + runningScore + sleepScore;

  return {
    walkingScore,
    runningScore,
    sleepScore,
    heightPercent: Math.round(totalScore * 100),
    walkingShare: scoreTotal ? (walkingScore / scoreTotal) * 100 : 0,
    runningShare: scoreTotal ? (runningScore / scoreTotal) * 100 : 0,
    sleepShare: scoreTotal ? (sleepScore / scoreTotal) * 100 : 0
  };
}

function getMetricComparison(day, metricKey) {
  const previousDay = getActivityDay(getPreviousDateKey(day.date));

  if (!previousDay.hasData) {
    return 'No previous day logged';
  }

  const delta = Number(day[metricKey] || 0) - Number(previousDay[metricKey] || 0);

  if (delta === 0) {
    return 'Same as previous day';
  }

  const direction = delta > 0 ? '+' : '-';
  return `${direction}${formatActivityMetric(metricKey, Math.abs(delta))} vs previous day`;
}

function renderActivityChart() {
  return `
    <div class="dashboard-chart" aria-label="Last 7 days health activity">
      ${state.weeklyData.map((day) => {
        const scores = getActivityScores(day);
        const isSelected = day.date === state.selectedDay;
        const tooltip = [
          `Walking: ${formatActivityMetric('walking', day.walking)}`,
          `Running: ${formatActivityMetric('running', day.running)}`,
          `Sleep: ${formatActivityMetric('sleep', day.sleep)}`
        ].join(' | ');

        return `
          <button
            class="dashboard-chart__day ${isSelected ? 'is-selected' : ''}"
            type="button"
            data-action="select-dashboard-day"
            data-date="${escapeHtml(day.date)}"
            aria-pressed="${String(isSelected)}"
            aria-label="${escapeHtml(`${formatActivityDayLabel(day.date, { long: true })}: ${tooltip}`)}">
            <span class="dashboard-chart__tooltip" role="tooltip">
              <strong>${escapeHtml(formatActivityDayLabel(day.date, { long: true }))}</strong>
              <span>${escapeHtml(formatActivityMetric('walking', day.walking))}</span>
              <span>${escapeHtml(formatActivityMetric('running', day.running))}</span>
              <span>${escapeHtml(formatActivityMetric('sleep', day.sleep))}</span>
            </span>
            <span class="dashboard-chart__track">
              <span class="dashboard-chart__stack" style="--bar-height:${scores.heightPercent}%; --walking-height:${scores.walkingShare}%; --running-height:${scores.runningShare}%; --sleep-height:${scores.sleepShare}%;">
                <span class="dashboard-chart__segment dashboard-chart__segment--sleep"></span>
                <span class="dashboard-chart__segment dashboard-chart__segment--running"></span>
                <span class="dashboard-chart__segment dashboard-chart__segment--walking"></span>
              </span>
            </span>
            <span class="dashboard-chart__label">${escapeHtml(formatActivityDayLabel(day.date))}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderDailyStats(day) {
  return `
    <div class="dashboard-stat-grid">
      ${ACTIVITY_METRICS.map((metric) => `
        <article class="dashboard-stat ${metric.colorClass}">
          <span class="dashboard-stat__label">${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(formatActivityMetric(metric.key, day[metric.key]))}</strong>
          <span class="dashboard-stat__comparison">${escapeHtml(getMetricComparison(day, metric.key))}</span>
        </article>
      `).join('')}
    </div>
  `;
}

function renderTodayLogPanel() {
  const todayKey = getDashboardTodayKey();
  const today = getActivityDay(todayKey);

  if (!today.hasData) {
    return `
      <article class="detail-card dashboard-log-card">
        <div>
          <span class="micro-chip">Today</span>
          <h2>Daily log</h2>
          <p class="muted-copy">Add today's walking, running, and sleep when you are ready.</p>
        </div>
        <button class="button-primary" type="button" data-action="open-health-log-modal" data-date="${escapeHtml(todayKey)}">Log Activity</button>
      </article>
    `;
  }

  return `
    <article class="detail-card dashboard-log-card">
      <div>
        <span class="micro-chip">Today</span>
        <h2>Activity saved</h2>
        <div class="dashboard-log-summary">
          <span>${escapeHtml(formatActivityMetric('walking', today.walking))}</span>
          <span>${escapeHtml(formatActivityMetric('running', today.running))}</span>
          <span>${escapeHtml(formatActivityMetric('sleep', today.sleep))}</span>
        </div>
      </div>
      <button class="soft-button" type="button" data-action="open-health-log-modal" data-date="${escapeHtml(todayKey)}">Edit Activity</button>
    </article>
  `;
}

function renderHealthLogModal() {
  if (!state.healthLogModalOpen) {
    return '';
  }

  const dateKey = state.healthLogDate || getDashboardTodayKey();
  const day = getActivityDay(dateKey);
  const title = day.hasData ? 'Edit Activity' : 'Log Activity';

  return `
    <div id="health-log-modal" class="modal-shell dashboard-modal is-open" aria-hidden="false">
      <div class="modal-shell__backdrop" data-action="dismiss-health-log-modal"></div>

      <div class="composer-card composer-modal" role="dialog" aria-modal="true" aria-labelledby="health-log-modal-title">
        <form id="health-log-form" class="stack-form" novalidate>
          <div class="composer-modal__header">
            <div class="composer-modal__heading">
              <h2 id="health-log-modal-title">${escapeHtml(title)}</h2>
              <p class="muted-copy">${escapeHtml(formatActivityDayLabel(dateKey, { long: true }))}</p>
            </div>

            <button class="soft-button" type="button" data-action="dismiss-health-log-modal">Close</button>
          </div>

          <input type="hidden" name="date" value="${escapeHtml(dateKey)}">

          <div class="field-grid">
            <label class="field">
              <span>Steps</span>
              <input type="number" min="0" step="1" name="steps" value="${escapeHtml(String(day.walking || 0))}" required>
            </label>

            <label class="field">
              <span>Running (km)</span>
              <input type="number" min="0" step="0.1" name="running" value="${escapeHtml(String(day.running || 0))}" required>
            </label>
          </div>

          <label class="field">
            <span>Sleep (hours)</span>
            <input type="number" min="0" step="0.25" name="sleep" value="${escapeHtml(String(day.sleep || 0))}" required>
          </label>

          <div class="composer-actions composer-actions--modal">
            <span class="helper-text">Saved activity updates the dashboard and today's tracker.</span>
            <button class="button-primary" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderHealthView() {
  if (!state.weeklyData.length) {
    state.weeklyData = Array.from({ length: 7 }, (_item, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return normalizeActivityDay({ date: getClientDateKey(date) });
    });
  }

  if (!state.selectedDay) {
    state.selectedDay = getDashboardTodayKey();
  }

  const selectedDay = getActivityDay(state.selectedDay);

  elements.viewRoot.innerHTML = `
    <section class="health-layout">
      <div class="page-heading">
        <h1>Health-Pulse</h1>
        <p>Review the last seven days, compare daily movement and sleep, and keep today's activity current.</p>
      </div>

      <article class="detail-card">
        <div class="detail-card__header detail-card__header--stacked">
          <div>
            <h2>Health activity</h2>
            <p class="muted-copy">Stacked by walking, running, and sleep against daily targets.</p>
          </div>
          <span class="micro-chip">${escapeHtml(formatActivityDayLabel(selectedDay.date, { long: true }))}</span>
        </div>

        ${renderActivityChart()}
      </article>

      ${renderDailyStats(selectedDay)}
      ${renderTodayLogPanel()}
    </section>
    ${renderHealthLogModal()}
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
    return;
  }

  if (route.name === 'wellness-picks') {
    renderWellnessPicksView();
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
  state.likedPosts = profileData.likedPosts || [];
  state.profileStats = profileData.stats;
  state.communities = communitiesData.communities;
  state.health = healthData.health;
  likeManager.replaceLikedPosts(profileData.user?.likedPosts || []);
  state.savedPostIds = new Set(getStoredSavedPostIds());

  if (state.savedPostIds.size) {
    const savedPostResults = await Promise.allSettled(
      [...state.savedPostIds].map((postId) => apiFetch(`/api/posts/${postId}`))
    );

    state.savedPosts = savedPostResults
      .filter((result) => result.status === 'fulfilled' && result.value?.post)
      .map((result) => result.value.post);

    const validSavedPostIds = new Set(state.savedPosts.map((post) => String(post._id)));
    state.savedPostIds.forEach((postId) => {
      if (!validSavedPostIds.has(postId)) {
        state.savedPostIds.delete(postId);
      }
    });
    persistSavedPostIds();
  } else {
    state.savedPosts = [];
  }

  await loadWellnessPicksPage(1);

  state.shellHydrated = true;

  const validCommunityIds = new Set(getJoinedCommunities().map((community) => community._id));
  if (state.feedFilter !== 'all' && !validCommunityIds.has(state.feedFilter)) {
    state.feedFilter = 'all';
  }

  const allCommunityIds = new Set(state.communities.map((community) => community._id));
  state.onboardingSelectedCommunityIds.forEach((communityId) => {
    if (validCommunityIds.has(communityId) || !allCommunityIds.has(communityId)) {
      state.onboardingSelectedCommunityIds.delete(communityId);
    }
  });
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
    return;
  }

  if (route.name === 'health') {
    const response = await apiFetch('/api/health/weekly');
    state.weeklyData = (response.weeklyData || []).map((day) => normalizeActivityDay(day));
    state.selectedDay = state.weeklyData.some((day) => day.date === state.selectedDay)
      ? state.selectedDay
      : response.selectedDay || getDashboardTodayKey();
    return;
  }

  if (route.name === 'wellness-picks') {
    return;
  }
}

async function refreshView(options = {}) {
  if (!options.skipLoading) {
    renderLoadingState(options.loadingTitle);
  }

  try {
    await loadShellData({ force: options.refreshShell });
    const route = getRoute();

    if (needsOnboarding()) {
      renderSidebar();
      renderOnboardingGate();
      renderOnboardingModal();
      return;
    }

    await loadViewData();
    renderSidebar();
    renderCurrentView();
    renderOnboardingModal();
  } catch (error) {
    renderOnboardingModal();
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

function applyCommunityLeaveToLocalState(communityId) {
  const normalizedCommunityId = String(communityId);
  const community = state.communities.find((item) => item._id === normalizedCommunityId);

  if (community) {
    community.isJoined = false;
    community.noOfActiveMembers = Math.max(0, (community.noOfActiveMembers || 0) - 1);
  }

  if (state.profile?.communitiesJoined) {
    state.profile.communitiesJoined = state.profile.communitiesJoined.filter(
      (joinedCommunity) => joinedCommunity._id !== normalizedCommunityId
    );
  }

  state.profileStats.communitiesCount = Math.max(0, (state.profileStats.communitiesCount || 0) - 1);
  state.homePosts = state.homePosts.filter((post) => getPostCommunity(post)?._id !== normalizedCommunityId);
  const joinedCategories = new Set(getJoinedCommunityCategories());
  state.wellnessPicks = state.wellnessPicks.filter((resource) => joinedCategories.has(resource.category));

  if (state.currentCommunity?._id === normalizedCommunityId) {
    state.currentCommunity = {
      ...state.currentCommunity,
      isJoined: false,
      noOfActiveMembers: Math.max(0, (state.currentCommunity.noOfActiveMembers || 0) - 1)
    };
  }

  if (state.feedFilter === normalizedCommunityId) {
    state.feedFilter = 'all';
  }
}

async function handleLeaveCommunity(communityId) {
  const confirmed = window.confirm('Leave this community? Its posts will be removed from your feed.');

  if (!confirmed) {
    return;
  }

  applyCommunityLeaveToLocalState(communityId);
  renderSidebar();
  renderCurrentView();
  renderOnboardingModal();

  try {
    await apiFetch(`/api/communities/${communityId}/join`, {
      method: 'DELETE'
    });

    showToast('Community left.');
    await refreshView({ skipLoading: true, refreshShell: true });
  } catch (error) {
    showToast(error.message, 'error');
    await refreshView({ skipLoading: true, refreshShell: true });
  }
}

async function handleOnboardingSubmit() {
  if (state.onboardingSubmitting) {
    return;
  }

  if (getOnboardingTotalCount() < MIN_ONBOARDING_COMMUNITIES) {
    showToast(`Choose at least ${MIN_ONBOARDING_COMMUNITIES} communities to continue.`, 'error');
    return;
  }

  const selectedCommunityIds = [...state.onboardingSelectedCommunityIds];
  state.onboardingSubmitting = true;
  renderOnboardingModal();

  try {
    await Promise.all(selectedCommunityIds.map((communityId) => apiFetch(`/api/communities/${communityId}/join`, {
      method: 'POST'
    })));

    state.onboardingSelectedCommunityIds.clear();
    showToast('Your feed is ready.');
    await refreshView({ skipLoading: true, refreshShell: true });
  } catch (error) {
    showToast(error.message, 'error');
    await refreshView({ skipLoading: true, refreshShell: true });
  } finally {
    state.onboardingSubmitting = false;
    renderOnboardingModal();
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

async function handleComment(form) {
  const postId = form.dataset.postId;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Posting...';

  try {
    const formData = new FormData(form);

    const response = await apiFetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        description: formData.get('description')
      })
    });

    syncUpdatedPost(response.post);
    state.openCommentPostIds.add(postId);
    showToast('Comment added.');
    form.reset();
    renderSidebar();
    renderCurrentView();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Post comment';
  }
}

function removePostFromLocalState(postId) {
  const normalizedPostId = String(postId);
  const localPost = getPostCollections()
    .flat()
    .find((post) => post?._id === normalizedPostId)
    || (state.currentPost?._id === normalizedPostId ? state.currentPost : null);

  state.homePosts = state.homePosts.filter((post) => post?._id !== normalizedPostId);
  state.profilePosts = state.profilePosts.filter((post) => post?._id !== normalizedPostId);
  state.likedPosts = state.likedPosts.filter((post) => post?._id !== normalizedPostId);
  state.savedPosts = state.savedPosts.filter((post) => post?._id !== normalizedPostId);
  state.communityPosts = state.communityPosts.filter((post) => post?._id !== normalizedPostId);
  state.savedPostIds.delete(normalizedPostId);
  persistSavedPostIds();
  state.openCommentPostIds.delete(normalizedPostId);

  if (state.currentPost?._id === normalizedPostId) {
    state.currentPost = null;
  }

  if (localPost && isCurrentUserPostOwner(localPost)) {
    state.profileStats.postsCount = Math.max(0, (state.profileStats.postsCount || 0) - 1);
    state.profileStats.commentsCount = Math.max(
      0,
      (state.profileStats.commentsCount || 0) - (localPost.comments?.length || 0)
    );
    state.profileStats.likesCount = Math.max(
      0,
      (state.profileStats.likesCount || 0) - (localPost.likes || 0)
    );
  }
}

async function handleDeletePost(postId) {
  const confirmed = window.confirm('Delete this post? This cannot be undone.');

  if (!confirmed) {
    return;
  }

  const currentRoute = getRoute();
  removePostFromLocalState(postId);

  if (currentRoute.name === 'post') {
    history.pushState({}, '', '/');
  }

  renderSidebar();
  renderCurrentView();

  try {
    await apiFetch(`/api/posts/${postId}`, {
      method: 'DELETE'
    });

    showToast('Post deleted.');

    if (currentRoute.name === 'post') {
      await refreshView({ skipLoading: true, refreshShell: true });
    }
  } catch (error) {
    showToast(error.message, 'error');
    await refreshView({ skipLoading: true, refreshShell: true });
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

function openHealthLogModal(dateKey = getDashboardTodayKey()) {
  state.healthLogDate = dateKey;
  state.healthLogModalOpen = true;
  renderCurrentView();

  requestAnimationFrame(() => {
    const firstInput = document.querySelector('#health-log-form input[name="steps"]');
    firstInput?.focus();
  });
}

function closeHealthLogModal() {
  if (!state.healthLogModalOpen) {
    return;
  }

  state.healthLogModalOpen = false;
  state.healthLogDate = '';
  renderCurrentView();
}

async function handleHealthLogSubmit(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const formData = new FormData(form);

    await apiFetch('/api/health/log', {
      method: 'POST',
      body: JSON.stringify({
        date: formData.get('date'),
        steps: Number(formData.get('steps')),
        running: Number(formData.get('running')),
        sleep: Number(formData.get('sleep'))
      })
    });

    state.selectedDay = String(formData.get('date') || getDashboardTodayKey());
    state.healthLogModalOpen = false;
    state.healthLogDate = '';
    showToast('Activity saved.');
    await refreshView({ skipLoading: true, refreshShell: true });
  } catch (error) {
    showToast(error.message, 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Save';
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

    if (needsOnboarding()) {
      renderOnboardingModal();
      showToast(`Join at least ${MIN_ONBOARDING_COMMUNITIES} communities to continue.`, 'error');
      return;
    }

    const targetPath = routeButton.dataset.route;
    closeProfileMenu();
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
      closeProfileMenu();
    }
    return;
  }

  const { action } = actionButton.dataset;

  if (action === 'toggle-onboarding-community') {
    const communityId = actionButton.dataset.communityId;

    if (state.onboardingSelectedCommunityIds.has(communityId)) {
      state.onboardingSelectedCommunityIds.delete(communityId);
    } else {
      state.onboardingSelectedCommunityIds.add(communityId);
    }

    renderOnboardingModal();
    return;
  }

  if (action === 'submit-onboarding') {
    await handleOnboardingSubmit();
    return;
  }

  if (action === 'reload-view') {
    await refreshView();
    return;
  }

  if (action === 'join-community') {
    await handleJoinCommunity(actionButton.dataset.communityId);
    return;
  }

  if (action === 'leave-community') {
    await handleLeaveCommunity(actionButton.dataset.communityId);
    return;
  }

  if (action === 'wellness-prev-page') {
    if (state.wellnessPicksPage > 1 && !state.wellnessPicksLoading) {
      await loadWellnessPicksPage(state.wellnessPicksPage - 1);
      renderSidebar();
      renderCurrentView();
    }
    return;
  }

  if (action === 'wellness-next-page') {
    if (state.wellnessPicksPage < state.wellnessPicksTotalPages && !state.wellnessPicksLoading) {
      await loadWellnessPicksPage(state.wellnessPicksPage + 1);
      renderSidebar();
      renderCurrentView();
    }
    return;
  }

  if (action === 'like-post') {
    await handleLikePost(actionButton.dataset.postId);
    return;
  }

  if (action === 'toggle-comments') {
    const postId = actionButton.dataset.postId;

    if (state.openCommentPostIds.has(postId)) {
      state.openCommentPostIds.delete(postId);
    } else {
      state.openCommentPostIds.add(postId);
    }

    renderCurrentView();
    return;
  }

  if (action === 'toggle-save-post') {
    toggleSavedPost(actionButton.dataset.postId);
    return;
  }

  if (action === 'delete-post') {
    await handleDeletePost(actionButton.dataset.postId);
    return;
  }

  if (action === 'share-post') {
    copyPostLink(actionButton.dataset.postId);
    return;
  }

  if (action === 'set-profile-tab') {
    state.profileTab = actionButton.dataset.profileTab || 'all';
    renderCurrentView();
    return;
  }

  if (action === 'select-dashboard-day') {
    state.selectedDay = actionButton.dataset.date || getDashboardTodayKey();
    renderCurrentView();
    return;
  }

  if (action === 'open-health-log-modal') {
    openHealthLogModal(actionButton.dataset.date || getDashboardTodayKey());
    return;
  }

  if (action === 'dismiss-health-log-modal') {
    closeHealthLogModal();
    return;
  }

  if (action === 'open-post-modal') {
    if (needsOnboarding()) {
      renderOnboardingModal();
      showToast(`Join at least ${MIN_ONBOARDING_COMMUNITIES} communities before posting.`, 'error');
      return;
    }

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

  if (action === 'logout') {
    closeProfileMenu();
    await handleSignOut();
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

  if (event.target.matches('[data-comment-form]')) {
    event.preventDefault();
    await handleComment(event.target);
  }

  if (event.target.id === 'health-form') {
    event.preventDefault();
    await handleHealthUpdate(event.target);
  }

  if (event.target.id === 'health-log-form') {
    event.preventDefault();
    await handleHealthLogSubmit(event.target);
  }
});

elements.profileMenuButton.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleProfileMenu();
});

elements.themeToggleButton?.addEventListener('click', () => {
  toggleTheme();
});

elements.searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderCurrentView();
});

elements.postImageInput.addEventListener('change', (event) => {
  handlePostImageSelection(event.target.files?.[0] || null);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.healthLogModalOpen) {
    closeHealthLogModal();
    return;
  }

  if (event.key === 'Escape' && state.postModalOpen) {
    closePostModal();
    return;
  }

  if (event.key === 'Escape' && state.profileMenuOpen) {
    closeProfileMenu();
  }
});

window.addEventListener('popstate', () => {
  refreshView();
});

initializeTheme();
renderLoadingState();
refreshView({ skipLoading: true });
