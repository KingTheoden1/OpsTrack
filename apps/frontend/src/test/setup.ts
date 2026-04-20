import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// Clear localStorage between every test so auth state never leaks
beforeEach(() => {
  localStorage.clear();
});
