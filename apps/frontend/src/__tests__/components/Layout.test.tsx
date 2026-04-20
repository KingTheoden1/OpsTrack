import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Layout from '../../components/Layout';
import { renderWithProviders, seedAuth, ADMIN_USER, SUPERVISOR_USER, VIEWER_USER } from '../../test/helpers';

function Wrapped() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<div>Page content</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Route>
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>
  );
}

describe('Layout', () => {
  it('displays the logged-in user email', () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Wrapped />);
    expect(screen.getByText(ADMIN_USER.email)).toBeInTheDocument();
  });

  it('displays the correct role badge for admin', () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Wrapped />);
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('displays the correct role badge for supervisor', () => {
    seedAuth(SUPERVISOR_USER);
    renderWithProviders(<Wrapped />);
    expect(screen.getByText('supervisor')).toBeInTheDocument();
  });

  it('displays the correct role badge for viewer', () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Wrapped />);
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('renders all three nav links', () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Wrapped />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Defect Log')).toBeInTheDocument();
    expect(screen.getByText('AI Analysis')).toBeInTheDocument();
  });

  it('clears token and user from localStorage when Sign out is clicked', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Wrapped />);

    await userEvent.click(screen.getByText('Sign out'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
