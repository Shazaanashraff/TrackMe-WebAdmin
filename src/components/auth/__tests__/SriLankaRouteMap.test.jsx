import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SriLankaRouteMap } from '../SriLankaRouteMap';

describe('SriLankaRouteMap', () => {
  it('renders the real district geometry and every hub city label', () => {
    render(<SriLankaRouteMap />);

    expect(screen.getByRole('img', { name: /route network map of sri lanka/i })).toBeInTheDocument();
    [
      'Colombo', 'Kandy', 'Jaffna', 'Trincomalee', 'Anuradhapura', 'Galle', 'Batticaloa',
      'Kurunegala', 'Ratnapura', 'Badulla', 'Matara', 'Puttalam', 'Polonnaruwa', 'Ampara',
      'Moneragala', 'Kegalle', 'Nuwara Eliya', 'Hambantota', 'Vavuniya', 'Mannar'
    ].forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('spreads connections across the island as a mesh instead of a single Colombo hub-and-spoke', () => {
    const { container } = render(<SriLankaRouteMap />);

    const roadPaths = container.querySelectorAll('path.sl-road');
    expect(roadPaths.length).toBe(30);

    const colomboEdges = Array.from(roadPaths).filter((path) => path.id.includes('colombo')).length;
    expect(colomboEdges).toBeLessThan(roadPaths.length / 4);

    // Turn-by-turn "road route" look: many straight segments with real bends, no curve commands.
    roadPaths.forEach((path) => {
      const d = path.getAttribute('d');
      expect(d).not.toMatch(/[QCqc]/);
      expect(d.match(/L/g)?.length).toBeGreaterThanOrEqual(8);
    });
  });

  it('never renders the removed live-stats headline', () => {
    render(<SriLankaRouteMap />);

    expect(screen.queryByText(/live for every route/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/active routes? tracked live/i)).not.toBeInTheDocument();
  });
});
