2000
%{
#include "StdH.h"
#include "EntitiesMP/Light.h"
%}

uses "EntitiesMP/PlayerWeapons";

event ETeslaLightning {
  CEntityPointer penOwner,
  FLOAT3D vTarget,
  FLOAT fPower,
};

// [Cecil] A dynamic lightning effect entity
class CTeslaLightning : CMovableModelEntity {
name      "TeslaLightning";
thumbnail "";
features  "CanBePredictable";

properties:
  1 FLOAT m_tmLightningStart = -100.0f, // lightning start time
  2 FLOAT m_fLightningPower = 1.0f, // lightning power
  3 CEntityPointer m_penOwner,
  4 FLOAT3D m_vTarget = FLOAT3D(0.0f, 0.0f, 0.0f), // target position
  5 FLOAT3D m_vSource = FLOAT3D(0.0f, 0.0f, 0.0f), // source position
  6 FLOAT3D m_vLastSrc = FLOAT3D(0.0f, 0.0f, 0.0f), // for lerping

components:
  1 model   MODEL_MARKER   "Models\\Editor\\Axis.mdl",
  2 texture TEXTURE_MARKER "Models\\Editor\\Vector.tex",

functions:
  // Add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penOwner->AddToPrediction();
  };

  void RenderParticles(void) {
    FLOAT tmNow = _pTimer->GetLerpedCurrentTick();

    if (tmNow - m_tmLightningStart > 0.0f && tmNow - m_tmLightningStart < 1.5f) {
      // render lightning particles
      FLOAT3D vSrc = Lerp(m_vLastSrc, m_vSource, _pTimer->GetLerpFactor());
      Particles_TeslaLightning(vSrc, m_vTarget, m_tmLightningStart - 0.15f, m_fLightningPower, 1.0f, 0.5f);
    }
  };

  // Set source position
  void SetSource(const CPlacement3D &plTesla) {
    CPlayerWeapons &penWeapons = (CPlayerWeapons&)*m_penOwner;

    // get last position offset
    FLOAT fSide = penWeapons.RenderPos(WEAPON_FLAMER).vFire(1) * 4.0f;
    FLOAT3D vLastPos = FLOAT3D(penWeapons.RenderPos(WEAPON_FLAMER).Pos1(1) + fSide, penWeapons.FirePos(WEAPON_FLAMER)(2) - 0.1f, 0.0f);

    // shift the position
    CPlacement3D plShift = CPlacement3D(vLastPos, ANGLE3D(0.0f, 0.0f, 0.0f));
    plShift.RelativeToAbsolute(plTesla);

    m_vLastSrc = m_vSource;
    m_vSource = plShift.pl_PositionVector;
  };

  void DoMoving(void) {
    // remember old placement for lerping
    en_plLastPlacement = GetPlacement();
  };

  void PostMoving(void) {
    if (m_penOwner == NULL || m_penOwner->GetFlags() & ENF_DELETED || !IsOfClass(m_penOwner, "Player Weapons")) {
      return;
    }
    
    // set placement to tesla gun position
    CPlacement3D plSource;
    ((CPlayerWeapons&)*m_penOwner).GetTeslaPlacement(plSource);

    // set source position
    SetSource(plSource);

    SetPlacement(plSource);
  };

procedures:
  Main(ETeslaLightning eTesla) {
    InitAsEditorModel();
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    SetModel(MODEL_MARKER);
    SetModelMainTexture(TEXTURE_MARKER);

    // set properties
    m_tmLightningStart = _pTimer->CurrentTick();
    m_fLightningPower = Clamp(eTesla.fPower, 0.0f, 1.0f);
    m_penOwner = eTesla.penOwner;
    m_vTarget = eTesla.vTarget;
    
    // set source position
    if (IsOfClass(m_penOwner, "Player Weapons")) {
      CPlacement3D plSource;
      ((CPlayerWeapons&)*m_penOwner).GetTeslaPlacement(plSource);

      SetSource(plSource);
    } else {
      m_vSource = GetPlacement().pl_PositionVector;
    }

    m_vLastSrc = m_vSource;

    AddToMovers();

    // wait for the lightning to disappear
    autowait(1.5f);

    Destroy();
    return;
  };
};
