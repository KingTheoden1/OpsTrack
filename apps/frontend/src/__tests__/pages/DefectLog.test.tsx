import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    {
      id: 2,
      title: 'Cracked landing gear strut',
      description: 'Hairline fracture detected on inspection',
      severity: 'high',
      status: 'in_progress',
      reporter_email: 'sup@ops.com',
      reported_by: 2,
      created_at: '2026-04-02T00:00:00Z',
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

// ─── Row click opens slide-over ───────────────────────────────────────────────

describe('DefectLog — slide-over detail panel', () => {
  it('opens the slide-over with full description when a row is clicked', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic fluid leak'));

    expect(screen.getByText('Fluid near frame 245')).toBeInTheDocument();
  });

  it('shows the Edit Defect section in the slide-over for admin', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic fluid leak'));

    expect(screen.getByText('Edit Defect')).toBeInTheDocument();
  });

  it('hides the Edit Defect section in the slide-over for viewer', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic fluid leak'));

    expect(screen.queryByText('Edit Defect')).not.toBeInTheDocument();
  });

  it('closes the slide-over when the × button is clicked', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic fluid leak'));
    expect(screen.getByText('Fluid near frame 245')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('Fluid near frame 245')).not.toBeInTheDocument();
  });
});

// ─── Filtering ────────────────────────────────────────────────────────────────

describe('DefectLog — filtering', () => {
  it('filters by search text and hides non-matching rows', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search title or description…');
    await userEvent.type(searchInput, 'landing gear');

    expect(screen.queryByText('Hydraulic fluid leak')).not.toBeInTheDocument();
    expect(screen.getByText('Cracked landing gear strut')).toBeInTheDocument();
  });

  it('filters by severity and hides non-matching rows', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    await userEvent.selectOptions(
      screen.getByDisplayValue('All severities'),
      'high'
    );

    expect(screen.queryByText('Hydraulic fluid leak')).not.toBeInTheDocument();
    expect(screen.getByText('Cracked landing gear strut')).toBeInTheDocument();
  });

  it('shows a Clear button when a filter is active and clears filters on click', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search title or description…');
    await userEvent.type(searchInput, 'hydraulic');

    const clearBtn = screen.getByText('Clear');
    expect(clearBtn).toBeInTheDocument();

    await userEvent.click(clearBtn);

    // Both rows should be visible again
    expect(screen.getByText('Hydraulic fluid leak')).toBeInTheDocument();
    expect(screen.getByText('Cracked landing gear strut')).toBeInTheDocument();
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('updates the count label when filters are active', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('2 total defects')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search title or description…');
    await userEvent.type(searchInput, 'hydraulic');

    expect(screen.getByText('1 of 2 defects')).toBeInTheDocument();
  });
});
