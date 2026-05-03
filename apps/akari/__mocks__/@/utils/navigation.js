const { router } = require('expo-router');

module.exports = {
  useNavigateToPost: jest.fn(() => jest.fn(({ actor, rKey }) => {
    router.push(`/(tabs)/index/user-profile/${actor}/post/${rKey}`);
  })),
  useNavigateToProfile: jest.fn(() => jest.fn(({ actor }) => {
    router.push(`/(tabs)/index/user-profile/${actor}`);
  })),
  useProfileHref: jest.fn(() => jest.fn((actor) => `/(tabs)/index/user-profile/${actor}`)),
  usePostHref: jest.fn(() => jest.fn(({ actor, rKey }) => `/(tabs)/index/user-profile/${actor}/post/${rKey}`)),
};
