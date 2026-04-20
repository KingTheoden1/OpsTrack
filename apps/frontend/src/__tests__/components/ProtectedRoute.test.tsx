import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { renderWithProviders, seedAuth, ADMIN_USER } from '../../test/helpers';

function ProtectedContent() {
  return <div>Protected content</div>;
}

function LoginPage() {
  return <div>Login page</div>;
}

function AppWithGuard() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no token', () => {
    // localStorage is empty (cleared in beforeEach)
    renderWithProviders(<AppWithGuard />, { initialRoute: '/dashboard' });
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the protected content when a token is present', () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<AppWithGuard />, { initialRoute: '/dashboard' });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
