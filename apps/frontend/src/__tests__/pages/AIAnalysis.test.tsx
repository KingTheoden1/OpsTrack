import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import AIAnalysis from '../../pages/AIAnalysis';
import { renderWithProviders, seedAuth, ADMIN_USER, SUPERVISOR_USER, VIEWER_USER } from '../../test/helpers';

vi.mock('../../api/defects', () => ({
  getDefects: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Hydraulic leak',
      description: 'Fluid seeping',
      severity: 'critical',
      status: 'open',
      reporter_email: 'admin@ops.com',
      reported_by: 1,
      created_at: '2026-04-01T00:00:00Z',
    },
  ]),
}));

vi.mock('../../api/ai', () => ({
  analyzeDefects: vi.fn().mockResolvedValue({
    summary: 'Test summary',
    risk_areas: ['Hydraulic system'],
    recommendations: ['Replace seal'],
  }),
  previewCsv: vi.fn(),
  bulkInsert: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Analysis panel ───────────────────────────────────────────────────────────

describe('AIAnalysis — analysis panel', () => {
  it('renders the "Run Analysis" button for all roles', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<AIAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('Run Analysis')).toBeInTheDocument();
    });
  });

  it('shows the defect count in the panel description', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<AIAnalysis />);

    await waitFor(() => {
      expect(screen.getByText(/Analyzes all 1 logged defects/)).toBeInTheDocument();
    });
  });
});

// ─── RBAC — CSV import section ────────────────────────────────────────────────

describe('AIAnalysis — RBAC: CSV import', () => {
  it('shows the CSV Import section for admin', async () => {
    seedAuth(ADMIN_USER);
    renderWithProviders(<AIAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('CSV Import')).toBeInTheDocument();
    });
  });

  it('shows the CSV Import section for supervisor', async () => {
    seedAuth(SUPERVISOR_USER);
    renderWithProviders(<AIAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('CSV Import')).toBeInTheDocument();
    });
  });

  it('hides the CSV Import section for viewer', async () => {
    seedAuth(VIEWER_USER);
    renderWithProviders(<AIAnalysis />);

    // Wait for the page to fully render
    await waitFor(() => {
      expect(screen.getByText('Run Analysis')).toBeInTheDocument();
    });

    expect(screen.queryByText('CSV Import')).not.toBeInTheDocument();
  });
});
