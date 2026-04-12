function normalizePostId(postId) {
  return String(postId);
}

export function createPostLikeManager(initialLikedPostIds = []) {
  let likedPostIds = new Set(initialLikedPostIds.map(normalizePostId));
  const pendingRequests = new Map();

  return {
    isLiked(postId) {
      return likedPostIds.has(normalizePostId(postId));
    },

    isPending(postId) {
      return pendingRequests.has(normalizePostId(postId));
    },

    replaceLikedPosts(postIds = []) {
      likedPostIds = new Set(postIds.map(normalizePostId));
    },

    snapshot() {
      return Array.from(likedPostIds);
    },

    beginOptimisticToggle(postId, currentLikesCount = 0) {
      const normalizedPostId = normalizePostId(postId);

      if (pendingRequests.has(normalizedPostId)) {
        return null;
      }

      const previousLiked = likedPostIds.has(normalizedPostId);
      const nextLiked = !previousLiked;
      const nextLikesCount = Math.max(0, currentLikesCount + (nextLiked ? 1 : -1));

      pendingRequests.set(normalizedPostId, {
        liked: previousLiked,
        likesCount: currentLikesCount
      });

      if (nextLiked) {
        likedPostIds.add(normalizedPostId);
      } else {
        likedPostIds.delete(normalizedPostId);
      }

      return {
        postId: normalizedPostId,
        liked: nextLiked,
        likesCount: nextLikesCount
      };
    },

    confirm(postId, liked, likesCount) {
      const normalizedPostId = normalizePostId(postId);
      pendingRequests.delete(normalizedPostId);

      if (liked) {
        likedPostIds.add(normalizedPostId);
      } else {
        likedPostIds.delete(normalizedPostId);
      }

      return {
        postId: normalizedPostId,
        liked,
        likesCount
      };
    },

    rollback(postId) {
      const normalizedPostId = normalizePostId(postId);
      const previousState = pendingRequests.get(normalizedPostId);

      if (!previousState) {
        return null;
      }

      pendingRequests.delete(normalizedPostId);

      if (previousState.liked) {
        likedPostIds.add(normalizedPostId);
      } else {
        likedPostIds.delete(normalizedPostId);
      }

      return {
        postId: normalizedPostId,
        liked: previousState.liked,
        likesCount: previousState.likesCount
      };
    }
  };
}
