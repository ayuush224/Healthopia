const Community = require('../models/Community');

const starterCommunities = [
  {
    communityName: 'Fitness Hub',
    description: 'Daily strength, running, recovery, and accountability for consistent movement.',
    noOfActiveMembers: 128,
    communityPhoto: ''
  },
  {
    communityName: 'Yoga Flow',
    description: 'Gentle practice, breathwork, flexibility, and mindful routines for every level.',
    noOfActiveMembers: 86,
    communityPhoto: ''
  },
  {
    communityName: 'Nutritionists',
    description: 'Meal ideas, hydration habits, sustainable nutrition tips, and healthy recipes.',
    noOfActiveMembers: 94,
    communityPhoto: ''
  },
  {
    communityName: 'Mental Clarity',
    description: 'Meditation, sleep routines, stress management, and emotional wellness support.',
    noOfActiveMembers: 73,
    communityPhoto: ''
  }
];

async function seedCommunities() {
  const communityCount = await Community.countDocuments();

  if (!communityCount) {
    await Community.insertMany(starterCommunities);
  }
}

module.exports = {
  seedCommunities
};
