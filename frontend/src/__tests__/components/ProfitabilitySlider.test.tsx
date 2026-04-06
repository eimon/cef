import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ProfitabilitySlider from '@/components/ProfitabilitySlider';
import { PricingAnalytics } from '@/types/pricing_analytics';

const mockAnalytics: PricingAnalytics = {
    property_id: "test-property-id",
    base_price: 100,
    floor_price: 50,
    current_profitability: 100,
    suggested_profitability: 120,
    market_comparison: {
        avg_market_price: 95,
        market_occupancy_rate: 70,
        competitor_count: 15,
        price_position: "ABOVE"
    },
    seasonal_demand: {
        season_name: "Verano",
        demand_multiplier: 1.5,
        historical_occupancy: 85
    }
};

describe('ProfitabilitySlider', () => {
    const mockOnProfitabilityChange = vi.fn();

    beforeEach(() => {
        mockOnProfitabilityChange.mockClear();
    });

    it('renders correctly with initial profitability', () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        expect(screen.getByText('Control de Rentabilidad')).toBeInTheDocument();
        expect(screen.getByText('100.0%')).toBeInTheDocument();
        expect(screen.getByText('Precio Competitivo')).toBeInTheDocument();
    });

    it('displays calculated price correctly', () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        // At 100% profitability, price should equal base price
        expect(screen.getByText('$100')).toBeInTheDocument();
    });

    it('updates profitability when slider changes', async () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '150' } });

        // Check that the profitability display updates immediately
        expect(screen.getByText('150.0%')).toBeInTheDocument();
        expect(screen.getByText('Precio Premium')).toBeInTheDocument();

        // Check that the callback is called after debounce
        await waitFor(() => {
            expect(mockOnProfitabilityChange).toHaveBeenCalledWith(150);
        }, { timeout: 500 });
    });

    it('calculates price correctly based on profitability', () => {
        const { rerender } = render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        // At 0% profitability, should show floor price
        const zeroAnalytics = { ...mockAnalytics, current_profitability: 0 };
        rerender(
            <ProfitabilitySlider 
                analytics={zeroAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '0' } });

        // Price should be floor price (50)
        expect(screen.getByText('$50')).toBeInTheDocument();
    });

    it('shows AI suggestion when profitability differs significantly', () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '80' } }); // Significantly different from suggested 120

        expect(screen.getByText('Sugerencia de IA:')).toBeInTheDocument();
        expect(screen.getByText(/120.0% de rentabilidad/)).toBeInTheDocument();
    });

    it('shows correct price comparison indicators', () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '150' } });

        // Should show increase indicator
        expect(screen.getByText(/\+\$75 vs\. precio base/)).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
                isLoading={true}
            />
        );

        const slider = screen.getByRole('slider');
        expect(slider).toBeDisabled();
    });

    it('shows reference indicators with correct values', () => {
        render(
            <ProfitabilitySlider 
                analytics={mockAnalytics}
                onProfitabilityChange={mockOnProfitabilityChange}
            />
        );

        expect(screen.getByText('Piso: 50%')).toBeInTheDocument();
        expect(screen.getByText('Base: 100%')).toBeInTheDocument();
        expect(screen.getByText('IA: 120%')).toBeInTheDocument();
    });
});