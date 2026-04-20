import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import type { User } from '../types';

/**
 * Seed localStorage so AuthProvider initialises with the given user/token.
 * Call this before renderWithProviders() in tests that need an authenticated state.
 */
export function seedAuth(user: User, token = 'test-token') {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export const ADMIN_USER: User = { id: 1, email: 'admin@ops.com', role: 'admin', created_at: '' };
export const SUPERVISOR_USER: User = { id: 2, email: 'sup@ops.com', role: 'supervisor', created_at: '' };
export const VIEWER_USER: User = { id: 3, email: 'viewer@ops.com', role: 'viewer', created_at: '' };

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

/**
 * Render a component wrapped in all required providers:
 * - QueryClientProvider (retries disabled)
 * - MemoryRouter
 * - AuthProvider (reads from localStorage — call seedAuth() first if needed)
 */
export function renderWithProviders(
  ui: ReactElement,
  { initialRoute = '/', ...options }: RenderWithProvidersOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
