242
%{
#include "StdH.h"
#include "EntitiesMP/WorldSettingsController.h"
%}

uses "EntitiesMP/ModelDestruction";
uses "EntitiesMP/AnimationChanger";
uses "EntitiesMP/BloodSpray";

enum SkaCustomShadingType {
  0 SCST_NONE             "Automatic shading",
  1 SCST_CONSTANT_SHADING "Constant shading",
  2 SCST_FULL_CUSTOMIZED  "Customized shading"
};

enum SkaShadowType {
  0 SST_NONE      "None",
  1 SST_CLUSTER   "Cluster shadows",
  2 SST_POLYGONAL "Polygonal" 
};

%{
// #define MIPRATIO 0.003125f //(2*tan(90/2))/640
%}

class CModelHolder3 : CRationalEntity {
name      "ModelHolder3";
thumbnail "Thumbnails\\ModelHolder3.tbn";
features "HasName", "HasDescription";

properties:
  1 CTFileName m_fnModel      "Model file (.smc)" 'M' = CTFILENAME(""),
  3 FLOAT m_fStretchAll       "StretchAll" 'S' = 1.0f,
  4 ANGLE3D m_vStretchXYZ       "StretchXYZ" 'X' = FLOAT3D(1.0f, 1.0f, 1.0f),
  7 CTString m_strName        "Name" 'N' ="",
 12 CTString m_strDescription = "",
  8 BOOL m_bColliding       "Collision" 'L' = FALSE,    // set if model is not immatierial
 11 enum SkaShadowType m_stClusterShadows "Shadows" 'W' = SST_CLUSTER,   // set if model uses cluster shadows
 13 BOOL m_bBackground     "Background" 'B' = FALSE,   // set if model is rendered in background
 21 BOOL m_bTargetable     "Targetable" = FALSE, // st if model should be targetable

 // parameters for custom shading of a model (overrides automatic shading calculation)
 14 enum SkaCustomShadingType m_cstCustomShading "Shading mode" 'H' = SCST_NONE,
 15 ANGLE3D m_aShadingDirection "Shade. Light direction" 'D' = ANGLE3D( AngleDeg(45.0f),AngleDeg(45.0f),AngleDeg(45.0f)),
 16 COLOR m_colLight            "Shade. Light color" 'O' = C_WHITE,
 17 COLOR m_colAmbient          "Shade. Ambient color" 'A' = C_BLACK,
 26 BOOL m_bActive "Active" = TRUE,

 70 FLOAT m_fClassificationStretch  "Classification stretch" = 1.0f, // classification box multiplier

100 FLOAT m_fMaxTessellationLevel "Max tessellation level" = 0.0f,

components:

functions:
  /* Fill in entity statistics - for AI purposes only */
  BOOL FillEntityStatistics(EntityStats *pes)
  {
    pes->es_strName = m_fnModel.FileName();
    
    pes->es_ctCount = 1;
    pes->es_ctAmmount = 1;
    pes->es_fValue = 0;
    pes->es_iScore = 0;
    return TRUE;
  }

  // classification box multiplier
  FLOAT3D GetClassificationBoxStretch(void) {
    return FLOAT3D( m_fClassificationStretch, m_fClassificationStretch, m_fClassificationStretch);
  };

  // maximum allowed tessellation level for this model (for Truform/N-Patches support)
  FLOAT GetMaxTessellationLevel(void) {
    return m_fMaxTessellationLevel;
  };

  /* Receive damage */
  void ReceiveDamage(CEntity *penInflictor, enum DamageType dmtType,
    FLOAT fDamageAmmount, const FLOAT3D &vHitPoint, const FLOAT3D &vDirection) 
  {};

  // Entity info
  void *GetEntityInfo(void) {
    return CEntity::GetEntityInfo();
  };

  BOOL IsTargetable(void) const
  {
    return m_bTargetable;
  }

  /* Adjust model shading parameters if needed. */
  BOOL AdjustShadingParameters(FLOAT3D &vLightDirection, COLOR &colLight, COLOR &colAmbient)
  {
    switch(m_cstCustomShading)
    {
    case SCST_FULL_CUSTOMIZED:
      {
        colLight   = m_colLight;
        colAmbient = m_colAmbient;

        AnglesToDirectionVector(m_aShadingDirection, vLightDirection);
        vLightDirection = -vLightDirection;
        break;
      }
    case SCST_CONSTANT_SHADING:
      {
        // combine colors with clamp
        UBYTE lR,lG,lB,aR,aG,aB,rR,rG,rB;
        ColorToRGB( colLight,   lR, lG, lB);
        ColorToRGB( colAmbient, aR, aG, aB);
        colLight = 0;
        rR = (UBYTE) Clamp( (ULONG)lR+aR, (ULONG)0, (ULONG)255);
        rG = (UBYTE) Clamp( (ULONG)lG+aG, (ULONG)0, (ULONG)255);
        rB = (UBYTE) Clamp( (ULONG)lB+aB, (ULONG)0, (ULONG)255);
        colAmbient = RGBToColor( rR, rG, rB);
        break;
      }
    case SCST_NONE:
      {
        // do nothing
        break;
      }
    }

    return m_stClusterShadows!=SST_NONE;
  };

  // apply mirror and stretch to the entity
  void MirrorAndStretch(FLOAT fStretch, BOOL bMirrorX)
  {
    m_fStretchAll*=fStretch;
    if (bMirrorX) {
      m_vStretchXYZ(1)=-m_vStretchXYZ(1);
    }
  }


// Stretch model
  void StretchModel(void) {
    // stretch factors must not have extreme values
    if (Abs(m_vStretchXYZ(1))  < 0.01f) { m_vStretchXYZ(1)   = 0.01f;  }
    if (Abs(m_vStretchXYZ(2))  < 0.01f) { m_vStretchXYZ(2)   = 0.01f;  }
    if (Abs(m_vStretchXYZ(3))  < 0.01f) { m_vStretchXYZ(3)   = 0.01f;  }
    if (m_fStretchAll< 0.01f) { m_fStretchAll = 0.01f;  }

    if (Abs(m_vStretchXYZ(1))  >1000.0f) { m_vStretchXYZ(1)   = 1000.0f*Sgn(m_vStretchXYZ(1)); }
    if (Abs(m_vStretchXYZ(2))  >1000.0f) { m_vStretchXYZ(2)   = 1000.0f*Sgn(m_vStretchXYZ(2)); }
    if (Abs(m_vStretchXYZ(3))  >1000.0f) { m_vStretchXYZ(3)   = 1000.0f*Sgn(m_vStretchXYZ(3)); }
    if (m_fStretchAll>1000.0f) { m_fStretchAll = 1000.0f; }

/*    if (m_bRandomStretch) {
      m_bRandomStretch = FALSE;
      // stretch
      m_fStretchRndX   = Clamp( m_fStretchRndX   , 0.0f, 1.0f);
      m_fStretchRndY   = Clamp( m_fStretchRndY   , 0.0f, 1.0f);
      m_fStretchRndZ   = Clamp( m_fStretchRndZ   , 0.0f, 1.0f);
      m_fStretchRndAll = Clamp( m_fStretchRndAll , 0.0f, 1.0f);

      m_fStretchRandom(1) = (FRnd()*m_fStretchRndX*2 - m_fStretchRndX) + 1;
      m_fStretchRandom(2) = (FRnd()*m_fStretchRndY*2 - m_fStretchRndY) + 1;
      m_fStretchRandom(3) = (FRnd()*m_fStretchRndZ*2 - m_fStretchRndZ) + 1;

      FLOAT fRNDAll = (FRnd()*m_fStretchRndAll*2 - m_fStretchRndAll) + 1;
      m_fStretchRandom(1) *= fRNDAll;
      m_fStretchRandom(2) *= fRNDAll;
      m_fStretchRandom(3) *= fRNDAll;
    }*/

    GetModelInstance()->StretchModel( m_vStretchXYZ*m_fStretchAll );
    ModelChangeNotify();
  };


  /* Init model holder*/
  void InitModelHolder(void) {

    // must not crash when model is removed
    if (m_fnModel=="") {
      m_fnModel=CTFILENAME("Models\\Editor\\Ska\\Axis.smc");
    }

    if (m_bActive) {
      InitAsSkaModel();
    } else {
      InitAsSkaEditorModel();
    }
   
    BOOL bLoadOK = TRUE;
    // try to load the model
    try {
      SetSkaModel_t(m_fnModel);
      // if failed
    } catch(char *strError) {
      WarningMessage(TRANS("Cannot load ska model '%s':\n%s"), (CTString&)m_fnModel, strError);
      bLoadOK = FALSE;
      // set colision info for default model
      //SetSkaColisionInfo();
    }
    if (!bLoadOK) {
      SetSkaModel(CTFILENAME("Models\\Editor\\Ska\\Axis.smc"));
    }
    
    /*try
    {
      GetModelObject()->mo_toTexture.SetData_t(m_fnTexture);
      GetModelObject()->mo_toTexture.PlayAnim(m_iTextureAnimation, AOF_LOOPING);
      GetModelObject()->mo_toReflection.SetData_t(m_fnReflection);
      GetModelObject()->mo_toSpecular.SetData_t(m_fnSpecular);
      GetModelObject()->mo_toBump.SetData_t(m_fnBump);
    } catch (char *strError) {
      WarningMessage(strError);
    }*/

    // set model stretch
    StretchModel();
    ModelChangeNotify();

    if (m_bColliding&&m_bActive) {
      SetPhysicsFlags(EPF_MODEL_FIXED);
      SetCollisionFlags(ECF_MODEL_HOLDER);
    } else {
      SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
      SetCollisionFlags(ECF_IMMATERIAL);
    }

    switch(m_stClusterShadows) {
    case SST_NONE:
      {
        SetFlags(GetFlags()&~ENF_CLUSTERSHADOWS);
        //SetFlags(GetFlags()&~ENF_POLYGONALSHADOWS);
        break;
      }
    case SST_CLUSTER:
      {
        SetFlags(GetFlags()|ENF_CLUSTERSHADOWS);
        //SetFlags(GetFlags()&~ENF_POLYGONALSHADOWS);
        break;
      }
    case SST_POLYGONAL:
      {
        //SetFlags(GetFlags()|ENF_POLYGONALSHADOWS);
        SetFlags(GetFlags()&~ENF_CLUSTERSHADOWS);
        break;
      }
    }

    if (m_bBackground) {
      SetFlags(GetFlags()|ENF_BACKGROUND);
    } else {
      SetFlags(GetFlags()&~ENF_BACKGROUND);
    }

/*    try {
      m_aoLightAnimation.SetData_t(m_fnmLightAnimation);
    } catch (char *strError) {
      WarningMessage(TRANS("Cannot load '%s': %s"), (CTString&)m_fnmLightAnimation, strError);
      m_fnmLightAnimation = "";
    }
    if (m_aoLightAnimation.GetData()!=NULL) {
      m_aoLightAnimation.PlayAnim(m_iLightAnimation, AOF_LOOPING);
    }

    if (m_penDestruction==NULL) {
      m_strDescription.PrintF("%s,%s undestroyable", (CTString&)m_fnModel.FileName(), (CTString&)m_fnTexture.FileName());
    } else {
      m_strDescription.PrintF("%s,%s -> %s", (CTString&)m_fnModel.FileName(), (CTString&)m_fnTexture.FileName(),
        m_penDestruction->GetName());
    }*/

    /*m_iMinModelOpacity = Clamp(m_iMinModelOpacity, (INDEX)0, (INDEX)255);
    m_fFadeEndWait = ClampDn(m_fFadeEndWait, 0.05f);
    m_fFadeSpeed = ClampDn(m_fFadeSpeed, 0.05f);*/

    m_strDescription.PrintF("%s", (CTString&)m_fnModel.FileName());

    return;
  };

procedures:
  Die()
  {
    // for each child of this entity
    {FOREACHINLIST(CEntity, en_lnInParent, en_lhChildren, itenChild) {
      // send it destruction event
      itenChild->SendEvent(ERangeModelDestruction());
    }}

/*    // spawn debris 
    CModelDestruction *pmd=GetDestruction();
    pmd->SpawnDebris(this);
    // if there is another phase in destruction
    CModelHolder3 *penNext = pmd->GetNextPhase();
    if (penNext!=NULL) {
      // copy it here
      CEntity *penNew = GetWorld()->CopyEntityInWorld( *penNext, GetPlacement() );
      penNew->GetModelObject()->StretchModel(GetModelObject()->mo_Stretch);
      penNew->ModelChangeNotify();
      ((CModelHolder3 *)penNew)->m_colBurning=m_colBurning;
      ((CModelHolder3 *)penNew)->m_fChainSawCutDamage=m_fChainSawCutDamage;

      if( pmd->m_iStartAnim!=-1)
      {
        penNew->GetModelObject()->PlayAnim(pmd->m_iStartAnim, 0);
      }

      // copy custom shading parameters
      CModelHolder3 &mhNew=*((CModelHolder3 *)penNew);
      mhNew.m_cstCustomShading=m_cstCustomShading;
      mhNew.m_colLight=m_colLight;
      mhNew.m_colAmbient=m_colAmbient;
      mhNew.m_fMipFadeDist = m_fMipFadeDist;
      mhNew.m_fMipFadeLen  = m_fMipFadeLen;
      mhNew.m_fMipAdd = m_fMipAdd;
      mhNew.m_fMipMul = m_fMipMul;

      // domino death for cannonball
      if(m_dmtLastDamageType==DMT_CHAINSAW)
      {
        EDeath eDeath;  // we don't need any extra parameters
        mhNew.m_fChainSawCutDamage=0.0f;
        mhNew.m_dmtLastDamageType=DMT_CHAINSAW;
        penNew->SendEvent(eDeath);
      }
    }

  // if there is a destruction target
    if (m_penDestroyTarget!=NULL) {
      // notify it
      SendToTarget(m_penDestroyTarget, EET_TRIGGER, m_penLastDamager);
    }*/

    // destroy yourself
    Destroy();
    return;
  }

  Main()
  {
    // initialize the model
    InitModelHolder();

    /*if (m_fMipFadeLenMetric>m_rMipFadeDistMetric) { m_fMipFadeLenMetric = m_rMipFadeDistMetric; }
    // convert metric factors to mip factors
    if (m_rMipFadeDistMetric>0.0f) {
      m_fMipFadeDist = Log2(m_rMipFadeDistMetric*1024.0f*MIPRATIO);
      m_fMipFadeLen  = Log2((m_rMipFadeDistMetric+m_fMipFadeLenMetric)*1024.0f*MIPRATIO) - m_fMipFadeDist;
    } else {
      m_fMipFadeDist = 0.0f;
      m_fMipFadeLen  = 0.0f;
    }*/
        
    // check your destruction pointer
    /*if (m_penDestruction!=NULL && !IsOfClass(m_penDestruction, "ModelDestruction")) {
      WarningMessage("Destruction '%s' is wrong class!", m_penDestruction->GetName());
      m_penDestruction=NULL;
    }*/

    // wait forever
    wait() {
      // on the beginning
      on(EBegin): {
        // set your health
        /*if (m_penDestruction!=NULL) {
          SetHealth(GetDestruction()->m_fHealth);
        }*/
        resume;
      }
      // activate/deactivate shows/hides model
      on (EActivate): {
        SwitchToModel();
        m_bActive = TRUE;
        if (m_bColliding) {
          SetPhysicsFlags(EPF_MODEL_FIXED);
          SetCollisionFlags(ECF_MODEL_HOLDER);
        }
        resume;
      }
      on (EDeactivate): {
        SwitchToEditorModel();
        SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
        SetCollisionFlags(ECF_IMMATERIAL);
        m_bActive = FALSE;
        SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
        SetCollisionFlags(ECF_IMMATERIAL);
        resume;
      }
      // when your parent is destroyed
      on(ERangeModelDestruction): {
        // for each child of this entity
        {FOREACHINLIST(CEntity, en_lnInParent, en_lhChildren, itenChild) {
          // send it destruction event
          itenChild->SendEvent(ERangeModelDestruction());
        }}
        // destroy yourself
        Destroy();
        resume;
      }
      // when dead
      on(EDeath): {
        /*if (m_penDestruction!=NULL) {
          jump Die();
        }*/
        resume;
      }
/*      on(EFade): {
        if (_pTimer->CurrentTick()>m_tmFadeEnd) {
          m_tmFadeStart = _pTimer->CurrentTick();
        }
        m_tmFadeEnd = _pTimer->CurrentTick() + m_fFadeSpeed + m_fFadeEndWait;
        // perhaps fade all entities children
        if (m_bFadeChildren) {
          {FOREACHINLIST( CEntity, en_lnInParent, en_lhChildren, iten) {
            iten->SendEvent(EFade());            
          }}
        }
        resume;
      }*/
      // when animation should be changed
      /*on(EChangeAnim eChange): {
        m_iModelAnimation   = eChange.iModelAnim;
        m_iTextureAnimation = eChange.iTextureAnim;
        m_iLightAnimation   = eChange.iLightAnim;
        if (m_aoLightAnimation.GetData()!=NULL) {
          m_aoLightAnimation.PlayAnim(m_iLightAnimation, eChange.bLightLoop?AOF_LOOPING:0);
        }
        if (GetModelObject()->GetData()!=NULL) {
          GetModelObject()->PlayAnim(m_iModelAnimation, eChange.bModelLoop?AOF_LOOPING:0);
        }
        if (GetModelObject()->mo_toTexture.GetData()!=NULL) {
          GetModelObject()->mo_toTexture.PlayAnim(m_iTextureAnimation, eChange.bTextureLoop?AOF_LOOPING:0);
        }
        resume;
      }*/
      otherwise(): {
        resume;
      }
    };
  }
};
