import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPricingAnalytics, getProfitabilityProjections, optimizePricing } from '@/actions/pricing_analytics';
import * as serverApi from '@/lib/server-api';

// Mock the serverApi module
vi.mock('@/lib/server-api', () => ({
    serverApi: vi.fn()
}));

const mockServerApi = vi.mocked(serverApi.serverApi);

describe('Pricing Analytics Actions', () => {
    beforeEach(() => {
        mockServerApi.mockClear();
    });

    describe('getPricingAnalytics', () => {
        it('fetches analytics successfully', async () => {
            const mockAnalytics = {
                property_id: "test-id",
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

            mockServerApi.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockAnalytics)
            } as any);

            const result = await getPricingAnalytics("test-id");

            expect(mockServerApi).toHaveBeenCalledWith(
                "/pricing-analytics/properties/test-id/analytics",
                { params: {} }
            );
            expect(result).toEqual(mockAnalytics);
        });

        it('includes analysis_date when provided', async () => {
            mockServerApi.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({})
            } as any);

            await getPricingAnalytics("test-id", "2024-01-15");

            expect(mockServerApi).toHaveBeenCalledWith(
                "/pricing-analytics/properties/test-id/analytics",
                { params: { analysis_date: "2024-01-15" } }
            );
        });

        it('returns null on API error', async () => {
            mockServerApi.mockResolvedValue({
                ok: false
            } as any);

            const result = await getPricingAnalytics("test-id");

            expect(result).toBeNull();
        });

        it('returns null on network error', async () => {
            mockServerApi.mockRejectedValue(new Error('Network error'));

            const result = await getPricingAnalytics("test-id");

            expect(result).toBeNull();
        });
    });

    describe('getProfitabilityProjections', () => {
        it('fetches projections successfully', async () => {
            const mockProjections = [
                {
                    month: 1,
                    year: 2024,
                    projected_revenue: 5000,
                    projected_costs: 2000,
                    projected_profit: 3000,
                    projected_occupancy: 75,
                    confidence_level: "HIGH" as const
                }
            ];

            mockServerApi.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockProjections)
            } as any);

            const result = await getProfitabilityProjections("test-id", 6);

            expect(mockServerApi).toHaveBeenCalledWith(
                "/pricing-analytics/properties/test-id/projections",
                { params: { months_ahead: "6" } }
            );
            expect(result).toEqual(mockProjections);
        });

        it('uses default months_ahead when not provided', async () => {
            mockServerApi.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue([])
            } as any);

            await getProfitabilityProjections("test-id");

            expect(mockServerApi).toHaveBeenCalledWith(
                "/pricing-analytics/properties/test-id/projections",
                { params: { months_ahead: "12" } }
            );
        });

        it('returns empty array on error', async () => {
            mockServerApi.mockRejectedValue(new Error('Network error'));

            const result = await getProfitabilityProjections("test-id");

            expect(result).toEqual([]);
        });
    });

    describe('optimizePricing', () => {
        it('optimizes pricing successfully', async () => {
            const mockOptimization = {
                current_revenue_projection: 10000,
                optimized_revenue_projection: 12000,
                recommended_profitability: 115,
                expected_occupancy: 70,
                confidence_score: 0.85,
                recommendations: ["Increase prices during peak season"]
            };

            mockServerApi.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockOptimization)
            } as any);

            const formData = new FormData();
            formData.set("property_id", "test-id");
            formData.set("target_occupancy", "70");
            formData.set("priority", "BALANCED");
            formData.set("date_range_start", "2024-01-01");
            formData.set("date_range_end", "2024-01-31");

            const result = await optimizePricing({}, formData);

            expect(mockServerApi).toHaveBeenCalledWith(
                "/pricing-analytics/optimize",
                {
                    method: "POST",
                    body: JSON.stringify({
                        property_id: "test-id",
                        target_occupancy: 70,
                        priority: "BALANCED",
                        date_range_start: "2024-01-01",
                        date_range_end: "2024-01-31"
                    })
                }
            );
            expect(result).toEqual({
                success: true,
                ...mockOptimization
            });
        });

        it('validates form data correctly', async () => {
            const formData = new FormData();
            formData.set("property_id", "invalid-uuid");
            formData.set("target_occupancy", "150"); // Invalid range
            formData.set("priority", "INVALID"); // Invalid enum
            formData.set("date_range_start", "invalid-date");
            formData.set("date_range_end", "2024-01-31");

            const result = await optimizePricing({}, formData);

            expect(result).toEqual({ error: "Campos inválidos" });
            expect(mockServerApi).not.toHaveBeenCalled();
        });

        it('handles API errors correctly', async () => {
            mockServerApi.mockResolvedValue({
                ok: false,
                json: vi.fn().mockResolvedValue({
                    detail: "Property not found"
                })
            } as any);

            const formData = new FormData();
            formData.set("property_id", "f47ac10b-58cc-4372-a567-0e02b2c3d479");
            formData.set("target_occupancy", "70");
            formData.set("priority", "REVENUE");
            formData.set("date_range_start", "2024-01-01");
            formData.set("date_range_end", "2024-01-31");

            const result = await optimizePricing({}, formData);

            expect(result).toEqual({ error: "Property not found" });
        });

        it('handles network errors correctly', async () => {
            mockServerApi.mockRejectedValue(new Error('Network error'));

            const formData = new FormData();
            formData.set("property_id", "f47ac10b-58cc-4372-a567-0e02b2c3d479");
            formData.set("target_occupancy", "70");
            formData.set("priority", "REVENUE");
            formData.set("date_range_start", "2024-01-01");
            formData.set("date_range_end", "2024-01-31");

            const result = await optimizePricing({}, formData);

            expect(result).toEqual({ error: "Algo salió mal" });
        });
    });
});