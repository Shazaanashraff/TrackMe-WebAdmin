import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JoinSection } from '../JoinSection';

vi.mock('../useAppDownloadLinks', () => ({
  useAppDownloadLinks: vi.fn(),
}));

import { useAppDownloadLinks } from '../useAppDownloadLinks';

describe('JoinSection — app download links', () => {
  it('renders disabled "Coming soon" rider buttons while no real release exists', () => {
    useAppDownloadLinks.mockReturnValue({ riderAndroid: null, riderIos: null, driverAndroid: null });
    render(<JoinSection />);

    expect(screen.getByRole('button', { name: /iphone/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /android/i })).toBeDisabled();
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(2);
  });

  it('renders real rider store links once the API returns releases', () => {
    useAppDownloadLinks.mockReturnValue({
      riderAndroid: '/downloads/rider-app-1.0.0.apk',
      riderIos: 'https://testflight.apple.com/join/abc123',
      driverAndroid: null,
    });
    render(<JoinSection />);

    expect(screen.getByRole('link', { name: /iphone/i })).toHaveAttribute('href', 'https://testflight.apple.com/join/abc123');
    expect(screen.getByRole('link', { name: /android/i })).toHaveAttribute('href', '/downloads/rider-app-1.0.0.apk');
  });

  it('shows no direct driver download link when no driver build exists', () => {
    useAppDownloadLinks.mockReturnValue({ riderAndroid: null, riderIos: null, driverAndroid: null });
    render(<JoinSection />);

    expect(screen.queryByText(/download the driver app/i)).not.toBeInTheDocument();
  });

  it('shows a direct driver download link once a driver build exists, without touching the LeadForm', () => {
    useAppDownloadLinks.mockReturnValue({
      riderAndroid: null,
      riderIos: null,
      driverAndroid: '/downloads/driver-app-1.0.0.apk',
    });
    render(<JoinSection />);

    const link = screen.getByRole('link', { name: /download the driver app/i });
    expect(link).toHaveAttribute('href', '/downloads/driver-app-1.0.0.apk');
    // The LeadForm is still the primary CTA, unchanged.
    expect(screen.getByLabelText('Your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get driver access/i })).toBeInTheDocument();
  });
});
