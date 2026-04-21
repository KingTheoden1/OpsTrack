import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Assets from '../../pages/Assets';
import { renderWithProviders, seedAuth, ADMIN_USER, SUPERVISOR_USER, VIEWER_USER } from '../../test/helpers';

vi.mock('../../api/assets', () => ({
  getAssets: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Hydraulic Actuator Unit 4',
      type: 'Hydraulic',
      location: 'Bay 3',
      created_at: '2026-04-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Landing Gear Strut A',
      type: 'Structural',
      location: 'Frame 12',
      created_at: '2026-04-02T00:00:00Z',
    },
  ]),
  createAsset: vi.fn().mockResolvedValue({}),
  updateAsset: vi.fn().mockResolvedValue({}),
  deleteAsset: vi.fn().mockResolvedValue({}),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Data display ─────────────────────────────────────────────────────────────

describe('Assets — data display', () => {
  it('renders asset names from the API response', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });
    expect(screen.getByText('Landing Gear Strut A')).toBeInTheDocument();
  });

  it('shows type and location columns', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic')).toBeInTheDocument();
    });
    expect(screen.getByText('Bay 3')).toBeInTheDocument();
  });
});

// ─── RBAC — create button ─────────────────────────────────────────────────────

describe('Assets — RBAC: create button', () => {
  it('shows "+ New Asset" for admin', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('+ New Asset')).toBeInTheDocument();
    });
  });

  it('shows "+ New Asset" for supervisor', async () => {
    seedAuth(SUPERVISOR_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('+ New Asset')).toBeInTheDocument();
    });
  });

  it('hides "+ New Asset" for viewer', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });
    expect(screen.queryByText('+ New Asset')).not.toBeInTheDocument();
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────

describe('Assets — search', () => {
  it('filters assets by name search', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name, type, or location…');
    await userEvent.type(searchInput, 'Landing');

    expect(screen.queryByText('Hydraulic Actuator Unit 4')).not.toBeInTheDocument();
    expect(screen.getByText('Landing Gear Strut A')).toBeInTheDocument();
  });
});

// ─── Slide-over ───────────────────────────────────────────────────────────────

describe('Assets — slide-over', () => {
  it('opens slide-over with asset details on row click', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic Actuator Unit 4'));

    expect(screen.getByText('Asset #1')).toBeInTheDocument();
    expect(screen.getByText('Bay 3')).toBeInTheDocument();
  });

  it('shows Edit Asset section for admin in slide-over', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic Actuator Unit 4'));
    expect(screen.getByText('Edit Asset')).toBeInTheDocument();
  });

  it('shows delete option for admin in slide-over', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic Actuator Unit 4'));
    expect(screen.getByText('Delete asset…')).toBeInTheDocument();
  });

  it('hides delete option for viewer', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic Actuator Unit 4'));
    expect(screen.queryByText('Delete asset…')).not.toBeInTheDocument();
  });

  it('shows confirmation prompt when delete is requested', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic Actuator Unit 4'));
    await userEvent.click(screen.getByText('Delete asset…'));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('closes the slide-over on × click', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<Assets />);

    await waitFor(() => {
      expect(screen.getByText('Hydraulic Actuator Unit 4')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Hydraulic Actuator Unit 4'));
    expect(screen.getByText('Asset #1')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('Asset #1')).not.toBeInTheDocument();
  });
});
