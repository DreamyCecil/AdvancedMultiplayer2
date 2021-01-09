2001
%{
#include "StdH.h"
%}

class CHellfireCloud : CRationalEntity {
name      "HellfireCloud";
thumbnail "";
features  "IsTargetable";

properties:
  1 CEntityPointer m_penOwner,
  2 FLOAT m_fTime = 0.0f,
  3 FLOAT m_fStart = 0.0f,

components:
  1 model   MODEL_MARKER   "Models\\Editor\\Axis.mdl",
  2 texture TEXTURE_MARKER "Models\\Editor\\Vector.tex",

functions:
  // Returns bytes of memory used by this object
  SLONG GetUsedMemory(void) {
    SLONG slUsedMemory = sizeof(CHellfireCloud) - sizeof(CRationalEntity) + CRationalEntity::GetUsedMemory();

    return slUsedMemory;
  };

  CEntity *GetOwner(void) {
    if (m_penOwner == NULL || m_penOwner->GetFlags() & ENF_DELETED) {
      return this;
    }
    return m_penOwner;
  };

  void RenderParticles(void) {
    UBYTE ubAlpha = 0;
    FLOAT fStartDiff = (_pTimer->GetLerpedCurrentTick() - m_fStart);
    FLOAT fEndDiff = ClampUp(m_fTime - _pTimer->GetLerpedCurrentTick(), 1.0f);

    if (fStartDiff < 1.0f) {
      ubAlpha = NormFloatToByte(fStartDiff * 1.0f);
    } else {
      ubAlpha = NormFloatToByte(fEndDiff * 1.0f);
    }

    Particles_FireBreath(this, GetLerpedPlacement().pl_PositionVector, GetLerpedPlacement().pl_PositionVector, m_fStart, m_fTime);
  };

procedures:
  MainLoop() {
    while (m_fTime > _pTimer->CurrentTick()) {
      CEntity *pen = GetOwner();

      InflictRangeDamage(pen, DMT_BURNING, Lerp(2, 8, FRnd()), GetPlacement().pl_PositionVector, 4.0f, 8.0f);
      autowait(0.2f);
    }

    Destroy();
    return;
  };

  Main(EStart eStart) {
    InitAsEditorModel();
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);
    SetModel(MODEL_MARKER);
    SetModelMainTexture(TEXTURE_MARKER);

    GetModelObject()->StretchModel(FLOAT3D(3.5f, 2.5f, 3.5f));
    ModelChangeNotify();

    m_penOwner = eStart.penCaused;
    m_fStart = _pTimer->CurrentTick();
    m_fTime = _pTimer->CurrentTick() + 10.0f;

    jump MainLoop();
    return;
  };
};

