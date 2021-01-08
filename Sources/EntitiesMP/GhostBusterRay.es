505
%{
#include "StdH.h"
%}

uses "EntitiesMP/Light";
uses "EntitiesMP/Bullet";
uses "EntitiesMP/PlayerWeapons";

// input parameter for ghost buster ray
event EGhostBusterRay {
  CEntityPointer penOwner,        // entity which owns it
};

%{
#define HIT_DISTANCE 100.0f // ray hit distance

void CGhostBusterRay_OnPrecache(CDLLEntityClass *pdec, INDEX iUser) 
{
  pdec->PrecacheClass(CLASS_BULLET);
  pdec->PrecacheModel(MODEL_RAY);
  pdec->PrecacheTexture(TEXTURE_RAY);
}
%}

class CGhostBusterRay : CMovableModelEntity {
name      "GhostBusterRay";
thumbnail "";
features "ImplementsOnPrecache", "CanBePredictable";

properties:
  1 CEntityPointer m_penOwner,    // entity which owns it
  2 BOOL m_bRender = FALSE,       // do not render on startup
  3 FLOAT3D m_vSrcOld = FLOAT3D(0.0f, 0.0f, 0.0f),
  4 FLOAT3D m_vDstOld = FLOAT3D(0.0f, 0.0f, 0.0f),
  5 FLOAT3D m_vSrc = FLOAT3D(0.0f, 0.0f, 0.0f),
  6 FLOAT3D m_vDst = FLOAT3D(0.0f, 0.0f, 0.0f),
 10 FLOAT3D m_iLastBulletPosition = FLOAT3D(32000.0f, 32000.0f, 32000.0f),   // for lerping
 11 CAnimObject m_aoLightAnim,
 12 INDEX m_ctPasses = 0,       // for lerping initialization

{
  CLightSource m_lsLightSource;
  CEntity *penBullet;
  const CPlacement3D *pplSource;
}

components:
  1 class   CLASS_LIGHT  "Classes\\Light.ecl",
  2 class   CLASS_BULLET "Classes\\Bullet.ecl",

 // [Cecil] Dummy model
 10 model   MODEL_RAY   "Models\\Editor\\Axis.mdl",
 11 texture TEXTURE_RAY "Models\\Editor\\Vector.tex",

functions:
  // add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penOwner->AddToPrediction();
  }

  // render particles
  void RenderParticles(void) {
    if (m_ctPasses < 2) {
      return;
    }

    FLOAT3D vLerpedSrc = Lerp(m_vSrcOld, m_vSrc, _pTimer->GetLerpFactor());
    FLOAT3D vLerpedDst = Lerp(m_vDstOld, m_vDst, _pTimer->GetLerpFactor());

    // [Cecil] New particles
    Particles_Ghostbuster2(vLerpedSrc, vLerpedDst, 32, 0.25f, 1.0f);
  };

  /* Read from stream. */
  void Read_t(CTStream *istr) // throw char *
  {
    CMovableModelEntity::Read_t(istr);
    SetupLightSource();
  };

  /* Get static light source information. */
  CLightSource *GetLightSource(void)
  {
    if (!IsPredictor()) {
      return &m_lsLightSource;
    } else {
      return NULL;
    }
  };

  // Setup light source
  void SetupLightSource(void)
  {
    // setup light source
    CLightSource lsNew;
    lsNew.ls_ulFlags = LSF_NONPERSISTENT|LSF_DYNAMIC;
    lsNew.ls_colColor = RGBToColor(134,238,255);
    lsNew.ls_rFallOff = 10.0f;
    lsNew.ls_rHotSpot = 1.0f;
    lsNew.ls_plftLensFlare = NULL;
    lsNew.ls_ubPolygonalMask = 0;
    lsNew.ls_paoLightAnimation = &m_aoLightAnim;

    m_lsLightSource.ls_penEntity = this;
    m_lsLightSource.SetLightSource(lsNew);
  };

/************************************************************
 *                        DO MOVING                         *
 ************************************************************/
  void DoMoving(void) {
    en_plLastPlacement = GetPlacement();  // remember old placement for lerping
  };

  void PostMoving(void) {
    if (!IsOfClass(m_penOwner, "Player Weapons")) {
      return;
    }

    // [Cecil] For convenience
    CPlayerWeapons &penWeapons = (CPlayerWeapons&)*m_penOwner;

    // from current owner position move away
    CPlacement3D plSource;
    penWeapons.GetGhostBusterSourcePlacement(plSource);

    FLOAT3D vDirection, vDesired;
    AnglesToDirectionVector(plSource.pl_OrientationAngle, vDirection);
    vDesired = vDirection*HIT_DISTANCE;
    vDesired = plSource.pl_PositionVector + vDesired;

    // cast a ray to find if any brush is hit
    CCastRay crRay(penWeapons.m_penPlayer, plSource.pl_PositionVector, vDesired);
    crRay.cr_bHitTranslucentPortals = FALSE;
    crRay.cr_ttHitModels = CCastRay::TT_COLLISIONBOX;
    GetWorld()->CastRay(crRay);

    // if hit anything set new position
    if (crRay.cr_penHit != NULL) {
      vDesired = crRay.cr_vHit;
    }
    vDesired -= vDirection/10.0f;

    // [Cecil] Get last position offset
    FLOAT3D vLastPos = penWeapons.RenderPos(WEAPON_LASER).Pos1();
    vLastPos(3) = 0.1f;

    // [Cecil] Shift the position
    CPlacement3D plShift = CPlacement3D(vLastPos, ANGLE3D(0.0f, 0.0f, 0.0f));
    plShift.RelativeToAbsolute(plSource);

    // source position
    m_vSrcOld = m_vSrc;
    m_vSrc = plShift.pl_PositionVector;

    // destination position
    m_vDstOld = m_vDst;
    m_vDst = vDesired;

    // stretch model
    FLOAT fStretch = (plSource.pl_PositionVector - vDesired).Length();
    //GetModelObject()->mo_Stretch(3) = fStretch;
    GetModelObject()->mo_Stretch(3) = 0.001f;
    // set your new placement
    CPlacement3D plSet;
    plSet.pl_PositionVector = vDesired;
    plSet.pl_OrientationAngle = plSource.pl_OrientationAngle;
    SetPlacement(plSet);
    m_ctPasses++;
  };

/************************************************************
 *                      FIRE FUNCTIONS                      *
 ************************************************************/
  // [Cecil] Ray power
  void PrepareBullet(const CPlacement3D &plBullet, FLOAT fPower) {
    // create bullet
    penBullet = CreateEntity(plBullet, CLASS_BULLET);
    // init bullet
    EBulletInit eInit;
    eInit.penOwner = ((CPlayerWeapons&)*m_penOwner).m_penPlayer;

    // [Cecil] Multiply damage
    eInit.fDamage = 100.0f*fPower * FireSpeed();

    penBullet->Initialize(eInit);
    ((CBullet&)*penBullet).m_EdtDamage = DMT_BULLET;
  };

  // [Cecil] Ray power
  void Fire(const CPlacement3D &plSource, FLOAT fPower) {
    if (!IsOfClass(m_penOwner, "Player Weapons")) { return; }

    // fire lerped bullets
    PrepareBullet(plSource, fPower);

    ((CBullet&)*penBullet).CalcTarget(HIT_DISTANCE);
    ((CBullet&)*penBullet).m_fBulletSize = 0.5f;
    ((CBullet&)*penBullet).CalcJitterTarget(0.02f*HIT_DISTANCE);
    // [Cecil] Disabled sound and effect
    ((CBullet&)*penBullet).LaunchBullet(FALSE, FALSE, FALSE);
    ((CBullet&)*penBullet).DestroyBullet();
  };

  // destroy yourself
  void DestroyGhostBusterRay(void) {
    Destroy();
  };

/************************************************************
 *                   P R O C E D U R E S                    *
 ************************************************************/
procedures:
  // --->>> MAIN
  Main(EGhostBusterRay egbr) {
    // store owner
    ASSERT(egbr.penOwner!=NULL);
    m_penOwner = egbr.penOwner;

    // [Cecil] InitAsModel() -> InitAsEditorModel()
    // initialization
    InitAsEditorModel();
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);
    SetModel(MODEL_RAY);
    SetModelMainTexture(TEXTURE_RAY);

    // [Cecil] Not needed
    /*try {
      m_aoLightAnim.SetData_t(CTFILENAME("Animations\\GhostbusterLightning.ani"));
      m_aoLightAnim.PlayAnim(0,AOF_LOOPING);
    } catch (char *strError) {
      CPrintF("%s", strError);
    }*/

    // setup light source
    SetupLightSource();

    // add to movers list
    AddToMovers();
    m_ctPasses = 0;

    return;
  }
};
