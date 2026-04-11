function buildPostQuery(query) {
  return query
    .populate('createdBy', 'name username profilePicture')
    .populate('communityId', 'communityName description communityPhoto noOfActiveMembers')
    .populate('comments.userId', 'name username profilePicture');
}

module.exports = {
  buildPostQuery
};
