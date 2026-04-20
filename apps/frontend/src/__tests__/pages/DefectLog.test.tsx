import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefectLog from '../../pages/DefectLog';
import { getDefects } from '../../api/defects';
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

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Build 12 minimal defect objects so the 10-per-page limit is exceeded. */
function makeDefects(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Defect ${i + 1}`,
    description: `Description ${i + 1}`,
    severity: 'low' as const,
    status: 'open' as const,
    reporter_email: 'admin@ops.com',
    reported_by: 1,
    asset_id: null,
    assigned_to: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  }));
}

describe('DefectLog — pagination', () => {
  beforeEach(() => {
    vi.mocked(getDefects).mockResolvedValue(makeDefects(12));
  });

  it('shows only 10 rows on page 1 when there are 12 defects', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Defect 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Defect 10')).toBeInTheDocument();
    expect(screen.queryByText('Defect 11')).not.toBeInTheDocument();
  });

  it('renders the pagination bar with prev/next buttons', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Defect 1')).toBeInTheDocument();
    });

    expect(screen.getByText('←')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 12')).toBeInTheDocument();
  });

  it('advances to page 2 and shows the remaining rows', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Defect 1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('→'));

    expect(screen.getByText('Defect 11')).toBeInTheDocument();
    expect(screen.getByText('Defect 12')).toBeInTheDocument();
    expect(screen.queryByText('Defect 1')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 11–12 of 12')).toBeInTheDocument();
  });

  it('resets to page 1 when a filter is applied', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<DefectLog />);

    await waitFor(() => {
      expect(screen.getByText('Defect 1')).toBeInTheDocument();
    });

    // Go to page 2 first
    await userEvent.click(screen.getByText('→'));
    expect(screen.getByText('Defect 11')).toBeInTheDocument();

    // Search for 'Defect 5' — only matches defect #5, not 11 or 12
    const searchInput = screen.getByPlaceholderText('Search title or description…');
    await userEvent.type(searchInput, 'Defect 5');

    // Page snaps back to 1; defect 5 visible, defect 11 gone
    expect(screen.getByText('Defect 5')).toBeInTheDocument();
    expect(screen.queryByText('Defect 11')).not.toBeInTheDocument();
  });
});
