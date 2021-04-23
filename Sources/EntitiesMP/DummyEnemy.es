2002
%{
#include "StdH.h"
#include "ModelsMP/Player/SeriousSam/Player.h"
#include "ModelsMP/Player/SeriousSam/Body.h"
#include "ModelsMP/Player/SeriousSam/Head.h"
#include "Models/Weapons/Colt/ColtItem.h"

// [Cecil] Patch parser
#include "EntitiesMP/Common/ConfigFunc.h"
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
 11 FLOAT m_fFireRate      "Dummy Fire Rate" = 0.5f,
 12 FLOAT m_fFireFrequency "Dummy Fire Frequency" = 3.0f,

 20 FLOAT m_fHealth "Health" = 100.0f,
 21 BOOL m_bSetBoss "Boss" = FALSE,
 22 enum SprayParticlesType m_sptParticles "Dummy Spray Particles" = SPT_BLOOD,

 30 FLOAT m_fSetWalkSpeed  "Speed Walk" = 2.0f,
 31 FLOAT m_fSetRunSpeed   "Speed Run" = 12.0f,
 32 FLOAT m_fSetCloseSpeed "Speed Close" = 11.0f,
 33 FLOAT m_fSetStopDist   "Dist Stop" = 1.5f,
 34 FLOAT m_fSetAttackDist "Dist Attack" = 50.0f,
 35 FLOAT m_fSetCloseDist  "Dist Close" = 6.0f,
 36 FLOAT m_fSetReflexDist "Dist Reflex" = 6.0f,

 40 CTFileName m_fnPatch "Dummy Patch" = CTString(""),
 41 CTFileName m_fnSight "Sound Sight" = CTString(""),
 42 CTFileName m_fnWound "Sound Wound" = CTString(""),
 43 CTFileName m_fnDeath "Sound Death" = CTString(""),

 50 FLOAT m_fBlowupDamage "Dummy Blowup Damage" = 100.0f,
 51 FLOAT m_fWoundDamage  "Dummy Wound Damage" = 60.0f,
 52 BOOL m_bWoundAnim     "Dummy Wound Animation" = TRUE,

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

  // [Cecil] Precache sounds
  void Precache(void) {
    CEnemyBase::Precache();
    PrecacheSound(SOUND_SIGHT);
    PrecacheSound(SOUND_WOUND);
    PrecacheSound(SOUND_DEATH);
    
    PrecacheResource(ECT_SOUND, m_fnFireSound);
    PrecacheResource(ECT_SOUND, m_fnHitSound);

    PrecacheResource(ECT_SOUND, m_fnSight);
    PrecacheResource(ECT_SOUND, m_fnWound);
    PrecacheResource(ECT_SOUND, m_fnDeath);
  };
  
  // [Cecil] Get body model
  CModelObject &GetBody(void) {
    CAttachmentModelObject *pamoBody = GetModelObject()->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);
    return pamoBody->amo_moModelObject;
  };

  // [Cecil] Get head model
  CModelObject &GetHead(void) {
    CAttachmentModelObject *pamoHead = GetBody().GetAttachmentModel(BODY_ATTACHMENT_HEAD);
    return pamoHead->amo_moModelObject;
  };

  // [Cecil] Body animation
  void BodyAnim(INDEX iAnim, ULONG ulFlags) {
    GetBody().PlayAnim(iAnim, ulFlags);
  };

  // [Cecil] Set dummy model
  void DummyAppearance(void) {
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
    
    // patch the dummy
    PatchDummy(m_fnPatch);

    // reset size
    CEnemyBase::SizeModel();
  };

  // [Cecil] Apply dummy patch
  void PatchDummy(CTFileName fnPatch) {
    // no patch
    if (!FileExists(fnPatch)) {
      return;
    }

    CConfigBlock cbPatch;
    HookConfigFunctions();

    // couldn't parse
    if (ParseConfig(fnPatch, cbPatch) != DJSON_OK) {
      FatalError("Cannot parse dummy patch '%s'!", fnPatch);
      return;
    }

    // appearance
    if (!SetConfigTexture(cbPatch, "Legs", GetModelObject()->mo_toTexture)) {
      CPrintF("Invalid legs texture for the dummy!\n");
    }

    if (!SetConfigTexture(cbPatch, "Body", GetBody().mo_toTexture)) {
      CPrintF("Invalid body texture for the dummy!\n");
    }

    if (!SetConfigTexture(cbPatch, "Head", GetHead().mo_toTexture)) {
      CPrintF("Invalid head texture for the dummy!\n");
    }

    // custom sounds
    GetConfigPath(cbPatch, "SightSound", m_fnSight);
    GetConfigPath(cbPatch, "WoundSound", m_fnWound);
    GetConfigPath(cbPatch, "DeathSound", m_fnDeath);
    GetConfigPath(cbPatch, "FireSound",  m_fnFireSound);
    GetConfigPath(cbPatch, "HitSound",   m_fnHitSound);

    // custom projectile
    ProjectileType ePrt;

    if (cbPatch.GetValue("Projectile", (int&)ePrt)) {
      // check for valid projectiles
      if (ProjectileType_enum.NameForValue(ePrt) != "") {
        m_prtProjectile = ePrt;
      } else {
        CPrintF("Invalid projectile index for the dummy: %d\n", ePrt);
      }
    }

    // other properties
    GetConfigString(cbPatch, "Name", m_strName);

    cbPatch.GetValue("BlowupDamage",  (float&)m_fBlowupDamage);
    cbPatch.GetValue("WoundDamage",   (float&)m_fWoundDamage);
    cbPatch.GetValue("ReflexDist",    (float&)m_fSetReflexDist);
    cbPatch.GetValue("FireRate",      (float&)m_fFireRate);
    cbPatch.GetValue("FireFrequency", (float&)m_fFireFrequency);
    cbPatch.GetValue("HitDamage",     (float&)m_fAttackHit);

    cbPatch.GetValue("FireCount",     (int&)m_iAttackFire);
    cbPatch.GetValue("WoundAnim",     (int&)m_bWoundAnim);

    // speeds and distances
    if (cbPatch.GetValue("WalkSpeed", (float&)m_fSetWalkSpeed)) {
      m_fWalkSpeed = m_fSetWalkSpeed;
    }

    if (cbPatch.GetValue("RunSpeed", (float&)m_fSetRunSpeed)) {
      m_fAttackRunSpeed = m_fSetRunSpeed;
    }

    if (cbPatch.GetValue("CloseSpeed", (float&)m_fSetCloseSpeed)) {
      m_fCloseRunSpeed = m_fSetCloseSpeed;
    }

    if (cbPatch.GetValue("StopDist", (float&)m_fSetStopDist)) {
      m_fStopDistance = m_fSetStopDist;
    }

    if (cbPatch.GetValue("AttackDist", (float&)m_fSetAttackDist)) {
      m_fAttackDistance = m_fSetAttackDist;
    }

    if (cbPatch.GetValue("CloseDist", (float&)m_fSetCloseDist)) {
      m_fCloseDistance = m_fSetCloseDist;
    }
  };

  // [Cecil] Patching for enemy replacements
  void Read_t(CTStream *istr) {
    CEnemyBase::Read_t(istr);

    // set normal size
    StretchModel(FLOAT3D(1.0f, 1.0f, 1.0f));

    // set custom properties
    m_fHealth = GetHealth();
    m_fMaxHealth = m_fHealth;
    m_bSetBoss = m_bBoss;
    m_sptParticles = m_sptType;

    m_fBlowupDamage = m_fBlowUpAmount;
    m_fWoundDamage = m_fDamageWounded;
    m_fFireFrequency = m_fAttackFireTime;

    m_fSetWalkSpeed = m_fWalkSpeed;
    m_fSetRunSpeed = m_fAttackRunSpeed;
    m_fSetCloseSpeed = m_fCloseRunSpeed;

    m_fSetStopDist = m_fStopDistance;
    m_fSetAttackDist = m_fAttackDistance;
    m_fSetCloseDist = m_fCloseDistance;

    // get dummy patch
    if (m_fnPatch == CTString("")) {
      m_fnPatch = GetPatchConfig(this, "Dummies");
    }

    // reset custom model
    DummyAppearance();
  };

  virtual CTString GetPlayerKillDescription(const CTString &strPlayerName, const EDeath &eDeath) {
    CTString str;
    str.PrintF(TRANS("%s killed %s"), GetName(), strPlayerName);
    return str;
  };

  // [Cecil] Display entity ID
  const CTString &GetDescription(void) const {
    ((CTString&)m_strDescription).PrintF("%d -> <none>", en_ulID);

    if (m_penMarker != NULL) {
      ((CTString&)m_strDescription).PrintF("%d -> %s", en_ulID, m_penMarker->GetName());
    }

    return m_strDescription;
  };

  void *GetEntityInfo(void) {
    return &eiDummyEnemy;
  };

  // [Cecil] Set the size manually
  void SizeModel(void) {};

  void ReceiveDamage(CEntity *penInflictor, enum DamageType dmtType, FLOAT fDamage, const FLOAT3D &vHitPoint, const FLOAT3D &vDirection) {
    // [Cecil] Can't harm allies
    if (IsOfClass(penInflictor, "DummyEnemy")) {
      return;
    }
    
    CEnemyBase::ReceiveDamage(penInflictor, dmtType, fDamage, vHitPoint, vDirection);
  };

  // [Cecil] Wound animation
  INDEX AnimForDamage(FLOAT fDamage) {
    if (m_bWoundAnim) {
      StartModelAnim(PLAYER_ANIM_TURNLEFT, AOF_LOOPING|AOF_NORESTART);
      BodyAnim(BODY_ANIM_COLT_STAND, AOF_LOOPING|AOF_NORESTART);

      return PLAYER_ANIM_TURNLEFT;
    }

    return PLAYER_ANIM_DEFAULT_ANIMATION;
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
      if (FileExists(m_fnSight)) {
        PlaySound(m_soSound, m_fnSight, SOF_3D);
      } else {
        PlaySound(m_soSound, SOUND_SIGHT, SOF_3D);
      }
    }
  };
  
  void WoundSound(void) {
    if (!m_soSound.IsPlaying()) {
      if (FileExists(m_fnWound)) {
        PlaySound(m_soSound, m_fnWound, SOF_3D);
      } else {
        PlaySound(m_soSound, SOUND_WOUND, SOF_3D);
      }
    }
  };
  
  void DeathSound(void) {
    if (FileExists(m_fnDeath)) {
      PlaySound(m_soSound, m_fnDeath, SOF_3D);
    } else {
      PlaySound(m_soSound, SOUND_DEATH, SOF_3D);
    }
  };

  // get movement frequency for attack
  virtual FLOAT GetAttackMoveFrequency(FLOAT fEnemyDistance) {
    // sharp reflexes when close
    if (fEnemyDistance < m_fSetReflexDist) {
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
    autowait(0.15f + FRnd()*0.15f);

    m_iFireCounter = m_iAttackFire;

    while (--m_iFireCounter >= 0) {
      BodyAnim(BODY_ANIM_COLT_FIRERIGHT, 0);
      ShootProjectile(m_prtProjectile, FLOAT3D(0.2f, 1.4f, -0.25f) * ClampDn(m_fStretchMultiplier, 0.5f), ANGLE3D(0.0f, 0.0f, 0.0f));
      PlaySound(m_soSound, m_fnFireSound, SOF_3D);

      autowait(ClampDn(m_fFireRate, 0.05f));
    }
    
    m_fShootTime = _pTimer->CurrentTick() + m_fFireFrequency + (FRnd()*0.3f - 0.15f);
    return EReturn();
  };

  Hit(EVoid) : CEnemyBase::Hit {
    // no hit attack
    if (m_fAttackHit <= 0.0f) {
      return EReturn();
    }

    // within hitting range
    if (CalcDist(m_penEnemy) < 2.0f * ClampDn(m_fStretchMultiplier, 0.5f)) {
      StandingAnimFight();
      BodyAnim(BODY_ANIM_KNIFE_ATTACK, 0);

      // wait for animation
      autowait(0.1f);

      // within hitting range
      if (CalcDist(m_penEnemy) < 3.0f * ClampDn(m_fStretchMultiplier, 0.5f)) {
        FLOAT3D vDir = m_penEnemy->GetPlacement().pl_PositionVector - GetPlacement().pl_PositionVector;
        vDir.Normalize();

        InflictDirectDamage(m_penEnemy, this, DMT_CLOSERANGE, m_fAttackHit, FLOAT3D(0.0f, 0.0f, 0.0f), vDir);
        PlaySound(m_soSound, m_fnHitSound, SOF_3D);
      }

      autowait(0.5f);
    }

    m_fShootTime = _pTimer->CurrentTick() + 0.4f + FRnd()*0.3f;
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
    m_sptType = m_sptParticles;

    en_tmMaxHoldBreath = 5.0f;
    en_fDensity = 1000.0f;
    m_fBlowUpSize = 2.0f;
    m_bBoss = m_bSetBoss;

    // appearance
    DummyAppearance();
    
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
    m_fAttackFireTime = m_fFireFrequency;
    m_fCloseFireTime = 0.25f;
    m_fIgnoreRange = 250.0f;

    // damage/explode properties
    m_fBlowUpAmount = m_fBlowupDamage;
    m_fBodyParts = 4;
    m_fDamageWounded = m_fWoundDamage;
    
    m_iScore = 1000;
    
    ModelChangeNotify();
    StandingAnim();

    // continue behavior in base class
    jump CEnemyBase::MainLoop();
  };
};
