const { router } = require('expo-router');

module.exports = {
  useNavigateToPost: jest.fn(() => jest.fn(({ actor, rKey }) => {
    router.push(`/(tabs)/index/user-profile/${actor}/post/${rKey}`);
  })),
  useNavigateToProfile: jest.fn(() => jest.fn(({ actor }) => {
    router.push(`/(tabs)/index/user-profile/${actor}`);
  })),
};
