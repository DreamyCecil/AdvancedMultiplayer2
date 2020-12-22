2002
%{
#include "StdH.h"
#include "ModelsMP/Player/SeriousSam/Player.h"
#include "ModelsMP/Player/SeriousSam/Body.h"
#include "ModelsMP/Player/SeriousSam/Head.h"
#include "Models/Weapons/Colt/ColtItem.h"
%}

uses "EntitiesMP/EnemyBase";
uses "EntitiesMP/BasicEffects";

%{
// info structure
static EntityInfo eiDummyEnemy = {
  EIBT_FLESH, 500.0f,
  0.0f, 1.9f, 0.0f, // source (eyes)
  0.0f, 1.0f, 0.0f, // target (body)
};
%}

class CDummyEnemy : CEnemyBase {
name      "DummyEnemy";
thumbnail "Thumbnails\\Headman.tbn";

properties:
  1 enum ProjectileType m_prtProjectile "Dummy Projectile" = PRT_HEADMAN_ROCKETMAN,
  2 INDEX m_iAttackFire      "Dummy Fire Count" = 0,
  3 FLOAT m_fAttackHit       "Dummy Hit Damage" = 10.0f,
  4 CTFileName m_fnFireSound "Dummy Fire Sound" = CTString("Models\\Weapons\\Colt\\Sounds\\Fire.wav"),
  5 CTFileName m_fnHitSound  "Dummy Hit Sound" = CTString("SoundsMP\\Misc\\Punch.wav"),

 10 INDEX m_iFireCounter = 0,
 11 FLOAT m_fFireRate "Dummy Fire Rate" = 0.5f,

 20 FLOAT m_fHealth       "Dummy Health" = 100.0f,
 21 FLOAT m_fBlowupDamage "Dummy Blowup Damage" = 100.0f,
 22 enum SprayParticlesType m_sptParticles "Dummy Spray Particles" = SPT_BLOOD,
 23 BOOL m_bSetBoss "Dummy Boss" = FALSE,

 30 FLOAT m_fSetWalkSpeed  "Dummy Speed Walk" = 2.0f,
 31 FLOAT m_fSetRunSpeed   "Dummy Speed Run" = 12.0f,
 32 FLOAT m_fSetCloseSpeed "Dummy Speed Close" = 11.0f,
 33 FLOAT m_fSetStopDist   "Dummy Dist Stop" = 1.5f,
 34 FLOAT m_fSetAttackDist "Dummy Dist Attack" = 50.0f,
 35 FLOAT m_fSetCloseDist  "Dummy Dist Close" = 10.0f,

{
  CAutoPrecacheSound m_apsAttack;
}
  
components:
  1 class   CLASS_BASIC_EFFECT    "Classes\\BasicEffect.ecl",
  2 class   CLASS_PROJECTILE      "Classes\\Projectile.ecl",

 10 model   MODEL_PLAYER   "ModelsMP\\Player\\SeriousSam\\Player.mdl",
 11 model   MODEL_BODY     "ModelsMP\\Player\\SeriousSam\\Body.mdl",
 12 model   MODEL_HEAD     "ModelsMP\\Player\\SeriousSam\\Head.mdl",
 13 texture TEXTURE_PLAYER "ModelsMP\\Player\\SeriousSam\\Player.tex",
 14 texture TEXTURE_BODY   "ModelsMP\\Player\\SeriousSam\\Body.tex",
 15 texture TEXTURE_HEAD   "ModelsMP\\Player\\SeriousSam\\Head.tex",

 20 model   MODEL_COLT          "Models\\Weapons\\Colt\\ColtItem.mdl",
 21 model   MODEL_COLTCOCK      "Models\\Weapons\\Colt\\ColtCock.mdl",
 22 model   MODEL_COLTMAIN      "Models\\Weapons\\Colt\\ColtMain.mdl",
 23 model   MODEL_COLTBULLETS   "Models\\Weapons\\Colt\\ColtBullets.mdl",
 24 texture TEXTURE_COLTMAIN    "Models\\Weapons\\Colt\\ColtMain.tex",
 25 texture TEXTURE_COLTCOCK    "Models\\Weapons\\Colt\\ColtCock.tex",
 26 texture TEXTURE_COLTBULLETS "Models\\Weapons\\Colt\\ColtBullets.tex",

 50 sound SOUND_SIGHT "Sounds\\Player\\Quotes\\Hey!.wav",
 51 sound SOUND_WOUND "Sounds\\Player\\WoundMedium.wav",
 52 sound SOUND_DEATH "Sounds\\Player\\Death.wav",

functions:
  // [Cecil] Enemy multiplication factor
  virtual INDEX EnemyMulFactor(INDEX iMul) {
    return 1;
  };

  // [Cecil] Legion multiplication factor
  virtual INDEX LegionMulFactor(void) {
    return 1;
  };
  
  // [Cecil] Get body model
  CModelObject &GetBody(void) {
    CAttachmentModelObject *pamoBody = GetModelObject()->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);
    return pamoBody->amo_moModelObject;
  };

  // [Cecil] Body animation
  void BodyAnim(INDEX iAnim, ULONG ulFlags) {
    GetBody().PlayAnim(iAnim, ulFlags);
  };

  // [Cecil] Patching for enemy replacements
  void Read_t(CTStream *istr) {
    CEnemyBase::Read_t(istr);

    // set custom properties
    m_fHealth = GetHealth();
    m_fBlowupDamage = m_fBlowUpAmount;
    m_sptParticles = m_sptType;
    m_bSetBoss = m_bBoss;

    m_fSetWalkSpeed = m_fWalkSpeed;
    m_fSetRunSpeed = m_fAttackRunSpeed;
    m_fSetCloseSpeed = m_fCloseRunSpeed;

    m_fSetStopDist = m_fStopDistance;
    m_fSetAttackDist = m_fAttackDistance;
    m_fSetCloseDist = m_fCloseDistance;
  };

  void Precache(void) {
    CEnemyBase::Precache();
    PrecacheSound(SOUND_SIGHT);
    PrecacheSound(SOUND_WOUND);
    PrecacheSound(SOUND_DEATH);
    
    m_apsAttack.Precache(m_fnFireSound);
    m_apsAttack.Precache(m_fnHitSound);
  };

  virtual CTString GetPlayerKillDescription(const CTString &strPlayerName, const EDeath &eDeath) {
    CTString str;
    str.PrintF(TRANS("%s killed %s"), GetName(), strPlayerName);
    return str;
  };

  void *GetEntityInfo(void) {
    return &eiDummyEnemy;
  };

  void ReceiveDamage(CEntity *penInflictor, enum DamageType dmtType, FLOAT fDamage, const FLOAT3D &vHitPoint, const FLOAT3D &vDirection) {
    // [Cecil] Can't harm allies
    if (IsOfClass(penInflictor, "DummyEnemy")) {
      return;
    }
    
    CEnemyBase::ReceiveDamage(penInflictor, dmtType, fDamage, vHitPoint, vDirection);
  };

  // [Cecil] Wound animation
  INDEX AnimForDamage(FLOAT fDamage) {
    StartModelAnim(PLAYER_ANIM_TURNLEFT, AOF_LOOPING|AOF_NORESTART);
    BodyAnim(BODY_ANIM_COLT_STAND, AOF_LOOPING|AOF_NORESTART);

    return PLAYER_ANIM_TURNLEFT;
  };

  // [Cecil] Death animation
  INDEX AnimForDeath(void) {
    FLOAT3D vFront;
    GetHeadingDirection(0, vFront);
    FLOAT fDamageDir = m_vDamage % vFront;
    
    INDEX iAnim1, iAnim2;
    
    if (fDamageDir < 0.0f) {
        if (Abs(fDamageDir) < 10.0f) {
          iAnim1 = PLAYER_ANIM_DEATH_EASYFALLBACK;
          iAnim2 = BODY_ANIM_DEATH_EASYFALLBACK;
        } else {
          iAnim1 = PLAYER_ANIM_DEATH_BACK;
          iAnim2 = BODY_ANIM_DEATH_BACK;
        }
      } else {
        if (Abs(fDamageDir) < 10.0f) {
          iAnim1 = PLAYER_ANIM_DEATH_EASYFALLFORWARD;
          iAnim2 = BODY_ANIM_DEATH_EASYFALLFORWARD;
        } else {
          iAnim1 = PLAYER_ANIM_DEATH_FORWARD;
          iAnim2 = BODY_ANIM_DEATH_FORWARD;
        }
      }

    StartModelAnim(iAnim1, 0);
    BodyAnim(iAnim2, 0);
    
    return iAnim1;
  };

  void DeathNotify(void) {
    ChangeCollisionBoxIndexWhenPossible(PLAYER_COLLISION_BOX_CROUCH);
    en_fDensity = 500.0f;
  };

  // virtual anim functions
  void StandingAnim(void) {
    StartModelAnim(PLAYER_ANIM_STAND, AOF_LOOPING|AOF_NORESTART);
    BodyAnim(BODY_ANIM_WAIT, AOF_LOOPING|AOF_NORESTART);
  };
  
  void StandingAnimFight(void) {
    StartModelAnim(PLAYER_ANIM_STAND, AOF_LOOPING|AOF_NORESTART);
    BodyAnim(BODY_ANIM_COLT_STAND, AOF_LOOPING|AOF_NORESTART);
  };
  
  void WalkingAnim(void) {
    StartModelAnim(PLAYER_ANIM_NORMALWALK, AOF_LOOPING|AOF_NORESTART);
    BodyAnim(BODY_ANIM_NORMALWALK, AOF_LOOPING|AOF_NORESTART);
  };
  
  void RunningAnim(void) {
    StartModelAnim(PLAYER_ANIM_RUN, AOF_LOOPING|AOF_NORESTART);
    BodyAnim(BODY_ANIM_COLT_STAND, AOF_LOOPING|AOF_NORESTART);
  };
  
  void RotatingAnim(void) {
    StartModelAnim(PLAYER_ANIM_TURNLEFT, AOF_LOOPING|AOF_NORESTART);
    BodyAnim(BODY_ANIM_COLT_STAND, AOF_LOOPING|AOF_NORESTART);
  };

  // virtual sound functions
  void SightSound(void) {
    if (!m_soSound.IsPlaying()) {
      PlaySound(m_soSound, SOUND_SIGHT, SOF_3D);
    }
  };
  
  void WoundSound(void) {
    if (!m_soSound.IsPlaying()) {
      PlaySound(m_soSound, SOUND_WOUND, SOF_3D);
    }
  };
  
  void DeathSound(void) {
    PlaySound(m_soSound, SOUND_DEATH, SOF_3D);
  };

  // get movement frequency for attack
  virtual FLOAT GetAttackMoveFrequency(FLOAT fEnemyDistance) {
    // sharp reflexes when close
    if (fEnemyDistance < m_fCloseDistance) {
      return 0.1f;
    }
    
    return CEnemyBase::GetAttackMoveFrequency(fEnemyDistance);
  };

procedures:
  Fire(EVoid) : CEnemyBase::Fire {
    // no fire attack
    if (m_iAttackFire <= 0) {
      return EReturn();
    }

    StandingAnimFight();
    autowait(0.25f);

    m_iFireCounter = m_iAttackFire;

    while (--m_iFireCounter >= 0) {
      BodyAnim(BODY_ANIM_COLT_FIRERIGHT, 0);
      ShootProjectile(m_prtProjectile, FLOAT3D(0.2f, 1.3f, -0.2f) * m_fStretchMultiplier, ANGLE3D(0.0f, 0.0f, 0.0f));
      PlaySound(m_soSound, m_fnFireSound, SOF_3D);

      autowait(ClampDn(m_fFireRate, 0.05f));
    }

    return EReturn();
  };

  Hit(EVoid) : CEnemyBase::Hit {
    // no hit attack
    if (m_fAttackHit <= 0.0f) {
      return EReturn();
    }

    m_fShootTime = _pTimer->CurrentTick() + 0.5f;

    // within hitting range
    if (CalcDist(m_penEnemy) < 3.0f*m_fStretchMultiplier) {
      StandingAnimFight();
      BodyAnim(BODY_ANIM_KNIFE_ATTACK, 0);

      // wait for animation
      autowait(0.25f);

      // within hitting range
      if (CalcDist(m_penEnemy) < 3.0f*m_fStretchMultiplier) {
        FLOAT3D vDir = m_penEnemy->GetPlacement().pl_PositionVector - GetPlacement().pl_PositionVector;
        vDir.Normalize();

        InflictDirectDamage(m_penEnemy, this, DMT_CLOSERANGE, m_fAttackHit, FLOAT3D(0.0f, 0.0f, 0.0f), vDir);
        PlaySound(m_soSound, m_fnHitSound, SOF_3D);
      }

      autowait(0.5f);
    }

    return EReturn();
  };

  Main(EVoid) {
    // declare yourself as a model
    InitAsModel();
    SetPhysicsFlags(EPF_MODEL_WALKING|EPF_HASLUNGS);
    SetCollisionFlags(ECF_MODEL);
    SetFlags(GetFlags() | ENF_ALIVE);

    SetHealth(m_fHealth);
    m_fMaxHealth = m_fHealth;

    en_tmMaxHoldBreath = 5.0f;
    en_fDensity = 1000.0f;
    m_fBlowUpSize = 2.0f;
    m_bBoss = m_bSetBoss;

    // appearance
    SetModel(MODEL_PLAYER);
    SetModelMainTexture(TEXTURE_PLAYER);
    AddAttachment(PLAYER_ATTACHMENT_TORSO, MODEL_BODY, TEXTURE_BODY);
    AddAttachmentToModel(this, GetBody(), BODY_ATTACHMENT_HEAD, MODEL_HEAD, TEXTURE_HEAD, 0, 0, 0);

    // weapon
    if (m_iAttackFire > 0) {
      AddAttachmentToModel(this, GetBody(), BODY_ATTACHMENT_COLT_RIGHT, MODEL_COLT, MODEL_COLTMAIN, 0, 0, 0);

      CModelObject &moColt = GetBody().GetAttachmentModel(BODY_ATTACHMENT_COLT_RIGHT)->amo_moModelObject;
      AddAttachmentToModel(this, moColt, COLTITEM_ATTACHMENT_BULLETS, MODEL_COLTBULLETS, TEXTURE_COLTBULLETS, 0, 0, 0);
      AddAttachmentToModel(this, moColt, COLTITEM_ATTACHMENT_COCK, MODEL_COLTCOCK, TEXTURE_COLTCOCK, 0, 0, 0);
      AddAttachmentToModel(this, moColt, COLTITEM_ATTACHMENT_BODY, MODEL_COLTMAIN, TEXTURE_COLTMAIN, 0, 0, 0);
    }
    
    // set moving speed
    m_fWalkSpeed      = m_fSetWalkSpeed;
    m_fAttackRunSpeed = m_fSetRunSpeed;
    m_fCloseRunSpeed  = m_fSetCloseSpeed;
    m_aWalkRotateSpeed   = AngleDeg(500.0f);
    m_aAttackRotateSpeed = AngleDeg(650.0f);
    m_aCloseRotateSpeed  = AngleDeg(650.0f);

    // set attack distances
    m_fStopDistance   = m_fSetStopDist;
    m_fAttackDistance = m_fSetAttackDist;
    m_fCloseDistance  = m_fSetCloseDist;
    m_fAttackFireTime = 1.0f;
    m_fCloseFireTime = 0.25f;
    m_fIgnoreRange = 250.0f;

    // damage/explode properties
    m_fBlowUpAmount = m_fBlowupDamage;
    m_fBodyParts = 4;
    m_fDamageWounded = 0.0f;
    
    m_iScore = 1000;
    
    ModelChangeNotify();
    StandingAnim();

    // continue behavior in base class
    jump CEnemyBase::MainLoop();
  };
};
