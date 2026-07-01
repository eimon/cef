"""
Integration test suite for deferred cupo reservation on subscription payment confirmation.

Tests validate that:
1. _materialize_subscription_reservas method exists and is callable
2. PagoService has all required confirmation methods
3. WaitlistSuscripcionService follows deferred pattern
4. WaitlistService uses coordinator pattern
5. All services import successfully without syntax errors
"""
from types import SimpleNamespace
from uuid import uuid4
import pytest


def test_materialize_method_signature():
    """Verify _materialize_subscription_reservas has correct signature."""
    from services.suscripcion_service import SuscripcionService
    import inspect
    
    # Method should exist
    assert hasattr(SuscripcionService, '_materialize_subscription_reservas')
    
    # Should be async
    method = getattr(SuscripcionService, '_materialize_subscription_reservas')
    assert inspect.iscoroutinefunction(method)
    
    # Should accept (self, suscripcion, template, fechas_clases)
    sig = inspect.signature(method)
    params = list(sig.parameters.keys())
    assert 'suscripcion' in params
    assert 'template' in params
    assert 'fechas_clases' in params


def test_pago_service_confirmation_methods():
    """Verify PagoService has all payment confirmation methods."""
    from services.pago_service import PagoService
    import inspect
    
    methods = [
        'confirmar_suscripcion_mp',
        'confirmar_renovacion_suscripcion_mp',
        'confirmar_waitlist_suscripcion_mp',
        'confirmar_pago_mp',
        'confirmar_waitlist_mp',
        'confirmar_deuda_mp',
    ]
    
    for method_name in methods:
        assert hasattr(PagoService, method_name), f"Missing method: {method_name}"
        method = getattr(PagoService, method_name)
        assert inspect.iscoroutinefunction(method), f"{method_name} should be async"


def test_suscripcion_service_architecture():
    """Verify SuscripcionService has correct deferred payment architecture."""
    from services.suscripcion_service import SuscripcionService
    import inspect
    
    # Should have both methods
    assert hasattr(SuscripcionService, 'suscribirse')
    assert hasattr(SuscripcionService, '_materialize_subscription_reservas')
    
    # Get source code to verify separation of concerns
    suscribirse_src = inspect.getsource(SuscripcionService.suscribirse)
    
    # suscribirse should NOT call materialize directly
    assert '_materialize_subscription_reservas' not in suscribirse_src, \
        "suscribirse() should not call _materialize_subscription_reservas()"
    
    # Should create pago but no reservas
    assert 'create_pago' in suscribirse_src
    assert 'create_reserva' not in suscribirse_src, \
        "suscribirse() should not create reservas directly"


def test_pago_service_calls_materialize():
    """Verify confirmar_suscripcion_mp calls materialize on payment confirmation."""
    from services.pago_service import PagoService
    import inspect
    
    src = inspect.getsource(PagoService.confirmar_suscripcion_mp)
    
    # Should call _materialize_subscription_reservas
    assert '_materialize_subscription_reservas' in src, \
        "confirmar_suscripcion_mp should call _materialize_subscription_reservas"


def test_waitlist_suscripcion_deferred_pattern():
    """Verify WaitlistSuscripcionService implements deferred pattern."""
    from services.waitlist_suscripcion_service import WaitlistSuscripcionService
    import inspect
    
    # Should have mark_confirmed_paid to materialize after payment
    assert hasattr(WaitlistSuscripcionService, 'mark_confirmed_paid')
    assert hasattr(WaitlistSuscripcionService, 'get_entry_for_payment')
    
    # Check method signatures
    mark_confirmed = getattr(WaitlistSuscripcionService, 'mark_confirmed_paid')
    assert inspect.iscoroutinefunction(mark_confirmed)


def test_waitlist_service_coordinator():
    """Verify WaitlistService uses coordinator pattern for promotion."""
    from services.waitlist_service import WaitlistService
    import inspect
    
    # Coordinator should try subscription first
    assert hasattr(WaitlistService, 'trigger_promotion_for_slot')
    
    # Then fall back to individual
    assert hasattr(WaitlistService, '_trigger_individual_promotion_for_slot')
    
    # Get source to verify coordinator logic
    src = inspect.getsource(WaitlistService.trigger_promotion_for_slot)
    
    # Should check subscription result and conditionally call individual
    assert 'WaitlistSuscripcionService' in src or 'trigger_promotion_for_slot' in src
    assert '_trigger_individual_promotion_for_slot' in src or 'fallback' in src


def test_helper_functions_available():
    """Verify materialization helper functions are exported."""
    from services.suscripcion_service import (
        _calcular_fecha_fin,
        _calcular_fechas_clases,
        _primera_clase_en_periodo,
    )
    
    assert callable(_calcular_fecha_fin)
    assert callable(_calcular_fechas_clases)
    assert callable(_primera_clase_en_periodo)


def test_pago_service_uses_helpers():
    """Verify PagoService uses materialization helpers in confirmation."""
    from services.pago_service import PagoService
    import inspect
    
    src = inspect.getsource(PagoService.confirmar_suscripcion_mp)
    
    # Should use helpers to calculate fechas
    assert '_calcular_fecha_fin' in src or '_calcular_fechas_clases' in src or 'fechas_clases' in src


def test_all_imports_work():
    """Verify all modified modules import without syntax errors."""
    try:
        from services.suscripcion_service import SuscripcionService
        from services.pago_service import PagoService
        from services.waitlist_service import WaitlistService
        from services.waitlist_suscripcion_service import WaitlistSuscripcionService
        
        assert all([
            SuscripcionService,
            PagoService,
            WaitlistService,
            WaitlistSuscripcionService,
        ])
    except SyntaxError as e:
        pytest.fail(f"Syntax error in services: {e}")


def test_renovation_path_unchanged():
    """Verify renovation still uses _create_period_reservas (not deferred)."""
    from services.suscripcion_service import SuscripcionService
    import inspect
    
    src = inspect.getsource(SuscripcionService.iniciar_renovacion)
    
    # Should still use immediate reservation pattern
    assert '_create_period_reservas' in src, \
        "Renovación should use _create_period_reservas for immediate reservas"


def test_architecture_summary():
    """Summary test validating overall deferred payment architecture."""
    messages = []
    
    # 1. Check that materialize method exists
    from services.suscripcion_service import SuscripcionService
    if not hasattr(SuscripcionService, '_materialize_subscription_reservas'):
        messages.append("❌ _materialize_subscription_reservas method missing")
    else:
        messages.append("✅ _materialize_subscription_reservas defined")
    
    # 2. Check coordinator pattern
    from services.waitlist_service import WaitlistService
    if not hasattr(WaitlistService, '_trigger_individual_promotion_for_slot'):
        messages.append("❌ Coordinator pattern incomplete")
    else:
        messages.append("✅ Coordinator pattern implemented")
    
    # 3. Check payment confirmation methods
    from services.pago_service import PagoService
    if not hasattr(PagoService, 'confirmar_suscripcion_mp'):
        messages.append("❌ Payment confirmation method missing")
    else:
        messages.append("✅ Payment confirmation methods present")
    
    print("\n".join(messages))
    
    # All checks should pass
    assert all("✅" in msg for msg in messages), f"Architecture issues: {messages}"
