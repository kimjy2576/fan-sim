"""
Fan Physics Model — HPWD Standard
Python mirror of frontend computeAero + computeStructure.
Supports variable air properties (T, ω, P dependent).

3 Modes:
  - on_design:       Pure physics from geometry (current 1D model)
  - semi_empirical:  Physics + fitted loss coefficients
  - off_design:      Experimental PQ map interpolation

Author: Fan-Sim / HPWD Integration
"""
import math
from typing import Optional


def compute_aero(params: dict, air: dict = None, mode: str = "on_design",
                 fit_coeffs: dict = None, pq_map: dict = None) -> dict:
    """
    Fan aerodynamic performance calculation.

    Args:
        params: Geometry + operating params
            D1, D2, b1, b2, beta1, beta2, Z, RPM, tBlade,
            cutoffGap, Rtongue, wrapAngle, scrollExpRate,
            diffAngle, diffLength, tongueOutLen, tongueOutAngle
        air: Inlet air state {rho, mu} (default: standard air)
        mode: "on_design" | "semi_empirical" | "off_design"
        fit_coeffs: Loss model coefficients (semi_empirical mode)
        pq_map: Experimental PQ data (off_design mode)

    Returns:
        dict with bep, pts, BPF, SPL, Ns, etc.
    """
    # --- Off-design mode: interpolate from experimental map ---
    if mode == "off_design" and pq_map:
        return _compute_from_map(params, pq_map, air)

    # --- Extract geometry ---
    D1 = params.get("D1", 120)
    D2 = params.get("D2", 175)
    b1 = params.get("b1", 60)
    b2 = params.get("b2", 50)
    beta1 = params.get("beta1", 30)
    beta2 = params.get("beta2", 145)
    Z = params.get("Z", 36)
    RPM = params.get("RPM", 1400)
    tBlade = params.get("tBlade", 1.0)
    cutoffGap = params.get("cutoffGap", 8)
    Rtongue = params.get("Rtongue", 5)
    wrapAngle = params.get("wrapAngle", 360)
    scrollExpRate = params.get("scrollExpRate", 0.12)
    diffAngle = params.get("diffAngle", 7)
    diffLength = params.get("diffLength", 40)

    # --- Air properties (variable or default) ---
    rho = air["rho"] if air else 1.184
    mu = air["mu"] if air else 1.85e-5

    # --- Loss coefficients (semi_empirical uses fitted values) ---
    fc = fit_coeffs or {}
    k_inc_mult = fc.get("k_inc", 1.0)
    k_fric_mult = fc.get("k_fric", 1.0)
    k_rec_thresh = fc.get("DR_crit", 0.5)
    k_rec_coeff = fc.get("k_rec", 0.0085)
    k_disk_mult = fc.get("k_disk", 1.0)
    k_jw_mult = fc.get("k_jw", 1.0)
    k_sc_mix = fc.get("k_sc_mix", 0.20)
    k_tongue_a = fc.get("k_tongue_a", 0.82)
    k_tongue_b = fc.get("k_tongue_b", 0.7)

    # --- Derived quantities ---
    omega = 2 * math.pi * RPM / 60
    r1, r2 = D1 / 2000, D2 / 2000
    b1m, b2m = b1 / 1000, b2 / 1000
    b1R = math.radians(beta1)
    b2R = math.radians(beta2)
    U1, U2 = omega * r1, omega * r2

    # Wiesner slip
    sigma = 1 - (math.pi * math.sin(b2R)) / Z
    Qmax_m3s = math.pi * (D2 / 1000) * b2m * U2 * 1.2

    # Passage hydraulic diameter
    pitch2 = math.pi * (D2 / 1000) / Z
    Dh = 2 * pitch2 * b2m / (pitch2 + b2m)
    tBladeM = tBlade / 1000
    k_inc_base = 1 - (tBladeM / (math.pi * (D1 / 1000) / Z)) ** 2

    gapM = cutoffGap / 1000
    wrapFrac = min(1.0, wrapAngle / 360)

    # Blade length (approximate via integration)
    Lb = 0
    px, py, th = r1, 0, 0
    for i in range(1, 21):
        t = i / 20
        r = r1 + t * (r2 - r1)
        rP = r1 + (i - 1) / 20 * (r2 - r1)
        rM = (r + rP) / 2
        tM = (t + (i - 1) / 20) / 2
        bM = b1R + tM * (b2R - b1R)
        if abs(math.tan(bM)) > 0.001:
            th += (-1 / (rM * math.tan(bM))) * (r - rP)
        x = r * math.cos(th)
        y = r * math.sin(th)
        Lb += math.sqrt((x - px) ** 2 + (y - py) ** 2)
        px, py = x, y

    # --- PQ curve (200 points) ---
    N = 200
    pts = []
    best_eta, best_idx = 0, 0
    min_bep_idx = N // 10

    for i in range(N + 1):
        Qm3s = (i / N) * Qmax_m3s
        Q = Qm3s * 60

        Cr1 = Qm3s / (math.pi * (D1 / 1000) * b1m) if b1m > 0 else 0
        Cr2 = Qm3s / (math.pi * (D2 / 1000) * b2m) if b2m > 0 else 0
        Ct2 = sigma * U2 - Cr2 / math.tan(b2R) if abs(math.tan(b2R)) > 1e-6 else sigma * U2
        C2 = math.sqrt(Cr2 ** 2 + Ct2 ** 2)
        W1 = math.sqrt(Cr1 ** 2 + U1 ** 2)
        W2 = math.sqrt(Cr2 ** 2 + (Ct2 - U2) ** 2)
        Pt_e = rho * U2 * Ct2

        # (1) Incidence loss
        inc_A = math.atan2(Cr1, U1) - b1R
        dP_inc = k_inc_base * k_inc_mult * 0.5 * rho * (W1 * math.sin(inc_A)) ** 2

        # (2) Passage friction
        Wa = (W1 + W2) / 2
        Re = rho * Wa * Dh / mu if mu > 0 else 1e5
        if Re > 2300:
            f = 1 / (-1.8 * math.log10(6.9 / Re + (5e-5 / Dh / 3.7) ** 1.11)) ** 2
        elif Re > 0:
            f = 64 / Re
        else:
            f = 0.02
        dP_fric = k_fric_mult * f * (Lb / Dh) * 0.5 * rho * Wa ** 2

        # (3) Recirculation
        DR = 1 - W2 / W1 + abs(Ct2) / (2 * Z * W1 / math.pi) if W1 > 0 else 0
        dP_rec = k_rec_coeff * (DR - k_rec_thresh) ** 2 * rho * U2 ** 2 if DR > k_rec_thresh else 0

        # (4) Disk friction
        Re_disk = rho * omega * r2 ** 2 / mu if mu > 0 else 1e6
        Cm = 0.0622 / Re_disk ** 0.2 if Re_disk > 0 else 0.005
        Pdf = k_disk_mult * 2 * 0.5 * Cm * rho * omega ** 3 * r2 ** 5
        dP_disk = Pdf / Qm3s if Qm3s > 1e-6 else Pdf / 1e-6

        # (5) Jet-wake
        eps = 0.12 + 0.5 * tBladeM / pitch2
        dP_jw = k_jw_mult * 0.5 * rho * C2 ** 2 * eps ** 2

        # Impeller total
        dP_disk = min(dP_disk, Pt_e * 0.5)
        Pt_imp = max(0, Pt_e - dP_inc - dP_fric - dP_rec - dP_disk - dP_jw)
        Pdyn_imp = 0.5 * rho * C2 ** 2

        # --- Scroll losses ---
        Pdyn_cap = Pdyn_imp * wrapFrac
        L_scroll = 2 * math.pi * r2 * wrapFrac
        bScrollM = b2m * 1.1
        rExit = r2 + r2 * scrollExpRate * wrapFrac * 2 * math.pi
        A_sc_exit = bScrollM * (rExit - r2)
        A_sc = max(A_sc_exit, Qm3s / max(1, C2 * 0.5) if Qm3s > 0 else bScrollM * 0.02)
        D_h_sc = 2 * A_sc / (math.sqrt(A_sc / bScrollM) + bScrollM) if bScrollM > 0 else 0.01
        C_sc = Qm3s / max(1e-4, A_sc) * 0.7 if Qm3s > 0 else C2 * 0.5
        Re_sc = rho * abs(C_sc) * max(0.005, D_h_sc) / mu if mu > 0 else 1e5
        f_sc = 0.316 / Re_sc ** 0.25 if Re_sc > 2300 else (64 / Re_sc if Re_sc > 0 else 0.02)
        dP_sc_fric = f_sc * (L_scroll / max(0.005, D_h_sc)) * 0.5 * rho * C_sc ** 2
        dP_sc_mix = k_sc_mix * Pdyn_cap
        dP_scroll = dP_sc_fric + dP_sc_mix

        # --- Tongue recirculation ---
        gapRatio = gapM / (2 * r2)
        denom_tongue = 1 + Rtongue / cutoffGap if cutoffGap > 0 else 1
        eps_leak = min(0.25, k_tongue_a * gapRatio ** k_tongue_b / denom_tongue)
        Q_recirc = Qm3s * eps_leak
        Q_delivered = Qm3s * (1 - eps_leak)
        Q_del_m3min = Q_delivered * 60
        dP_tongue = eps_leak * Pt_imp * 0.3

        # --- Diffuser ---
        if diffLength > 0:
            diffAR = 1 + 2 * (diffLength / 1000) * math.tan(abs(diffAngle) * math.pi / 180) / max(0.01, math.sqrt(A_sc))
        else:
            diffAR = 1
        A_exit = max(0.001, A_sc * max(1, diffAR))

        # --- Uncaptured ---
        dP_uncap = 0.5 * rho * (C2 * math.sqrt(1 - wrapFrac)) ** 2 * (1 - wrapFrac)

        # --- Fan totals ---
        Pt_fan = max(0, Pt_imp - dP_jw - dP_scroll - dP_tongue - dP_uncap)
        V_exit = Q_delivered / A_exit if Q_delivered > 0 else 0
        Pdyn_exit = 0.5 * rho * V_exit ** 2
        Ps = Pt_fan - Pdyn_exit

        Pshaft = Pt_e * Qm3s + Pdf if Qm3s > 1e-6 else Pdf
        eta = max(0, Ps * Q_delivered) / Pshaft if Pshaft > 0 else 0

        pts.append({
            "Q": Q_del_m3min, "Qm3s": Q_delivered,
            "Pt": Pt_fan, "Ps": Ps, "Pdyn": Pdyn_exit, "eta": eta,
            "C2": C2, "W1": W1, "W2": W2, "Ct2": Ct2, "Pt_e": Pt_e,
            "dP_inc": dP_inc, "dP_fric": dP_fric, "dP_rec": dP_rec,
            "dP_disk": dP_disk, "dP_jw": dP_jw,
            "dP_scroll": dP_scroll, "dP_tongue": dP_tongue,
            "dP_uncap": dP_uncap, "Q_recirc": Q_recirc,
            "Pt_imp": Pt_imp, "Pshaft": Pshaft,
        })
        if i >= min_bep_idx and eta > best_eta:
            best_eta = eta
            best_idx = i

    # BEP interpolation
    bep = pts[best_idx]
    if 0 < best_idx < N:
        a = pts[best_idx - 1]["eta"]
        b_val = pts[best_idx]["eta"]
        c = pts[best_idx + 1]["eta"]
        denom = 2 * (a - 2 * b_val + c)
        if abs(denom) > 1e-12:
            shift = (a - c) / denom
            bep = {}
            for k in pts[best_idx]:
                v0 = pts[best_idx][k]
                if shift > 0:
                    v1 = pts[best_idx + 1][k]
                else:
                    v1 = pts[best_idx - 1][k]
                bep[k] = v0 + (v1 - v0) * abs(shift)

    # Noise (Neise 1992)
    dR = cutoffGap / (D2 / 2)
    BPF = Z * RPM / 60
    if bep["Qm3s"] > 0 and bep["Pt"] > 0:
        SPL = 10 * math.log10(bep["Pt"] ** 2 * bep["Qm3s"] / (rho * 343 ** 3)) + 56
    else:
        SPL = 30
    SPL -= 20 * math.log10(max(0.03, dR) / 0.10)
    SPL -= 5 * math.log10(1 + Rtongue / max(1, cutoffGap))

    # Specific speed
    Ns = RPM * math.sqrt(bep["Qm3s"]) / (max(1, bep["Pt"]) / rho) ** 0.75 if bep["Qm3s"] > 0 else 0

    return {
        "bep": bep,
        "pts": pts,
        "BPF": BPF,
        "SPL": SPL,
        "Ns": Ns,
        "U1": U1, "U2": U2,
        "omega": omega,
        "Lb": Lb,
        "rho": rho,
        "sigma": sigma,
    }


def _compute_from_map(params: dict, pq_map: dict, air: dict = None) -> dict:
    """Off-design: interpolate from experimental PQ map."""
    RPM = params.get("RPM", 1400)
    # pq_map = { "data": [ {Q, Ps, eta, W, RPM}, ... ], "RPM_list": [...] }
    data = pq_map.get("data", [])
    if not data:
        return {"bep": {}, "pts": [], "error": "No map data"}

    # Filter for nearest RPM
    target_RPM = RPM
    rpm_list = sorted(set(d.get("RPM", RPM) for d in data))
    nearest_RPM = min(rpm_list, key=lambda r: abs(r - target_RPM))
    rpm_data = [d for d in data if abs(d.get("RPM", RPM) - nearest_RPM) < 1]
    rpm_data.sort(key=lambda d: d["Q"])

    # Build pts
    pts = []
    best_eta, best_idx = 0, 0
    for i, d in enumerate(rpm_data):
        pt = {
            "Q": d["Q"], "Qm3s": d["Q"] / 60,
            "Ps": d.get("Ps", 0), "Pt": d.get("Pt", d.get("Ps", 0)),
            "eta": d.get("eta", 0),
            "Pdyn": d.get("Pt", 0) - d.get("Ps", 0) if "Pt" in d else 0,
        }
        pts.append(pt)
        if pt["eta"] > best_eta:
            best_eta = pt["eta"]
            best_idx = i

    bep = pts[best_idx] if pts else {}
    return {"bep": bep, "pts": pts, "mode": "off_design", "map_RPM": nearest_RPM}


def compute_outlet_state(inlet: dict, fan_result: dict) -> dict:
    """
    Compute fan outlet state from inlet state + fan result.
    
    HPWD Convention:
    - Fan adds ΔPs to static pressure
    - Temperature: slight rise from inefficiency (T_out = T_in + ΔT_fan)
    - Humidity: unchanged (ω_out = ω_in)
    - Mass flow: Q_delivered from fan model
    """
    bep = fan_result.get("bep", {})
    Ps = bep.get("Ps", 0)
    eta = bep.get("eta", 0)
    Pshaft = bep.get("Pshaft", 0)
    Qm3s = bep.get("Qm3s", 0)

    T_in = inlet.get("T", 25.0)
    omega_in = inlet.get("omega", 0.010)
    P_in = inlet.get("P", 101325.0)
    rho = inlet.get("rho", 1.184)
    cp = inlet.get("cp", 1006.0)

    # Temperature rise from fan motor heat (W_shaft * (1 - η) → air)
    m_dot = rho * Qm3s  # kg/s
    Q_heat = Pshaft * (1 - eta) if Pshaft > 0 and eta < 1 else 0
    dT = Q_heat / (m_dot * cp) if m_dot > 0 else 0

    return {
        "T": T_in + dT,
        "omega": omega_in,
        "P": P_in + Ps,
        "m_dot": m_dot,
        "Q_m3s": Qm3s,
        "Q_m3min": Qm3s * 60,
        "dT_fan": dT,
        "Ps": Ps,
        "W_shaft": Pshaft,
        "eta": eta,
    }
