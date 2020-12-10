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

components:
  1 model   MODEL_MARKER   "Models\\Editor\\Axis.mdl",
  2 texture TEXTURE_MARKER "Models\\Editor\\Vector.tex",

functions:
  // add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penOwner->AddToPrediction();
  };

  void RenderParticles(void) {
    FLOAT tmNow = _pTimer->GetLerpedCurrentTick();

    if (tmNow - m_tmLightningStart > 0.0f && tmNow - m_tmLightningStart < 1.5f) {
      // render lightning particles
      FLOAT3D vSrc = GetLerpedPlacement().pl_PositionVector;
      Particles_TeslaLightning(vSrc, m_vTarget, m_tmLightningStart - 0.15f, m_fLightningPower, 1.0f, 0.5f);
    }
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

    AddToMovers();

    // wait for the lightning to disappear
    autowait(1.5f);

    Destroy();
    return;
  };
};
