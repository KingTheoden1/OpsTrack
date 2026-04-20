import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DefectLog from '../../pages/DefectLog';
import { renderWithProviders, seedAuth, ADMIN_USER, SUPERVISOR_USER, VIEWER_USER } from '../../test/helpers';

// Mock API so no real HTTP calls are made
vi.mock('../../api/defects', () => ({
  getDefects: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Hydraulic fluid leak',
      description: 'Fluid near frame 245',
      severity: 'critical',
      status: 'open',
      reporter_email: 'admin@ops.com',
      reported_by: 1,
      created_at: '2026-04-01T00:00:00Z',
    },
  ]),
  createDefect: vi.fn().mockResolvedValue({}),
  updateDefect: vi.fn().mockResolvedValue({}),
  deleteDefect: vi.fn().mockResolvedValue({}),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Defect table renders ─────────────────────────────────────────────────────

describe('DefectLog — data display', () => {
  it('renders the defect title from the API response', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });
  });

  it('displays a severity badge', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText(/Critical/i)).toBeInTheDocument();
    });
  });
});

// ─── RBAC — create button ─────────────────────────────────────────────────────

describe('DefectLog — RBAC: create button', () => {
  it('shows the "+ New Defect" button for admin', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('+ New Defect')).toBeInTheDocument();
    });
  });

  it('shows the "+ New Defect" button for supervisor', async () => {
    seedAuth(SUPERVISOR_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('+ New Defect')).toBeInTheDocument();
    });
  });

  it('hides the "+ New Defect" button for viewer', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    // Wait for the data to load first
    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    expect(screen.queryByText('+ New Defect')).not.toBeInTheDocument();
  });
});

// ─── RBAC — edit button ───────────────────────────────────────────────────────

describe('DefectLog — RBAC: edit button', () => {
  it('shows the Edit button for admin', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('shows the Edit button for supervisor', async () => {
    seedAuth(SUPERVISOR_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('hides the Edit button for viewer', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
