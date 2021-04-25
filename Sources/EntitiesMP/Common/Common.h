// Brush surfaces
#define SURFACE_SAND 9
#define SURFACE_WATER 12
#define SURFACE_RED_SAND 13
#define SURFACE_GRASS 17
#define SURFACE_GRASS_SLIDING 19
#define SURFACE_GRASS_NOIMPACT 20
#define SURFACE_WOOD 18
#define SURFACE_SNOW 21

// [Cecil] Moved from Player
// Representing flags used to fill buttoned actions
#define PLACT_FIRE            (1L << 0)
#define PLACT_RELOAD          (1L << 1)
#define PLACT_WEAPON_NEXT     (1L << 2)
#define PLACT_WEAPON_PREV     (1L << 3)
#define PLACT_WEAPON_FLIP     (1L << 4)
#define PLACT_USE             (1L << 5)
#define PLACT_COMPUTER        (1L << 6)
#define PLACT_3RD_PERSON_VIEW (1L << 7)
#define PLACT_CENTER_VIEW     (1L << 8)
#define PLACT_USE_HELD        (1L << 9)
#define PLACT_SNIPER_ZOOMIN   (1L << 10)
#define PLACT_SNIPER_ZOOMOUT  (1L << 11)
#define PLACT_SNIPER_USE      (1L << 12)
#define PLACT_FIREBOMB        (1L << 13)

// [Cecil] New buttons
#define PLACT_ALTFIRE         (1L << 14) // alt fire button
#define PLACT_TOKENS          (1L << 15) // token spending button
#define PLACT_SELECT_MODIFIER (1L << 16) // weapon selection modifier

// [Cecil] Weapon selection mask (last 5 bits)
#define PLACT_SELECT_WEAPON_SHIFT (27)
#define PLACT_SELECT_WEAPON_MASK  (0x1FL << PLACT_SELECT_WEAPON_SHIFT)

// Max ammo
#define MAX_BULLETS       INDEX(500)
#define MAX_SHELLS        INDEX(100)
#define MAX_ROCKETS       INDEX(50)
#define MAX_GRENADES      INDEX(50)
#define MAX_NAPALM        INDEX(500)
#define MAX_ELECTRICITY   INDEX(400)
#define MAX_IRONBALLS     INDEX(30)
#define MAX_SNIPERBULLETS INDEX(50)

// Bit shifters for ammo
#define AMMO_BULLETS       0
#define AMMO_SHELLS        1
#define AMMO_ROCKETS       2
#define AMMO_GRENADES      3
#define AMMO_NAPALM        4
#define AMMO_ELECTRICITY   5
#define AMMO_IRONBALLS     7
#define AMMO_SNIPERBULLETS 8

// [Cecil] Ammo bits in order
static const INDEX _aiTakeAmmoBits[8] = {
  AMMO_SHELLS,
  AMMO_BULLETS,
  AMMO_ROCKETS,
  AMMO_GRENADES,
  AMMO_NAPALM,
  AMMO_SNIPERBULLETS,
  AMMO_ELECTRICITY,
  AMMO_IRONBALLS,
};

#define BLOOD_SPILL_RED RGBAToColor(250,20,20,255)
#define BLOOD_SPILL_GREEN RGBAToColor(0,250,0,255)

// Ammo mana Value
#define AV_SHELLS        INDEX(70)
#define AV_BULLETS       INDEX(10)
#define AV_ROCKETS       INDEX(150)
#define AV_GRENADES      INDEX(150)
#define AV_ELECTRICITY   INDEX(250)
#define AV_IRONBALLS     INDEX(700)
#define AV_NAPALM        INDEX(200)
#define AV_SNIPERBULLETS INDEX(200)

// [Cecil] Mana for ammo adjustment (moved from PlayerWeapons)
#define MANA_AMMO (0.1f)

// used for invisibility powerup
#define INVISIBILITY_ALPHA_LOCAL  0x55
#define INVISIBILITY_ALPHA_REMOTE 0x11

enum EmptyShellType {
  ESL_BULLET = 0,
  ESL_SHOTGUN = 1,
  ESL_BUBBLE = 2,
  ESL_BULLET_SMOKE = 3,
  ESL_SHOTGUN_SMOKE = 4,
  ESL_COLT_SMOKE = 5,
};
// empty shell launch info
#define MAX_FLYING_SHELLS 32
struct ShellLaunchData {
  FLOAT sld_fSize;              // size multiplier
  FLOAT3D sld_vPos;             // launch position
  FLOAT3D sld_vSpeed;           // launch speed
  FLOAT3D sld_vUp;              // up vector in moment of launch
  FLOAT sld_tmLaunch;           // time of launch
  EmptyShellType sld_estType;   // shell type
};
#define ShellLaunchData_array m_asldData[MAX_FLYING_SHELLS]

// player bullet spray fx list
#define MAX_BULLET_SPRAYS 32
struct BulletSprayLaunchData {
  INDEX bsld_iRndBase;              // random base
  FLOAT3D bsld_vPos;                // launch position
  FLOAT3D bsld_vG;                  // gravity vector
  EffectParticlesType bsld_eptType; // type
  FLOAT bsld_tmLaunch;              // time of launch
  FLOAT3D bsld_vStretch;            // stretch
};
#define BulletSprayLaunchData_array m_absldData[MAX_BULLET_SPRAYS]

#define MAX_GORE_SPRAYS 32
struct GoreSprayLaunchData {
  FLOAT3D gsld_vPos;                // launch position
  FLOAT3D gsld_v3rdPos;             // launch position for 3rd perspective
  FLOAT3D gsld_vG;                  // gravity vector
  FLOAT gsld_fGA;                   // gravity strength
  SprayParticlesType gsld_sptType;  // type
  FLOATaabbox3D gsld_boxHitted;     // box of hitted object
  FLOAT3D gsld_vSpilDirection;      // spill direction
  FLOAT gsld_fDamagePower;          // damage power
  FLOAT gsld_tmLaunch;              // time of launch
  COLOR gsld_colParticles;          // color of particles
};
#define GoreSprayLaunchData_array m_agsldData[MAX_GORE_SPRAYS]

// world change
struct WorldChange {
  CTString strGroup;      // group name
  CPlacement3D plLink;    // link placement for relative change
  INDEX iType;            // change type
};
extern struct WorldChange _SwcWorldChange;

// entity info
struct EntityInfo {
  EntityInfoBodyType Eeibt;     // body type
  FLOAT fMass;                  // mass (in kg)
  FLOAT vSourceCenter[3];       // body point (offset from handle) when entity look another entity
  FLOAT vTargetCenter[3];       // body point (offset from handle) when entity is target of look
};

// entity info
struct EntityStats {
  CTString es_strName;
  INDEX es_ctCount;
  INDEX es_ctAmmount;
  FLOAT es_fValue;
  INDEX es_iScore;
};

// statistics data for player stats management
struct DECL_DLL PlayerStats {
  INDEX ps_iScore;
  INDEX ps_iKills;
  INDEX ps_iDeaths;
  INDEX ps_iSecrets;
  TIME  ps_tmTime;

  PlayerStats(void)
  {
    ps_iScore = 0;
    ps_iKills = 0;
    ps_iDeaths = 0;
    ps_iSecrets = 0;
    ps_tmTime = 0.0f;
  }
};

// get info position for entity
DECL_DLL void GetEntityInfoPosition(CEntity *pen, FLOAT *pf, FLOAT3D &vPos);
// get source and target positions for ray cast
DECL_DLL void GetPositionCastRay(CEntity *penSource, CEntity *penTarget, FLOAT3D &vSource, FLOAT3D &vTarget);

// set bool from bool enum type
DECL_DLL void SetBoolFromBoolEType(BOOL &bSet, BoolEType bet);
// send event to target
DECL_DLL void SendToTarget(CEntity *penSendEvent, EventEType eetEventType, CEntity *penCaused = NULL);
// send event in range
DECL_DLL void SendInRange(CEntity *penSource, EventEType eetEventType, const FLOATaabbox3D &boxRange);

// spawn reminder
DECL_DLL CEntityPointer SpawnReminder(CEntity *penOwner, FLOAT fWaitTime, INDEX iValue);
// spawn flame
DECL_DLL CEntityPointer SpawnFlame(CEntity *penOwner, CEntity *penAttach, const FLOAT3D &vSource);

// Set components
DECL_DLL void SetComponents(CEntity *pen, CModelObject &mo, ULONG ulIDModel, ULONG ulIDTexture,
                   ULONG ulIDReflectionTexture, ULONG ulIDSpecularTexture, ULONG ulIDBumpTexture);
// Add attachment to model
DECL_DLL void AddAttachmentToModel(CEntity *pen, CModelObject &mo, INDEX iAttachment, ULONG ulIDModel, ULONG ulIDTexture,
                          ULONG ulIDReflectionTexture, ULONG ulIDSpecularTexture, ULONG ulIDBumpTexture);
// Remove attachment from model
DECL_DLL void RemoveAttachmentFromModel(CModelObject &mo, INDEX iAttachment);

// Kick entity
DECL_DLL void KickEntity(CEntity *penTarget, FLOAT3D vSpeed);


// lens flare variables
extern CLensFlareType _lftStandard;
extern CLensFlareType _lftStandardReflections;
extern CLensFlareType _lftYellowStarRedRing;
extern CLensFlareType _lftYellowStarRedRingFar;
extern CLensFlareType _lftWhiteGlowStarRedRing;
extern CLensFlareType _lftWhiteGlowStar;
extern CLensFlareType _lftWhiteGlowStarNG;
extern CLensFlareType _lftWhiteStarRedRingStreaks;
extern CLensFlareType _lftWhiteStarRedReflections;
extern CLensFlareType _lftBlueStarBlueReflections;
extern CLensFlareType _lftProjectileStarGlow;
extern CLensFlareType _lftProjectileWhiteBubbleGlow;
extern CLensFlareType _lftProjectileYellowBubbleGlow;
extern CLensFlareType _lftPVSpaceShipWindowFlare;
extern CLensFlareType _lftCatmanFireGlow;
extern CLensFlareType _lftWhiteGlowFar;
// init lens flare effects
void InitLensFlares(void);
// close lens flares effects
void CloseLensFlares(void);

DECL_DLL BOOL SetPlayerAppearance(CModelObject *mo, CPlayerCharacter *ppc, CTString &strName, BOOL bPreview);

// debugging functions
DECL_DLL const char *PrintConsole(void);
DECL_DLL const char *PrintStack(CEntity *pen);

// debris spawning
DECL_DLL void Debris_Begin(
  EntityInfoBodyType Eeibt, 
  enum DebrisParticlesType dptParticles,
  enum BasicEffectType  betStain,
  FLOAT fEntitySize,             // entity size in meters
  const FLOAT3D &vSpeed,
  const FLOAT3D &vSpawnerSpeed,  // how fast was the entity moving
  const FLOAT fConeSize,         // size multiplier for debris cone
  const FLOAT fSpeedUp,          // size multiplier for debris catapulting up (0-no multiply)
  const COLOR colDebris=C_WHITE  // multiply color
);
DECL_DLL CEntityPointer Debris_Spawn(
  CEntity *penSpawner,
  CEntity *penComponents,
  SLONG idModelComponent,
  SLONG idTextureComponent,
  SLONG idReflectionTextureComponent,
  SLONG idSpecularTextureComponent,
  SLONG idBumpTextureComponent,
  INDEX iModelAnim,
  FLOAT fSize,                // size relative to entity size (or 0 for absolute stretch of 1)
  const FLOAT3D &vPosRatio);
DECL_DLL CEntityPointer Debris_Spawn_Independent(
  CEntity *penSpawner,
  CEntity *penComponents,
  SLONG idModelComponent,
  SLONG idTextureComponent,
  SLONG idReflectionTextureComponent,
  SLONG idSpecularTextureComponent,
  SLONG idBumpTextureComponent,
  INDEX iModelAnim,
  FLOAT fSize,
  CPlacement3D plAbsolutePlacement,
  FLOAT3D vTranslation,
  ANGLE3D aRotation);
DECL_DLL CEntityPointer Debris_Spawn_Template(
  EntityInfoBodyType eibt,
  enum DebrisParticlesType dptParticles,
  enum BasicEffectType betStain,
  class CModelHolder2 *penmhDestroyed,
  CEntity *penComponents,
  class CModelHolder2 *penmh2,
  FLOAT3D vStretch,
  FLOAT fSize,
  CPlacement3D plAbsolutePlacement,
  FLOAT3D vLaunchSpeed,
  ANGLE3D aRotSpeed,
  BOOL bDebrisImmaterialASAP,
  FLOAT fDustStretch,
  COLOR colBurning);

// get default entity info for given body type
DECL_DLL EntityInfo *GetStdEntityInfo(EntityInfoBodyType eibt);
// damage control functions
DECL_DLL FLOAT DamageStrength(EntityInfoBodyType eibtBody, enum DamageType dtDamage);

// Print center screen message
DECL_DLL void PrintCenterMessage(CEntity *penThis, CEntity *penTarget, 
  const CTString &strMessage, TIME tmLength, enum MessageSound mssSound);

// get name of a key item
DECL_DLL const char *GetKeyName(enum KeyItemType kit);

// get session properties
DECL_DLL inline const CSessionProperties *GetSP(void)
{
  return (const CSessionProperties *)_pNetwork->GetSessionProperties();
}

// i.e. weapon sound when fireing or exploding
DECL_DLL void SpawnRangeSound( CEntity *penPlayer, CEntity *penPos, enum SoundType st, FLOAT fRange);

// get some player for trigger source if any is existing
DECL_DLL CEntity *FixupCausedToPlayer(CEntity *penThis, CEntity *penCaused, BOOL bWarning=TRUE);

// precisely lerp between two placement using quaternions
DECL_DLL CPlacement3D LerpPlacementsPrecise(const CPlacement3D &pl0, const CPlacement3D &pl1, FLOAT fRatio);

// obtain game extra damage per enemy and per player
DECL_DLL FLOAT GetGameDamageMultiplier(void);

// get entity's serious damage multiplier
DECL_DLL FLOAT GetSeriousDamageMultiplier( CEntity *pen);

// get current world settings controller
DECL_DLL class CWorldSettingsController *GetWSC(CEntity *pen);

// helper functions

// distance between two entities
DECL_DLL inline FLOAT DistanceTo(CEntity *penE1, CEntity *penE2) {
    return (penE1->GetPlacement().pl_PositionVector -
            penE2->GetPlacement().pl_PositionVector).Length();
}

BulletHitType GetBulletHitTypeForSurface(INDEX iSurfaceType);
EffectParticlesType GetParticleEffectTypeForSurface(INDEX iSurfaceType);
// spawn effect from hit type
void SpawnHitTypeEffect(CEntity *pen, enum BulletHitType bhtType, BOOL bSound, FLOAT3D vHitNormal, FLOAT3D vHitPoint,
  FLOAT3D vIncommingBulletDir, FLOAT3D vDistance);

#define FRndIn(a, b) (a + FRnd()*(b - a))

// [Cecil] Check for a singleplayer world in multiplayer
inline BOOL SPWorld(void) {
  return (!GetSP()->sp_bSinglePlayer && GetSP()->sp_gmGameMode == CSessionProperties::GM_SINGLEPLAYER);
};

// [Cecil] Check if using global controller for cutscenes
inline BOOL GlobalCutscenes(void) {
  //return FALSE; // [Cecil] TEMP
  return SPWorld();
};

// [Cecil] Fire speed multiplier
inline FLOAT FireSpeedMul(void) {
  return (1.0f / GetSP()->sp_fFireSpeed);
};

// [Cecil] Ammo multiplier
inline FLOAT AmmoMul(void) {
  return GetSP()->sp_fAmmoMultiplier;
};

// [Cecil] Pure fire speed
inline FLOAT FireSpeed(void) {
  return GetSP()->sp_fFireSpeed;
};

// [Cecil] Stronger enemies
inline BOOL StrongerEnemies(void) {
  return GetSP()->sp_iAMPOptions & AMP_ENEMIES;
};

// [Cecil] Valid enemy multiplier
inline INDEX EnemyMul(void) {
  return ClampDn(GetSP()->sp_iEnemyMultiplier, (INDEX)1);
};

// [Cecil] Item type to item removal flag table
static const INDEX _aiWeaponItemFlags[13] = {
  IRF_KNIFE,
  IRF_COLT,
  IRF_SHOTGUN,
  IRF_DSHOTGUN,
  IRF_TOMMYGUN,
  IRF_MINIGUN,
  IRF_RLAUNCHER,
  IRF_GLAUNCHER,
  IRF_SNIPER,
  IRF_FLAMER,
  IRF_LASER,
  IRF_CHAINSAW,
  IRF_CANNON,
};

// [Cecil] Assert entity existence
#define ASSERT_ENTITY(_Entity) (_Entity != NULL && !(_Entity->GetFlags() & ENF_DELETED))

// [Cecil] Check if entity is alive
inline BOOL IsAlive(const CEntity *pen) {
  return (pen->GetFlags() & ENF_ALIVE);
};

// [Cecil] Model path
inline CTFileName GetModelPath(CModelObject *pmo) {
  if (pmo->GetData() == NULL) {
    return CTFILENAME("");
  }
  return pmo->GetData()->GetName();
};

// [Cecil] Texture path
inline CTFileName GetModelTexturePath(CModelObject *pmo) {
  if (pmo->mo_toTexture.GetData() == NULL) {
    return CTFILENAME("");
  }
  return pmo->mo_toTexture.GetData()->GetName();
};

// [Cecil] Christmas blood color
inline COLOR ChristmasColor(INDEX iRandom, UBYTE ubFactor, UBYTE ubAlpha) {
  COLOR colWhite = RGBAToColor(ubFactor, ubFactor, ubFactor, ubAlpha);

  switch (iRandom % 3) {
    case 0: return RGBAToColor(ubFactor, FLOAT(ubFactor) * 0.15f, FLOAT(ubFactor) * 0.15f, ubAlpha); // red
    case 1: return RGBAToColor(FLOAT(ubFactor) * 0.15f, ubFactor, FLOAT(ubFactor) * 0.15f, ubAlpha); // green
    case 2: return colWhite; // white
  }
  return colWhite;
};

// [Cecil] Get blood type
DECL_DLL INDEX GetBloodType(void);
