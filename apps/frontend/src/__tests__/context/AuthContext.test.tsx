import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

const TEST_USER: User = { id: 1, email: 'auth@ops.com', role: 'admin', created_at: '' };
const TEST_TOKEN = 'fake.jwt.token';

// Small consumer component so we can drive the context from inside a test
function AuthConsumer() {
  const { user, token, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => signIn(TEST_TOKEN, TEST_USER)}>sign-in</button>
      <button onClick={signOut}>sign-out</button>
    </div>
  );
}

function Wrapped() {
  return (
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  it('starts with no user or token when localStorage is empty', () => {
    render(<Wrapped />);
    expect(screen.getByTestId('email').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('none');
  });

  it('restores user and token from localStorage on mount', () => {
    localStorage.setItem('token', TEST_TOKEN);
    localStorage.setItem('user', JSON.stringify(TEST_USER));

    render(<Wrapped />);

    expect(screen.getByTestId('email').textContent).toBe(TEST_USER.email);
    expect(screen.getByTestId('token').textContent).toBe(TEST_TOKEN);
  });

  it('signIn stores token and user in localStorage and state', async () => {
    render(<Wrapped />);
    await userEvent.click(screen.getByText('sign-in'));

    expect(screen.getByTestId('email').textContent).toBe(TEST_USER.email);
    expect(screen.getByTestId('token').textContent).toBe(TEST_TOKEN);
    expect(localStorage.getItem('token')).toBe(TEST_TOKEN);
    expect(JSON.parse(localStorage.getItem('user')!).email).toBe(TEST_USER.email);
  });

  it('signOut clears token and user from localStorage and state', async () => {
    localStorage.setItem('token', TEST_TOKEN);
    localStorage.setItem('user', JSON.stringify(TEST_USER));

    render(<Wrapped />);
    await userEvent.click(screen.getByText('sign-out'));

    expect(screen.getByTestId('email').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('useAuth throws when called outside AuthProvider', () => {
    // Suppress the React error boundary noise in test output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow();
    spy.mockRestore();
  });
});
