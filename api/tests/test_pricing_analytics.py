import pytest
import uuid
from datetime import date, timedelta
from decimal import Decimal
from httpx import AsyncClient

from core.database import get_db
from services.pricing_analytics_service import PricingAnalyticsService
from schemas.pricing_analytics import PricingOptimizationRequest


class TestPricingAnalyticsService:
    """Tests para el servicio de análisis de rentabilidad"""

    @pytest.mark.asyncio
    async def test_get_pricing_analytics_success(self, async_client: AsyncClient, manager_headers, property_id):
        """Test análisis de rentabilidad exitoso"""
        response = await async_client.get(
            f"/pricing-analytics/properties/{property_id}/analytics",
            headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "property_id" in data
        assert "base_price" in data
        assert "floor_price" in data
        assert "current_profitability" in data
        assert "suggested_profitability" in data
        assert "market_comparison" in data
        assert "seasonal_demand" in data
        
        # Validar estructura de market_comparison
        market = data["market_comparison"]
        assert "avg_market_price" in market
        assert "market_occupancy_rate" in market
        assert "competitor_count" in market
        assert market["price_position"] in ["BELOW", "AT", "ABOVE"]
        
        # Validar seasonal_demand
        seasonal = data["seasonal_demand"]
        assert "season_name" in seasonal
        assert "demand_multiplier" in seasonal
        assert "historical_occupancy" in seasonal

    @pytest.mark.asyncio
    async def test_pricing_optimization_revenue(self, async_client: AsyncClient, manager_headers, property_id):
        """Test optimización para maximizar ingresos"""
        optimization_data = {
            "property_id": str(property_id),
            "target_occupancy": 70.0,
            "priority": "REVENUE",
            "date_range_start": str(date.today()),
            "date_range_end": str(date.today() + timedelta(days=30))
        }
        
        response = await async_client.post(
            "/pricing-analytics/optimize",
            json=optimization_data,
            headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "current_revenue_projection" in data
        assert "optimized_revenue_projection" in data
        assert "recommended_profitability" in data
        assert "expected_occupancy" in data
        assert "confidence_score" in data
        assert "recommendations" in data
        
        # Validar que la rentabilidad recomendada es razonable
        assert 50.0 <= data["recommended_profitability"] <= 200.0
        assert 0.0 <= data["confidence_score"] <= 1.0

    @pytest.mark.asyncio
    async def test_pricing_optimization_occupancy(self, async_client: AsyncClient, manager_headers, property_id):
        """Test optimización para maximizar ocupación"""
        optimization_data = {
            "property_id": str(property_id),
            "target_occupancy": 85.0,
            "priority": "OCCUPANCY",
            "date_range_start": str(date.today()),
            "date_range_end": str(date.today() + timedelta(days=30))
        }
        
        response = await async_client.post(
            "/pricing-analytics/optimize",
            json=optimization_data,
            headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Para ocupación alta, la rentabilidad recomendada debería ser menor
        assert data["recommended_profitability"] < 100.0

    @pytest.mark.asyncio
    async def test_profitability_projections(self, async_client: AsyncClient, manager_headers, property_id):
        """Test proyecciones de rentabilidad"""
        response = await async_client.get(
            f"/pricing-analytics/properties/{property_id}/projections?months_ahead=6",
            headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 6
        for projection in data:
            assert "month" in projection
            assert "year" in projection
            assert "projected_revenue" in projection
            assert "projected_costs" in projection
            assert "projected_profit" in projection
            assert "projected_occupancy" in projection
            assert projection["confidence_level"] in ["HIGH", "MEDIUM", "LOW"]
            
            # Validar lógica básica
            assert projection["projected_revenue"] >= 0
            assert projection["projected_costs"] >= 0
            assert 0 <= projection["projected_occupancy"] <= 100

    @pytest.mark.asyncio
    async def test_market_insights(self, async_client: AsyncClient, manager_headers, property_id):
        """Test insights del mercado"""
        response = await async_client.get(
            f"/pricing-analytics/properties/{property_id}/market-insights",
            headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "market_position" in data
        assert "competitive_gap" in data
        assert "market_opportunity" in data
        assert "seasonal_factor" in data
        assert data["recommendation"] in ["INCREASE", "DECREASE"]
        assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]

    @pytest.mark.asyncio
    async def test_price_sensitivity_analysis(self, async_client: AsyncClient, manager_headers, property_id):
        """Test análisis de sensibilidad de precios"""
        response = await async_client.get(
            f"/pricing-analytics/properties/{property_id}/price-sensitivity?price_variation=15.0",
            headers=manager_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "property_id" in data
        assert "base_price" in data
        assert "price_scenarios" in data
        assert "recommendation" in data
        
        scenarios = data["price_scenarios"]
        assert len(scenarios) == 3
        
        # Validar que tenemos los tres escenarios
        scenario_types = [s["scenario_type"] for s in scenarios]
        assert "DECREASE" in scenario_types
        assert "CURRENT" in scenario_types
        assert "INCREASE" in scenario_types

    @pytest.mark.asyncio
    async def test_invalid_property_id(self, async_client: AsyncClient, manager_headers):
        """Test con property_id inexistente"""
        fake_id = str(uuid.uuid4())
        response = await async_client.get(
            f"/pricing-analytics/properties/{fake_id}/analytics",
            headers=manager_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, async_client: AsyncClient, property_id):
        """Test acceso sin autorización"""
        response = await async_client.get(
            f"/pricing-analytics/properties/{property_id}/analytics"
        )
        assert response.status_code == 401


class TestPricingAnalyticsServiceUnit:
    """Tests unitarios para métodos específicos"""

    @pytest.mark.asyncio
    async def test_seasonal_demand_analysis(self, db_session):
        """Test análisis de demanda estacional"""
        service = PricingAnalyticsService(db_session)
        
        # Test verano (diciembre)
        summer_demand = service._analyze_seasonal_demand(date(2024, 12, 15))
        assert summer_demand.season_name == "Verano"
        assert summer_demand.demand_multiplier > 1.5
        assert summer_demand.historical_occupancy > 80
        
        # Test temporada baja (abril)
        low_season = service._analyze_seasonal_demand(date(2024, 4, 15))
        assert low_season.season_name == "Temporada Baja"
        assert low_season.demand_multiplier < 1.0

    @pytest.mark.asyncio
    async def test_demand_response_calculation(self, db_session):
        """Test cálculo de respuesta de demanda"""
        service = PricingAnalyticsService(db_session)
        
        # Precio alto -> ocupación baja
        high_price_occupancy = service._calculate_demand_response(150.0, 70.0)
        
        # Precio bajo -> ocupación alta
        low_price_occupancy = service._calculate_demand_response(80.0, 70.0)
        
        assert low_price_occupancy > high_price_occupancy
        assert 20.0 <= high_price_occupancy <= 95.0
        assert 20.0 <= low_price_occupancy <= 95.0

    def test_market_comparison_generation(self):
        """Test generación de comparación de mercado"""
        from services.pricing_analytics_service import PricingAnalyticsService
        
        service = PricingAnalyticsService(None)  # No need for db in this test
        base_price = Decimal("100.00")
        analysis_date = date.today()
        
        market_comparison = service._generate_market_comparison(base_price, analysis_date)
        
        assert market_comparison.avg_market_price > 0
        assert 0 <= market_comparison.market_occupancy_rate <= 100
        assert market_comparison.competitor_count > 0
        assert market_comparison.price_position in ["BELOW", "AT", "ABOVE"]

    def test_seasonal_multiplier(self):
        """Test multiplicadores estacionales"""
        from services.pricing_analytics_service import PricingAnalyticsService
        
        service = PricingAnalyticsService(None)
        
        # Verano (diciembre) debe tener multiplicador alto
        december_multiplier = service._get_seasonal_multiplier(12)
        assert december_multiplier > 1.3
        
        # Temporada baja (abril) debe tener multiplicador bajo
        april_multiplier = service._get_seasonal_multiplier(4)
        assert april_multiplier < 1.0
        
        # Invierno (julio) debe tener multiplicador medio-alto
        july_multiplier = service._get_seasonal_multiplier(7)
        assert 1.0 < july_multiplier < 1.5

    def test_recommendation_generation(self):
        """Test generación de recomendaciones"""
        from services.pricing_analytics_service import PricingAnalyticsService
        
        service = PricingAnalyticsService(None)
        
        # Precio premium
        high_price_recs = service._generate_recommendations(140.0, 60.0, "REVENUE")
        assert any("premium" in rec.lower() for rec in high_price_recs)
        
        # Precio agresivo
        low_price_recs = service._generate_recommendations(70.0, 80.0, "OCCUPANCY")
        assert any("agresivo" in rec.lower() for rec in low_price_recs)
        
        # Alta ocupación
        high_occ_recs = service._generate_recommendations(100.0, 90.0, "BALANCED")
        assert any("aumentar" in rec.lower() for rec in high_occ_recs)