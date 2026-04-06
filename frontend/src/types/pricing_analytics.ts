// Tipos específicos para pricing analytics
export interface MarketComparison {
    avg_market_price: number;
    market_occupancy_rate: number;
    competitor_count: number;
    price_position: "BELOW" | "AT" | "ABOVE";
}

export interface DemandSeasonality {
    season_name: string;
    demand_multiplier: number;
    historical_occupancy: number;
}

export interface PricingAnalytics {
    property_id: string;
    base_price: number;
    floor_price: number;
    current_profitability: number;
    suggested_profitability: number;
    market_comparison: MarketComparison;
    seasonal_demand: DemandSeasonality;
}

export interface PricingOptimizationResponse {
    current_revenue_projection: number;
    optimized_revenue_projection: number;
    recommended_profitability: number;
    expected_occupancy: number;
    confidence_score: number;
    recommendations: string[];
}

export interface ProfitabilityProjection {
    month: number;
    year: number;
    projected_revenue: number;
    projected_costs: number;
    projected_profit: number;
    projected_occupancy: number;
    confidence_level: "HIGH" | "MEDIUM" | "LOW";
}

export interface MarketInsights {
    market_position: "BELOW" | "AT" | "ABOVE";
    competitive_gap: number;
    market_opportunity: number;
    seasonal_factor: number;
    recommendation: "INCREASE" | "DECREASE";
    confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface PriceSensitivityScenario {
    profitability_percent: number;
    expected_occupancy: number;
    estimated_monthly_revenue: number;
    scenario_type: "DECREASE" | "CURRENT" | "INCREASE";
}

export interface PriceSensitivityAnalysis {
    property_id: string;
    base_price: number;
    price_scenarios: PriceSensitivityScenario[];
    recommendation: string;
}