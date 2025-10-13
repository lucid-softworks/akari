module.exports = {
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
};
