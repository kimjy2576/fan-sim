"""
Air Properties Module — HPWD Standard Interface
Moist air thermodynamic properties for fan performance calculation.
"""
import math


def saturation_pressure(T_C: float) -> float:
    """Antoine equation for water saturation pressure [Pa]. T in °C."""
    T = T_C + 273.15
    if T_C >= 0:
        return math.exp(23.196 - 3816.44 / (T - 46.13))
    else:
        return math.exp(23.33 - 3820.0 / (T - 44.0))


def humidity_ratio(T_C: float, RH: float, P_atm: float = 101325.0) -> float:
    """Humidity ratio ω [kg_w/kg_da] from T(°C), RH(0~1), P(Pa)."""
    Ps = saturation_pressure(T_C)
    Pw = RH * Ps
    return 0.62198 * Pw / max(1.0, P_atm - Pw)


def air_density(T_C: float, omega: float, P_atm: float = 101325.0) -> float:
    """Moist air density [kg/m³]. T(°C), ω(kg_w/kg_da), P(Pa)."""
    T_K = T_C + 273.15
    R_da = 287.058  # J/(kg·K) dry air
    R_v = 461.495   # J/(kg·K) water vapor
    # Partial pressures
    Pv = omega * P_atm / (0.62198 + omega)
    Pda = P_atm - Pv
    return Pda / (R_da * T_K) + Pv / (R_v * T_K)


def air_viscosity(T_C: float) -> float:
    """Dynamic viscosity of air [Pa·s]. Sutherland's law."""
    T_K = T_C + 273.15
    mu_ref = 1.716e-5  # Pa·s at 273.15 K
    T_ref = 273.15
    S = 110.4  # K
    return mu_ref * (T_K / T_ref) ** 1.5 * (T_ref + S) / (T_K + S)


def air_cp(T_C: float, omega: float) -> float:
    """Specific heat of moist air [J/(kg·K)]."""
    cp_da = 1006.0  # J/(kg·K) dry air
    cp_v = 1860.0   # J/(kg·K) water vapor
    return (cp_da + omega * cp_v) / (1 + omega)


def compute_inlet_state(T: float = 25.0, omega: float = 0.010,
                        P: float = 101325.0, RH: float = None) -> dict:
    """
    Compute full inlet air state from partial inputs.
    
    HPWD Standard State Point:
    { T, omega, P, rho, mu, cp, RH }
    
    Args:
        T: Temperature [°C]
        omega: Humidity ratio [kg_w/kg_da] (optional if RH given)
        P: Pressure [Pa]
        RH: Relative humidity [0~1] (optional, overrides omega)
    """
    if RH is not None:
        omega = humidity_ratio(T, RH, P)
    
    rho = air_density(T, omega, P)
    mu = air_viscosity(T)
    cp = air_cp(T, omega)
    
    # Compute RH from omega if not given
    if RH is None:
        Ps = saturation_pressure(T)
        Pv = omega * P / (0.62198 + omega)
        RH = min(1.0, Pv / max(1.0, Ps))
    
    return {
        "T": T,           # °C
        "omega": omega,   # kg_w/kg_da
        "P": P,           # Pa
        "rho": rho,       # kg/m³
        "mu": mu,         # Pa·s
        "cp": cp,         # J/(kg·K)
        "RH": RH,         # 0~1
    }
