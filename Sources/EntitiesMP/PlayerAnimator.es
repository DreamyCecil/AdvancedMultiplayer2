406
%{
#include "StdH.h"

#include "ModelsMP/Player/SeriousSam/Player.h"
#include "ModelsMP/Player/SeriousSam/Body.h"
#include "ModelsMP/Player/SeriousSam/Head.h"

#include "Models/Weapons/Knife/KnifeItem.h"
#include "Models/Weapons/Colt/ColtItem.h"
#include "Models/Weapons/Colt/ColtMain.h"
#include "Models/Weapons/SingleShotgun/SingleShotgunItem.h"
#include "Models/Weapons/SingleShotgun/Barrels.h"
#include "Models/Weapons/DoubleShotgun/DoubleShotgunItem.h"
#include "Models/Weapons/DoubleShotgun/Dshotgunbarrels.h"
#include "Models/Weapons/TommyGun/TommyGunItem.h"
#include "Models/Weapons/TommyGun/Body.h"
#include "Models/Weapons/MiniGun/MiniGunItem.h"
#include "Models/Weapons/MiniGun/Body.h"
#include "Models/Weapons/GrenadeLauncher/GrenadeLauncherItem.h"
#include "Models/Weapons/RocketLauncher/RocketLauncherItem.h"
#include "ModelsMP/Weapons/Sniper/SniperItem.h"
#include "ModelsMP/Weapons/Sniper/Sniper.h"
#include "ModelsMP/Weapons/Flamer/FlamerItem.h"
#include "ModelsMP/Weapons/Flamer/Body.h"
#include "ModelsMP/Weapons/Chainsaw/ChainsawForPlayer.h"
#include "ModelsMP/Weapons/Chainsaw/BladeForPlayer.h"
#include "ModelsMP/Weapons/Chainsaw/Body.h"
#include "Models/Weapons/Laser/LaserItem.h"
#include "Models/Weapons/Cannon/Cannon.h"

// [Cecil] Player's inventory
#include "EntitiesMP/PlayerInventory.h"
%}

uses "EntitiesMP/Player";
uses "EntitiesMP/PlayerWeapons";

// input parameter for animator
event EAnimatorInit {
  CEntityPointer penPlayer, // player owns it
};

%{
// animator action
enum AnimatorAction {
  AA_JUMPDOWN = 0,
  AA_CROUCH,
  AA_RISE,
  AA_PULLWEAPON,
  AA_ATTACK,
};

extern FLOAT plr_fBreathingStrength;
extern FLOAT plr_fViewDampFactor;
extern FLOAT plr_fViewDampLimitGroundUp;
extern FLOAT plr_fViewDampLimitGroundDn;
extern FLOAT plr_fViewDampLimitWater;

void CPlayerAnimator_Precache(void) {
  CDLLEntityClass *pdec = &CPlayerAnimator_DLLClass;

  pdec->PrecacheModel(MODEL_GOLDAMON);
  pdec->PrecacheTexture(TEXTURE_GOLDAMON);
  pdec->PrecacheTexture(TEX_SPEC_MEDIUM);
  pdec->PrecacheTexture(TEX_REFL_GOLD01);
  pdec->PrecacheClass(CLASS_REMINDER);

  // precache shells that drop when firing
  extern void CPlayerWeaponsEffects_Precache(void);
  CPlayerWeaponsEffects_Precache();
}
%}

class export CPlayerAnimator : CRationalEntity {
name      "Player Animator";
thumbnail "";
features  "CanBePredictable";

properties:
  1 CEntityPointer m_penPlayer,               // player which owns it

  5 BOOL m_bReference=FALSE,                  // player has reference (floor)
  6 FLOAT m_fLastActionTime = 0.0f,           // last action time for boring weapon animations
  7 INDEX m_iContent = 0,                     // content type index
  8 BOOL m_bWaitJumpAnim = FALSE,             // wait legs anim (for jump end)
  9 BOOL m_bCrouch = FALSE,                   // player crouch state
 10 BOOL m_iCrouchDownWait = FALSE,           // wait for crouch down
 11 BOOL m_iRiseUpWait = FALSE,               // wait for rise up
 12 BOOL m_bChangeWeapon = FALSE,             // wait for weapon change
 13 BOOL m_bSwim = FALSE,                     // player in water
 16 BOOL m_bAttacking = FALSE,                // currently firing weapon/swinging knife
 19 FLOAT m_tmAttackingDue = -1.0f,           // when firing animation is due
 18 BOOL m_bDisableAnimating = FALSE,

// player soft eyes on Y axis
 20 FLOAT3D m_vLastPlayerPosition = FLOAT3D(0.0f, 0.0f, 0.0f), // last player position for eyes movement
 21 FLOAT m_fEyesYLastOffset = 0.0f,                 // eyes offset from player position
 22 FLOAT m_fEyesYOffset = 0.0f,
 23 FLOAT m_fEyesYSpeed = 0.0f,                      // eyes speed
 27 FLOAT m_fWeaponYLastOffset = 0.0f,                 // eyes offset from player position
 28 FLOAT m_fWeaponYOffset = 0.0f,
 29 FLOAT m_fWeaponYSpeed = 0.0f,                      // eyes speed
 // recoil pitch
// 24 FLOAT m_fRecoilLastOffset = 0.0f,   // eyes offset from player position
// 25 FLOAT m_fRecoilOffset = 0.0f,
// 26 FLOAT m_fRecoilSpeed = 0.0f,        // eyes speed

// player banking when moving
 30 BOOL m_bMoving = FALSE,
 31 FLOAT m_fMoveLastBanking = 0.0f,
 32 FLOAT m_fMoveBanking = 0.0f,
 33 BOOL m_iMovingSide = 0,
 34 BOOL m_bSidestepBankingLeft = FALSE,
 35 BOOL m_bSidestepBankingRight = FALSE,
 36 FLOAT m_fSidestepLastBanking = 0.0f,
 37 FLOAT m_fSidestepBanking = 0.0f,
 39 FLOAT m_fBodyAnimTime = -1.0f,

{
  CModelObject *m_pmoModel;

  // [Cecil] Weapon attachments lists
  CAttachList m_aAttachments1;
  CAttachList m_aAttachments2;
}

components:
  1 class CLASS_REMINDER "Classes\\Reminder.ecl",

 // Amon statue
 10 model   MODEL_GOLDAMON   "Models\\Ages\\Egypt\\Gods\\Amon\\AmonGold.mdl",
 11 texture TEXTURE_GOLDAMON "Models\\Ages\\Egypt\\Gods\\Amon\\AmonGold.tex",
 12 texture TEX_SPEC_MEDIUM  "Models\\SpecularTextures\\Medium.tex",
 13 texture TEX_REFL_GOLD01  "Models\\ReflectionTextures\\Gold01.tex",

functions:
  // Read from stream
  void Read_t(CTStream *istr) { 
    CRationalEntity::Read_t(istr);

    // [Cecil] Reset weapon attachments
    ResetAttachmentList(FALSE);
    ResetAttachmentList(TRUE);
  };

  void Precache(void) {
    CPlayerAnimator_Precache();
  };
  
  // [Cecil] Get player entity
  CPlayer *GetPlayer(void) {
    return ((CPlayer*)&*m_penPlayer);
  };

  // [Cecil] Get some weapon
  CPlayerWeapons *GetWeapon(const INDEX &iExtra) {
    return GetPlayer()->GetWeapon(iExtra);
  };

  CModelObject *GetBody(void) {
    CAttachmentModelObject *pamoBody = GetPlayer()->GetModelObject()->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);

    if (pamoBody == NULL) {
      return NULL;
    }

    return &pamoBody->amo_moModelObject;
  }

  CModelObject *GetBodyRen(void) {
    CAttachmentModelObject *pamoBody = GetPlayer()->m_moRender.GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);

    if (pamoBody == NULL) {
      return NULL;
    }

    return &pamoBody->amo_moModelObject;
  }

  // Set components
  void SetComponents(CModelObject *mo, ULONG ulIDModel, ULONG ulIDTexture,
                     ULONG ulIDReflectionTexture, ULONG ulIDSpecularTexture, ULONG ulIDBumpTexture) {
    // model data
    mo->SetData(GetModelDataForComponent(ulIDModel));
    // texture data
    mo->mo_toTexture.SetData(GetTextureDataForComponent(ulIDTexture));
    // reflection texture data
    if (ulIDReflectionTexture>0) {
      mo->mo_toReflection.SetData(GetTextureDataForComponent(ulIDReflectionTexture));
    } else {
      mo->mo_toReflection.SetData(NULL);
    }
    // specular texture data
    if (ulIDSpecularTexture>0) {
      mo->mo_toSpecular.SetData(GetTextureDataForComponent(ulIDSpecularTexture));
    } else {
      mo->mo_toSpecular.SetData(NULL);
    }
    // bump texture data
    if (ulIDBumpTexture>0) {
      mo->mo_toBump.SetData(GetTextureDataForComponent(ulIDBumpTexture));
    } else {
      mo->mo_toBump.SetData(NULL);
    }
    ModelChangeNotify();
  };

  // Add attachment model
  void AddModel(CModelObject *mo, INDEX iAttachment, ULONG ulIDModel, ULONG ulIDTexture,
                ULONG ulIDReflectionTexture, ULONG ulIDSpecularTexture, ULONG ulIDBumpTexture) {
    SetComponents(&mo->AddAttachmentModel(iAttachment)->amo_moModelObject, ulIDModel, 
                  ulIDTexture, ulIDReflectionTexture, ulIDSpecularTexture, ulIDBumpTexture);
  };

  // synchronize any possible weapon attachment(s) with default appearance
  void SyncWeapon(void) {
    CModelObject *pmoBodyRen = GetBodyRen();
    CModelObject *pmoBodyDef = GetBody();

    // for each weapon attachment
    for (INDEX iWeapon = BODY_ATTACHMENT_COLT_RIGHT; iWeapon <= BODY_ATTACHMENT_ITEM; iWeapon++) {
      CAttachmentModelObject *pamoWeapDef = pmoBodyDef->GetAttachmentModel(iWeapon);
      CAttachmentModelObject *pamoWeapRen = pmoBodyRen->GetAttachmentModel(iWeapon);

      // if it doesn't exist in either
      if (pamoWeapRen == NULL && pamoWeapDef == NULL) {
        // just skip it
        NOTHING;

      // if exists only in rendering model
      } else if (pamoWeapRen != NULL && pamoWeapDef == NULL) {
        // remove it from rendering
        pmoBodyRen->RemoveAttachmentModel(iWeapon);

      // if exists only in default
      } else if (pamoWeapRen == NULL && pamoWeapDef != NULL) {
        // add it to rendering
        pamoWeapRen = pmoBodyRen->AddAttachmentModel(iWeapon);
        pamoWeapRen->amo_plRelative = pamoWeapDef->amo_plRelative;
        pamoWeapRen->amo_moModelObject.Copy(pamoWeapDef->amo_moModelObject);

      // if exists in both
      } else {
        // just synchronize
        pamoWeapRen->amo_plRelative = pamoWeapDef->amo_plRelative;
        pamoWeapRen->amo_moModelObject.Synchronize(pamoWeapDef->amo_moModelObject);
      }
    }
  };

  // [Cecil] Get attachment model under a certain flag
  CAttachmentModelObject *GetModel(const CTString &strFlag, const BOOL &bSecond) {
    CAttachList &aList = (&m_aAttachments1)[bSecond];
    CAttachList::const_iterator it = aList.find(strFlag.str_String);

    if (it != aList.end()) {
      return it->second.pamo;
    }

    return NULL;
  };

  // [Cecil] Set third person model
  void SetWeapon(BOOL bExtra) {
    // remove old weapon
    RemoveWeapon(bExtra);
    
    // get third person model
    INDEX iWeapon = GetWeapon(bExtra)->GetCurrent();
    SPlayerWeapon &pw = GetPlayer()->GetInventory()->m_aWeapons[iWeapon];

    if (iWeapon == WEAPON_NONE) {
      return;
    }

    m_pmoModel = GetBody();

    // set custom model
    CWeaponModel &wm = pw.pwsWeapon->wmModel3;

    if (wm.cbModel.Count() > 0) {
      // add weapon attachment
      INDEX iAttach = (bExtra ? BODY_ATTACHMENT_COLT_LEFT : BODY_ATTACHMENT_COLT_RIGHT);
      CAttachmentModelObject *pamoWeapon = m_pmoModel->AddAttachmentModel(iAttach);

      try {
        ParseModelConfig(wm.cbModel, &pamoWeapon->amo_moModelObject, NULL, (bExtra ? &m_aAttachments2 : &m_aAttachments1));
        ModelChangeNotify();

      } catch (char *strError) {
        FatalError("Cannot load third person weapon model config '%s':\n%s", wm.strConfig, strError);
      }

      // apply third person offset
      if (pamoWeapon != NULL) {
        SWeaponPos wps = pw.GetPosition();

        // add weapon position
        pamoWeapon->amo_plRelative.pl_PositionVector += (wps.Pos3() - COLT_LEFT_POS);
        pamoWeapon->amo_plRelative.pl_OrientationAngle += (wps.Rot3() - COLT_LEFT_ROT);
      }
    }

    // remove flares
    WeaponFlare(FALSE, FALSE);
    WeaponFlare(TRUE, FALSE);

    // sync apperances
    SyncWeapon();
  };

  // [Cecil] Reset weapon attachments
  void ResetAttachmentList(BOOL bExtra) {
    // get current weapon
    INDEX iWeapon = GetWeapon(bExtra)->GetCurrent();
    SPlayerWeapon &pw = GetPlayer()->GetInventory()->m_aWeapons[iWeapon];

    CWeaponModel &wm = pw.pwsWeapon->wmModel3;

    if (wm.cbModel.Count() <= 0) {
      return;
    }
    
    m_pmoModel = GetBody();

    // get weapon attachment
    INDEX iAttach = (bExtra ? BODY_ATTACHMENT_COLT_LEFT : BODY_ATTACHMENT_COLT_RIGHT);
    CAttachmentModelObject *pamoWeapon = m_pmoModel->GetAttachmentModel(iAttach);

    if (pamoWeapon == NULL) {
      return;
    }

    // reset attachments
    try {
      ParseModelAttachments(wm.cbModel, &pamoWeapon->amo_moModelObject, NULL, (bExtra ? m_aAttachments2 : m_aAttachments1));

    } catch (char *strError) {
      FatalError("Cannot load third person weapon model config '%s':\n%s", wm.strConfig, strError);
    }
  };

  // set item
  void SetItem(CModelObject *pmo) {
    m_pmoModel = GetBody();
    AddModel(m_pmoModel, BODY_ATTACHMENT_ITEM, MODEL_GOLDAMON, TEXTURE_GOLDAMON, TEX_REFL_GOLD01, TEX_SPEC_MEDIUM, 0);

    if (pmo != NULL) {
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      CAttachmentModelObject *pamo = pl.GetModelObject()->GetAttachmentModelList(PLAYER_ATTACHMENT_TORSO, BODY_ATTACHMENT_ITEM, -1);
      m_pmoModel = &(pamo->amo_moModelObject);
      m_pmoModel->Copy(*pmo);
      m_pmoModel->StretchModel(FLOAT3D(1.0f, 1.0f, 1.0f));
      pamo->amo_plRelative = CPlacement3D(FLOAT3D(0.0f, 0.0f, 0.0f), ANGLE3D(0.0f, 0.0f, 0.0f));
    }

    // sync apperances
    SyncWeapon();
  }

  // set player body animation
  void SetBodyAnimation(INDEX iAnimation, ULONG ulFlags) {
    // on weapon change skip anim
    if (m_bChangeWeapon) { return; }
    // on firing skip anim
    if (m_bAttacking) { return; }
    // play body anim
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.PlayBodyAnim(iAnimation, ulFlags);
    m_fBodyAnimTime = GetBody()->GetAnimLength(iAnimation); // anim length
  };

  void Initialize(void) {
    // set internal properties
    m_bReference = TRUE;
    m_bWaitJumpAnim = FALSE;
    m_bCrouch = FALSE;
    m_iCrouchDownWait = 0;
    m_iRiseUpWait = 0;
    m_bChangeWeapon = FALSE;
    m_bSwim = FALSE;
    m_bAttacking = FALSE;

    // clear eyes offsets
    m_fEyesYLastOffset = 0.0f;
    m_fEyesYOffset = 0.0f;
    m_fEyesYSpeed = 0.0f;
    m_fWeaponYLastOffset = 0.0f;
    m_fWeaponYOffset = 0.0f;
    m_fWeaponYSpeed = 0.0f;
    
    // clear moving banking
    m_bMoving = FALSE;
    m_fMoveLastBanking = 0.0f;
    m_fMoveBanking = 0.0f;
    m_iMovingSide = 0;
    m_bSidestepBankingLeft = FALSE;
    m_bSidestepBankingRight = FALSE;
    m_fSidestepLastBanking = 0.0f;
    m_fSidestepBanking = 0.0f;

    // weapon
    SetWeapon(FALSE);
    SetWeapon(TRUE);
    SetBodyAnimation(BODY_ANIM_COLT_STAND, AOF_LOOPING|AOF_NORESTART);
  };

  // store for lerping
  void StoreLast(void) {
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    m_vLastPlayerPosition = pl.GetPlacement().pl_PositionVector; // store last player position
    m_fEyesYLastOffset = m_fEyesYOffset; // store last eyes offset
    m_fWeaponYLastOffset = m_fWeaponYOffset;
    m_fMoveLastBanking = m_fMoveBanking; // store last banking for lerping
    m_fSidestepLastBanking = m_fSidestepBanking;
  };

  // animate banking
  void AnimateBanking(void) {
    // moving -> change banking
    if (m_bMoving) {
      // move banking left
      if (m_iMovingSide == 0) {
        m_fMoveBanking += 0.35f;
        if (m_fMoveBanking > 1.0f) { 
          m_fMoveBanking = 1.0f;
          m_iMovingSide = 1;
        }
      // move banking right
      } else {
        m_fMoveBanking -= 0.35f;
        if (m_fMoveBanking < -1.0f) {
          m_fMoveBanking = -1.0f;
          m_iMovingSide = 0;
        }
      }
      const FLOAT fBankingSpeed = 0.4f;

      // sidestep banking left
      if (m_bSidestepBankingLeft) {
        m_fSidestepBanking += fBankingSpeed;
        if (m_fSidestepBanking > 1.0f) { m_fSidestepBanking = 1.0f; }
      }
      // sidestep banking right
      if (m_bSidestepBankingRight) {
        m_fSidestepBanking -= fBankingSpeed;
        if (m_fSidestepBanking < -1.0f) { m_fSidestepBanking = -1.0f; }
      }

    // restore banking
    } else {
      // move banking
      if (m_fMoveBanking > 0.0f) {
        m_fMoveBanking -= 0.1f;
        if (m_fMoveBanking < 0.0f) { m_fMoveBanking = 0.0f; }
      } else if (m_fMoveBanking < 0.0f) {
        m_fMoveBanking += 0.1f;
        if (m_fMoveBanking > 0.0f) { m_fMoveBanking = 0.0f; }
      }
      // sidestep banking
      if (m_fSidestepBanking > 0.0f) {
        m_fSidestepBanking -= 0.4f;
        if (m_fSidestepBanking < 0.0f) { m_fSidestepBanking = 0.0f; }
      } else if (m_fSidestepBanking < 0.0f) {
        m_fSidestepBanking += 0.4f;
        if (m_fSidestepBanking > 0.0f) { m_fSidestepBanking = 0.0f; }
      }
    }

    if (GetPlayer()->GetSettings()->ps_ulFlags&PSF_NOBOBBING) {
      m_fSidestepBanking = m_fMoveBanking = 0.0f;
    }
  };

  // animate soft eyes
  void AnimateSoftEyes(void) {
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    // find eyes offset and speed (differential formula realized in numerical mathematics)
    FLOAT fRelY = (pl.GetPlacement().pl_PositionVector-m_vLastPlayerPosition) %
                  FLOAT3D(pl.en_mRotation(1, 2), pl.en_mRotation(2, 2), pl.en_mRotation(3, 2));

    // if just jumped
    if (pl.en_tmJumped>_pTimer->CurrentTick()-0.5f) {
      fRelY = ClampUp(fRelY, 0.0f);
    }
    m_fEyesYOffset -= fRelY;
    m_fWeaponYOffset -= ClampUp(fRelY, 0.0f);

    plr_fViewDampFactor      = Clamp(plr_fViewDampFactor      ,0.0f,1.0f);
    plr_fViewDampLimitGroundUp = Clamp(plr_fViewDampLimitGroundUp ,0.0f,2.0f);
    plr_fViewDampLimitGroundDn = Clamp(plr_fViewDampLimitGroundDn ,0.0f,2.0f);
    plr_fViewDampLimitWater  = Clamp(plr_fViewDampLimitWater  ,0.0f,2.0f);

    m_fEyesYSpeed = (m_fEyesYSpeed - m_fEyesYOffset*plr_fViewDampFactor) * (1.0f-plr_fViewDampFactor);
    m_fEyesYOffset += m_fEyesYSpeed;
    
    m_fWeaponYSpeed = (m_fWeaponYSpeed - m_fWeaponYOffset*plr_fViewDampFactor) * (1.0f-plr_fViewDampFactor);
    m_fWeaponYOffset += m_fWeaponYSpeed;

    if (m_bSwim) {
      m_fEyesYOffset = Clamp(m_fEyesYOffset, -plr_fViewDampLimitWater,  +plr_fViewDampLimitWater);
      m_fWeaponYOffset = Clamp(m_fWeaponYOffset, -plr_fViewDampLimitWater,  +plr_fViewDampLimitWater);
    } else {
      m_fEyesYOffset = Clamp(m_fEyesYOffset, -plr_fViewDampLimitGroundDn,  +plr_fViewDampLimitGroundUp);
      m_fWeaponYOffset = Clamp(m_fWeaponYOffset, -plr_fViewDampLimitGroundDn,  +plr_fViewDampLimitGroundUp);
    }
  };

  // change view
  void ChangeView(CPlacement3D &pl) {
    TIME tmNow = _pTimer->GetLerpedCurrentTick();

    if (!(GetPlayer()->GetSettings()->ps_ulFlags & PSF_NOBOBBING)) {
      // banking
      FLOAT fBanking = Lerp(m_fMoveLastBanking, m_fMoveBanking, _pTimer->GetLerpFactor());
      fBanking = fBanking * fBanking * Sgn(fBanking) * 0.25f;
      fBanking += Lerp(m_fSidestepLastBanking, m_fSidestepBanking, _pTimer->GetLerpFactor());
      fBanking = Clamp(fBanking, -5.0f, 5.0f);
      pl.pl_OrientationAngle(3) += fBanking;
    }

    // swimming
    if (m_bSwim) {
      pl.pl_OrientationAngle(1) += sin(tmNow*0.9)*2.0f;
      pl.pl_OrientationAngle(2) += sin(tmNow*1.7)*2.0f;
      pl.pl_OrientationAngle(3) += sin(tmNow*2.5)*2.0f;
    }

    // eyes up/down for jumping and breathing
    FLOAT fEyesOffsetY = Lerp(m_fEyesYLastOffset, m_fEyesYOffset, _pTimer->GetLerpFactor());
    fEyesOffsetY+= sin(tmNow*1.5)*0.05f * plr_fBreathingStrength;
    fEyesOffsetY = Clamp(fEyesOffsetY, -1.0f, 1.0f);
    pl.pl_PositionVector(2) += fEyesOffsetY;
  }

  // body and head animation
  void BodyAndHeadOrientation(CPlacement3D &plView) {
    CAttachmentModelObject *pamoBody = GetPlayer()->GetModelObject()->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);
    ANGLE3D a = plView.pl_OrientationAngle;

    if (!IsAlive(m_penPlayer)) {
      a = ANGLE3D(0.0f, 0.0f, 0.0f);
    }

    pamoBody->amo_plRelative.pl_OrientationAngle = a;
    pamoBody->amo_plRelative.pl_OrientationAngle(3) *= 4.0f;
    
    CAttachmentModelObject *pamoHead = (pamoBody->amo_moModelObject).GetAttachmentModel(BODY_ATTACHMENT_HEAD);
    pamoHead->amo_plRelative.pl_OrientationAngle = a;
    pamoHead->amo_plRelative.pl_OrientationAngle(1) = 0.0f;
    pamoHead->amo_plRelative.pl_OrientationAngle(2) = 0.0f;
    pamoHead->amo_plRelative.pl_OrientationAngle(3) *= 4.0f;

    // forbid players from cheating by kissing their @$$
    const FLOAT fMaxBanking = 5.0f;
    pamoBody->amo_plRelative.pl_OrientationAngle(3) = Clamp(pamoBody->amo_plRelative.pl_OrientationAngle(3), -fMaxBanking, fMaxBanking);
    pamoHead->amo_plRelative.pl_OrientationAngle(3) = Clamp(pamoHead->amo_plRelative.pl_OrientationAngle(3), -fMaxBanking, fMaxBanking);
  };

  // animate player
  void AnimatePlayer(void) {
    if (m_bDisableAnimating) {
      return;
    }
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    FLOAT3D vDesiredTranslation = pl.en_vDesiredTranslationRelative;
    FLOAT3D vCurrentTranslation = pl.en_vCurrentTranslationAbsolute * !pl.en_mRotation;
    ANGLE3D aDesiredRotation = pl.en_aDesiredRotationRelative;
    ANGLE3D aCurrentRotation = pl.en_aCurrentRotationAbsolute;

    // if player is moving
    if (vDesiredTranslation.ManhattanNorm()>0.01f
      ||aDesiredRotation.ManhattanNorm()>0.01f) {
      // prevent idle weapon animations
      m_fLastActionTime = _pTimer->CurrentTick();
    }

    // swimming
    if (m_bSwim) {
      if (vDesiredTranslation.Length()>1.0f && vCurrentTranslation.Length()>1.0f) {
        pl.StartModelAnim(PLAYER_ANIM_SWIM, AOF_LOOPING|AOF_NORESTART);
      } else {
        pl.StartModelAnim(PLAYER_ANIM_SWIMIDLE, AOF_LOOPING|AOF_NORESTART);
      }
      BodyStillAnimation();

    // stand
    } else {
      // has reference (floor)
      if (m_bReference) {
        // jump
        if (pl.en_tmJumped+_pTimer->TickQuantum>=_pTimer->CurrentTick() &&
            pl.en_tmJumped<=_pTimer->CurrentTick()) {
          m_bReference = FALSE;
          pl.StartModelAnim(PLAYER_ANIM_JUMPSTART, AOF_NORESTART);
          BodyStillAnimation();
          m_fLastActionTime = _pTimer->CurrentTick();

        // not in jump anim and in stand mode change
        } else if (!m_bWaitJumpAnim && m_iCrouchDownWait==0 && m_iRiseUpWait==0) {
          // standing
          if (!m_bCrouch) {
            // running anim
            if (vDesiredTranslation.Length()>5.0f && vCurrentTranslation.Length()>5.0f) {
              if (vCurrentTranslation(3)<0) {
                pl.StartModelAnim(PLAYER_ANIM_RUN, AOF_LOOPING|AOF_NORESTART);
              } else {
                pl.StartModelAnim(PLAYER_ANIM_BACKPEDALRUN, AOF_LOOPING|AOF_NORESTART);
              }
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // walking anim
            } else if (vDesiredTranslation.Length()>2.0f && vCurrentTranslation.Length()>2.0f) {
              if (vCurrentTranslation(3)<0) {
                pl.StartModelAnim(PLAYER_ANIM_NORMALWALK, AOF_LOOPING|AOF_NORESTART);
              } else {
                pl.StartModelAnim(PLAYER_ANIM_BACKPEDAL, AOF_LOOPING|AOF_NORESTART);
              }
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // left rotation anim
            } else if (aDesiredRotation(1)>0.5f) {
              pl.StartModelAnim(PLAYER_ANIM_TURNLEFT, AOF_LOOPING|AOF_NORESTART);
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // right rotation anim
            } else if (aDesiredRotation(1)<-0.5f) {
              pl.StartModelAnim(PLAYER_ANIM_TURNRIGHT, AOF_LOOPING|AOF_NORESTART);
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // standing anim
            } else {
              pl.StartModelAnim(PLAYER_ANIM_STAND, AOF_LOOPING|AOF_NORESTART);
              BodyStillAnimation();
            }
          // crouch
          } else {
            // walking anim
            if (vDesiredTranslation.Length()>2.0f && vCurrentTranslation.Length()>2.0f) {
              if (vCurrentTranslation(3)<0) {
                pl.StartModelAnim(PLAYER_ANIM_CROUCH_WALK, AOF_LOOPING|AOF_NORESTART);
              } else {
                pl.StartModelAnim(PLAYER_ANIM_CROUCH_WALKBACK, AOF_LOOPING|AOF_NORESTART);
              }
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // left rotation anim
            } else if (aDesiredRotation(1)>0.5f) {
              pl.StartModelAnim(PLAYER_ANIM_CROUCH_TURNLEFT, AOF_LOOPING|AOF_NORESTART);
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // right rotation anim
            } else if (aDesiredRotation(1)<-0.5f) {
              pl.StartModelAnim(PLAYER_ANIM_CROUCH_TURNRIGHT, AOF_LOOPING|AOF_NORESTART);
              BodyStillAnimation();
              m_fLastActionTime = _pTimer->CurrentTick();
            // standing anim
            } else {
              pl.StartModelAnim(PLAYER_ANIM_CROUCH_IDLE, AOF_LOOPING|AOF_NORESTART);
              BodyStillAnimation();
            }
          }

        }

      // no reference (in air)
      } else {                           
        // touched reference
        if (pl.en_penReference!=NULL) {
          m_bReference = TRUE;
          pl.StartModelAnim(PLAYER_ANIM_JUMPEND, AOF_NORESTART);
          BodyStillAnimation();
          SpawnReminder(this, pl.GetModelObject()->GetAnimLength(PLAYER_ANIM_JUMPEND), (INDEX) AA_JUMPDOWN);
          m_bWaitJumpAnim = TRUE;
        }
      }
    }

    // boring weapon animation
    if (_pTimer->CurrentTick() - m_fLastActionTime > 10.0f) {
      m_fLastActionTime = _pTimer->CurrentTick();

      // [Cecil] Vary between both weapons
      INDEX iBoringWeapon = 0;

      if (GetWeapon(1)->GetCurrent() != WEAPON_NONE) {
        iBoringWeapon = IRnd() % 2;
      }

      GetWeapon(iBoringWeapon)->SendEvent(EBoringWeapon());
    }

    // moving view change
    // translating -> change banking
    if (m_bReference != NULL && vDesiredTranslation.Length()>1.0f && vCurrentTranslation.Length()>1.0f) {
      m_bMoving = TRUE;
      // sidestep banking
      FLOAT vSidestepSpeedDesired = vDesiredTranslation(1);
      FLOAT vSidestepSpeedCurrent = vCurrentTranslation(1);
      // right
      if (vSidestepSpeedDesired>1.0f && vSidestepSpeedCurrent>1.0f) {
        m_bSidestepBankingRight = TRUE;
        m_bSidestepBankingLeft = FALSE;
      // left
      } else if (vSidestepSpeedDesired<-1.0f && vSidestepSpeedCurrent<-1.0f) {
        m_bSidestepBankingLeft = TRUE;
        m_bSidestepBankingRight = FALSE;
      // none
      } else {
        m_bSidestepBankingLeft = FALSE;
        m_bSidestepBankingRight = FALSE;
      }
    // in air (space) or not moving
    } else {
      m_bMoving = FALSE;
      m_bSidestepBankingLeft = FALSE;
      m_bSidestepBankingRight = FALSE;
    }
  };

  // crouch
  void Crouch(void) {
    if (m_bDisableAnimating) {
      return;
    }
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.StartModelAnim(PLAYER_ANIM_CROUCH, AOF_NORESTART);
    SpawnReminder(this, pl.GetModelObject()->GetAnimLength(PLAYER_ANIM_CROUCH), (INDEX) AA_CROUCH);
    m_iCrouchDownWait++;
    m_bCrouch = TRUE;
  };

  // rise
  void Rise(void) {
    if (m_bDisableAnimating) {
      return;
    }
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.StartModelAnim(PLAYER_ANIM_RISE, AOF_NORESTART);
    SpawnReminder(this, pl.GetModelObject()->GetAnimLength(PLAYER_ANIM_RISE), (INDEX) AA_RISE);
    m_iRiseUpWait++;
    m_bCrouch = FALSE;
  };

  // fall
  void Fall(void) {
    if (m_bDisableAnimating) {
      return;
    }
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.StartModelAnim(PLAYER_ANIM_JUMPSTART, AOF_NORESTART);
    if (_pNetwork->ga_ulDemoMinorVersion>6) { m_bCrouch = FALSE; }
    m_bReference = FALSE;
  };

  // swim
  void Swim(void) {
    if (m_bDisableAnimating) {
      return;
    }
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.StartModelAnim(PLAYER_ANIM_SWIM, AOF_LOOPING|AOF_NORESTART);
    if (_pNetwork->ga_ulDemoMinorVersion>2) { m_bCrouch = FALSE; }
    m_bSwim = TRUE;
  };

  // stand
  void Stand(void) {
    if (m_bDisableAnimating) {
      return;
    }
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.StartModelAnim(PLAYER_ANIM_STAND, AOF_LOOPING|AOF_NORESTART);
    if (_pNetwork->ga_ulDemoMinorVersion>2) { m_bCrouch = FALSE; }
    m_bSwim = FALSE;
  };

  // fire/attack
  void FireAnimation(INDEX iAnim, ULONG ulFlags, BOOL bExtra) {
    // [Cecil] Force Colt animations for dual weapons
    if (GetWeapon(1)->GetCurrent() != WEAPON_NONE) {
      iAnim = BODY_ANIM_COLT_STAND; //(bExtra ? BODY_ANIM_COLT_FIRELEFT : BODY_ANIM_COLT_FIRERIGHT);

      if (m_bSwim) {
        iAnim += BODY_ANIM_COLT_SWIM_STAND - BODY_ANIM_COLT_STAND;
      }

    } else if (m_bSwim) {
      INDEX iWeapon = GetWeapon(0)->GetCurrent();

      switch (iWeapon) {
        case WEAPON_NONE:
          break;

        case WEAPON_KNIFE: case WEAPON_COLT:
          iAnim += BODY_ANIM_COLT_SWIM_STAND-BODY_ANIM_COLT_STAND;
          break;

        case WEAPON_SINGLESHOTGUN: case WEAPON_DOUBLESHOTGUN: case WEAPON_TOMMYGUN:
        case WEAPON_SNIPER: case WEAPON_LASER: case WEAPON_FLAMER:
          iAnim += BODY_ANIM_SHOTGUN_SWIM_STAND-BODY_ANIM_SHOTGUN_STAND;
          break;

        case WEAPON_MINIGUN: case WEAPON_ROCKETLAUNCHER: case WEAPON_GRENADELAUNCHER:
        case WEAPON_IRONCANNON: case WEAPON_CHAINSAW:
          iAnim += BODY_ANIM_MINIGUN_SWIM_STAND-BODY_ANIM_MINIGUN_STAND;
          break;
      }
    }

    m_bAttacking = FALSE;
    m_bChangeWeapon = FALSE;
    SetBodyAnimation(iAnim, ulFlags);

    if (!(ulFlags & AOF_LOOPING)) {
      SpawnReminder(this, m_fBodyAnimTime, (INDEX) AA_ATTACK);
      m_tmAttackingDue = _pTimer->CurrentTick()+m_fBodyAnimTime;
    }

    m_bAttacking = TRUE;
  };

  void FireAnimationOff(void) {
    m_bAttacking = FALSE;
  };

  // body animation template
  void BodyAnimationTemplate(INDEX iNone, INDEX iColt, INDEX iShotgun, INDEX iMinigun, ULONG ulFlags) {
    // [Cecil] Force Colt animations for dual weapons
    if (GetWeapon(1)->GetCurrent() != WEAPON_NONE) {
      if (m_bSwim) {
        iColt += BODY_ANIM_COLT_SWIM_STAND - BODY_ANIM_COLT_STAND;
      }

      SetBodyAnimation(iColt, ulFlags);
      return;
    }

    INDEX iWeapon = GetWeapon(0)->GetCurrent();

    switch (iWeapon) {
      case WEAPON_NONE:
        SetBodyAnimation(iNone, ulFlags);
        break;

      case WEAPON_KNIFE: case WEAPON_COLT:
        if (m_bSwim) { iColt += BODY_ANIM_COLT_SWIM_STAND-BODY_ANIM_COLT_STAND; }
        SetBodyAnimation(iColt, ulFlags);
        break;

      case WEAPON_SINGLESHOTGUN: case WEAPON_DOUBLESHOTGUN: case WEAPON_TOMMYGUN:
      case WEAPON_SNIPER: case WEAPON_LASER: case WEAPON_FLAMER:
        if (m_bSwim) { iShotgun += BODY_ANIM_SHOTGUN_SWIM_STAND-BODY_ANIM_SHOTGUN_STAND; }
        SetBodyAnimation(iShotgun, ulFlags);
        break;

      case WEAPON_MINIGUN: case WEAPON_ROCKETLAUNCHER: case WEAPON_GRENADELAUNCHER:
      case WEAPON_IRONCANNON: case WEAPON_CHAINSAW:
        if (m_bSwim) { iMinigun+=BODY_ANIM_MINIGUN_SWIM_STAND-BODY_ANIM_MINIGUN_STAND; }
        SetBodyAnimation(iMinigun, ulFlags);
        break;

      default: ASSERTALWAYS("Player Animator - Unknown weapon");
    }
  };

  // walk
  void BodyWalkAnimation() {
    BodyAnimationTemplate(BODY_ANIM_NORMALWALK, 
      BODY_ANIM_COLT_STAND, BODY_ANIM_SHOTGUN_STAND, BODY_ANIM_MINIGUN_STAND, 
      AOF_LOOPING|AOF_NORESTART);
  };

  // stand
  void BodyStillAnimation() {
    BodyAnimationTemplate(BODY_ANIM_WAIT, 
      BODY_ANIM_COLT_STAND, BODY_ANIM_SHOTGUN_STAND, BODY_ANIM_MINIGUN_STAND, 
      AOF_LOOPING|AOF_NORESTART);
  };

  // push weapon
  void BodyPushAnimation() {
    m_bAttacking = FALSE;
    m_bChangeWeapon = FALSE;
    BodyAnimationTemplate(BODY_ANIM_WAIT, 
      BODY_ANIM_COLT_REDRAW, BODY_ANIM_SHOTGUN_REDRAW, BODY_ANIM_MINIGUN_REDRAW, 0);
    m_bChangeWeapon = TRUE;
  };

  // [Cecil] Remove current weapon model
  void RemoveWeapon(BOOL bExtra) {
    m_pmoModel = GetBody();

    // [Cecil] Remove specific weapon
    INDEX iAttach = (bExtra ? BODY_ATTACHMENT_COLT_LEFT : BODY_ATTACHMENT_COLT_RIGHT);
    m_pmoModel->RemoveAttachmentModel(iAttach);

    // clear attachments
    if (!bExtra) {
      m_aAttachments1.clear();
    } else {
      m_aAttachments2.clear();
    }

    // sync apperances
    SyncWeapon();
  }

  // pull weapon
  void BodyPullAnimation(BOOL bExtra) {
    // set new weapon
    SetWeapon(bExtra);

    // pull weapon
    m_bChangeWeapon = FALSE;

    BodyAnimationTemplate(BODY_ANIM_WAIT, 
      BODY_ANIM_COLT_DRAW, BODY_ANIM_SHOTGUN_DRAW, BODY_ANIM_MINIGUN_DRAW, 0);

    INDEX iWeapon = GetWeapon(0)->GetCurrent();

    if (iWeapon != WEAPON_NONE) {
      m_bChangeWeapon = TRUE;
      SpawnReminder(this, m_fBodyAnimTime, (INDEX) AA_PULLWEAPON);
    }

    // sync apperances
    SyncWeapon();
  };

  // pull item
  void BodyPullItemAnimation() {
    // remove old weapon
    RemoveWeapon(FALSE);
    RemoveWeapon(TRUE);

    // pull item
    m_bChangeWeapon = FALSE;

    SetBodyAnimation(BODY_ANIM_STATUE_PULL, 0);

    m_bChangeWeapon = TRUE;

    SpawnReminder(this, m_fBodyAnimTime, (INDEX) AA_PULLWEAPON);

    // sync apperances
    SyncWeapon();
  };

  // pick item
  void BodyPickItemAnimation() {
    // remove old weapon
    RemoveWeapon(FALSE);
    RemoveWeapon(TRUE);

    // pick item
    m_bChangeWeapon = FALSE;

    SetBodyAnimation(BODY_ANIM_KEYLIFT, 0);

    m_bChangeWeapon = TRUE;

    SpawnReminder(this, m_fBodyAnimTime, (INDEX) AA_PULLWEAPON);

    // sync apperances
    SyncWeapon();
  };

  // remove item
  void BodyRemoveItem() {
    m_pmoModel = GetBody();
    m_pmoModel->RemoveAttachmentModel(BODY_ATTACHMENT_ITEM);

    // sync apperances
    SyncWeapon();
  };

  void OnPreRender(void) {
    // Minigun specific
    for (INDEX iWeapon = 0; iWeapon < 2; iWeapon++) {
      CPlayerWeapons &plw = *GetWeapon(iWeapon);

      if (plw.GetCurrent() == WEAPON_MINIGUN) {
        ANGLE aAngle = Lerp(plw.m_aMiniGunLast, plw.m_aMiniGun, _pTimer->GetLerpFactor());

        // rotate minigun barrels
        INDEX iAttach (plw.m_bExtraWeapon ? BODY_ATTACHMENT_COLT_LEFT : BODY_ATTACHMENT_COLT_RIGHT);

        CAttachmentModelObject *pamo = GetModel("rotate", iWeapon);

        if (pamo != NULL) {
          // [Cecil] Mirror for the extra weapon
          pamo->amo_plRelative.pl_OrientationAngle(3) = aAngle * (iWeapon % 2 ? -1.0f : 1.0f);
        }
      }
    }
  };

  // [Cecil] Unified show & hide flare functions
  void WeaponFlare(const BOOL &bExtraWeapon, const BOOL &bShow) {
    CAttachmentModelObject *pamoFlare = GetModel("flare", bExtraWeapon);

    // no flare
    if (pamoFlare == NULL) {
      return;
    }

    CModelObject *pmo = &pamoFlare->amo_moModelObject;

    if (bShow) {
      // random angle
      pamoFlare->amo_plRelative.pl_OrientationAngle(3) = (rand() * 360.0f) / RAND_MAX;

      // stretch flare
      pmo->StretchModel(FLOAT3D(1.0f, 1.0f, 1.0f));

    } else {
      pmo->StretchModel(FLOAT3D(0.0f, 0.0f, 0.0f));
    }
  };

procedures:
  ReminderAction(EReminder er) {
    switch (er.iValue) {
      case AA_JUMPDOWN: m_bWaitJumpAnim = FALSE; break;
      case AA_CROUCH: m_iCrouchDownWait--; ASSERT(m_iCrouchDownWait>=0); break;
      case AA_RISE: m_iRiseUpWait--; ASSERT(m_iRiseUpWait>=0); break;
      case AA_PULLWEAPON: m_bChangeWeapon = FALSE; break;
      case AA_ATTACK: if(m_tmAttackingDue<=_pTimer->CurrentTick()) { m_bAttacking = FALSE; } break;
      default: ASSERTALWAYS("Animator - unknown reminder action.");
    }
    return EBegin();
  };

  Main(EAnimatorInit eInit) {
    // remember the initial parameters
    ASSERT(eInit.penPlayer!=NULL);
    m_penPlayer = eInit.penPlayer;

    // declare yourself as a void
    InitAsVoid();
    SetFlags(GetFlags()|ENF_CROSSESLEVELS);
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    // last action time for boring weapon animation
    m_fLastActionTime = _pTimer->CurrentTick();

    wait() {
      on (EBegin) : { resume; }
      on (EReminder er) : { call ReminderAction(er); }
      on (EEnd) : { stop; }
    }

    // cease to exist
    Destroy();

    return;
  };
};

