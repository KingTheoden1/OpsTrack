import '@testing-library/jest-dom';

// Clear localStorage between every test so auth state never leaks
beforeEach(() => {
  localStorage.clear();
});
