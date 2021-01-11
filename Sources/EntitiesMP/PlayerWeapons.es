402
%{
#include "StdH.h"
#include "GameMP/SEColors.h"
  
#include <Engine/Build.h>

#include "EntitiesMP/Player.h"
#include "EntitiesMP/Bullet.h"
#include "Models/Weapons/Knife/Knife.h"
#include "Models/Weapons/Knife/KnifeItem.h"
#include "Models/Weapons/Colt/Colt.h"
#include "Models/Weapons/Colt/ColtMain.h"
#include "Models/Weapons/SingleShotgun/SingleShotgun.h"
#include "Models/Weapons/SingleShotgun/Barrels.h"
#include "Models/Weapons/DoubleShotgun/DoubleShotgun.h"
#include "Models/Weapons/DoubleShotgun/Dshotgunbarrels.h"
#include "Models/Weapons/DoubleShotgun/HandWithAmmo.h"
#include "Models/Weapons/TommyGun/TommyGun.h"
#include "Models/Weapons/TommyGun/Body.h"
#include "Models/Weapons/MiniGun/MiniGun.h"
#include "Models/Weapons/MiniGun/Body.h"
#include "Models/Weapons/GrenadeLauncher/GrenadeLauncher.h"
#include "Models/Weapons/RocketLauncher/RocketLauncher.h"
#include "Models/Weapons/Laser/Laser.h"
#include "Models/Weapons/Laser/Barrel.h"
#include "Models/Weapons/Cannon/Cannon.h"
#include "Models/Weapons/Cannon/Body.h"
// Mission Pack weapons
#include "ModelsMP/Weapons/Sniper/Sniper.h"
#include "ModelsMP/Weapons/Sniper/Body.h"
#include "ModelsMP/Weapons/Flamer/Flamer.h"
#include "ModelsMP/Weapons/Flamer/Body.h"
#include "ModelsMP/Weapons/Flamer/FuelReservoir.h"
#include "ModelsMP/Weapons/Flamer/Flame.h"  
#include "ModelsMP/Weapons/Chainsaw/Chainsaw.h"
#include "ModelsMP/Weapons/Chainsaw/ChainSawForPlayer.h"
#include "ModelsMP/Weapons/Chainsaw/Body.h"
#include "ModelsMP/Weapons/Chainsaw/Blade.h"
#include "ModelsMP/Weapons/Chainsaw/Teeth.h"

// Mission Pack player body instead of the old one
#include "ModelsMP/Player/SeriousSam/Body.h"
#include "ModelsMP/Player/SeriousSam/Player.h"

#include "EntitiesMP/Switch.h"
#include "EntitiesMP/PlayerView.h"
#include "EntitiesMP/PlayerAnimator.h"
#include "EntitiesMP/MovingBrush.h"
#include "EntitiesMP/MessageHolder.h"
#include "EntitiesMP/EnemyBase.h"
extern INDEX hud_bShowWeapon;

// [Cecil] AMP 2 customization
static INDEX amp_bPowerUpParticles = TRUE;
static FLOAT amp_afWeaponPos[3] = {1.0f, 1.0f, 1.0f};
static FLOAT amp_afWeaponRot[3] = {1.0f, 1.0f, 1.0f};
static FLOAT amp_fWeaponFOV = 1.0f;

extern INDEX amp_bWeaponMirrored = FALSE;
static INDEX _bLastWeaponMirrored = FALSE;

// [Cecil] Reset weapon position
void ResetWeaponPosition(void) {
  for (INDEX i = 0; i < 3; i++) {
    amp_afWeaponPos[i] = 1.0f;
    amp_afWeaponRot[i] = 1.0f;
  }
  amp_fWeaponFOV = 1.0f;
};

// [Cecil] Tesla lightning
#include "EntitiesMP/TeslaLightning.h"
// [Cecil] Extra functions
#include "EntitiesMP/Common/ExtraFunc.h"

// [Cecil] Ammo types to default ammo set
static const _aiAmmoSetTypes[] = {
  -1, // invalid
   1, // AIT_SHELLS
   2, // AIT_BULLETS
   3, // AIT_ROCKETS
   4, // AIT_GRENADES
   7, // AIT_ELECTRICITY
  -1, // AIT_NUKEBALL (invalid)
   8, // AIT_IRONBALLS
  -1, // AIT_SERIOUSPACK (invalid)
  -1, // AIT_BACKPACK (invalid)
   5, // AIT_NAPALM
   6, // AIT_SNIPERBULLETS
};

// Current player weapon
#define CUR_WEAPON m_aWeapons[m_iCurrentWeapon]
%}

uses "EntitiesMP/Player";
uses "EntitiesMP/PlayerWeaponsEffects";
uses "EntitiesMP/Projectile";
uses "EntitiesMP/Bullet";
uses "EntitiesMP/BasicEffects";
uses "EntitiesMP/WeaponItem";
uses "EntitiesMP/AmmoItem";
uses "EntitiesMP/AmmoPack";
uses "EntitiesMP/ModelHolder2";
uses "EntitiesMP/GhostBusterRay";
uses "EntitiesMP/CannonBall";

// input parameter for weapons
event EWeaponsInit {
  CEntityPointer penOwner,        // who owns it
};

// select weapon
event ESelectWeapon {
  INDEX iWeapon,          // weapon to select
};

// boring weapon animations
event EBoringWeapon {};

// fire weapon
event EFireWeapon {};
// release weapon
event EReleaseWeapon {};
// reload weapon
event EReloadWeapon {};
// weapon changed - used to notify other entities
event EWeaponChanged {};

// [Cecil] Alt fire
event EAltFire {};

// weapons (do not change order! - needed by HUD.cpp)
enum WeaponType {
  0 WEAPON_NONE               "", // don't consider this in WEAPONS_ALLAVAILABLEMASK
  1 WEAPON_KNIFE              "",
  2 WEAPON_COLT               "",
  3 WEAPON_DOUBLECOLT         "",
  4 WEAPON_SINGLESHOTGUN      "",
  5 WEAPON_DOUBLESHOTGUN      "",
  6 WEAPON_TOMMYGUN           "",
  7 WEAPON_MINIGUN            "",
  8 WEAPON_ROCKETLAUNCHER     "",
  9 WEAPON_GRENADELAUNCHER    "",
 10 WEAPON_CHAINSAW           "",
 11 WEAPON_FLAMER             "",
 12 WEAPON_LASER              "",
 13 WEAPON_SNIPER             "",
 14 WEAPON_IRONCANNON         "",
 15 WEAPON_LAST               "",
}; // see 'WEAPONS_ALLAVAILABLEMASK' -> (11111111111111 == 0x3FFF)

%{
// AVAILABLE WEAPON MASK
#define WEAPONS_ALLAVAILABLEMASK 0x3FFF

// MiniGun specific
#define MINIGUN_STATIC      0
#define MINIGUN_FIRE        1
#define MINIGUN_SPINUP      2
#define MINIGUN_SPINDOWN    3

#define MINIGUN_SPINUPTIME      0.5f
#define MINIGUN_SPINDNTIME      3.0f
#define MINIGUN_SPINUPSOUND     0.5f
#define MINIGUN_SPINDNSOUND     1.5f
#define MINIGUN_FULLSPEED       500.0f
#define MINIGUN_SPINUPACC       (MINIGUN_FULLSPEED/MINIGUN_SPINUPTIME)
#define MINIGUN_SPINDNACC       (MINIGUN_FULLSPEED/MINIGUN_SPINDNTIME)
#define MINIGUN_TICKTIME        (_pTimer->TickQuantum)

// chainsaw specific
#define CHAINSAW_UPDATETIME     0.05f

// fire flare specific
#define FLARE_REMOVE 1
#define FLARE_ADD 2

// animation light specific
#define LIGHT_ANIM_MINIGUN 2
#define LIGHT_ANIM_TOMMYGUN 3
#define LIGHT_ANIM_COLT_SHOTGUN 4
#define LIGHT_ANIM_NONE 5


// mana for ammo adjustment (multiplier)
#define MANA_AMMO (0.1f)

static INDEX wpn_iCurrent;
extern FLOAT hud_tmWeaponsOnScreen;

// bullet positions
static FLOAT afSingleShotgunPellets[] =
{     -0.3f,+0.1f,    +0.0f,+0.1f,   +0.3f,+0.1f,
  -0.4f,-0.1f,  -0.1f,-0.1f,  +0.1f,-0.1f,  +0.4f,-0.1f
};
static FLOAT afDoubleShotgunPellets[] =
{
      -0.3f,+0.15f, +0.0f,+0.15f, +0.3f,+0.15f,
  -0.4f,+0.05f, -0.1f,+0.05f, +0.1f,+0.05f, +0.4f,+0.05f,
      -0.3f,-0.05f, +0.0f,-0.05f, +0.3f,-0.05f,
  -0.4f,-0.15f, -0.1f,-0.15f, +0.1f,-0.15f, +0.4f,-0.15f
};

// sniper discrete zoom values - 4 (1x,2x,4x,6x)
// synchronize this with sniper properties (properties 233-237)
static INDEX iSniperDiscreteZoomLevels = 4;
static FLOAT afSniperZoom[] =
{
      90.0f,1.0f, 53.1f, 2.0f, 28.0f,4.0f, 14.2f,6.0f, 
       //7.2f,8.0f, 3.56f,10.0f ,1.8f,12.0f
};

// crosshair console variables
static INDEX hud_bCrosshairFixed    = FALSE;
static INDEX hud_bCrosshairColoring = TRUE;
static FLOAT hud_fCrosshairScale    = 1.0f;
static FLOAT hud_fCrosshairOpacity  = 1.0f;
static FLOAT hud_fCrosshairRatio    = 0.5f;  // max distance size ratio
// misc HUD vars
static INDEX hud_bShowPlayerName = TRUE;
static INDEX hud_bShowCoords     = FALSE;
static FLOAT plr_tmSnoopingDelay = 1.0f; // seconds 
extern FLOAT plr_tmSnoopingTime  = 1.0f; // seconds 

// some static vars
static INDEX _iLastCrosshairType=-1;
static CTextureObject _toCrosshair;

// must do this to keep dependency catcher happy
CTFileName fn1 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair1.tex");
CTFileName fn2 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair2.tex");
CTFileName fn3 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair3.tex");
CTFileName fn4 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair4.tex");
CTFileName fn5 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair5.tex");
CTFileName fn6 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair6.tex");
CTFileName fn7 = CTFILENAME("Textures\\Interface\\Crosshairs\\Crosshair7.tex");

void CPlayerWeapons_Precache(ULONG ulAvailable)
{
  CDLLEntityClass *pdec = &CPlayerWeapons_DLLClass;

  // precache general stuff always
  pdec->PrecacheTexture(TEX_REFL_BWRIPLES01      );
  pdec->PrecacheTexture(TEX_REFL_BWRIPLES02      );
  pdec->PrecacheTexture(TEX_REFL_LIGHTMETAL01    );
  pdec->PrecacheTexture(TEX_REFL_LIGHTBLUEMETAL01);
  pdec->PrecacheTexture(TEX_REFL_DARKMETAL       );
  pdec->PrecacheTexture(TEX_REFL_PURPLE01        );
  pdec->PrecacheTexture(TEX_SPEC_WEAK            );
  pdec->PrecacheTexture(TEX_SPEC_MEDIUM          );
  pdec->PrecacheTexture(TEX_SPEC_STRONG          );
  pdec->PrecacheTexture(TEXTURE_HAND             );
  pdec->PrecacheTexture(TEXTURE_FLARE01          );
  pdec->PrecacheModel(MODEL_FLARE01);
  pdec->PrecacheClass(CLASS_BULLET);
  pdec->PrecacheSound(SOUND_SILENCE);

  // precache other weapons if available
  pdec->PrecacheModel(MODEL_KNIFE);
  pdec->PrecacheModel(MODEL_KNIFEITEM);
  pdec->PrecacheTexture(TEXTURE_KNIFEITEM);
  pdec->PrecacheSound(SOUND_KNIFE_BACK);
  pdec->PrecacheSound(SOUND_KNIFE_HIGH);
  pdec->PrecacheSound(SOUND_KNIFE_LONG);
  pdec->PrecacheSound(SOUND_KNIFE_LOW);

  pdec->PrecacheModel(MODEL_COLT);
  pdec->PrecacheModel(MODEL_COLTCOCK);
  pdec->PrecacheModel(MODEL_COLTMAIN);
  pdec->PrecacheModel(MODEL_COLTBULLETS);
  pdec->PrecacheTexture(TEXTURE_COLTMAIN);
  pdec->PrecacheTexture(TEXTURE_COLTCOCK);
  pdec->PrecacheTexture(TEXTURE_COLTBULLETS);
  pdec->PrecacheSound(SOUND_COLT_FIRE);
  pdec->PrecacheSound(SOUND_COLT_RELOAD);

  pdec->PrecacheModel(MODEL_SINGLESHOTGUN);
  pdec->PrecacheModel(MODEL_SS_SLIDER);
  pdec->PrecacheModel(MODEL_SS_HANDLE);
  pdec->PrecacheModel(MODEL_SS_BARRELS);
  pdec->PrecacheTexture(TEXTURE_SS_HANDLE);
  pdec->PrecacheTexture(TEXTURE_SS_BARRELS);
  pdec->PrecacheSound(SOUND_SINGLESHOTGUN_FIRE);

  pdec->PrecacheModel(MODEL_DOUBLESHOTGUN);
  pdec->PrecacheModel(MODEL_DS_HANDLE);
  pdec->PrecacheModel(MODEL_DS_BARRELS);
  pdec->PrecacheModel(MODEL_DS_AMMO);
  pdec->PrecacheModel(MODEL_DS_SWITCH);
  pdec->PrecacheModel(MODEL_DS_HANDWITHAMMO);
  pdec->PrecacheTexture(TEXTURE_DS_HANDLE);
  pdec->PrecacheTexture(TEXTURE_DS_BARRELS);
  pdec->PrecacheTexture(TEXTURE_DS_AMMO);
  pdec->PrecacheTexture(TEXTURE_DS_SWITCH);
  pdec->PrecacheSound(SOUND_DOUBLESHOTGUN_FIRE);
  pdec->PrecacheSound(SOUND_DOUBLESHOTGUN_RELOAD);

  pdec->PrecacheModel(MODEL_TOMMYGUN);
  pdec->PrecacheModel(MODEL_TG_BODY);
  pdec->PrecacheModel(MODEL_TG_SLIDER);
  pdec->PrecacheTexture(TEXTURE_TG_BODY);
  pdec->PrecacheSound(SOUND_TOMMYGUN_FIRE);

  pdec->PrecacheModel(MODEL_SNIPER);
  pdec->PrecacheModel(MODEL_SNIPER_BODY);
  pdec->PrecacheTexture(TEXTURE_SNIPER_BODY);
  pdec->PrecacheSound(SOUND_SNIPER_FIRE);

  pdec->PrecacheModel(MODEL_MINIGUN);
  pdec->PrecacheModel(MODEL_MG_BARRELS);
  pdec->PrecacheModel(MODEL_MG_BODY);
  pdec->PrecacheModel(MODEL_MG_ENGINE);
  pdec->PrecacheTexture(TEXTURE_MG_BODY);
  pdec->PrecacheTexture(TEXTURE_MG_BARRELS);
  pdec->PrecacheSound(SOUND_MINIGUN_FIRE);
  pdec->PrecacheSound(SOUND_MINIGUN_ROTATE);
  pdec->PrecacheSound(SOUND_MINIGUN_SPINUP);
  pdec->PrecacheSound(SOUND_MINIGUN_SPINDOWN);
  pdec->PrecacheSound(SOUND_MINIGUN_CLICK);

  pdec->PrecacheModel(MODEL_ROCKETLAUNCHER);
  pdec->PrecacheModel(MODEL_RL_BODY);
  pdec->PrecacheModel(MODEL_RL_ROTATINGPART);
  pdec->PrecacheModel(MODEL_RL_ROCKET);
  pdec->PrecacheTexture(TEXTURE_RL_BODY);
  pdec->PrecacheTexture(TEXTURE_RL_ROCKET);
  pdec->PrecacheSound(SOUND_ROCKETLAUNCHER_FIRE);
  pdec->PrecacheClass(CLASS_PROJECTILE, PRT_ROCKET);
  pdec->PrecacheClass(CLASS_PROJECTILE, PRT_CHAINSAW_ROCKET);

  pdec->PrecacheModel(MODEL_GRENADELAUNCHER);
  pdec->PrecacheModel(MODEL_GL_BODY);
  pdec->PrecacheModel(MODEL_GL_MOVINGPART);
  pdec->PrecacheModel(MODEL_GL_GRENADE);
  pdec->PrecacheTexture(TEXTURE_GL_BODY);
  pdec->PrecacheTexture(TEXTURE_GL_MOVINGPART);
  pdec->PrecacheSound(SOUND_GRENADELAUNCHER_FIRE);
  pdec->PrecacheClass(CLASS_PROJECTILE, PRT_GRENADE);

  pdec->PrecacheModel(MODEL_CHAINSAW);
  pdec->PrecacheModel(MODEL_CS_BODY);
  pdec->PrecacheModel(MODEL_CS_BLADE);
  pdec->PrecacheModel(MODEL_CS_TEETH);
  pdec->PrecacheTexture(TEXTURE_CS_BODY);
  pdec->PrecacheTexture(TEXTURE_CS_BLADE);
  pdec->PrecacheTexture(TEXTURE_CS_TEETH);
  pdec->PrecacheSound(SOUND_CS_FIRE);
  pdec->PrecacheSound(SOUND_CS_BEGINFIRE);
  pdec->PrecacheSound(SOUND_CS_ENDFIRE);
  pdec->PrecacheSound(SOUND_CS_BRINGUP);
  pdec->PrecacheSound(SOUND_CS_BRINGDOWN);
  pdec->PrecacheSound(SOUND_CS_IDLE);

  pdec->PrecacheModel(MODEL_FLAMER);
  pdec->PrecacheModel(MODEL_FL_BODY);
  pdec->PrecacheModel(MODEL_FL_RESERVOIR);
  pdec->PrecacheModel(MODEL_FL_FLAME);
  pdec->PrecacheTexture(TEXTURE_FL_BODY);
  pdec->PrecacheTexture(TEXTURE_FL_FLAME);
  pdec->PrecacheTexture(TEXTURE_FL_FUELRESERVOIR);
  pdec->PrecacheSound(SOUND_FL_FIRE);
  pdec->PrecacheSound(SOUND_FL_START);
  pdec->PrecacheSound(SOUND_FL_STOP);
  pdec->PrecacheClass(CLASS_PROJECTILE, PRT_FLAME);

  // [Cecil] Tesla gun
  pdec->PrecacheSound(SOUND_TESLA_FIRE);
  pdec->PrecacheSound(SOUND_TESLA_START1);
  pdec->PrecacheSound(SOUND_TESLA_START2);
  pdec->PrecacheSound(SOUND_TESLA_START3);
  // [Cecil] Death ray
  pdec->PrecacheSound(SOUND_DEATHRAY);
  pdec->PrecacheClass(CLASS_GHOSTBUSTERRAY);
  // [Cecil] Chainsaw Launcher
  pdec->PrecacheSound(SOUND_LAUNCHERMODE);
  // [Cecil] Accurate sniper
  pdec->PrecacheSound(SOUND_ACCURATE_SNIPER);
  // [Cecil] Tommygun burst
  pdec->PrecacheSound(SOUND_TOMMYGUN_BURST);

  pdec->PrecacheModel(MODEL_LASER);
  pdec->PrecacheModel(MODEL_LS_BODY);
  pdec->PrecacheModel(MODEL_LS_BARREL);
  pdec->PrecacheTexture(TEXTURE_LS_BODY);
  pdec->PrecacheTexture(TEXTURE_LS_BARREL);
  pdec->PrecacheSound(SOUND_LASER_FIRE);
  pdec->PrecacheClass(CLASS_PROJECTILE, PRT_LASER_RAY);

  pdec->PrecacheModel(MODEL_CANNON);
  pdec->PrecacheModel(MODEL_CN_BODY);
  pdec->PrecacheTexture(TEXTURE_CANNON);
  pdec->PrecacheSound(SOUND_CANNON);
  pdec->PrecacheSound(SOUND_CANNON_PREPARE);
  pdec->PrecacheClass(CLASS_CANNONBALL);

  // precache animator too
  extern void CPlayerAnimator_Precache(ULONG ulAvailable);
  CPlayerAnimator_Precache(ulAvailable);
}

void CPlayerWeapons_Init(void) {
  // declare weapon position controls
  _pShell->DeclareSymbol("user INDEX wpn_iCurrent;", &wpn_iCurrent);
  
  // declare crosshair and its coordinates
  _pShell->DeclareSymbol("persistent user INDEX hud_bCrosshairFixed;",    &hud_bCrosshairFixed);
  _pShell->DeclareSymbol("persistent user INDEX hud_bCrosshairColoring;", &hud_bCrosshairColoring);
  _pShell->DeclareSymbol("persistent user FLOAT hud_fCrosshairScale;",    &hud_fCrosshairScale);
  _pShell->DeclareSymbol("persistent user FLOAT hud_fCrosshairRatio;",    &hud_fCrosshairRatio);
  _pShell->DeclareSymbol("persistent user FLOAT hud_fCrosshairOpacity;",  &hud_fCrosshairOpacity);
                                  
  _pShell->DeclareSymbol("persistent user INDEX hud_bShowPlayerName;", &hud_bShowPlayerName);
  _pShell->DeclareSymbol("persistent user INDEX hud_bShowCoords;",     &hud_bShowCoords);

  _pShell->DeclareSymbol("persistent user FLOAT plr_tmSnoopingTime;",  &plr_tmSnoopingTime);
  _pShell->DeclareSymbol("persistent user FLOAT plr_tmSnoopingDelay;", &plr_tmSnoopingDelay);

  // [Cecil] AMP 2 Customization
  _pShell->DeclareSymbol("persistent user INDEX amp_bPowerUpParticles;", &amp_bPowerUpParticles);
  _pShell->DeclareSymbol("persistent user FLOAT amp_afWeaponPos[3];", &amp_afWeaponPos);
  _pShell->DeclareSymbol("persistent user FLOAT amp_afWeaponRot[3];", &amp_afWeaponRot);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fWeaponFOV;", &amp_fWeaponFOV);
  _pShell->DeclareSymbol("user void ResetWeaponPosition(void);", &ResetWeaponPosition);

  _pShell->DeclareSymbol("persistent user INDEX amp_bWeaponMirrored;", &amp_bWeaponMirrored);

  // precache base weapons
  CPlayerWeapons_Precache(0x03);
}

// [Cecil] FLOAT[3] -> FLOAT3D
// extra weapon positions for shells dropout
static FLOAT3D _vSingleShotgunShellPos  = FLOAT3D(0.2f, 0.0f, -0.31f);
static FLOAT3D _vDoubleShotgunShellPos  = FLOAT3D(0.0f, 0.0f, -0.5f);
static FLOAT3D _vTommygunShellPos       = FLOAT3D(0.2f, 0.0f, -0.31f);
static FLOAT3D _vMinigunShellPos        = FLOAT3D(0.2f, 0.0f, -0.31f);
static FLOAT3D _vMinigunShellPos3rdView = FLOAT3D(0.2f, 0.2f, -0.31f);
static FLOAT3D _vSniperShellPos         = FLOAT3D(0.2f, 0.0f, -0.15f);

static FLOAT3D _vRightColtPipe      = FLOAT3D(0.07f, -0.05f, -0.26f);
static FLOAT3D _vSingleShotgunPipe  = FLOAT3D(0.2f, 0.0f, -1.25f);
static FLOAT3D _vDoubleShotgunPipe  = FLOAT3D(0.2f, 0.0f, -1.25f);
static FLOAT3D _vTommygunPipe       = FLOAT3D(-0.06f, 0.1f, -0.6f);
static FLOAT3D _vMinigunPipe        = FLOAT3D(-0.06f, 0.0f, -0.6f);
static FLOAT3D _vMinigunPipe3rdView = FLOAT3D(0.25f, 0.3f, -2.5f);

#define TM_START m_aMiniGun
#define F_OFFSET_CHG m_aMiniGunLast
#define F_TEMP m_aMiniGunSpeed
%}

class export CPlayerWeapons : CRationalEntity {
name      "Player Weapons";
thumbnail "";
features  "CanBePredictable";

properties:
  1 CEntityPointer m_penPlayer,       // player which owns it
  2 BOOL m_bFireWeapon = FALSE,       // weapon is firing
  3 BOOL m_bHasAmmo    = FALSE,       // weapon has ammo
 // [Cecil] Knife -> None
  4 enum WeaponType m_iCurrentWeapon  = WEAPON_NONE,    // currently active weapon (internal)
  5 enum WeaponType m_iWantedWeapon   = WEAPON_NONE,     // wanted weapon (internal)
  6 enum WeaponType m_iPreviousWeapon = WEAPON_NONE,   // previous active weapon (internal)
 // [Cecil] 0x01 -> 0x00
 11 INDEX m_iAvailableWeapons = 0x00,   // avaible weapons
 12 BOOL  m_bChangeWeapon = FALSE,      // change current weapon
 13 BOOL  m_bReloadWeapon = FALSE,      // reload weapon
 14 BOOL  m_bMirrorFire   = FALSE,      // fire with mirror model
 15 INDEX m_iAnim         = 0,          // temporary anim variable
 16 FLOAT m_fAnimWaitTime = 0.0f,       // animation wait time
 17 FLOAT m_tmRangeSoundSpawned = 0.0f, // for not spawning range sounds too often
 23 BOOL  m_bSniperZoom = FALSE,        // zoom sniper
 24 FLOAT m_fSniperFOV      = 90.0f,    // sniper FOV
 28 FLOAT m_fSniperFOVlast  = 90.0f,    // sniper FOV for lerping

 18 CTString m_strLastTarget   = "",      // string for last target
 19 FLOAT m_tmTargetingStarted = -99.0f,  // when targeting started
 20 FLOAT m_tmLastTarget       = -99.0f,  // when last target was seen
 21 FLOAT m_tmSnoopingStarted  = -99.0f,  // is player spying another player
 22 CEntityPointer m_penTargeting,        // who is the target
 
 25 CModelObject m_moWeapon,               // current weapon model
 26 CModelObject m_moWeaponSecond,         // current weapon second (additional) model
 27 FLOAT m_tmWeaponChangeRequired = 0.0f, // time when weapon change was required

 30 CEntityPointer m_penRayHit,         // entity hit by ray
 31 FLOAT m_fRayHitDistance = 100.0f,   // distance from hit point
 32 FLOAT m_fEnemyHealth    = 0.0f,     // normalized health of enemy in target (for coloring of crosshair)
 33 FLOAT3D m_vRayHit     = FLOAT3D(0.0f, 0.0f, 0.0f), // coordinates where ray hit
 34 FLOAT3D m_vRayHitLast = FLOAT3D(0.0f, 0.0f, 0.0f), // for lerping
 35 FLOAT3D m_vBulletSource = FLOAT3D(0.0f, 0.0f, 0.0f), // bullet launch position remembered here
 36 FLOAT3D m_vBulletTarget = FLOAT3D(0.0f, 0.0f, 0.0f), // bullet hit (if hit) position remembered here

// weapons specific
// minigun
220 FLOAT m_aMiniGun = 0.0f,
221 FLOAT m_aMiniGunLast = 0.0f,
222 FLOAT m_aMiniGunSpeed = 0.0f,

// lerped bullets fire
230 FLOAT3D m_iLastBulletPosition = FLOAT3D(32000.0f, 32000.0f, 32000.0f),
231 INDEX m_iBulletsOnFireStart = 0,

// sniper
233 FLOAT m_fSniperMaxFOV = 90.0f,
234 FLOAT m_fSniperMinFOV = 14.2f,
235 FLOAT m_fSnipingZoomSpeed = 2.0f,
236 BOOL  m_bSniping = FALSE,
237 FLOAT m_fMinimumZoomFOV  = 53.1f,
238 FLOAT m_tmLastSniperFire = 0.0f,

// pipebomb
//235 CEntityPointer m_penPipebomb,
//236 INDEX m_bPipeBombDropped = FALSE,

// flamer
240 CEntityPointer m_penFlame,

// laser
245 INDEX m_iLaserBarrel = 0,

// ghostbuster
250 CEntityPointer m_penGhostBusterRay,

// fire flare
251 INDEX m_iFlare = FLARE_REMOVE,       // 0-none, 1-remove, 2-add
252 INDEX m_iSecondFlare = FLARE_REMOVE, // 0-none, 1-remove, 2-add

// cannon
260 FLOAT m_fWeaponDrawPowerOld = 0,
261 FLOAT m_fWeaponDrawPower = 0,
262 FLOAT m_tmDrawStartTime = 0.0f,

270 FLOAT m_tmFlamerStart=1e6,
271 FLOAT m_tmFlamerStop=1e9,
272 FLOAT m_tmLastChainsawSpray = 0.0f,

// [Cecil] Advanced Multiplayer
300 BOOL m_bAltFire = FALSE, // using alt fire
301 BOOL m_bChainLauncher = FALSE, // chainsaw launcher mode
302 INDEX m_iAmmoLeft = 1, // how much ammo is left

310 CEntityPointer m_penTesla,

{
  CEntity *penBullet;
  CPlacement3D plBullet;
  FLOAT3D vBulletDestination;

  // [Cecil] Player's personal arsenal
  CWeaponArsenal m_aWeapons;
  CAmmunition m_aAmmo;
}

components:
  1 class   CLASS_PROJECTILE        "Classes\\Projectile.ecl",
  2 class   CLASS_BULLET            "Classes\\Bullet.ecl",
  3 class   CLASS_WEAPONEFFECT      "Classes\\PlayerWeaponsEffects.ecl",
  4 class   CLASS_PIPEBOMB          "Classes\\Pipebomb.ecl",
  5 class   CLASS_GHOSTBUSTERRAY    "Classes\\GhostBusterRay.ecl",
  6 class   CLASS_CANNONBALL        "Classes\\CannonBall.ecl",
  7 class   CLASS_WEAPONITEM        "Classes\\WeaponItem.ecl",
  8 class   CLASS_BASIC_EFFECT      "Classes\\BasicEffect.ecl",

// [Cecil] Tesla gun lightning
  9 class CLASS_TESLA "Classes\\TeslaLightning.ecl",

// ************** HAND **************
 10 texture TEXTURE_HAND                "Models\\Weapons\\Hand.tex",

// ************** KNIFE **************
 20 model   MODEL_KNIFEITEM             "Models\\Weapons\\Knife\\KnifeItem.mdl",
 21 texture TEXTURE_KNIFEITEM           "Models\\Weapons\\Knife\\KnifeItem.tex",
 22 model   MODEL_KNIFE                 "Models\\Weapons\\Knife\\Knife.mdl",
 23 sound   SOUND_KNIFE_BACK            "Models\\Weapons\\Knife\\Sounds\\Back.wav",
 24 sound   SOUND_KNIFE_HIGH            "Models\\Weapons\\Knife\\Sounds\\High.wav",
 25 sound   SOUND_KNIFE_LONG            "Models\\Weapons\\Knife\\Sounds\\Long.wav",
 26 sound   SOUND_KNIFE_LOW             "Models\\Weapons\\Knife\\Sounds\\Low.wav",
 
// ************** COLT **************
 30 model   MODEL_COLT                  "Models\\Weapons\\Colt\\Colt.mdl",
 31 model   MODEL_COLTCOCK              "Models\\Weapons\\Colt\\ColtCock.mdl",
 32 model   MODEL_COLTMAIN              "Models\\Weapons\\Colt\\ColtMain.mdl",
 33 model   MODEL_COLTBULLETS           "Models\\Weapons\\Colt\\ColtBullets.mdl",
 34 texture TEXTURE_COLTMAIN            "Models\\Weapons\\Colt\\ColtMain.tex",
 35 texture TEXTURE_COLTCOCK            "Models\\Weapons\\Colt\\ColtCock.tex",
 36 texture TEXTURE_COLTBULLETS         "Models\\Weapons\\Colt\\ColtBullets.tex",
 37 sound   SOUND_COLT_FIRE             "Models\\Weapons\\Colt\\Sounds\\Fire.wav",
 38 sound   SOUND_COLT_RELOAD           "Models\\Weapons\\Colt\\Sounds\\Reload.wav",

// ************** SINGLE SHOTGUN ************
 40 model   MODEL_SINGLESHOTGUN         "Models\\Weapons\\SingleShotgun\\SingleShotgun.mdl",
 41 model   MODEL_SS_SLIDER             "Models\\Weapons\\SingleShotgun\\Slider.mdl",
 42 model   MODEL_SS_HANDLE             "Models\\Weapons\\SingleShotgun\\Handle.mdl",
 43 model   MODEL_SS_BARRELS            "Models\\Weapons\\SingleShotgun\\Barrels.mdl",
 44 texture TEXTURE_SS_HANDLE           "Models\\Weapons\\SingleShotgun\\Handle.tex",
 45 texture TEXTURE_SS_BARRELS          "Models\\Weapons\\SingleShotgun\\Barrels.tex",
 46 sound   SOUND_SINGLESHOTGUN_FIRE    "Models\\Weapons\\SingleShotgun\\Sounds\\_Fire.wav",

// ************** DOUBLE SHOTGUN **************
 50 model   MODEL_DOUBLESHOTGUN         "Models\\Weapons\\DoubleShotgun\\DoubleShotgun.mdl",
 51 model   MODEL_DS_HANDLE             "Models\\Weapons\\DoubleShotgun\\Dshotgunhandle.mdl",
 52 model   MODEL_DS_BARRELS            "Models\\Weapons\\DoubleShotgun\\Dshotgunbarrels.mdl",
 53 model   MODEL_DS_AMMO               "Models\\Weapons\\DoubleShotgun\\Ammo.mdl",
 54 model   MODEL_DS_SWITCH             "Models\\Weapons\\DoubleShotgun\\Switch.mdl",
 55 model   MODEL_DS_HANDWITHAMMO       "Models\\Weapons\\DoubleShotgun\\HandWithAmmo.mdl",
 56 texture TEXTURE_DS_HANDLE           "Models\\Weapons\\DoubleShotgun\\Handle.tex",
 57 texture TEXTURE_DS_BARRELS          "Models\\Weapons\\DoubleShotgun\\Barrels.tex",
 58 texture TEXTURE_DS_AMMO             "Models\\Weapons\\DoubleShotgun\\Ammo.tex",
 59 texture TEXTURE_DS_SWITCH           "Models\\Weapons\\DoubleShotgun\\Switch.tex",
 60 sound   SOUND_DOUBLESHOTGUN_FIRE    "Models\\Weapons\\DoubleShotgun\\Sounds\\Fire.wav",
 61 sound   SOUND_DOUBLESHOTGUN_RELOAD  "Models\\Weapons\\DoubleShotgun\\Sounds\\Reload.wav",

// ************** TOMMYGUN **************
 70 model   MODEL_TOMMYGUN              "Models\\Weapons\\TommyGun\\TommyGun.mdl",
 71 model   MODEL_TG_BODY               "Models\\Weapons\\TommyGun\\Body.mdl",
 72 model   MODEL_TG_SLIDER             "Models\\Weapons\\TommyGun\\Slider.mdl",
 73 texture TEXTURE_TG_BODY             "Models\\Weapons\\TommyGun\\Body.tex",
 74 sound   SOUND_TOMMYGUN_FIRE         "Models\\Weapons\\TommyGun\\Sounds\\_Fire.wav",

// ************** MINIGUN **************
 80 model   MODEL_MINIGUN               "Models\\Weapons\\MiniGun\\MiniGun.mdl",
 81 model   MODEL_MG_BARRELS            "Models\\Weapons\\MiniGun\\Barrels.mdl",
 82 model   MODEL_MG_BODY               "Models\\Weapons\\MiniGun\\Body.mdl",
 83 model   MODEL_MG_ENGINE             "Models\\Weapons\\MiniGun\\Engine.mdl",
 84 texture TEXTURE_MG_BODY             "Models\\Weapons\\MiniGun\\Body.tex",
 99 texture TEXTURE_MG_BARRELS          "Models\\Weapons\\MiniGun\\Barrels.tex",
 85 sound   SOUND_MINIGUN_FIRE          "Models\\Weapons\\MiniGun\\Sounds\\Fire.wav",
 86 sound   SOUND_MINIGUN_ROTATE        "Models\\Weapons\\MiniGun\\Sounds\\Rotate.wav",
 87 sound   SOUND_MINIGUN_SPINUP        "Models\\Weapons\\MiniGun\\Sounds\\RotateUp.wav",
 88 sound   SOUND_MINIGUN_SPINDOWN      "Models\\Weapons\\MiniGun\\Sounds\\RotateDown.wav",
 89 sound   SOUND_MINIGUN_CLICK         "Models\\Weapons\\MiniGun\\Sounds\\Click.wav",

// ************** ROCKET LAUNCHER **************
 90 model   MODEL_ROCKETLAUNCHER        "Models\\Weapons\\RocketLauncher\\RocketLauncher.mdl",
 91 model   MODEL_RL_BODY               "Models\\Weapons\\RocketLauncher\\Body.mdl",
 92 texture TEXTURE_RL_BODY             "Models\\Weapons\\RocketLauncher\\Body.tex",
 93 model   MODEL_RL_ROTATINGPART       "Models\\Weapons\\RocketLauncher\\RotatingPart.mdl",
 94 texture TEXTURE_RL_ROTATINGPART     "Models\\Weapons\\RocketLauncher\\RotatingPart.tex",
 95 model   MODEL_RL_ROCKET             "Models\\Weapons\\RocketLauncher\\Projectile\\Rocket.mdl",
 96 texture TEXTURE_RL_ROCKET           "Models\\Weapons\\RocketLauncher\\Projectile\\Rocket.tex",
 97 sound   SOUND_ROCKETLAUNCHER_FIRE   "Models\\Weapons\\RocketLauncher\\Sounds\\_Fire.wav",

// ************** GRENADE LAUNCHER **************
100 model   MODEL_GRENADELAUNCHER       "Models\\Weapons\\GrenadeLauncher\\GrenadeLauncher.mdl",
101 model   MODEL_GL_BODY               "Models\\Weapons\\GrenadeLauncher\\Body.mdl",
102 model   MODEL_GL_MOVINGPART         "Models\\Weapons\\GrenadeLauncher\\MovingPipe.mdl",
103 model   MODEL_GL_GRENADE            "Models\\Weapons\\GrenadeLauncher\\GrenadeBack.mdl",
104 texture TEXTURE_GL_BODY             "Models\\Weapons\\GrenadeLauncher\\Body.tex",
105 texture TEXTURE_GL_MOVINGPART       "Models\\Weapons\\GrenadeLauncher\\MovingPipe.tex",
106 sound   SOUND_GRENADELAUNCHER_FIRE  "Models\\Weapons\\GrenadeLauncher\\Sounds\\_Fire.wav",

// ************** SNIPER **************
110 model   MODEL_SNIPER                "ModelsMP\\Weapons\\Sniper\\Sniper.mdl",
111 model   MODEL_SNIPER_BODY           "ModelsMP\\Weapons\\Sniper\\Body.mdl",
112 texture TEXTURE_SNIPER_BODY         "ModelsMP\\Weapons\\Sniper\\Body.tex",
113 sound   SOUND_SNIPER_FIRE           "ModelsMP\\Weapons\\Sniper\\Sounds\\Fire.wav",

// ************** FLAMER **************
130 model   MODEL_FLAMER                "ModelsMP\\Weapons\\Flamer\\Flamer.mdl",
131 model   MODEL_FL_BODY               "ModelsMP\\Weapons\\Flamer\\Body.mdl",
132 model   MODEL_FL_RESERVOIR          "ModelsMP\\Weapons\\Flamer\\FuelReservoir.mdl",
133 model   MODEL_FL_FLAME              "ModelsMP\\Weapons\\Flamer\\Flame.mdl",
134 texture TEXTURE_FL_BODY             "ModelsMP\\Weapons\\Flamer\\Body.tex",
135 texture TEXTURE_FL_FLAME            "ModelsMP\\Effects\\Flame\\Flame.tex",
136 sound   SOUND_FL_FIRE               "ModelsMP\\Weapons\\Flamer\\Sounds\\Fire.wav",
137 sound   SOUND_FL_START              "ModelsMP\\Weapons\\Flamer\\Sounds\\Start.wav",
138 sound   SOUND_FL_STOP               "ModelsMP\\Weapons\\Flamer\\Sounds\\Stop.wav",
139 texture TEXTURE_FL_FUELRESERVOIR    "ModelsMP\\Weapons\\Flamer\\FuelReservoir.tex",

// ************** LASER **************
140 model   MODEL_LASER                 "Models\\Weapons\\Laser\\Laser.mdl",
141 model   MODEL_LS_BODY               "Models\\Weapons\\Laser\\Body.mdl",
142 model   MODEL_LS_BARREL             "Models\\Weapons\\Laser\\Barrel.mdl",
144 texture TEXTURE_LS_BODY             "Models\\Weapons\\Laser\\Body.tex",
145 texture TEXTURE_LS_BARREL           "Models\\Weapons\\Laser\\Barrel.tex",
146 sound   SOUND_LASER_FIRE            "Models\\Weapons\\Laser\\Sounds\\_Fire.wav",

// ************** CHAINSAW **************
150 model   MODEL_CHAINSAW              "ModelsMP\\Weapons\\Chainsaw\\Chainsaw.mdl",
151 model   MODEL_CS_BODY               "ModelsMP\\Weapons\\Chainsaw\\Body.mdl",
152 model   MODEL_CS_BLADE              "ModelsMP\\Weapons\\Chainsaw\\Blade.mdl",
160 model   MODEL_CS_TEETH              "ModelsMP\\Weapons\\Chainsaw\\Teeth.mdl",
153 texture TEXTURE_CS_BODY             "ModelsMP\\Weapons\\Chainsaw\\Body.tex",
154 texture TEXTURE_CS_BLADE            "ModelsMP\\Weapons\\Chainsaw\\Blade.tex",
161 texture TEXTURE_CS_TEETH            "ModelsMP\\Weapons\\Chainsaw\\Teeth.tex",
155 sound   SOUND_CS_FIRE               "ModelsMP\\Weapons\\Chainsaw\\Sounds\\Fire.wav",
156 sound   SOUND_CS_BEGINFIRE          "ModelsMP\\Weapons\\Chainsaw\\Sounds\\BeginFire.wav",
157 sound   SOUND_CS_ENDFIRE            "ModelsMP\\Weapons\\Chainsaw\\Sounds\\EndFire.wav",
158 sound   SOUND_CS_BRINGUP            "ModelsMP\\Weapons\\Chainsaw\\Sounds\\BringUp.wav",
159 sound   SOUND_CS_IDLE               "ModelsMP\\Weapons\\Chainsaw\\Sounds\\Idle.wav",
162 sound   SOUND_CS_BRINGDOWN          "ModelsMP\\Weapons\\Chainsaw\\Sounds\\BringDown.wav",

// ************** CANNON **************
170 model   MODEL_CANNON                "Models\\Weapons\\Cannon\\Cannon.mdl",
171 model   MODEL_CN_BODY               "Models\\Weapons\\Cannon\\Body.mdl",
173 texture TEXTURE_CANNON              "Models\\Weapons\\Cannon\\Body.tex",
174 sound   SOUND_CANNON                "Models\\Weapons\\Cannon\\Sounds\\Fire.wav",
175 sound   SOUND_CANNON_PREPARE        "Models\\Weapons\\Cannon\\Sounds\\Prepare.wav",

// ************** REFLECTIONS **************
200 texture TEX_REFL_BWRIPLES01         "Models\\ReflectionTextures\\BWRiples01.tex",
201 texture TEX_REFL_BWRIPLES02         "Models\\ReflectionTextures\\BWRiples02.tex",
202 texture TEX_REFL_LIGHTMETAL01       "Models\\ReflectionTextures\\LightMetal01.tex",
203 texture TEX_REFL_LIGHTBLUEMETAL01   "Models\\ReflectionTextures\\LightBlueMetal01.tex",
204 texture TEX_REFL_DARKMETAL          "Models\\ReflectionTextures\\DarkMetal.tex",
205 texture TEX_REFL_PURPLE01           "Models\\ReflectionTextures\\Purple01.tex",

// ************** SPECULAR **************
210 texture TEX_SPEC_WEAK               "Models\\SpecularTextures\\Weak.tex",
211 texture TEX_SPEC_MEDIUM             "Models\\SpecularTextures\\Medium.tex",
212 texture TEX_SPEC_STRONG             "Models\\SpecularTextures\\Strong.tex",

// ************** FLARES **************
250 model   MODEL_FLARE01               "Models\\Effects\\Weapons\\Flare01\\Flare.mdl",
251 texture TEXTURE_FLARE01             "Models\\Effects\\Weapons\\Flare01\\Flare.tex",

280 sound   SOUND_SILENCE               "Sounds\\Misc\\Silence.wav",

// [Cecil] Tesla gun sounds
300 sound SOUND_TESLA_FIRE   "Sounds\\Weapons\\TeslaFire.wav",
301 sound SOUND_TESLA_START1 "Sounds\\Weapons\\TeslaGun1.wav",
302 sound SOUND_TESLA_START2 "Sounds\\Weapons\\TeslaGun2.wav",
303 sound SOUND_TESLA_START3 "Sounds\\Weapons\\TeslaGun3.wav",

// [Cecil] Death ray sound
310 sound SOUND_DEATHRAY "SoundsMP\\Environment\\Laser.wav",

// [Cecil] Chainsaw Launcher switch sound
315 sound SOUND_LAUNCHERMODE "SoundsMP\\Items\\SeriousBomb.wav",

// [Cecil] Accurate sniper sound
320 sound SOUND_ACCURATE_SNIPER "Sounds\\Weapons\\SniperXbox.wav",

// [Cecil] Tommygun burst sound
325 sound SOUND_TOMMYGUN_BURST "Sounds\\Weapons\\TommygunBurst.wav",

functions:
  // [Cecil] Destroy ghostbuster ray
  void DestroyRay(void) {
    if (m_penGhostBusterRay!=NULL) {
      ((CGhostBusterRay*)&*m_penGhostBusterRay)->DestroyGhostBusterRay();
      m_penGhostBusterRay = NULL;
    }
  };

  // [Cecil] Create tesla gun lightning
  void TeslaGunLightning(CEntity *penOwner, FLOAT3D vSource, FLOAT3D vDest, FLOAT fPower) {
    CEntity *penTesla = CreateEntity(CPlacement3D(vSource, ANGLE3D(0.0f, 0.0f, 0.0f)), CLASS_TESLA);
    
    if (penOwner == this) {
      m_penTesla = penTesla;
    }

    ETeslaLightning eTesla;
    eTesla.penOwner = penOwner;
    eTesla.vTarget = vDest;
    eTesla.fPower = fPower;

    penTesla->Initialize(eTesla);
  };

  // [Cecil] Tesla gun burst
  void TeslaBurst(CEntity *penHit, FLOAT3D vTarget, FLOAT fDamage) {
    // counter
    INDEX iEnemy = 0;

    // go through entities
    FOREACHINDYNAMICCONTAINER(GetWorld()->wo_cenEntities, CEntity, iten) {
      CEntity *pen = iten;

      // pick only alive enemies
      if (pen == NULL || pen->GetFlags() & ENF_DELETED || !IsAlive(pen) || !IsDerivedFromClass(pen, "Enemy Base")) {
        continue;
      }

      // within range
      if ((pen->GetPlacement().pl_PositionVector - vTarget).Length() > 20.0f) {
        continue;
      }

      // ignore templates
      if (((CEnemyBase*)pen)->m_bTemplate) {
        continue;
      }

      FLOAT3D vPos = pen->GetPlacement().pl_PositionVector;

      if (pen != penHit) {
        // target enemy body
        FLOAT3D vShootTarget = FLOAT3D(0.0f, 1.0f, 0.0f) * pen->GetRotationMatrix();
        EntityInfo *peiTarget = (EntityInfo*)pen->GetEntityInfo();

        if (peiTarget != NULL) {
          GetEntityInfoPosition(pen, peiTarget->vTargetCenter, vShootTarget);
        }

        TeslaGunLightning(NULL, vTarget, vShootTarget, 0.3f);
      }

      INDEX iFlames = 4;
      while (--iFlames > 0) {
        SpawnFlame(GetPlayer(), pen, vPos);
      }

      InflictDirectDamage(pen, GetPlayer(), DMT_BURNING, (fDamage > 0.0f ? fDamage : 10.0f), vPos, FLOAT3D(0.0f, 1.0f, 0.0f));

      iEnemy++;

      // enough enemies damaged
      if (iEnemy >= 50) {
        break;
      }
    }
  };

  // [Cecil] Check the alt fire
  BOOL AltFireExists(const INDEX &iWeapon) {
    // no alt fire
    if (GetSP()->AltMode() == 0) {
      return FALSE;
    }

    switch (iWeapon) {
      // doesn't have alt fire
      case WEAPON_KNIFE: case WEAPON_CHAINSAW:
      case WEAPON_COLT: case WEAPON_DOUBLECOLT:
        return FALSE;
    }

    // check for the flag
    INDEX iFlag = 1 << (iWeapon-1);
    return (GetSP()->sp_iAltFire & iFlag);
  };

  // [Cecil] Stretch rocket model
  void StretchRocket(FLOAT3D vSize) {
    CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(ROCKETLAUNCHER_ATTACHMENT_ROCKET1)->amo_moModelObject);
    FLOAT fScale = (m_bChainLauncher ? 0.5f : 1.0f);

    if (pmo != NULL) {
      pmo->StretchModel(vSize * fScale);
    }
  };

  // [Cecil] Stretch all rocket models
  void StretchAllRockets(FLOAT3D vSize) {
    for (INDEX i = 0; i < 3; i++) {
      CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(ROCKETLAUNCHER_ATTACHMENT_ROCKET1 + i)->amo_moModelObject);
      FLOAT fScale = (m_bChainLauncher ? 0.5f : 1.0f);

      if (pmo != NULL) {
        pmo->StretchModel(vSize * fScale);
      }
    }
  };

  // [Cecil] Rotate all rocket models
  void RotateAllRockets(FLOAT fAngle) {
    for (INDEX i = 0; i < 3; i++) {
      CAttachmentModelObject *pamo = m_moWeapon.GetAttachmentModel(ROCKETLAUNCHER_ATTACHMENT_ROCKET1 + i);

      if (pamo != NULL) {
        pamo->amo_plRelative.pl_OrientationAngle(3) += fAngle;
        pamo->amo_plRelative.pl_PositionVector(3) += 0.1f;
      }
    }
  };

  // [Cecil] Constructor
  void CPlayerWeapons(void) {
    // copy ammo
    INDEX ctAmmo = _aWeaponAmmo.Count();
    m_aAmmo.New(ctAmmo);

    for (INDEX iAmmo = 0; iAmmo < ctAmmo; iAmmo++) {
      m_aAmmo[iAmmo].pAmmoStruct = &_aWeaponAmmo[iAmmo];
    }

    // copy weapons
    INDEX ctWeapons = _aPlayerWeapons.Count();
    m_aWeapons.New(ctWeapons);

    for (INDEX iWeapon = 0; iWeapon < ctWeapons; iWeapon++) {
      SPlayerWeapon &pw = m_aWeapons[iWeapon];
      pw.pWeaponStruct = &_aPlayerWeapons[iWeapon];

      // set ammo
      ULONG *pulID = pw.GetAmmoID();

      if (pulID != NULL) {
        pw.pAmmo = &m_aAmmo[*pulID];
      }
      
      // set alt ammo
      pulID = pw.GetAltID();

      if (pulID != NULL) {
        pw.pAlt = &m_aAmmo[*pulID];
      }
    }

    // [Cecil] TEMP: See copied weapons
    /*CTString str = "";
    for (iWeapon = 0; iWeapon < ctWeapons; iWeapon++) {
      SPlayerWeapon &pw = m_aWeapons[iWeapon];

      str.PrintF("%s%d: ammo: %d, alt %d\n", str, pw.pWeapon->ulID, (pw.GetAmmoID() != NULL ? *pw.GetAmmoID() : -1), (pw.GetAltID() != NULL ? *pw.GetAltID() : -1));
    }
    FatalError(str);*/
  };

  // [Cecil] Write weapons and ammo
  void Write_t(CTStream *ostr) {
    CRationalEntity::Write_t(ostr);

    INDEX ctWeapons = m_aWeapons.Count();
    INDEX ctAmmo = m_aAmmo.Count();

    *ostr << ctWeapons;
    *ostr << ctAmmo;

    for (INDEX iWeapon = 0; iWeapon < ctWeapons; iWeapon++) {
      m_aWeapons[iWeapon].Write(ostr);
    }

    for (INDEX iAmmo = 0; iAmmo < ctAmmo; iAmmo++) {
      m_aAmmo[iAmmo].Write(ostr);
    }
  };

  // [Cecil] Read weapons and ammo
  void Read_t(CTStream *istr) {
    CRationalEntity::Read_t(istr);

    INDEX ctWeapons = 0;
    INDEX ctAmmo = 0;
    
    *istr >> ctWeapons;
    *istr >> ctAmmo;

    for (INDEX iWeapon = 0; iWeapon < ctWeapons; iWeapon++) {
      m_aWeapons[iWeapon].Read(istr);
    }

    for (INDEX iAmmo = 0; iAmmo < ctAmmo; iAmmo++) {
      m_aAmmo[iAmmo].Read(istr);
    }
  };

  // [Cecil] Get predicted weapons
  CPlayerWeapons *PredTail(void) {
    return (CPlayerWeapons*)GetPredictionTail();
  };

  // [Cecil] Get current ammo
  INDEX CurrentAmmo(void) {
    SPlayerAmmo *pAmmo = PredTail()->CUR_WEAPON.pAmmo;
    return (pAmmo == NULL ? 0 : pAmmo->iAmount);
  };

  INDEX CurrentAlt(void) {
    SPlayerAmmo *pAlt = PredTail()->CUR_WEAPON.pAlt;
    return (pAlt == NULL ? 0 : pAlt->iAmount);
  };

  // [Cecil] Get weapon's ammo
  SPlayerAmmo *GetWeaponAmmo(BOOL bAlt) {
    SPlayerAmmo *pAmmo = CUR_WEAPON.pAmmo;
    SPlayerAmmo *pAlt = CUR_WEAPON.pAlt;

    return (bAlt ? pAlt : pAmmo);
  };

  // [Cecil] Get weapon damage
  FLOAT GetDamage(INDEX iWeapon) {
    SWeaponStruct &ws = *m_aWeapons[iWeapon].pWeaponStruct;
    BOOL bCoop = (GetSP()->sp_bCooperative || ws.fDamageDM <= 0.0f);
    
    return (bCoop ? ws.fDamage : ws.fDamageDM);
  };

  FLOAT GetDamageAlt(INDEX iWeapon) {
    SWeaponStruct &ws = *m_aWeapons[iWeapon].pWeaponStruct;
    BOOL bCoop = (GetSP()->sp_bCooperative || ws.fDamageAltDM <= 0.0f);
    
    return (bCoop ? ws.fDamageAlt : ws.fDamageAltDM);
  };

  // [Cecil] Moved from the C++ block, added alt flag
  void DecAmmo(INDEX iWeapon, INDEX iDec, BOOL bAlt) {
    if (GetSP()->sp_bInfiniteAmmo) {
      return;
    }

    SPlayerWeapon &pw = m_aWeapons[iWeapon];

    if (bAlt) {
      if (pw.pAlt != NULL) {
        pw.pAlt->iAmount -= iDec;
      }

    } else if (pw.pAmmo != NULL) {
      pw.pAmmo->iAmount -= iDec;
    }
  };

  // [Cecil] Decrease magazine
  void DecMag(INDEX iWeapon, INDEX iDec, BOOL bAmmo) {
    // decrease overall ammo
    if (bAmmo) {
      DecAmmo(iWeapon, iDec, FALSE);
    }

    SPlayerWeapon &pw = m_aWeapons[iWeapon];

    // no mag
    if (pw.pWeaponStruct->iMaxMag <= 0) {
      return;
    }

    pw.iMag -= iDec;
  };

  // [Cecil] Get fire position
  FLOAT3D FirePos(INDEX iWeapon) {
    SWeaponPos wps = m_aWeapons[iWeapon].GetPosition();
    return wps.vFire;
  };

  // [Cecil] Get weapon position for rendering
  SWeaponPos RenderPos(INDEX iWeapon) {
    SWeaponPos wps = m_aWeapons[iWeapon].GetPosition();

    // weapon position shift
    if (iWeapon == WEAPON_MINIGUN && AltFireExists(WEAPON_MINIGUN)) {
      wps.Pos1(1) += 0.1f;
    }

    // mirror the position
    if (amp_bWeaponMirrored) {
      FLOATmatrix3D mRot;
      MakeRotationMatrix(mRot, wps.Rot1());

      // mirror the rotation
      mRot(1, 2) *= -1.0f;
      mRot(1, 3) *= -1.0f;
      DecomposeRotationMatrix(wps.Rot1(), mRot);

      wps.Pos1(1) *= -1.0f;
      wps.Rot1(3) *= -1.0f;
      wps.vFire(1) *= -1.0f;
    }

    // customizable position
    wps.Pos1(1) *= amp_afWeaponPos[0];
    wps.Pos1(2) *= amp_afWeaponPos[1];
    wps.Pos1(3) *= amp_afWeaponPos[2];

    wps.Rot1(1) *= amp_afWeaponRot[0];
    wps.Rot1(2) *= amp_afWeaponRot[1];
    wps.Rot1(3) *= amp_afWeaponRot[2];

    wps.vFire(1) *= amp_afWeaponPos[0];
    wps.vFire(2) *= amp_afWeaponPos[1];
    wps.vFire(3) *= amp_afWeaponPos[2];

    if (amp_fWeaponFOV < 1.0f) {
      // lower FOV (0..1 = 20..OG)
      wps.fFOV = Lerp(20.0f, wps.fFOV, ClampDn(amp_fWeaponFOV, 0.0f));

    } else {
      // upper FOV (1..2 = OG..120)
      wps.fFOV = Lerp(wps.fFOV, 120.0f, ClampUp(amp_fWeaponFOV-1.0f, 1.0f));
    }

    return wps;
  };

  // [Cecil] Mirror the weapon
  void ApplyMirroring(BOOL bMirror) {
    if (bMirror) {
      m_moWeapon.StretchModelRelative(FLOAT3D(-1.0f, 1.0f, 1.0f));
      m_moWeaponSecond.StretchModelRelative(FLOAT3D(-1.0f, 1.0f, 1.0f));
    }
  };

  // [Cecil] Mirror effect's position
  void MirrorEffect(FLOAT3D &vPos, FLOAT3D &vSpeed, BOOL bMirrored) {
    if (bMirrored) {
      FLOAT fPosX = CUR_WEAPON.GetPosition().Pos1(1);

      vPos(1) = -vPos(1) - fPosX*2.0f;
      vSpeed(1) *= -1.0f;
    }
  };

  // [Cecil] Drop some bullet shell
  void DropBulletShell(FLOAT3D vPos, FLOAT3D vSpeed, EmptyShellType eShellType, BOOL bMirrored) {
    if (!hud_bShowWeapon) {
      return;
    }

    // mirror the position
    MirrorEffect(vPos, vSpeed, bMirrored);

    CPlayer *penPlayer = GetPlayer();
    
    // get shell placement
    CPlacement3D plShell;
    CalcWeaponPosition(vPos, plShell, FALSE);

    // get rotation matrix
    FLOATmatrix3D mRot;
    MakeRotationMatrixFast(mRot, plShell.pl_OrientationAngle);

    // upwards vector
    const FLOATmatrix3D &m = penPlayer->GetRotationMatrix();
    FLOAT3D vUp(m(1,2), m(2,2), m(3,2));

    // spawn new shell
    ShellLaunchData &sld = penPlayer->m_asldData[penPlayer->m_iFirstEmptySLD];
    sld.sld_vPos = plShell.pl_PositionVector;
    sld.sld_vSpeed = vSpeed*mRot;
    sld.sld_vUp = vUp;
    sld.sld_tmLaunch = _pTimer->CurrentTick();
    sld.sld_estType = eShellType;

    // next shell
    penPlayer->m_iFirstEmptySLD = (penPlayer->m_iFirstEmptySLD+1) % MAX_FLYING_SHELLS;
  };

  // [Cecil] Spawn bubbles effect
  BOOL SpawnBubbleEffect(FLOAT3D vPosBubble, FLOAT3D vSpeedBubble, BOOL bMirrored) {
    CPlayer *penPlayer = GetPlayer();

    if (penPlayer->m_pstState != PST_DIVE) {
      return FALSE;
    }

    // mirror the position
    MirrorEffect(vPosBubble, vSpeedBubble, bMirrored);
    
    // get bubble placement
    CPlacement3D plBubble;
    CalcWeaponPosition(vPosBubble, plBubble, FALSE);

    // get rotation matrix
    FLOATmatrix3D m;
    MakeRotationMatrixFast(m, plBubble.pl_OrientationAngle);

    // upwards vector
    FLOAT3D vUp(m(1,2), m(2,2), m(3,2));

    // spawn new bubble
    ShellLaunchData &sldBubble = penPlayer->m_asldData[penPlayer->m_iFirstEmptySLD];
    sldBubble.sld_vPos = plBubble.pl_PositionVector;
    sldBubble.sld_vSpeed = vSpeedBubble*m;

    sldBubble.sld_vUp = vUp;
    sldBubble.sld_tmLaunch = _pTimer->CurrentTick();
    sldBubble.sld_estType = ESL_BUBBLE;

    // next bubble
    penPlayer->m_iFirstEmptySLD = (penPlayer->m_iFirstEmptySLD+1) % MAX_FLYING_SHELLS;

    return TRUE;
  };

  // [Cecil] Spawn smoke or bubbles
  void SpawnPipeEffect(FLOAT3D vPosBubble, FLOAT3D vPosSmoke, FLOAT3D vSpeedBubble, FLOAT3D vSpeedSmoke, EmptyShellType eSmokeType, BOOL bMirrored) {
    if (!hud_bShowWeapon) {
      return;
    }

    // try to spawn bubbles
    if (SpawnBubbleEffect(vPosBubble, vSpeedBubble, bMirrored)) {
      return;
    }

    // mirror the position
    MirrorEffect(vPosSmoke, vSpeedSmoke, bMirrored);

    CPlayer *penPlayer = GetPlayer();
    
    // get smoke placement
    CPlacement3D plSmoke;
    CalcWeaponPosition(vPosSmoke, plSmoke, FALSE);

    // get rotation matrix
    FLOATmatrix3D m;
    MakeRotationMatrixFast(m, plSmoke.pl_OrientationAngle);

    // upwards vector
    FLOAT3D vUp(m(1,2), m(2,2), m(3,2));

    // spawn new smoke
    ShellLaunchData &sldSmoke = penPlayer->m_asldData[penPlayer->m_iFirstEmptySLD];
    sldSmoke.sld_vPos = plSmoke.pl_PositionVector;
    sldSmoke.sld_vSpeed = vSpeedSmoke*m;

    sldSmoke.sld_vUp = vUp;
    sldSmoke.sld_tmLaunch = _pTimer->CurrentTick();
    sldSmoke.sld_estType = eSmokeType;

    // next effect
    penPlayer->m_iFirstEmptySLD = (penPlayer->m_iFirstEmptySLD+1) % MAX_FLYING_SHELLS;
  };
  
  // add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penPlayer->AddToPrediction();
    //m_penPipebomb->AddToPrediction();
    m_penGhostBusterRay->AddToPrediction();
    m_penFlame->AddToPrediction();

    // [Cecil] Tesla lightning
    m_penTesla->AddToPrediction();
  };

  void Precache(void) {
    CPlayerWeapons_Precache(m_iAvailableWeapons);
  };

  CPlayer *GetPlayer(void) {
    ASSERT(m_penPlayer!=NULL);
    return (CPlayer *)&*m_penPlayer;
  };

  CPlayerAnimator *GetAnimator(void) {
    ASSERT(m_penPlayer!=NULL);
    return ((CPlayerAnimator*)&*((CPlayer&)*m_penPlayer).m_penAnimator);
  };

  CModelObject *GetChainSawTeeth(void) {
    CPlayer *ppl=GetPlayer();
    if(ppl==NULL) { return NULL;}
    CModelObject *pmoPlayer = ppl->GetModelObject();
    if(pmoPlayer==NULL) { return NULL;}
    CAttachmentModelObject *pamoTorso = pmoPlayer->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);
    if(pamoTorso==NULL) { return NULL;}
    CAttachmentModelObject *pamoChainSaw = pamoTorso->amo_moModelObject.GetAttachmentModel(BODY_ATTACHMENT_MINIGUN);
    if(pamoChainSaw==NULL) { return NULL;}
    CAttachmentModelObject *pamoBlade = pamoChainSaw->amo_moModelObject.GetAttachmentModel(CHAINSAWFORPLAYER_ATTACHMENT_BLADE);
    if(pamoBlade==NULL) { return NULL;}
    CAttachmentModelObject *pamoTeeth = pamoBlade->amo_moModelObject.GetAttachmentModel(BLADE_ATTACHMENT_TEETH);
    if(pamoTeeth==NULL) { return NULL;}
    return &pamoTeeth->amo_moModelObject;
  };

  // recoil
  void DoRecoil(void) {};

  BOOL HoldingFire(void) {
    return m_bFireWeapon && !m_bChangeWeapon;
  };

  // [Cecil] Holding alt fire
  BOOL HoldingAlt(void) {
    return m_bAltFire && !m_bChangeWeapon;
  };

  // render weapon model(s)
  void RenderWeaponModel(CPerspectiveProjection3D &prProjection, CDrawPort *pdp,
                         FLOAT3D vViewerLightDirection, COLOR colViewerLight, COLOR colViewerAmbient,
                         BOOL bRender, INDEX iEye) {
    // [Cecil] No weapon
    if (m_iCurrentWeapon == WEAPON_NONE) {
      return;
    }

    _mrpModelRenderPrefs.SetRenderType( RT_TEXTURE|RT_SHADING_PHONG);

    // flare attachment
    ControlFlareAttachment();

    if( !bRender || m_iCurrentWeapon==WEAPON_NONE
     || GetPlayer()->GetSettings()->ps_ulFlags&PSF_HIDEWEAPON) { return; }

    // nuke and iron cannons have the same view settings
    INDEX iWeaponData = m_iCurrentWeapon;

    // store FOV for Crosshair
    const FLOAT fFOV = ((CPerspectiveProjection3D &)prProjection).FOVL();
    CPlacement3D plView;
    plView = ((CPlayer&)*m_penPlayer).en_plViewpoint;
    plView.RelativeToAbsolute(m_penPlayer->GetPlacement());

    // [Cecil] Weapon position
    SWeaponPos wps = RenderPos(iWeaponData);

    // [Cecil] Mirror the weapon
    if (_bLastWeaponMirrored != amp_bWeaponMirrored) {
      ApplyMirroring(TRUE);
      _bLastWeaponMirrored = amp_bWeaponMirrored;
    }

    // added: chainsaw shaking
    CPlacement3D plWeapon;
    if (m_iCurrentWeapon == WEAPON_CHAINSAW) {
      CPlayer *plPlayer = (CPlayer*)&*m_penPlayer;

      FLOAT3D vPos = wps.Pos1();
      vPos(1) += plPlayer->m_fChainsawShakeDX*0.35f;
      vPos(2) += plPlayer->m_fChainsawShakeDY*0.35f;

      plWeapon = CPlacement3D(vPos, wps.Rot1());
    } else {
      plWeapon = wps.plPos;
    }

    // make sure that weapon will be bright enough
    UBYTE ubLR,ubLG,ubLB, ubAR,ubAG,ubAB;
    ColorToRGB( colViewerLight,   ubLR,ubLG,ubLB);
    ColorToRGB( colViewerAmbient, ubAR,ubAG,ubAB);
    INDEX iMinDL = Min( Min(ubLR,ubLG),ubLB) -32;
    INDEX iMinDA = Min( Min(ubAR,ubAG),ubAB) -32;
    if( iMinDL<0) {
      ubLR = ClampUp( ubLR-iMinDL, (INDEX)255);
      ubLG = ClampUp( ubLG-iMinDL, (INDEX)255);
      ubLB = ClampUp( ubLB-iMinDL, (INDEX)255);
    }
    if( iMinDA<0) {
      ubAR = ClampUp( ubAR-iMinDA, (INDEX)255);
      ubAG = ClampUp( ubAG-iMinDA, (INDEX)255);
      ubAB = ClampUp( ubAB-iMinDA, (INDEX)255);
    }
    const COLOR colLight   = RGBToColor( ubLR,ubLG,ubLB);
    const COLOR colAmbient = RGBToColor( ubAR,ubAG,ubAB);
    const FLOAT tmNow = _pTimer->GetLerpedCurrentTick();

    UBYTE ubBlend = INVISIBILITY_ALPHA_LOCAL;
    FLOAT tmInvisibility = ((CPlayer *)&*m_penPlayer)->m_tmInvisibility;
    FLOAT tmSeriousDamage = ((CPlayer *)&*m_penPlayer)->m_tmSeriousDamage;
    FLOAT tmInvulnerability = ((CPlayer *)&*m_penPlayer)->m_tmInvulnerability;

    if (tmInvisibility > tmNow) {
      FLOAT fIntensity = 0.0f;
      if (tmInvisibility - tmNow < 3.0f) {
        fIntensity = 0.5f-0.5f*cos((tmInvisibility-tmNow)*(6.0f*3.1415927f/3.0f));
        ubBlend = (INDEX)(INVISIBILITY_ALPHA_LOCAL+(FLOAT)(254-INVISIBILITY_ALPHA_LOCAL)*fIntensity);      
      }      
    }

    // [Cecil] Dual minigun
    BOOL bMinigun = (iWeaponData == WEAPON_MINIGUN && AltFireExists(WEAPON_MINIGUN));
      
    // DRAW WEAPON MODEL
    //  Double colt - second colt in mirror
    //  Double shotgun - hand with ammo
    if (iWeaponData == WEAPON_DOUBLECOLT || iWeaponData == WEAPON_DOUBLESHOTGUN || bMinigun) {
      // prepare render model structure and projection
      CRenderModel rmMain;
      CPerspectiveProjection3D prMirror = prProjection;
      prMirror.ViewerPlacementL() = plView;
      prMirror.FrontClipDistanceL() = 0.1f; // [Cecil] 0.1 for every weapon
      prMirror.DepthBufferNearL() = 0.0f;
      prMirror.DepthBufferFarL() = 0.1f;

      CPlacement3D plWeaponMirror = wps.plPos;

      if (iWeaponData == WEAPON_DOUBLECOLT || bMinigun) {
        plWeaponMirror.pl_PositionVector(1) = -plWeaponMirror.pl_PositionVector(1);
        plWeaponMirror.pl_OrientationAngle(1) = -plWeaponMirror.pl_OrientationAngle(1);
        plWeaponMirror.pl_OrientationAngle(3) = -plWeaponMirror.pl_OrientationAngle(3);
      }

      ((CPerspectiveProjection3D &)prMirror).FOVL() = AngleDeg(wps.fFOV);
      CAnyProjection3D apr;
      apr = prMirror;
      Stereo_AdjustProjection(*apr, iEye, 0.1f);
      BeginModelRenderingView(apr, pdp);

      // [Cecil] Added angle
      WeaponMovingOffset(plWeaponMirror.pl_PositionVector, plWeaponMirror.pl_OrientationAngle);
      plWeaponMirror.RelativeToAbsoluteSmooth(plView);
      rmMain.SetObjectPlacement(plWeaponMirror);

      rmMain.rm_colLight   = colLight;
      rmMain.rm_colAmbient = colAmbient;
      rmMain.rm_vLightDirection = vViewerLightDirection;
      rmMain.rm_ulFlags |= RMF_WEAPON; // TEMP: for Truform
      if (tmInvisibility>tmNow) {
        rmMain.rm_colBlend = (rmMain.rm_colBlend&0xffffff00)|ubBlend;
      }
      
      m_moWeaponSecond.SetupModelRendering(rmMain);
      m_moWeaponSecond.RenderModel(rmMain);

      // [Cecil] Power Up particles
      if (amp_bPowerUpParticles) {
        if (tmSeriousDamage > tmNow && tmInvulnerability > tmNow) {
          Particle_PrepareSystem(pdp, apr);
          Particle_PrepareEntity( 1, 0, 0, NULL);
          Particles_ModelGlow2(&m_moWeaponSecond, plWeaponMirror, Max(tmSeriousDamage, tmInvulnerability), PT_STAR08, 0.025f, 2, 0.01f, 0xff00ff00);
          Particle_EndSystem();
        } else if (tmInvulnerability > tmNow) {
          Particle_PrepareSystem(pdp, apr);
          Particle_PrepareEntity( 1, 0, 0, NULL);
          Particles_ModelGlow2(&m_moWeaponSecond, plWeaponMirror, tmInvulnerability, PT_STAR05, 0.025f, 2, 0.01f, 0x3333ff00);
          Particle_EndSystem();
        } else if (tmSeriousDamage > tmNow) {
          Particle_PrepareSystem(pdp, apr);
          Particle_PrepareEntity( 1, 0, 0, NULL);
          Particles_ModelGlow2(&m_moWeaponSecond, plWeaponMirror, tmSeriousDamage, PT_STAR08, 0.025f, 2, 0.01f, 0xff777700);
          Particle_EndSystem();
        }
      }

      EndModelRenderingView();
    }

    // minigun specific (update rotation)
    if (iWeaponData == WEAPON_MINIGUN) {
      RotateMinigun();
    }

    // prepare render model structure
    CRenderModel rmMain;
    prProjection.ViewerPlacementL() = plView;
    prProjection.FrontClipDistanceL() = 0.1f; // [Cecil] 0.1 for every weapon
    prProjection.DepthBufferNearL() = 0.0f;
    prProjection.DepthBufferFarL() = 0.1f;
    ((CPerspectiveProjection3D &)prProjection).FOVL() = AngleDeg(wps.fFOV);

    CAnyProjection3D apr;
    apr = prProjection;
    Stereo_AdjustProjection(*apr, iEye, 0.1f);
    BeginModelRenderingView(apr, pdp);

    // [Cecil] Added angle
    WeaponMovingOffset(plWeapon.pl_PositionVector, plWeapon.pl_OrientationAngle);
    plWeapon.RelativeToAbsoluteSmooth(plView);
    rmMain.SetObjectPlacement(plWeapon);

    rmMain.rm_colLight   = colLight;  
    rmMain.rm_colAmbient = colAmbient;
    rmMain.rm_vLightDirection = vViewerLightDirection;
    rmMain.rm_ulFlags |= RMF_WEAPON; // TEMP: for Truform
    if (tmInvisibility>tmNow) {
      rmMain.rm_colBlend = (rmMain.rm_colBlend&0xffffff00)|ubBlend;
    }      
    
    m_moWeapon.SetupModelRendering(rmMain);
    m_moWeapon.RenderModel(rmMain);
    
    // [Cecil] Power Up particles
    if (amp_bPowerUpParticles) {
      if (tmSeriousDamage > tmNow && tmInvulnerability > tmNow) {
        Particle_PrepareSystem(pdp, apr);
        Particle_PrepareEntity( 1, 0, 0, NULL);
        Particles_ModelGlow2(&m_moWeapon, plWeapon, Max(tmSeriousDamage, tmInvulnerability), PT_STAR08, 0.025f, 2, 0.01f, 0xff00ff00);
        Particle_EndSystem();
      } else if (tmInvulnerability > tmNow) {
        Particle_PrepareSystem(pdp, apr);
        Particle_PrepareEntity( 1, 0, 0, NULL);
        Particles_ModelGlow2(&m_moWeapon, plWeapon, tmInvulnerability, PT_STAR05, 0.025f, 2, 0.01f, 0x3333ff00);
        Particle_EndSystem();
      } else if (tmSeriousDamage > tmNow) {
        Particle_PrepareSystem(pdp, apr);
        Particle_PrepareEntity( 1, 0, 0, NULL);
        Particles_ModelGlow2(&m_moWeapon, plWeapon, tmSeriousDamage, PT_STAR08, 0.025f, 2, 0.01f, 0xff777700);
        Particle_EndSystem();
      }
    }

    EndModelRenderingView();

    // restore FOV for Crosshair
    ((CPerspectiveProjection3D &)prProjection).FOVL() = fFOV;
  };

  // [Cecil] Added angle
  // Weapon moving offset
  void WeaponMovingOffset(FLOAT3D &plPos, ANGLE3D &aRot) {
    CPlayerAnimator &plan = (CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator;
    FLOAT fXOffset = Lerp(plan.m_fMoveLastBanking, plan.m_fMoveBanking, _pTimer->GetLerpFactor()) * -0.02f;
    FLOAT fYOffset = Lerp(plan.m_fWeaponYLastOffset, plan.m_fWeaponYOffset, _pTimer->GetLerpFactor()) * 0.15f;
    fYOffset += (fXOffset * fXOffset) * 30.0f;
    plPos(1) += fXOffset;
    plPos(2) += fYOffset;

    // [Cecil] Changed from if-else to switch-case
    switch (m_iCurrentWeapon) {
      // [Cecil] Shotgun animation
      case WEAPON_SINGLESHOTGUN: {
        FLOAT fLerped = Lerp(m_fWeaponDrawPowerOld, m_fWeaponDrawPower, _pTimer->GetLerpFactor());
        aRot(2) += fLerped;

        FLOAT fLerpedDelay = Lerp(ClampDn(m_fWeaponDrawPowerOld-1.0f, 0.0f), ClampDn(m_fWeaponDrawPower-1.0f, 0.0f), _pTimer->GetLerpFactor());
        plPos(3) += fLerpedDelay/32.0f;
      } break;

      // [Cecil] Tommygun animation
      case WEAPON_TOMMYGUN: {
        FLOAT fLerped = Lerp(m_fWeaponDrawPowerOld, m_fWeaponDrawPower, _pTimer->GetLerpFactor());
        plPos(3) += fLerped/100.0f;
      } break;

      // apply grenade launcher pumping
      case WEAPON_GRENADELAUNCHER: {
        // obtain moving part attachment
        CAttachmentModelObject *amo = m_moWeapon.GetAttachmentModel(GRENADELAUNCHER_ATTACHMENT_MOVING_PART);
        FLOAT fLerpedMovement = Lerp(m_fWeaponDrawPowerOld, m_fWeaponDrawPower, _pTimer->GetLerpFactor());
        amo->amo_plRelative.pl_PositionVector(3) = fLerpedMovement;
        plPos(3) += fLerpedMovement/2.0f;

        if (m_tmDrawStartTime != 0.0f) {
          FLOAT tmPassed = _pTimer->GetLerpedCurrentTick()-m_tmDrawStartTime;
          plPos(1) += Sin(tmPassed*360.0f*10)*0.0125f*tmPassed/6.0f;
          plPos(2) += Sin(tmPassed*270.0f*8)*0.01f*tmPassed/6.0f;
        }
      } break;

      // apply cannon draw
      case WEAPON_IRONCANNON: {
        FLOAT fLerpedMovement = Lerp(m_fWeaponDrawPowerOld, m_fWeaponDrawPower, _pTimer->GetLerpFactor());
        plPos(3) += fLerpedMovement;

        if (m_tmDrawStartTime != 0.0f) {
          FLOAT tmPassed = _pTimer->GetLerpedCurrentTick()-m_tmDrawStartTime;
          plPos(1) += Sin(tmPassed*360.0f*10)*0.0125f*tmPassed/2.0f;
          plPos(2) += Sin(tmPassed*270.0f*8)*0.01f*tmPassed/2.0f;
        }
      } break;
    }
  };

  // check target for time prediction updating
  void CheckTargetPrediction(CEntity *penTarget)
  {
    // if target is not predictable
    if (!penTarget->IsPredictable()) {
      // do nothing
      return;
    }

    extern FLOAT cli_tmPredictFoe;
    extern FLOAT cli_tmPredictAlly;
    extern FLOAT cli_tmPredictEnemy;

    // get your and target's bases for prediction
    CEntity *penMe = GetPlayer();
    if (IsPredictor()) {
      penMe = penMe->GetPredicted();
    }
    CEntity *penYou = penTarget;
    if (penYou->IsPredictor()) {
      penYou = penYou->GetPredicted();
    }

    // if player
    if (IsOfClass(penYou, "Player")) {
      // if ally player 
      if (GetSP()->sp_bCooperative) {
        // if ally prediction is on and this player is local
        if (cli_tmPredictAlly>0 && _pNetwork->IsPlayerLocal(penMe)) {
          // predict the ally
          penYou->SetPredictionTime(cli_tmPredictAlly);
        }
      // if foe player
      } else {
        // if foe prediction is on
        if (cli_tmPredictFoe>0) {
          // if this player is local
          if (_pNetwork->IsPlayerLocal(penMe)) {
            // predict the foe
            penYou->SetPredictionTime(cli_tmPredictFoe);
          }
          // if the target is local
          if (_pNetwork->IsPlayerLocal(penYou)) {
            // predict self
            penMe->SetPredictionTime(cli_tmPredictFoe);
          }
        }
      }
    } else {
      // if enemy prediction is on an it is an enemy
      if( cli_tmPredictEnemy>0 && IsDerivedFromClass( penYou, "Enemy Base")) {
        // if this player is local
        if (_pNetwork->IsPlayerLocal(penMe)) {
          // set enemy prediction time
          penYou->SetPredictionTime(cli_tmPredictEnemy);
        }
      }
    }
  }

  // cast a ray from weapon
  void UpdateTargetingInfo(void)
  {
    // crosshair start position from weapon
    CPlacement3D plCrosshair;

    // [Cecil] Get weapon fire position
    FLOAT fFX = FirePos(m_iCurrentWeapon)(1);
    FLOAT fFY = FirePos(m_iCurrentWeapon)(2);

    if (GetPlayer()->m_iViewState == PVT_3RDPERSONVIEW) {
      fFX = fFY = 0;
    }

    CalcWeaponPosition(FLOAT3D(fFX, fFY, 0), plCrosshair, FALSE);
    // cast ray
    CCastRay crRay( m_penPlayer, plCrosshair);
    crRay.cr_bHitTranslucentPortals = FALSE;
    crRay.cr_bPhysical = FALSE;
    crRay.cr_ttHitModels = CCastRay::TT_COLLISIONBOX;
    GetWorld()->CastRay(crRay);
    // store required cast ray results
    m_vRayHitLast = m_vRayHit;  // for lerping purposes
    m_vRayHit   = crRay.cr_vHit;
    m_penRayHit = crRay.cr_penHit;
    m_fRayHitDistance = crRay.cr_fHitDistance;
    m_fEnemyHealth = 0.0f;

    // set some targeting properties (snooping and such...)
    TIME tmNow = _pTimer->CurrentTick();
    if( m_penRayHit!=NULL)
    {
      CEntity *pen = m_penRayHit;
      // if alive 
      if (IsAlive(pen)) {
        // check the target for time prediction updating
        CheckTargetPrediction(pen);

        // if player
        if( IsOfClass( pen, "Player")) {
          // rememer when targeting begun  
          if( m_tmTargetingStarted==0) {
            m_penTargeting = pen;
            m_tmTargetingStarted = tmNow;
          }
          // keep player name, mana and health for eventual printout or coloring
          m_fEnemyHealth = ((CPlayer*)pen)->GetHealth() / ((CPlayer*)pen)->m_fMaxHealth;
          m_strLastTarget.PrintF( "%s", ((CPlayer*)pen)->GetPlayerName());
          if( GetSP()->sp_gmGameMode==CSessionProperties::GM_SCOREMATCH) {
            // add mana to player name
            CTString strMana="";
            strMana.PrintF( " (%d)", ((CPlayer*)pen)->m_iMana);
            m_strLastTarget += strMana;
          }
          if( hud_bShowPlayerName) { m_tmLastTarget = tmNow+1.5f; }
        }
        // not targeting player
        else {
          // reset targeting
          m_tmTargetingStarted = 0; 
        }
        // keep enemy health for eventual crosshair coloring
        if( IsDerivedFromClass( pen, "Enemy Base")) {
          m_fEnemyHealth = ((CEnemyBase*)pen)->GetHealth() / ((CEnemyBase*)pen)->m_fMaxHealth;
        }
         // cannot snoop while firing
        if( m_bFireWeapon) { m_tmTargetingStarted = 0; }
      }
      // if not alive
      else
      {
        // not targeting player
        m_tmTargetingStarted = 0; 

        // check switch relaying by moving brush
        if( IsOfClass( pen, "Moving Brush") && ((CMovingBrush&)*pen).m_penSwitch!=NULL) {
          pen = ((CMovingBrush&)*pen).m_penSwitch;
        }
        // if switch and near enough
        if( IsOfClass( pen, "Switch") && m_fRayHitDistance<2.0f) {
          CSwitch &enSwitch = (CSwitch&)*pen;
          // if switch is useable
          if( enSwitch.m_bUseable) {
            // show switch message
            if( enSwitch.m_strMessage!="") { m_strLastTarget = enSwitch.m_strMessage; }
            else { m_strLastTarget = TRANS("Use"); }
            m_tmLastTarget = tmNow+0.5f;
          }
        }
        // if analyzable
        if( IsOfClass( pen, "MessageHolder") 
         && m_fRayHitDistance < ((CMessageHolder*)&*pen)->m_fDistance
         && ((CMessageHolder*)&*pen)->m_bActive) {
          const CTFileName &fnmMessage = ((CMessageHolder*)&*pen)->m_fnmMessage;
          // if player doesn't have that message it database
          CPlayer &pl = (CPlayer&)*m_penPlayer;
          if( !pl.HasMessage(fnmMessage)) {
            // show analyse message
            m_strLastTarget = TRANS("Analyze");
            m_tmLastTarget  = tmNow+0.5f;
          }
        }
      }
    }
    // if didn't hit anything
    else {
      // not targeting player
      m_tmTargetingStarted = 0; 
      // remember position ahead
      FLOAT3D vDir = crRay.cr_vTarget-crRay.cr_vOrigin;
      vDir.Normalize();
      m_vRayHit = crRay.cr_vOrigin+vDir*50.0f;
    }

    // determine snooping time
    TIME tmDelta = tmNow - m_tmTargetingStarted; 
    if( m_tmTargetingStarted>0 && plr_tmSnoopingDelay>0 && tmDelta>plr_tmSnoopingDelay) {
      m_tmSnoopingStarted = tmNow;
    }
  }



  // Render Crosshair
  void RenderCrosshair( CProjection3D &prProjection, CDrawPort *pdp, CPlacement3D &plViewSource)
  {
    INDEX iCrossHair = GetPlayer()->GetSettings()->ps_iCrossHairType+1;

    // adjust crosshair type
    if( iCrossHair<=0) {
      iCrossHair  = 0;
      _iLastCrosshairType = 0;
    }

    // create new crosshair texture (if needed)
    if( _iLastCrosshairType != iCrossHair) {
      _iLastCrosshairType = iCrossHair;
      CTString fnCrosshair;
      fnCrosshair.PrintF( "Textures\\Interface\\Crosshairs\\Crosshair%d.tex", iCrossHair);
      try {
        // load new crosshair texture
        _toCrosshair.SetData_t( fnCrosshair);
      } catch( char *strError) { 
        // didn't make it! - reset crosshair
        CPrintF( strError);
        iCrossHair = 0;
        return;
      }
    }
    COLOR colCrosshair = C_WHITE;
    TIME  tmNow = _pTimer->CurrentTick();

    // if hit anything
    FLOAT3D vOnScreen;
    FLOAT   fDistance = m_fRayHitDistance;
    //const FLOAT3D vRayHit = Lerp( m_vRayHitLast, m_vRayHit, _pTimer->GetLerpFactor());
    const FLOAT3D vRayHit = m_vRayHit;  // lerping doesn't seem to work ???
    // if hit anything
    if( m_penRayHit!=NULL) {

      CEntity *pen = m_penRayHit;
      // do screen projection
      prProjection.ViewerPlacementL() = plViewSource;
      prProjection.ObjectPlacementL() = CPlacement3D( FLOAT3D(0.0f, 0.0f, 0.0f), ANGLE3D( 0, 0, 0));
      prProjection.Prepare();
      prProjection.ProjectCoordinate( vRayHit, vOnScreen);
      // if required, show enemy health thru crosshair color
      if( hud_bCrosshairColoring && m_fEnemyHealth>0) {
             if( m_fEnemyHealth<0.25f) { colCrosshair = C_RED;    }
        else if( m_fEnemyHealth<0.60f) { colCrosshair = C_YELLOW; }
        else                         { colCrosshair = C_GREEN;  }
      }
    }
    // if didn't hit anything
    else
    {
      // far away in screen center
      vOnScreen(1) = (FLOAT)pdp->GetWidth()  *0.5f;
      vOnScreen(2) = (FLOAT)pdp->GetHeight() *0.5f;
      fDistance    = 100.0f;
    }

    // if croshair should be of fixed position
    if( hud_bCrosshairFixed || GetPlayer()->m_iViewState == PVT_3RDPERSONVIEW) {
      // reset it to screen center
      vOnScreen(1) = (FLOAT)pdp->GetWidth()  *0.5f;
      vOnScreen(2) = (FLOAT)pdp->GetHeight() *0.5f;
      //fDistance    = 100.0f;
    }
    
    // clamp console variables
    hud_fCrosshairScale   = Clamp( hud_fCrosshairScale,   0.1f, 2.0f);
    hud_fCrosshairRatio   = Clamp( hud_fCrosshairRatio,   0.1f, 1.0f);
    hud_fCrosshairOpacity = Clamp( hud_fCrosshairOpacity, 0.1f, 1.0f);
    const ULONG ulAlpha = NormFloatToByte( hud_fCrosshairOpacity);
    // draw crosshair if needed
    if( iCrossHair>0) {
      // determine crosshair size
      const FLOAT fMinD =   1.0f;
      const FLOAT fMaxD = 100.0f;
      fDistance = Clamp( fDistance, fMinD, fMaxD);
      const FLOAT fRatio   = (fDistance-fMinD) / (fMaxD-fMinD);
      const FLOAT fMaxSize = (FLOAT)pdp->GetWidth() / 640.0f;
      const FLOAT fMinSize = fMaxSize * hud_fCrosshairRatio;
      const FLOAT fSize    = 16 * Lerp( fMaxSize, fMinSize, fRatio) * hud_fCrosshairScale;
      // draw crosshair
      const FLOAT fI0 = + (PIX)vOnScreen(1) - fSize;
      const FLOAT fI1 = + (PIX)vOnScreen(1) + fSize;
      const FLOAT fJ0 = - (PIX)vOnScreen(2) - fSize +pdp->GetHeight();
      const FLOAT fJ1 = - (PIX)vOnScreen(2) + fSize +pdp->GetHeight();
      pdp->InitTexture( &_toCrosshair);
      pdp->AddTexture( fI0, fJ0, fI1, fJ1, colCrosshair|ulAlpha);
      pdp->FlushRenderingQueue();
    }

    // if there is still time
    TIME tmDelta = m_tmLastTarget - tmNow;
    if( tmDelta>0) {
      // printout current target info
      SLONG slDPWidth  = pdp->GetWidth();
      SLONG slDPHeight = pdp->GetHeight();
      FLOAT fScaling   = (FLOAT)slDPWidth/640.0f;
      // set font and scale
      pdp->SetFont( _pfdDisplayFont);
      pdp->SetTextScaling( fScaling);
      pdp->SetTextAspect( 1.0f);
      // do faded printout
      ULONG ulA = (FLOAT)ulAlpha * Clamp( 2*tmDelta, 0.0f, 1.0f);
      pdp->PutTextC( m_strLastTarget, slDPWidth*0.5f, slDPHeight*0.75f, SE_COL_BLUE_NEUTRAL|ulA);
    }

    // printout crosshair world coordinates if needed
    if( hud_bShowCoords) { 
      CTString strCoords;
      SLONG slDPWidth  = pdp->GetWidth();
      SLONG slDPHeight = pdp->GetHeight();
      // set font and scale
      pdp->SetFont( _pfdDisplayFont);
      pdp->SetTextAspect( 1.0f);
      pdp->SetTextScaling( (FLOAT)slDPWidth/640.0f);
      // do printout only if coordinates are valid
      const FLOAT fMax = Max( Max( vRayHit(1), vRayHit(2)), vRayHit(3));
      const FLOAT fMin = Min( Min( vRayHit(1), vRayHit(2)), vRayHit(3));
      if( fMax<+100000 && fMin>-100000) {
        strCoords.PrintF( "%.0f,%.0f,%.0f", vRayHit(1), vRayHit(2), vRayHit(3));
        pdp->PutTextC( strCoords, slDPWidth*0.5f, slDPHeight*0.10f, C_WHITE|CT_OPAQUE);
      }
    }
  };

  // show flare
  void ShowFlare(CModelObject &moWeapon, INDEX iAttachObject, INDEX iAttachFlare, FLOAT fSize) {
    CModelObject *pmo = &(moWeapon.GetAttachmentModel(iAttachObject)->amo_moModelObject);
    CAttachmentModelObject *pamo = pmo->GetAttachmentModel(iAttachFlare);
    pamo->amo_plRelative.pl_OrientationAngle(3) = (rand()*360.0f)/RAND_MAX;
    pmo = &(pamo->amo_moModelObject);
    pmo->StretchModel(FLOAT3D(fSize, fSize, fSize));
  };

  // hide flare
  void HideFlare(CModelObject &moWeapon, INDEX iAttachObject, INDEX iAttachFlare) {
    CModelObject *pmo = &(moWeapon.GetAttachmentModel(iAttachObject)->amo_moModelObject);
    pmo = &(pmo->GetAttachmentModel(iAttachFlare)->amo_moModelObject);
    pmo->StretchModel(FLOAT3D(0.0f, 0.0f, 0.0f));
  };

  void SetFlare(INDEX iFlare, INDEX iAction)
  {
    // if not a prediction head
    if (!IsPredictionHead()) {
      // do nothing
      return;
    }

    // get your prediction tail
    CPlayerWeapons *pen = (CPlayerWeapons*)GetPredictionTail();
    if (iFlare==0) {
      pen->m_iFlare = iAction;
      pen->GetPlayer()->GetPlayerAnimator()->m_iFlare = iAction;
    } else {
      pen->m_iSecondFlare = iAction;
      pen->GetPlayer()->GetPlayerAnimator()->m_iSecondFlare = iAction;
    }
  }

  // flare attachment
  void ControlFlareAttachment(void) {
    // get your prediction tail
    CPlayerWeapons *pen = (CPlayerWeapons *)GetPredictionTail();
    // second colt only
    if (m_iCurrentWeapon == WEAPON_DOUBLECOLT) {
      // add flare
      if (pen->m_iSecondFlare == FLARE_ADD) {
        pen->m_iSecondFlare = FLARE_REMOVE;
        ShowFlare(m_moWeaponSecond, COLT_ATTACHMENT_COLT, COLTMAIN_ATTACHMENT_FLARE, 1.0f);
      // remove flare
      } else if (pen->m_iSecondFlare == FLARE_REMOVE) {
        HideFlare(m_moWeaponSecond, COLT_ATTACHMENT_COLT, COLTMAIN_ATTACHMENT_FLARE);
      }

    // [Cecil] Dual minigun
    } else if (m_iCurrentWeapon == WEAPON_MINIGUN && AltFireExists(WEAPON_MINIGUN)) {
      // add flare
      if (pen->m_iSecondFlare == FLARE_ADD) {
        pen->m_iSecondFlare = FLARE_REMOVE;
        ShowFlare(m_moWeaponSecond, MINIGUN_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE, 1.25f);
      // remove flare
      } else if (pen->m_iSecondFlare == FLARE_REMOVE) {
        HideFlare(m_moWeaponSecond, MINIGUN_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE);
      }
    }

    // add flare
    if (pen->m_iFlare==FLARE_ADD) {
      pen->m_iFlare = FLARE_REMOVE;
      switch(m_iCurrentWeapon) {
        case WEAPON_DOUBLECOLT: case WEAPON_COLT:
          ShowFlare(m_moWeapon, COLT_ATTACHMENT_COLT, COLTMAIN_ATTACHMENT_FLARE, 0.75f);
          break;
        case WEAPON_SINGLESHOTGUN:
          ShowFlare(m_moWeapon, SINGLESHOTGUN_ATTACHMENT_BARRELS, BARRELS_ATTACHMENT_FLARE, 1.0f);
          break;
        case WEAPON_DOUBLESHOTGUN:
          ShowFlare(m_moWeapon, DOUBLESHOTGUN_ATTACHMENT_BARRELS, DSHOTGUNBARRELS_ATTACHMENT_FLARE, 1.75f);
          break;
        case WEAPON_TOMMYGUN:
          ShowFlare(m_moWeapon, TOMMYGUN_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE, 0.5f);
          break;
        case WEAPON_SNIPER:
          ShowFlare(m_moWeapon, SNIPER_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE, 0.5f);
          break;
        case WEAPON_MINIGUN:
          ShowFlare(m_moWeapon, MINIGUN_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE, 1.25f);
          break;
      }
    // remove
    } else if (pen->m_iFlare==FLARE_REMOVE) {
      switch(m_iCurrentWeapon) {
        case WEAPON_DOUBLECOLT: case WEAPON_COLT:
          HideFlare(m_moWeapon, COLT_ATTACHMENT_COLT, COLTMAIN_ATTACHMENT_FLARE);
          break;
        case WEAPON_SINGLESHOTGUN:
          HideFlare(m_moWeapon, SINGLESHOTGUN_ATTACHMENT_BARRELS, BARRELS_ATTACHMENT_FLARE);
          break;
        case WEAPON_DOUBLESHOTGUN:
          HideFlare(m_moWeapon, DOUBLESHOTGUN_ATTACHMENT_BARRELS, DSHOTGUNBARRELS_ATTACHMENT_FLARE);
          break;
        case WEAPON_TOMMYGUN:
          HideFlare(m_moWeapon, TOMMYGUN_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE);
          break;
        case WEAPON_SNIPER:
          HideFlare(m_moWeapon, SNIPER_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE);
          break;
        case WEAPON_MINIGUN:
          HideFlare(m_moWeapon, MINIGUN_ATTACHMENT_BODY, BODY_ATTACHMENT_FLARE);
          break;
      }
    } else {
      ASSERT(FALSE);
    }
  };


  // play light animation
  void PlayLightAnim(INDEX iAnim, ULONG ulFlags) {
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    if (pl.m_aoLightAnimation.GetData()!=NULL) {
      pl.m_aoLightAnimation.PlayAnim(iAnim, ulFlags);
    }
  };


  // Set weapon model for current weapon.
  void SetCurrentWeaponModel(void) {
    // [Cecil] Reset mirroring
    m_moWeapon.StretchModel(FLOAT3D(1.0f, 1.0f, 1.0f));
    m_moWeaponSecond.StretchModel(FLOAT3D(1.0f, 1.0f, 1.0f));

    switch (m_iCurrentWeapon) {
      case WEAPON_NONE: break;

      case WEAPON_KNIFE: {
        SetComponents(this, m_moWeapon, MODEL_KNIFE, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, KNIFE_ATTACHMENT_KNIFEITEM, MODEL_KNIFEITEM, TEXTURE_KNIFEITEM, TEX_REFL_BWRIPLES02, TEX_SPEC_WEAK, 0);
      } break;

      case WEAPON_DOUBLECOLT: {
        SetComponents(this, m_moWeaponSecond, MODEL_COLT, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeaponSecond, COLT_ATTACHMENT_BULLETS, MODEL_COLTBULLETS, TEXTURE_COLTBULLETS, TEX_REFL_LIGHTBLUEMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeaponSecond, COLT_ATTACHMENT_COCK, MODEL_COLTCOCK, TEXTURE_COLTCOCK, TEX_REFL_LIGHTBLUEMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeaponSecond, COLT_ATTACHMENT_COLT, MODEL_COLTMAIN, TEXTURE_COLTMAIN, TEX_REFL_LIGHTBLUEMETAL01, TEX_SPEC_MEDIUM, 0);
        CModelObject &mo = m_moWeaponSecond.GetAttachmentModel(COLT_ATTACHMENT_COLT)->amo_moModelObject;
        AddAttachmentToModel(this, mo, COLTMAIN_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0); }
        m_moWeaponSecond.StretchModel(FLOAT3D(-1.0f, 1.0f, 1.0f));

      case WEAPON_COLT: {
        // [Cecil] Don't set Colt again
        if (m_iPreviousWeapon != WEAPON_COLT && m_iPreviousWeapon != WEAPON_DOUBLECOLT) {
          SetComponents(this, m_moWeapon, MODEL_COLT, TEXTURE_HAND, 0, 0, 0);
          AddAttachmentToModel(this, m_moWeapon, COLT_ATTACHMENT_BULLETS, MODEL_COLTBULLETS, TEXTURE_COLTBULLETS, TEX_REFL_LIGHTBLUEMETAL01, TEX_SPEC_MEDIUM, 0);
          AddAttachmentToModel(this, m_moWeapon, COLT_ATTACHMENT_COCK, MODEL_COLTCOCK, TEXTURE_COLTCOCK, TEX_REFL_LIGHTBLUEMETAL01, TEX_SPEC_MEDIUM, 0);
          AddAttachmentToModel(this, m_moWeapon, COLT_ATTACHMENT_COLT, MODEL_COLTMAIN, TEXTURE_COLTMAIN, TEX_REFL_LIGHTBLUEMETAL01, TEX_SPEC_MEDIUM, 0);
          CModelObject &mo = m_moWeapon.GetAttachmentModel(COLT_ATTACHMENT_COLT)->amo_moModelObject;
          AddAttachmentToModel(this, mo, COLTMAIN_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);
        }
      } break;

      case WEAPON_SINGLESHOTGUN: {
        SetComponents(this, m_moWeapon, MODEL_SINGLESHOTGUN, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, SINGLESHOTGUN_ATTACHMENT_BARRELS, MODEL_SS_BARRELS, TEXTURE_SS_BARRELS, TEX_REFL_DARKMETAL, TEX_SPEC_WEAK, 0);
        AddAttachmentToModel(this, m_moWeapon, SINGLESHOTGUN_ATTACHMENT_HANDLE, MODEL_SS_HANDLE, TEXTURE_SS_HANDLE, TEX_REFL_DARKMETAL, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, SINGLESHOTGUN_ATTACHMENT_SLIDER, MODEL_SS_SLIDER, TEXTURE_SS_BARRELS, TEX_REFL_DARKMETAL, TEX_SPEC_MEDIUM, 0);
        CModelObject &mo = m_moWeapon.GetAttachmentModel(SINGLESHOTGUN_ATTACHMENT_BARRELS)->amo_moModelObject;
        AddAttachmentToModel(this, mo, BARRELS_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);
      } break;

      case WEAPON_DOUBLESHOTGUN: {
        SetComponents(this, m_moWeapon, MODEL_DOUBLESHOTGUN, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, DOUBLESHOTGUN_ATTACHMENT_BARRELS, MODEL_DS_BARRELS, TEXTURE_DS_BARRELS, TEX_REFL_BWRIPLES01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, DOUBLESHOTGUN_ATTACHMENT_HANDLE, MODEL_DS_HANDLE, TEXTURE_DS_HANDLE, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, DOUBLESHOTGUN_ATTACHMENT_SWITCH, MODEL_DS_SWITCH, TEXTURE_DS_SWITCH, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, DOUBLESHOTGUN_ATTACHMENT_AMMO, MODEL_DS_AMMO, TEXTURE_DS_AMMO, 0 ,0, 0);
        CModelObject &mo = m_moWeapon.GetAttachmentModel(DOUBLESHOTGUN_ATTACHMENT_BARRELS)->amo_moModelObject;
        AddAttachmentToModel(this, mo, DSHOTGUNBARRELS_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);

        SetComponents(this, m_moWeaponSecond, MODEL_DS_HANDWITHAMMO, TEXTURE_HAND, 0, 0, 0);
        // [Cecil] Hide by default
        m_moWeaponSecond.StretchModel(FLOAT3D(0.0f, 0.0f, 0.0f));
      } break;

      case WEAPON_TOMMYGUN: {
        SetComponents(this, m_moWeapon, MODEL_TOMMYGUN, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, TOMMYGUN_ATTACHMENT_BODY, MODEL_TG_BODY, TEXTURE_TG_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, TOMMYGUN_ATTACHMENT_SLIDER, MODEL_TG_SLIDER, TEXTURE_TG_BODY, 0, TEX_SPEC_MEDIUM, 0);
        CModelObject &mo = m_moWeapon.GetAttachmentModel(TOMMYGUN_ATTACHMENT_BODY)->amo_moModelObject;
        AddAttachmentToModel(this, mo, BODY_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);
      } break;

      case WEAPON_SNIPER: {
        SetComponents(this, m_moWeapon, MODEL_SNIPER, TEXTURE_SNIPER_BODY, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, SNIPER_ATTACHMENT_BODY, MODEL_SNIPER_BODY, TEXTURE_SNIPER_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        CModelObject &mo = m_moWeapon.GetAttachmentModel(SNIPER_ATTACHMENT_BODY)->amo_moModelObject;
        AddAttachmentToModel(this, mo, BODY_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);
      } break;

      case WEAPON_MINIGUN: {
        // [Cecil] Dual minigun
        if (AltFireExists(WEAPON_MINIGUN)) {
          SetComponents(this, m_moWeaponSecond, MODEL_MINIGUN, TEXTURE_HAND, 0, 0, 0);
          AddAttachmentToModel(this, m_moWeaponSecond, MINIGUN_ATTACHMENT_BARRELS, MODEL_MG_BARRELS, TEXTURE_MG_BARRELS, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
          AddAttachmentToModel(this, m_moWeaponSecond, MINIGUN_ATTACHMENT_BODY, MODEL_MG_BODY, TEXTURE_MG_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
          AddAttachmentToModel(this, m_moWeaponSecond, MINIGUN_ATTACHMENT_ENGINE, MODEL_MG_ENGINE, TEXTURE_MG_BARRELS, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
          CModelObject &mo = m_moWeaponSecond.GetAttachmentModel(MINIGUN_ATTACHMENT_BODY)->amo_moModelObject;
          AddAttachmentToModel(this, mo, BODY_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);
          m_moWeaponSecond.StretchModel(FLOAT3D(-1.0f, 1.0f, 1.0f));
        }
       
        SetComponents(this, m_moWeapon, MODEL_MINIGUN, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, MINIGUN_ATTACHMENT_BARRELS, MODEL_MG_BARRELS, TEXTURE_MG_BARRELS, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, MINIGUN_ATTACHMENT_BODY, MODEL_MG_BODY, TEXTURE_MG_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, MINIGUN_ATTACHMENT_ENGINE, MODEL_MG_ENGINE, TEXTURE_MG_BARRELS, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        CModelObject &mo = m_moWeapon.GetAttachmentModel(MINIGUN_ATTACHMENT_BODY)->amo_moModelObject;
        AddAttachmentToModel(this, mo, BODY_ATTACHMENT_FLARE, MODEL_FLARE01, TEXTURE_FLARE01, 0, 0, 0);
      } break;

      case WEAPON_ROCKETLAUNCHER: {
        SetComponents(this, m_moWeapon, MODEL_ROCKETLAUNCHER, TEXTURE_RL_BODY, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, ROCKETLAUNCHER_ATTACHMENT_BODY, MODEL_RL_BODY, TEXTURE_RL_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, ROCKETLAUNCHER_ATTACHMENT_ROTATINGPART, MODEL_RL_ROTATINGPART, TEXTURE_RL_ROTATINGPART, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);

        // [Cecil] Chainsaw launcher
        if (m_bChainLauncher && AltFireExists(WEAPON_ROCKETLAUNCHER)) {
          for (INDEX iSaw = 0; iSaw < 3; iSaw++) {
            AddAttachmentToModel(this, m_moWeapon, ROCKETLAUNCHER_ATTACHMENT_ROCKET1 + iSaw, MODEL_CS_BLADE, TEXTURE_CS_BLADE, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);

            CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(ROCKETLAUNCHER_ATTACHMENT_ROCKET1 + iSaw)->amo_moModelObject);
            AddAttachmentToModel(this, *pmo, BLADE_ATTACHMENT_TEETH, MODEL_CS_TEETH, TEXTURE_CS_TEETH, 0, 0, 0);

            pmo = &(pmo->GetAttachmentModel(BLADE_ATTACHMENT_TEETH)->amo_moModelObject);
            pmo->PlayAnim(TEETH_ANIM_ROTATE, AOF_LOOPING|AOF_NORESTART);
          }

          // [Cecil] Stretch all saws
          StretchAllRockets(FLOAT3D(1.0f, 1.0f, 1.0f));
          RotateAllRockets(70.0f);

        } else {
          AddAttachmentToModel(this, m_moWeapon, ROCKETLAUNCHER_ATTACHMENT_ROCKET1, MODEL_RL_ROCKET, TEXTURE_RL_ROCKET, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
          AddAttachmentToModel(this, m_moWeapon, ROCKETLAUNCHER_ATTACHMENT_ROCKET2, MODEL_RL_ROCKET, TEXTURE_RL_ROCKET, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
          AddAttachmentToModel(this, m_moWeapon, ROCKETLAUNCHER_ATTACHMENT_ROCKET3, MODEL_RL_ROCKET, TEXTURE_RL_ROCKET, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        }
      } break;

      case WEAPON_GRENADELAUNCHER: {
        SetComponents(this, m_moWeapon, MODEL_GRENADELAUNCHER, TEXTURE_GL_BODY, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, GRENADELAUNCHER_ATTACHMENT_BODY, MODEL_GL_BODY, TEXTURE_GL_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, GRENADELAUNCHER_ATTACHMENT_MOVING_PART, MODEL_GL_MOVINGPART, TEXTURE_GL_MOVINGPART, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, GRENADELAUNCHER_ATTACHMENT_GRENADE, MODEL_GL_GRENADE, TEXTURE_GL_MOVINGPART, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
      } break;

      case WEAPON_FLAMER: {
        SetComponents(this, m_moWeapon, MODEL_FLAMER, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, FLAMER_ATTACHMENT_BODY, MODEL_FL_BODY, TEXTURE_FL_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, FLAMER_ATTACHMENT_FUEL, MODEL_FL_RESERVOIR, TEXTURE_FL_FUELRESERVOIR, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, FLAMER_ATTACHMENT_FLAME, MODEL_FL_FLAME, TEXTURE_FL_FLAME, 0, 0, 0);
      } break;

      case WEAPON_CHAINSAW: {
        SetComponents(this, m_moWeapon, MODEL_CHAINSAW, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, CHAINSAW_ATTACHMENT_CHAINSAW, MODEL_CS_BODY, TEXTURE_CS_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, CHAINSAW_ATTACHMENT_BLADE, MODEL_CS_BLADE, TEXTURE_CS_BLADE, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        CModelObject *pmo;
        pmo = &(m_moWeapon.GetAttachmentModel(CHAINSAW_ATTACHMENT_BLADE)->amo_moModelObject);
        AddAttachmentToModel(this, *pmo, BLADE_ATTACHMENT_TEETH, MODEL_CS_TEETH, TEXTURE_CS_TEETH, 0, 0, 0);
      } break;

      case WEAPON_LASER: {
        SetComponents(this, m_moWeapon, MODEL_LASER, TEXTURE_HAND, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, LASER_ATTACHMENT_BODY, MODEL_LS_BODY, TEXTURE_LS_BODY, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, LASER_ATTACHMENT_LEFTUP,    MODEL_LS_BARREL, TEXTURE_LS_BARREL, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, LASER_ATTACHMENT_LEFTDOWN,  MODEL_LS_BARREL, TEXTURE_LS_BARREL, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, LASER_ATTACHMENT_RIGHTUP,   MODEL_LS_BARREL, TEXTURE_LS_BARREL, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
        AddAttachmentToModel(this, m_moWeapon, LASER_ATTACHMENT_RIGHTDOWN, MODEL_LS_BARREL, TEXTURE_LS_BARREL, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
      } break;

      case WEAPON_IRONCANNON: {
        SetComponents(this, m_moWeapon, MODEL_CANNON, TEXTURE_CANNON, 0, 0, 0);
        AddAttachmentToModel(this, m_moWeapon, CANNON_ATTACHMENT_BODY, MODEL_CN_BODY, TEXTURE_CANNON, TEX_REFL_LIGHTMETAL01, TEX_SPEC_MEDIUM, 0);
      } break;
    }

    // [Cecil] Mirror the weapon
    ApplyMirroring(amp_bWeaponMirrored);

    // [Cecil] Play default animation
    PlayDefaultAnim(TRUE);
  };

  void RotateMinigun(void) {
    // [Cecil] Mirroring
    FLOAT fMirror = (amp_bWeaponMirrored ? -1.0f : 1.0f);

    ANGLE aAngle = Lerp(m_aMiniGunLast, m_aMiniGun, _pTimer->GetLerpFactor());

    // rotate minigun barrels
    CAttachmentModelObject *amo = m_moWeapon.GetAttachmentModel(MINIGUN_ATTACHMENT_BARRELS);
    amo->amo_plRelative.pl_OrientationAngle(3) = aAngle*FireSpeed() * fMirror;

    // [Cecil] Dual minigun
    if (AltFireExists(WEAPON_MINIGUN)) {
      amo = m_moWeaponSecond.GetAttachmentModel(MINIGUN_ATTACHMENT_BARRELS);
      amo->amo_plRelative.pl_OrientationAngle(3) = -aAngle*FireSpeed() * fMirror;
    }
  };

  // calc weapon position for 3rd person view
  void CalcWeaponPosition3rdPersonView(FLOAT3D vPos, CPlacement3D &plPos, BOOL bResetZ) {
    // [Cecil] Weapon position
    SWeaponPos wps = CUR_WEAPON.GetPosition();

    plPos.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);
    // weapon handle
    if (!m_bMirrorFire) {
      plPos.pl_PositionVector = wps.Pos1();
    } else {
      wps.Pos1(1) *= -1.0f;
      plPos.pl_PositionVector = wps.Pos1();
    }

    // weapon offset
    plPos.RelativeToAbsoluteSmooth(CPlacement3D(vPos, ANGLE3D(0.0f, 0.0f, 0.0f)));

    plPos.pl_PositionVector(1) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(2) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(3) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);

    if (bResetZ) {
      plPos.pl_PositionVector(3) = 0.0f;
    }

    // player view and absolute position
    CPlacement3D plView = ((CPlayer &)*m_penPlayer).en_plViewpoint;
    plView.pl_PositionVector(2)= 1.25118f;
    plPos.RelativeToAbsoluteSmooth(plView);
    plPos.RelativeToAbsoluteSmooth(m_penPlayer->GetPlacement());
  };

  // calc weapon position
  void CalcWeaponPosition(FLOAT3D vPos, CPlacement3D &plPos, BOOL bResetZ) {
    // [Cecil] Weapon position
    SWeaponPos wps = CUR_WEAPON.GetPosition();

    plPos.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);
    // weapon handle
    if (!m_bMirrorFire) {
      plPos.pl_PositionVector = wps.Pos1();

      if (m_bSniping) {
        plPos.pl_PositionVector = FLOAT3D(0.0f, 0.0f, 0.0f);
      }

    } else {
      wps.Pos1(1) *= -1.0f;
      plPos.pl_PositionVector = wps.Pos1();
    }

    // weapon offset
    plPos.RelativeToAbsoluteSmooth(CPlacement3D(vPos, ANGLE3D(0.0f, 0.0f, 0.0f)));

    plPos.pl_PositionVector(1) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(2) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(3) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);

    if (bResetZ) {
      plPos.pl_PositionVector(3) = 0.0f;
    }

    // player view and absolute position
    CPlacement3D plView = ((CPlayer &)*m_penPlayer).en_plViewpoint;
    plView.pl_PositionVector(2)+= ((CPlayerAnimator&)*((CPlayer &)*m_penPlayer).m_penAnimator).
      m_fEyesYOffset;
    plPos.RelativeToAbsoluteSmooth(plView);
    plPos.RelativeToAbsoluteSmooth(m_penPlayer->GetPlacement());
  };

  // calc lerped weapon position
  void CalcLerpedWeaponPosition(FLOAT3D vPos, CPlacement3D &plPos, BOOL bResetZ) {
    // [Cecil] Weapon position
    SWeaponPos wps = RenderPos(m_iCurrentWeapon); //CUR_WEAPON.GetPosition();

    plPos.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);
    // weapon handle
    if (!m_bMirrorFire) {
      plPos.pl_PositionVector = wps.Pos1();

      if (m_bSniping) {
        plPos.pl_PositionVector = FLOAT3D(0.0f, 0.0f, 0.0f);
      }

    } else {
      wps.Pos1(1) *= -1.0f;
      plPos.pl_PositionVector = wps.Pos1();
    }

    // weapon offset
    plPos.RelativeToAbsoluteSmooth(CPlacement3D(vPos, ANGLE3D(0.0f, 0.0f, 0.0f)));

    plPos.pl_PositionVector(1) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(2) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(3) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);

    if (bResetZ) {
      plPos.pl_PositionVector(3) = 0.0f;
    }

    // player view and absolute position
    CPlacement3D plRes;
    GetPlayer()->GetLerpedWeaponPosition(plPos.pl_PositionVector, plRes);
    plPos = plRes;
  };

  // calc weapon position
  void CalcWeaponPositionImprecise(FLOAT3D vPos, CPlacement3D &plPos, BOOL bResetZ, FLOAT fImprecissionAngle) {
    // [Cecil] Weapon position
    SWeaponPos wps = CUR_WEAPON.GetPosition();

    plPos.pl_OrientationAngle = ANGLE3D((FRnd()-0.5f)*fImprecissionAngle, (FRnd()-0.5f)*fImprecissionAngle, 0);

    // weapon handle
    if (!m_bMirrorFire) {
      plPos.pl_PositionVector = wps.Pos1();

      if (m_bSniping) {
        plPos.pl_PositionVector = FLOAT3D(0.0f, 0.0f, 0.0f);
      }

    } else {
      wps.Pos1(1) *= -1.0f;
      plPos.pl_PositionVector = wps.Pos1();
    }

    // weapon offset
    plPos.RelativeToAbsoluteSmooth(CPlacement3D(vPos, ANGLE3D(0.0f, 0.0f, 0.0f)));

    plPos.pl_PositionVector(1) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(2) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);
    plPos.pl_PositionVector(3) *= SinFast(wps.fFOV / 2.0f) / SinFast(90.0f / 2.0f);

    if (bResetZ) {
      plPos.pl_PositionVector(3) = 0.0f;
    }

    // player view and absolute position
    CPlacement3D plView = ((CPlayer &)*m_penPlayer).en_plViewpoint;
    plView.pl_PositionVector(2)+= ((CPlayerAnimator&)*((CPlayer &)*m_penPlayer).m_penAnimator).
      m_fEyesYOffset;
    plPos.RelativeToAbsoluteSmooth(plView);
    plPos.RelativeToAbsoluteSmooth(m_penPlayer->GetPlacement());
  };

  // setup 3D sound parameters
  void Setup3DSoundParameters(void) {
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    // initialize sound 3D parameters
    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.0f, 1.0f);
    pl.m_soWeapon1.Set3DParameters(50.0f, 5.0f, 1.0f, 1.0f);
    pl.m_soWeapon2.Set3DParameters(50.0f, 5.0f, 1.0f, 1.0f);
    pl.m_soWeapon3.Set3DParameters(50.0f, 5.0f, 1.0f, 1.0f);
    pl.m_soWeaponAmbient.Set3DParameters(30.0f, 3.0f, 0.0f, 1.0f);
  };

  // cut in front of you with knife
  BOOL CutWithKnife(FLOAT fX, FLOAT fY, FLOAT fRange, FLOAT fWide, FLOAT fThickness, FLOAT fDamage) {
    // knife start position
    CPlacement3D plKnife;
    CalcWeaponPosition(FLOAT3D(fX, fY, 0), plKnife, TRUE);

    // create a set of rays to test
    const FLOAT3D &vBase = plKnife.pl_PositionVector;
    FLOATmatrix3D m;
    MakeRotationMatrixFast(m, plKnife.pl_OrientationAngle);
    FLOAT3D vRight = m.GetColumn(1)*fWide;
    FLOAT3D vUp    = m.GetColumn(2)*fWide;
    FLOAT3D vFront = -m.GetColumn(3)*fRange;

    FLOAT3D vDest[5];
    vDest[0] = vBase+vFront;
    vDest[1] = vBase+vFront+vUp;
    vDest[2] = vBase+vFront-vUp;
    vDest[3] = vBase+vFront+vRight;
    vDest[4] = vBase+vFront-vRight;

    CEntity *penClosest = NULL;
    FLOAT fDistance = UpperLimit(0.0f);
    FLOAT3D vHit;
    FLOAT3D vDir;
    // for each ray
    for (INDEX i=0; i<5; i++) {
      // cast a ray to find if any model
      CCastRay crRay( m_penPlayer, vBase, vDest[i]);
      crRay.cr_bHitTranslucentPortals = FALSE;
      crRay.cr_fTestR = fThickness;
      crRay.cr_ttHitModels = CCastRay::TT_COLLISIONBOX;
      GetWorld()->CastRay(crRay);
      
      // if hit something
      if (crRay.cr_penHit!=NULL /*&& crRay.cr_penHit->GetRenderType()==RT_MODEL*/ && crRay.cr_fHitDistance<fDistance) {
        penClosest = crRay.cr_penHit;
        fDistance = crRay.cr_fHitDistance;
        vDir = vDest[i]-vBase;
        vHit = crRay.cr_vHit;
        
        if (i==0) {
          if(crRay.cr_penHit->GetRenderType()==RT_BRUSH)
          {
            INDEX iSurfaceType=crRay.cr_pbpoBrushPolygon->bpo_bppProperties.bpp_ubSurfaceType;
            EffectParticlesType eptType=GetParticleEffectTypeForSurface(iSurfaceType);
            
            FLOAT3D vNormal=crRay.cr_pbpoBrushPolygon->bpo_pbplPlane->bpl_plAbsolute;
            FLOAT3D vReflected = vDir-vNormal*(2.0f*(vNormal%vDir));
            ((CPlayer&)*m_penPlayer).AddBulletSpray( vBase+vFront, eptType, vReflected);
          }
          else if(crRay.cr_penHit->GetRenderType()==RT_MODEL)
          {
            BOOL bRender=TRUE;
            FLOAT3D vSpillDir=-((CPlayer&)*m_penPlayer).en_vGravityDir*0.5f;
            SprayParticlesType sptType=SPT_NONE;
            COLOR colParticles=C_WHITE|CT_OPAQUE;
            FLOAT fPower=4.0f;
            if( IsOfClass(crRay.cr_penHit, "ModelHolder2"))
            {
              bRender=FALSE;
              CModelDestruction *penDestruction = ((CModelHolder2&)*crRay.cr_penHit).GetDestruction();
              if( penDestruction!=NULL)
              {
                bRender=TRUE;
                sptType= penDestruction->m_sptType;
              }
              CModelHolder2 *pmh2=(CModelHolder2*)crRay.cr_penHit;
              colParticles=pmh2->m_colBurning;
            }
            FLOATaabbox3D boxCutted=FLOATaabbox3D(FLOAT3D(0.0f, 0.0f, 0.0f),FLOAT3D(1.0f, 1.0f, 1.0f));
            if(bRender)
            {
              crRay.cr_penHit->en_pmoModelObject->GetCurrentFrameBBox( boxCutted);
              ((CPlayer&)*m_penPlayer).AddGoreSpray( vBase+vFront, vHit, sptType,
                vSpillDir, boxCutted, fPower, colParticles);
            }
          }
          // don't search any more
          break;
        }        
      }
    }
    // if any model hit
    if (penClosest!=NULL) {
      // in deathmatches check for backstab
      if (!(GetSP()->sp_bCooperative) && IsOfClass(penClosest, "Player")) {
        FLOAT3D vToTarget = penClosest->GetPlacement().pl_PositionVector - m_penPlayer->GetPlacement().pl_PositionVector;
        FLOAT3D vTargetHeading = FLOAT3D(0.0, 0.0, -1.0f)*penClosest->GetRotationMatrix();
        vToTarget.Normalize(); vTargetHeading.Normalize();
        if (vToTarget%vTargetHeading>0.64279) //CosFast(50.0f)
        {
          PrintCenterMessage(this, m_penPlayer, TRANS("Backstab!"), 4.0f, MSS_NONE);
          fDamage *= 4.0f;
        }
      }
      const FLOAT fDamageMul = GetSeriousDamageMultiplier(m_penPlayer);
      InflictDirectDamage(penClosest, m_penPlayer, DMT_CLOSERANGE, fDamage*fDamageMul, vHit, vDir);
      return TRUE;
    }
    return FALSE;
  };

  
  // cut in front of you with the chainsaw
  BOOL CutWithChainsaw(FLOAT fX, FLOAT fY, FLOAT fRange, FLOAT fWide, FLOAT fThickness, FLOAT fDamage) 
  {
    // knife start position
    CPlacement3D plKnife;
    CalcWeaponPosition(FLOAT3D(fX, fY, 0), plKnife, TRUE);

    // create a set of rays to test
    const FLOAT3D &vBase = plKnife.pl_PositionVector;
    FLOATmatrix3D m;
    MakeRotationMatrixFast(m, plKnife.pl_OrientationAngle);
    FLOAT3D vRight = m.GetColumn(1)*fWide;
    FLOAT3D vUp    = m.GetColumn(2)*fWide;
    FLOAT3D vFront = -m.GetColumn(3)*fRange;

    FLOAT3D vDest[3];
    vDest[0] = vBase+vFront;
    vDest[1] = vBase+vFront+vRight;
    vDest[2] = vBase+vFront-vRight;
    
    CEntity *penClosest = NULL;
    FLOAT fDistance = UpperLimit(0.0f);
    FLOAT3D vHit;
    FLOAT3D vDir;
    // for each ray
    for (INDEX i=0; i<3; i++) {
      // cast a ray to find if any model
      CCastRay crRay( m_penPlayer, vBase, vDest[i]);
      crRay.cr_bHitTranslucentPortals = FALSE;
      crRay.cr_fTestR = fThickness;
      crRay.cr_ttHitModels = CCastRay::TT_COLLISIONBOX;
      GetWorld()->CastRay(crRay);

      // if hit something
      if (crRay.cr_penHit!=NULL)
      {
        penClosest = crRay.cr_penHit;
        fDistance = crRay.cr_fHitDistance;
        vDir = vDest[i]-vBase;
        vDir.Normalize();
        vHit = crRay.cr_vHit;

        if(i==0)
        {
          if(crRay.cr_penHit->GetRenderType()==RT_BRUSH)
          {
            INDEX iSurfaceType=crRay.cr_pbpoBrushPolygon->bpo_bppProperties.bpp_ubSurfaceType;
            EffectParticlesType eptType=GetParticleEffectTypeForSurface(iSurfaceType);

            FLOAT3D vNormal=crRay.cr_pbpoBrushPolygon->bpo_pbplPlane->bpl_plAbsolute;
            FLOAT3D vReflected = vDir-vNormal*(2.0f*(vNormal%vDir));
            ((CPlayer&)*m_penPlayer).AddBulletSpray( vBase+vFront, eptType, vReflected);

            // shake view
            ((CPlayer&)*m_penPlayer).m_fChainShakeStrength = 0.85f;
            ((CPlayer&)*m_penPlayer).m_fChainShakeFreqMod = 1.0f;
            ((CPlayer&)*m_penPlayer).m_tmChainShakeEnd = _pTimer->CurrentTick() + CHAINSAW_UPDATETIME*1.5f;

          }
          else if(crRay.cr_penHit->GetRenderType()==RT_MODEL)
          {
            BOOL bRender=TRUE;
            FLOAT3D vSpillDir=-((CPlayer&)*m_penPlayer).en_vGravityDir*0.5f;
            SprayParticlesType sptType=SPT_BLOOD;
            COLOR colParticles=C_WHITE|CT_OPAQUE;
            if (!IsDerivedFromClass(crRay.cr_penHit, "Enemy Base")) {
              sptType=SPT_NONE;
            }
            FLOAT fPower=4.0f;
            if( IsOfClass(crRay.cr_penHit, "Boneman"))   {sptType=SPT_BONES; fPower=6.0f;}
            if( IsOfClass(crRay.cr_penHit, "Gizmo") ||
                IsOfClass(crRay.cr_penHit, "Beast"))     {sptType=SPT_SLIME; fPower=4.0f;}
            if( IsOfClass(crRay.cr_penHit, "Woman"))     {sptType=SPT_FEATHER; fPower=3.0f;}
            if( IsOfClass(crRay.cr_penHit, "Elemental")) {sptType=SPT_LAVA_STONES; fPower=3.0f;}
            if( IsOfClass(crRay.cr_penHit, "Walker"))    {sptType=SPT_ELECTRICITY_SPARKS; fPower=30.0f;}
            if( IsOfClass(crRay.cr_penHit, "AirElemental"))    {sptType=SPT_AIRSPOUTS; fPower=6.0f;}
            if( IsOfClass(crRay.cr_penHit, "CannonRotating") ||
                IsOfClass(crRay.cr_penHit, "CannonStatic"))    {sptType=SPT_WOOD;}
            if( IsOfClass(crRay.cr_penHit, "ModelHolder2"))
            {
              bRender=FALSE;
              CModelDestruction *penDestruction = ((CModelHolder2&)*crRay.cr_penHit).GetDestruction();
              CModelHolder2 *pmh2=(CModelHolder2*)crRay.cr_penHit;
              colParticles=pmh2->m_colBurning;
              if( penDestruction!=NULL)
              {
                bRender=TRUE;
                sptType= penDestruction->m_sptType;
                if(sptType==SPT_COLOREDSTONE)
                {
                  colParticles=MulColors(colParticles,penDestruction->m_colParticles);
                }
              }
            }
            FLOATaabbox3D boxCutted=FLOATaabbox3D(FLOAT3D(0.0f, 0.0f, 0.0f),FLOAT3D(1.0f, 1.0f, 1.0f));
            if(bRender && m_tmLastChainsawSpray+0.2f<_pTimer->CurrentTick())
            {
              crRay.cr_penHit->en_pmoModelObject->GetCurrentFrameBBox( boxCutted);
              ((CPlayer&)*m_penPlayer).AddGoreSpray( vBase+vFront, vHit, sptType,
                vSpillDir, boxCutted, fPower, colParticles);
              m_tmLastChainsawSpray = _pTimer->CurrentTick();
            }

            // shake view
            ((CPlayer&)*m_penPlayer).m_fChainShakeStrength = 1.1f;
            ((CPlayer&)*m_penPlayer).m_fChainShakeFreqMod = 1.0f;
            ((CPlayer&)*m_penPlayer).m_tmChainShakeEnd = _pTimer->CurrentTick() + CHAINSAW_UPDATETIME*1.5f;

          }
        }

        if(crRay.cr_penHit->GetRenderType()==RT_MODEL && crRay.cr_fHitDistance<=fDistance)
        {
          // if this is primary ray
          if (i==0)
          {
            // don't search any more
            break;
          }
        }
      } else {
        // because we're firing, add just a slight shake
        ((CPlayer&)*m_penPlayer).m_fChainShakeStrength = 0.1f;
        ((CPlayer&)*m_penPlayer).m_fChainShakeFreqMod = 1.0f;
        ((CPlayer&)*m_penPlayer).m_tmChainShakeEnd = _pTimer->CurrentTick() + CHAINSAW_UPDATETIME*1.5f;
      }
    }
    // if any model hit
    if (penClosest!=NULL) {
      // [Cecil] Multiply damage
      InflictDirectDamage(penClosest, m_penPlayer, DMT_CHAINSAW, fDamage * FireSpeed(), vHit, vDir);
      return TRUE;
    }
    return FALSE;
  };

  // prepare Bullet
  void PrepareSniperBullet(FLOAT fX, FLOAT fY, FLOAT fDamage, FLOAT fImprecission) {
    // bullet start position
    CalcWeaponPositionImprecise(FLOAT3D(fX, fY, 0), plBullet, TRUE, fImprecission);
    // create bullet
    penBullet = CreateEntity(plBullet, CLASS_BULLET);
    m_vBulletSource = plBullet.pl_PositionVector;
    // init bullet
    EBulletInit eInit;
    eInit.penOwner = m_penPlayer;
    eInit.fDamage = fDamage;
    penBullet->Initialize(eInit);
  };

  // prepare Bullet
  void PrepareBullet(FLOAT fX, FLOAT fY, FLOAT fDamage) {
    // bullet start position
    CalcWeaponPosition(FLOAT3D(fX, fY, 0), plBullet, TRUE);
    // create bullet
    penBullet = CreateEntity(plBullet, CLASS_BULLET);
    // init bullet
    EBulletInit eInit;
    eInit.penOwner = m_penPlayer;
    eInit.fDamage = fDamage;
    penBullet->Initialize(eInit);
  };
  
  // [Cecil] X & Y -> Vector
  // fire one bullet
  void FireSniperBullet(FLOAT3D vPos, FLOAT fRange, FLOAT fDamage, FLOAT fImprecission) {
    PrepareSniperBullet(vPos(1), vPos(2), fDamage, fImprecission);
    ((CBullet&)*penBullet).CalcTarget(fRange);
    ((CBullet&)*penBullet).m_fBulletSize = 0.1f;
    // launch bullet
    ((CBullet&)*penBullet).LaunchBullet(TRUE, FALSE, TRUE);
    
    if (((CBullet&)*penBullet).m_vHitPoint != FLOAT3D(0.0f, 0.0f, 0.0f)) {
      m_vBulletTarget = ((CBullet&)*penBullet).m_vHitPoint;
    } else if (TRUE) {
      m_vBulletTarget = m_vBulletSource + FLOAT3D(0.0f, 0.0f, -500.0f)*((CBullet&)*penBullet).GetRotationMatrix();
      
    }
    
    // bullet no longer needed
    ((CBullet&)*penBullet).DestroyBullet();
  };

  // [Cecil] X & Y -> Vector
  // fire one bullet
  void FireOneBullet(FLOAT3D vPos, FLOAT fRange, FLOAT fDamage) {
    PrepareBullet(vPos(1), vPos(2), fDamage);
    ((CBullet&)*penBullet).CalcTarget(fRange);
    ((CBullet&)*penBullet).m_fBulletSize = 0.1f;
    // launch bullet
    ((CBullet&)*penBullet).LaunchBullet(TRUE, FALSE, TRUE);
    ((CBullet&)*penBullet).DestroyBullet();
  };

  // [Cecil] X & Y -> Vector; added bullet punch
  // fire bullets (x offset is used for double shotgun)
  void FireBullets(FLOAT3D vPos, FLOAT fRange, FLOAT fDamage, INDEX iBullets,
    FLOAT *afPositions, FLOAT fStretch, FLOAT fJitter, FLOAT fPunch)
  {
    PrepareBullet(vPos(1), vPos(2), fDamage);
    ((CBullet&)*penBullet).CalcTarget(fRange);
    ((CBullet&)*penBullet).m_fBulletSize = (GetSP()->sp_bCooperative ? 0.1f : 0.3f);

    // [Cecil] Bullet punch
    ((CBullet&)*penBullet).m_fPunch = fPunch;

    // launch slugs
    INDEX iSlug;
    for (iSlug = 0; iSlug < iBullets; iSlug++) {
      // launch bullet
      ((CBullet&)*penBullet).CalcJitterTargetFixed(
        afPositions[iSlug*2+0]*fRange*fStretch, afPositions[iSlug*2+1]*fRange*fStretch,
        fJitter*fRange*fStretch);
      ((CBullet&)*penBullet).LaunchBullet(iSlug < 2, FALSE, TRUE);
    }

    ((CBullet&)*penBullet).DestroyBullet();
  };
  
  // [Cecil] X & Y -> Vector
  // fire one bullet for machine guns (tommygun and minigun)
  void FireMachineBullet(FLOAT3D vPos, FLOAT fRange, FLOAT fDamage, 
    FLOAT fJitter, FLOAT fBulletSize)
  {
    fJitter *= fRange; // jitter relative to range
    PrepareBullet(vPos(1), vPos(2), fDamage);
    ((CBullet&)*penBullet).CalcTarget(fRange);
    ((CBullet&)*penBullet).m_fBulletSize = fBulletSize;
    ((CBullet&)*penBullet).CalcJitterTarget(fJitter);
    ((CBullet&)*penBullet).LaunchBullet(TRUE, FALSE, TRUE);
    ((CBullet&)*penBullet).DestroyBullet();
  }

  // [Cecil] Added poison grenades and custom damage
  // fire grenade
  void FireGrenade(INDEX iPower, BOOL bPoison, FLOAT fDamage) {
    // [Cecil] Grenade position
    FLOAT3D vGrenade = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), FirePos(WEAPON_GRENADELAUNCHER)(2), -0.15f);

    // grenade start position
    CPlacement3D plGrenade;
    CalcWeaponPosition(vGrenade, plGrenade, TRUE);

    // create grenade
    CEntityPointer penGrenade = CreateEntity(plGrenade, CLASS_PROJECTILE);
    // init and launch grenade
    ELaunchProjectile eLaunch;
    eLaunch.penLauncher = m_penPlayer;
    eLaunch.prtType = (bPoison ? PRT_FIRE_GRENADE : PRT_GRENADE);
    eLaunch.fSpeed = 20.0f + iPower*5.0f;
    eLaunch.fDamage = fDamage * 0.75f;
    eLaunch.fRangeDamage = fDamage;
    penGrenade->Initialize(eLaunch);
  };
  
  // [Cecil] Added custom damage
  void FireRocket(FLOAT fDamage) {
    // [Cecil] Rocket position
    FLOAT3D vRocket = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), FirePos(WEAPON_ROCKETLAUNCHER)(2), -0.15f);

    // rocket start position
    CPlacement3D plRocket;
    CalcWeaponPosition(vRocket, plRocket, TRUE);

    // create rocket
    CEntityPointer penRocket = CreateEntity(plRocket, CLASS_PROJECTILE);
    // init and launch rocket
    ELaunchProjectile eLaunch;
    eLaunch.penLauncher = m_penPlayer;
    eLaunch.prtType = (m_bChainLauncher ? PRT_CHAINSAW_ROCKET : PRT_ROCKET);
    eLaunch.fDamage = fDamage;
    
    // [Cecil] Range damage only for normal rockets
    if (!m_bChainLauncher) {
      eLaunch.fRangeDamage = fDamage * (GetSP()->sp_bCooperative ? 0.5f : 1.0f);
    }

    penRocket->Initialize(eLaunch);
  };

  // flamer source
  void GetFlamerSourcePlacement(CPlacement3D &plSource, CPlacement3D &plInFrontOfPipe) {
    // [Cecil] Flamer position
    FLOAT3D vPos = RenderPos(WEAPON_FLAMER).vFire + FLOAT3D(0.0f, 0.0f, -0.15f);
    CalcLerpedWeaponPosition(vPos, plSource, FALSE);

    plInFrontOfPipe = plSource;

    FLOAT3D vFront;
    AnglesToDirectionVector(plSource.pl_OrientationAngle, vFront);
    plInFrontOfPipe.pl_PositionVector = plSource.pl_PositionVector+vFront*1.0f;
  };
  
  // [Cecil] Added custom damage
  // fire flame
  void FireFlame(FLOAT fDamage) {
    // [Cecil] Fire position
    FLOAT3D vFire = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), FirePos(WEAPON_FLAMER)(2), -0.15f);

    // flame start position
    CPlacement3D plFlame;
    CalcWeaponPosition(vFire, plFlame, TRUE);

    // create flame
    CEntityPointer penFlame = CreateEntity(plFlame, CLASS_PROJECTILE);
    // init and launch flame
    ELaunchProjectile eLaunch;
    eLaunch.penLauncher = m_penPlayer;
    eLaunch.prtType = PRT_FLAME;
    eLaunch.fDamage = fDamage;
    penFlame->Initialize(eLaunch);

    // [Cecil] Assert flame existence
    // link last flame with this one (if not NULL or deleted)
    if (ASSERT_ENTITY(m_penFlame)) {
      ((CProjectile&)*m_penFlame).m_penParticles = penFlame;
    }

    // link to player weapons
    ((CProjectile&)*penFlame).m_penParticles = this;

    // store last flame
    m_penFlame = penFlame;
  };
  
  // [Cecil] Added custom damage
  // fire laser ray
  void FireLaserRay(FLOAT fDamage) {
    // [Cecil] Laser position
    FLOAT3D vLaser = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), FirePos(WEAPON_LASER)(2), 0.0f);

    // laser start position
    CPlacement3D plLaserRay;
    FLOAT fFX = vLaser(1); // get laser center position
    FLOAT fFY = vLaser(2);
    FLOAT fLUX = 0.0f;
    FLOAT fRUX = 0.6f;
    FLOAT fLUY = 0.0f;
    FLOAT fRUY = 0.0f;
    FLOAT fLDX = -0.1f;
    FLOAT fRDX = 0.7f;
    FLOAT fLDY = -0.3f;
    FLOAT fRDY = -0.3f;

    if (GetPlayer()->m_pstState == PST_CROUCH) {
      fLDY = -0.1f;
      fRDY = -0.1f;
    }

    switch (m_iLaserBarrel) {
      case 0: // barrel lu (*o-oo)
        CalcWeaponPosition(FLOAT3D(fFX+fLUX, fFY+fLUY, 0.0f), plLaserRay, TRUE);
        break;

      case 1: // barrel ld (oo-*o)
        CalcWeaponPosition(FLOAT3D(fFX+fLDX, fFY+fLDY, 0.0f), plLaserRay, TRUE);
        break;

      case 2: // barrel ru (o*-oo)
        CalcWeaponPosition(FLOAT3D(fFX+fRUX, fFY+fRUY, 0.0f), plLaserRay, TRUE);
        break;

      case 3: // barrel rd (oo-o*)
        CalcWeaponPosition(FLOAT3D(fFX+fRDX, fFY+fRDY, 0.0f), plLaserRay, TRUE);
        break;
    }

    // create laser projectile
    CEntityPointer penLaser = CreateEntity(plLaserRay, CLASS_PROJECTILE);

    // init and launch laser projectile
    ELaunchProjectile eLaunch;
    eLaunch.penLauncher = m_penPlayer;
    eLaunch.prtType = PRT_LASER_RAY;
    eLaunch.fDamage = fDamage;
    penLaser->Initialize(eLaunch);
  };

  // [Cecil] Use Laser position
  void GetGhostBusterSourcePlacement(CPlacement3D &plSource) {
    // [Cecil] Laser position
    FLOAT3D vLaser = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), 0.0f, 0.0f);
    CalcWeaponPosition(vLaser, plSource, TRUE);
  };

  // [Cecil] Tesla gun position
  void GetTeslaPlacement(CPlacement3D &plSource) {
    // tesla position
    FLOAT3D vTesla = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), FirePos(WEAPON_FLAMER)(2) - 0.2f, -1.5f);
    CalcWeaponPosition(vTesla, plSource, FALSE);
  };

  // [Cecil] Added ray power and custom damage
  void FireGhostBusterRay(FLOAT fPower, FLOAT fDamage) {
    // ray start position
    CPlacement3D plRay;
    GetGhostBusterSourcePlacement(plRay);

    // fire ray
    ((CGhostBusterRay&)*m_penGhostBusterRay).Fire(plRay, fPower, fDamage);
  };
  
  // [Cecil] Added custom damage
  // fire cannon ball
  void FireCannonBall(INDEX iPower, BOOL bNuke, FLOAT fDamage) {
    // [Cecil] Ball position
    FLOAT3D vBall = FLOAT3D(-CUR_WEAPON.GetPosition().Pos1(1), FirePos(WEAPON_IRONCANNON)(2), 0.0f);

    // cannon ball start position
    CPlacement3D plBall;
    CalcWeaponPosition(vBall, plBall, TRUE);

    // create cannon ball
    CEntityPointer penBall = CreateEntity(plBall, CLASS_CANNONBALL);

    // init and launch cannon ball
    ELaunchCannonBall eLaunch;
    eLaunch.penLauncher = m_penPlayer;
    eLaunch.fLaunchPower = (bNuke ? 30.0f : 60.0f) + iPower * (bNuke ? 2.0f : 4.0f); // ranges from 60-140 (since iPower can be max 20)
    eLaunch.fSize = 3.0f;
    eLaunch.cbtType = (bNuke ? CBT_NUKE : CBT_IRON);
    eLaunch.fDamage = fDamage;
    penBall->Initialize(eLaunch);
  };

  // weapon sound when firing
  void SpawnRangeSound(FLOAT fRange) {
    if( _pTimer->CurrentTick()>m_tmRangeSoundSpawned+0.5f) {
      m_tmRangeSoundSpawned = _pTimer->CurrentTick();
      ::SpawnRangeSound( m_penPlayer, m_penPlayer, SNDT_PLAYER, fRange);
    }
  };

  // clear weapons
  void ClearWeapons(void) {
    // [Cecil] Don't clear secret weapons in coop
    BOOL bClear = !GetSP()->sp_bCooperative || !(GetSP()->sp_iAMPOptions & AMP_KEEPSECRETS);

    if (bClear) {
      // [Cecil] 0x03 -> 0x00
      m_iAvailableWeapons = 0x00;
    }

    // [Cecil] Clear ammo amounts
    INDEX iClear;
    for (iClear = 0; iClear < m_aAmmo.Count(); iClear++) {
      m_aAmmo[iClear].iAmount = 0;
    }

    // [Cecil] Clear magazines
    for (iClear = 0; iClear < m_aWeapons.Count(); iClear++) {
      m_aWeapons[iClear].iMag = 0;
    }
  };

  void ResetWeaponMovingOffset(void) {
    // reset weapon draw offset
    m_fWeaponDrawPowerOld = m_fWeaponDrawPower = m_tmDrawStartTime = 0;
  };

  // initialize weapons
  void InitializeWeapons(INDEX iGiveWeapons, INDEX iTakeWeapons, INDEX iTakeAmmo, FLOAT fMaxAmmoRatio) {
    ResetWeaponMovingOffset();
    // remember old weapons
    ULONG ulOldWeapons = m_iAvailableWeapons;

    // [Cecil] Keep all weapons in coop
    BOOL bKeep = (GetSP()->sp_bCooperative && GetSP()->sp_iAMPOptions & AMP_KEEPSECRETS);
    if (bKeep) {
      ulOldWeapons = 0;
    }

    // give/take weapons
    m_iAvailableWeapons &= ~iTakeWeapons;

    // [Cecil] 0x03 -> GetSP()->sp_iWeaponGiver
    m_iAvailableWeapons |= (GetSP()->sp_iWeaponGiver | iGiveWeapons);

    // [Cecil] Remove weapons whose items were disabled
    if (GetSP()->sp_iAMPOptions & AMP_TAKEWEAPONS) {
      INDEX iRemoved = (GetSP()->sp_iItemRemoval & WEAPONS_ALLAVAILABLEMASK);
      m_iAvailableWeapons &= iRemoved;
    }

    m_iAvailableWeapons &= WEAPONS_ALLAVAILABLEMASK;

    // find which weapons are new
    ULONG ulNewWeapons = m_iAvailableWeapons & ~ulOldWeapons;

    // [Cecil] Starting ammo
    const BOOL bStartAmmo = (GetSP()->sp_iAMPOptions & AMP_STARTAMMO);

    // for each new weapon
    for (INDEX iWeapon = WEAPON_KNIFE; iWeapon < WEAPON_LAST; iWeapon++) {
      if (WeaponExists(ulNewWeapons, iWeapon)) {
        // [Cecil] Give all ammo
        // add default amount of ammo
        AddDefaultAmmoForWeapon(iWeapon, (bStartAmmo ? 1.0f : fMaxAmmoRatio));
      }
    }

    // [Cecil] Don't take starting ammo
    if (!bStartAmmo) {
      // [Cecil] Take away first 8 ammo types
      for (INDEX iTake = 1; iTake <= 8; iTake++) {
        INDEX iAmmoBit = (1 << _aiTakeAmmoBits[iTake-1]);

        if (iTakeAmmo & iAmmoBit) {
          m_aAmmo[iTake].iAmount = 0;
        }
      }
    }
    
    // [Cecil] Reload weapons
    for (INDEX iReload = 0; iReload < m_aWeapons.Count(); iReload++) {
      m_aWeapons[iReload].Reload();
    }

    // precache eventual new weapons
    Precache();

    // clear temp variables for some weapons
    m_aMiniGun = 0;
    m_aMiniGunLast = 0;
    m_aMiniGunSpeed = 0;

    // select best weapon
    SelectNewWeapon();
    m_iCurrentWeapon=m_iWantedWeapon;
    wpn_iCurrent = m_iCurrentWeapon;
    m_bChangeWeapon = FALSE;

    // set weapon model for current weapon
    SetCurrentWeaponModel();

    // remove weapon attachment
    ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).RemoveWeapon();
    // add weapon attachment
    ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).SetWeapon();
  };

  void CheatOpen(void) {
    if (IsOfClass(m_penRayHit, "Moving Brush")) {
      m_penRayHit->SendEvent(ETrigger());
    }
  };

  // cheat give all
  void CheatGiveAll(void) {
    // all weapons
    m_iAvailableWeapons = WEAPONS_ALLAVAILABLEMASK;

    // [Cecil] Give all ammo
    for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
      m_aAmmo[i].SetMax();
    }

    // precache eventual new weapons
    Precache();
  };

  // add a given amount of mana to the player
  void AddManaToPlayer(INDEX iMana) {
    ((CPlayer&)*m_penPlayer).m_iMana += iMana;
    ((CPlayer&)*m_penPlayer).m_fPickedMana += iMana;
  };

  // clamp ammounts of all ammunition to maximum values
  void ClampAllAmmo(void) {
    // [Cecil] Limit all ammo
    for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
      INDEX &iAmmo = m_aAmmo[i].iAmount;

      iAmmo = ClampUp(iAmmo, m_aAmmo[i].Max());
    }
  };

  // add default ammount of ammunition when receiving a weapon
  void AddDefaultAmmoForWeapon(INDEX iWeapon, FLOAT fMaxAmmoRatio) {
    // [Cecil] Add all ammo if infinite
    if (GetSP()->sp_bInfiniteAmmo) {
      fMaxAmmoRatio = 1.0f;
    }
    
    // [Cecil] Get weapon
    SPlayerWeapon &pw = m_aWeapons[iWeapon];
    SWeaponStruct &ws = *pw.pWeaponStruct;

    // [Cecil] Define ammo amounts
    FLOAT fPickupAmmo = Max(FLOAT(ws.iPickup), pw.MaxAmmo() * fMaxAmmoRatio);
    FLOAT fPickupAlt = Max(FLOAT(ws.iPickupAlt), pw.MaxAlt() * fMaxAmmoRatio);

    // [Cecil] Ammo references
    SPlayerAmmo *pAmmo = pw.pAmmo;
    SPlayerAmmo *pAlt = pw.pAlt;

    // [Cecil] Add ammo
    if (pAmmo != NULL) {
      pAmmo->iAmount += fPickupAmmo;
      AddManaToPlayer(fPickupAmmo * ws.fMana * MANA_AMMO);
    }

    // [Cecil] NOTE: Crashes around here
    if (pAlt != NULL) {
      pAlt->iAmount += fPickupAlt;
      AddManaToPlayer(fPickupAlt * ws.fMana * MANA_AMMO);
    }

    // make sure we don't have more ammo than maximum
    ClampAllAmmo();
  };

  // drop current weapon (in deathmatch)
  void DropWeapon(void) {
    // [Cecil] No weapon
    if (m_iCurrentWeapon == WEAPON_NONE) {
      return;
    }

    CEntityPointer penWeapon = CreateEntity(GetPlayer()->GetPlacement(), CLASS_WEAPONITEM);
    CWeaponItem *pwi = (CWeaponItem*)&*penWeapon;

    WeaponItemType wit = WIT_COLT;
    switch (m_iCurrentWeapon) {
      default:
        ASSERT(FALSE);
      // [Cecil] Drop knife
      case WEAPON_KNIFE: wit = WIT_KNIFE; break;

      case WEAPON_COLT:
      case WEAPON_DOUBLECOLT: wit = WIT_COLT; break;

      case WEAPON_SINGLESHOTGUN: wit = WIT_SINGLESHOTGUN; break;
      case WEAPON_DOUBLESHOTGUN: wit = WIT_DOUBLESHOTGUN; break;
      case WEAPON_TOMMYGUN: wit = WIT_TOMMYGUN; break;
      case WEAPON_SNIPER: wit = WIT_SNIPER; break;
      case WEAPON_MINIGUN: wit = WIT_MINIGUN; break;
      case WEAPON_ROCKETLAUNCHER: wit = WIT_ROCKETLAUNCHER; break;
      case WEAPON_GRENADELAUNCHER: wit = WIT_GRENADELAUNCHER; break;
      case WEAPON_FLAMER: wit = WIT_FLAMER; break;
      case WEAPON_CHAINSAW: wit = WIT_CHAINSAW; break;
      case WEAPON_LASER : wit = WIT_LASER; break;
      case WEAPON_IRONCANNON : wit = WIT_CANNON; break;
    }

    pwi->m_EwitType = wit;
    pwi->m_bDropped = TRUE;
    pwi->CEntity::Initialize();
    
    const FLOATmatrix3D &m = GetPlayer()->GetRotationMatrix();
    FLOAT3D vSpeed = FLOAT3D(5.0f, 10.0f, -7.5f);
    pwi->GiveImpulseTranslationAbsolute(vSpeed*m);
  };

  // receive weapon
  BOOL ReceiveWeapon(const CEntityEvent &ee) {
    ASSERT(ee.ee_slEvent == EVENTCODE_EWeaponItem);
    
    // [Cecil] Get weapon type
    INDEX iReceiveType = ((EWeaponItem&)ee).iWeapon;

    // [Cecil] Random weapon item
    if (iReceiveType == WIT_RANDOM) {
      iReceiveType = WeaponItemType(IRnd() % 13);

      // replace weapons with unlimited ammo with something else
      if ((iReceiveType == WIT_KNIFE    && m_iAvailableWeapons & IRF_KNIFE)
       || (iReceiveType == WIT_CHAINSAW && m_iAvailableWeapons & IRF_CHAINSAW)
       || (iReceiveType == WIT_COLT     && m_iAvailableWeapons & IRF_COLT && m_iAvailableWeapons & IRF_DCOLT)) {
        iReceiveType = WeaponItemType(IRnd() % 10 + 3);
      }

    } else {
      // [Cecil] Don't receive disabled weapons
      BOOL bEnabled = (GetSP()->sp_iItemRemoval & _aiWeaponItemFlags[iReceiveType]);
      if (!bEnabled) {
        return TRUE;
      }
    }

    // [Cecil] Don't give anything on pickup
    if (GetSP()->sp_iWeaponItems == 0) {
      return TRUE;
    }

    INDEX wit = iReceiveType;

    switch (iReceiveType) {
      // [Cecil] Knife item
      case WIT_KNIFE:           iReceiveType = WEAPON_KNIFE; break;
      case WIT_COLT:            iReceiveType = WEAPON_COLT; break;
      case WIT_SINGLESHOTGUN:   iReceiveType = WEAPON_SINGLESHOTGUN; break;
      case WIT_DOUBLESHOTGUN:   iReceiveType = WEAPON_DOUBLESHOTGUN; break;
      case WIT_TOMMYGUN:        iReceiveType = WEAPON_TOMMYGUN; break;
      case WIT_SNIPER:          iReceiveType = WEAPON_SNIPER; break;
      case WIT_MINIGUN:         iReceiveType = WEAPON_MINIGUN; break;
      case WIT_ROCKETLAUNCHER:  iReceiveType = WEAPON_ROCKETLAUNCHER; break;
      case WIT_GRENADELAUNCHER: iReceiveType = WEAPON_GRENADELAUNCHER; break;
      case WIT_FLAMER:          iReceiveType = WEAPON_FLAMER; break;
      case WIT_CHAINSAW:        iReceiveType = WEAPON_CHAINSAW; break;
      case WIT_LASER:           iReceiveType = WEAPON_LASER; break;
      case WIT_CANNON:          iReceiveType = WEAPON_IRONCANNON; break;
      default: ASSERTALWAYS("Uknown weapon type");
    }

    // add weapon
    if (iReceiveType == WEAPON_COLT && (m_iAvailableWeapons & (1 << (WEAPON_COLT-1)))) {
      iReceiveType = WEAPON_DOUBLECOLT;
    }

    ULONG ulOldWeapons = m_iAvailableWeapons;
    m_iAvailableWeapons |= 1 << (iReceiveType-1);

    // precache eventual new weapons
    Precache();

    CTFileName fnmMsg;
    switch (wit) {
      // [Cecil] Knife item
      case WIT_KNIFE:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("Military Knife"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\knife.txt");
        break;

      case WIT_COLT:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("Shofield .45 w/ TMAR"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\colt.txt");
        break;

      case WIT_SINGLESHOTGUN:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("12 Gauge Pump Action Shotgun"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\singleshotgun.txt");
        break;

      case WIT_DOUBLESHOTGUN:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("Double Barrel Coach Gun"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\doubleshotgun.txt");
        break;

      case WIT_TOMMYGUN:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("M1-A2 Tommygun"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\tommygun.txt");
        break;

      case WIT_SNIPER:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("RAPTOR 16mm Sniper"), 0);
        fnmMsg = CTFILENAME("DataMP\\Messages\\Weapons\\sniper.txt");
        break;

      case WIT_MINIGUN:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("XM214-A Minigun"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\minigun.txt");
        break;

      case WIT_ROCKETLAUNCHER:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("XPML21 Rocket Launcher"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\rocketlauncher.txt");
        break;

      case WIT_GRENADELAUNCHER:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("MKIII Grenade Launcher"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\grenadelauncher.txt");
        break;

      case WIT_FLAMER:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("XOP Flamethrower"), 0);
        fnmMsg = CTFILENAME("DataMP\\Messages\\Weapons\\flamer.txt");
        break;

      case WIT_CHAINSAW:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("'Bonecracker' P-LAH Chainsaw"), 0);
        fnmMsg = CTFILENAME("DataMP\\Messages\\Weapons\\chainsaw.txt");
        break;

      case WIT_LASER:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("XL2 Lasergun"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\laser.txt");
        break;

      case WIT_CANNON:
        ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("SBC Cannon"), 0);
        fnmMsg = CTFILENAME("Data\\Messages\\Weapons\\cannon.txt");
        break;

      default: ASSERTALWAYS("Uknown weapon type");
    }

    // send computer message
    if (GetSP()->sp_bCooperative) {
      EComputerMessage eMsg;
      eMsg.fnmMessage = fnmMsg;
      m_penPlayer->SendEvent(eMsg);
    }

    // add the ammunition
    AddDefaultAmmoForWeapon(iReceiveType, 0);

    // if this weapon should be auto selected
    BOOL bAutoSelect = FALSE;
    INDEX iSelectionSetting = GetPlayer()->GetSettings()->ps_iWeaponAutoSelect;
    if (iSelectionSetting==PS_WAS_ALL) {
      bAutoSelect = TRUE;
    } else if (iSelectionSetting==PS_WAS_ONLYNEW) {
      if (m_iAvailableWeapons&~ulOldWeapons) {
        bAutoSelect = TRUE;
      }
    } else if (iSelectionSetting==PS_WAS_BETTER) {
      // [Cecil] No position remapping
      if (m_iCurrentWeapon < iReceiveType) {
        bAutoSelect = TRUE;
      }
    }
    if (bAutoSelect) {
      // select it
      if (WeaponSelectOk((WeaponType)iReceiveType)) {
        SendEvent(EBegin());
      }
    }

    return TRUE;
  };

  // receive ammo
  BOOL ReceiveAmmo(const CEntityEvent &ee) {
    ASSERT(ee.ee_slEvent == EVENTCODE_EAmmoItem);

    // if infinite ammo is on
    if (GetSP()->sp_bInfiniteAmmo) {
      // pick all items anyway (items that exist in this mode are only those that
      // trigger something when picked - so they must be picked)
      return TRUE;
    }

    EAmmoItem &Eai = (EAmmoItem&)ee;

    // [Cecil] Find proper ammo type
    INDEX iType = _aiAmmoSetTypes[Eai.EaitType];

    // [Cecil] Invalid type
    if (iType == -1) {
      CPrintF("^cff0000Warning: Picking invalid ammo type: %d^r\n", Eai.EaitType);
      return TRUE;

    // [Cecil] Back packs
    } else if (Eai.EaitType == AIT_BACKPACK || Eai.EaitType == AIT_SERIOUSPACK) {
      // add ammo
      switch (Eai.EaitType) {
        case AIT_BACKPACK:
          m_aAmmo[1].iAmount +=  20 * GetSP()->sp_fAmmoQuantity * AmmoMul();
          m_aAmmo[2].iAmount += 200 * GetSP()->sp_fAmmoQuantity * AmmoMul();
          m_aAmmo[3].iAmount +=   5 * GetSP()->sp_fAmmoQuantity * AmmoMul();

          ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("Ammo pack"), 0);
          // [Cecil] Set to 100
          AddManaToPlayer(100.0f * MANA_AMMO);
          break;

        case AIT_SERIOUSPACK: {
          // [Cecil] Give all ammo
          for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
            m_aAmmo[i].SetMax();
          }

          ((CPlayer&)*m_penPlayer).ItemPicked(TRANS("All Ammo"), 0);

          // [Cecil] Set to 1000
          AddManaToPlayer(1000.0f * MANA_AMMO);
        } break;
      }

      return TRUE;
    }

    // [Cecil] Ammo amount
    INDEX iAmmo = ceil(FLOAT(Eai.iQuantity) * AmmoMul());

    // [Cecil] Ammo reference
    SPlayerAmmo &paAmmo = m_aAmmo[iType];

    // [Cecil] Enough ammo
    if (paAmmo.iAmount >= paAmmo.Max()) {
      paAmmo.SetMax();
      return FALSE;
    }
    
    // [Cecil] Add ammo
    paAmmo.iAmount += iAmmo;

    CTString &strPick = paAmmo.pAmmoStruct->strPickup;
    ((CPlayer&)*m_penPlayer).ItemPicked(Translate(strPick.str_String), iAmmo);

    AddManaToPlayer(iAmmo * paAmmo.pAmmoStruct->fMana * MANA_AMMO);

    // make sure we don't have more ammo than maximum
    ClampAllAmmo();
    return TRUE;
  };

  // receive ammo
  BOOL ReceivePackAmmo(const CEntityEvent &ee) {
    // if infinite ammo is on
    if (GetSP()->sp_bInfiniteAmmo) {
      // pick all items anyway (items that exist in this mode are only those that
      // trigger something when picked - so they must be picked)
      return TRUE;
    }

    ASSERT(ee.ee_slEvent == EVENTCODE_EAmmoPackItem);
    EAmmoPackItem &eapi = (EAmmoPackItem &)ee;

    // [Cecil] Default ammo set
    INDEX aiSet[8];
    aiSet[0] = eapi.iShells;
    aiSet[1] = eapi.iBullets;
    aiSet[2] = eapi.iRockets;
    aiSet[3] = eapi.iGrenades;
    aiSet[4] = eapi.iNapalm;
    aiSet[5] = eapi.iSniperBullets;
    aiSet[6] = eapi.iElectricity;
    aiSet[7] = eapi.iIronBalls;

    // [Cecil] Check if lacking some ammo
    BOOL bLacking = FALSE;
    INDEX iTypes = 0;

    for (INDEX iCheck = 1; iCheck <= 8; iCheck++) {
      if (aiSet[iCheck-1] > 0) {
        // count types
        iTypes++;

        bLacking |= !m_aAmmo[iCheck].Full();
      }
    }

    if (bLacking) {
      // [Cecil] Add ammo
      for (INDEX iAdd = 1; iAdd <= 8; iAdd++) {
        m_aAmmo[iAdd].iAmount += ceil(FLOAT(aiSet[iAdd-1]) * AmmoMul());
      }

      // make sure we don't have more ammo than maximum
      ClampAllAmmo();

      // preapare message string
      CTString strMessage;

      // [Cecil] Print simple message
      if (iTypes > 4) {
        strMessage.PrintF(TRANS("Ammo pack"));

      // [Cecil] Print each type
      } else {
        for (INDEX i = 1; i <= 8; i++) {
          // [Cecil] No ammo
          if (aiSet[i-1] <= 0) {
            continue;
          }

          // [Cecil] Next type
          if (strMessage != "") {
            strMessage += ", ";
          }

          // [Cecil] Print the type
          CTString &strPick = m_aAmmo[i].pAmmoStruct->strPickup;
          strMessage.PrintF("%s%s %d", strMessage, Translate(strPick.str_String), aiSet[i-1]);
        }
      }

      ((CPlayer&)*m_penPlayer).ItemPicked(strMessage, 0);
      return TRUE;
    }
    return FALSE;
  }

  // get weapon from selected number
  WeaponType GetStrongerWeapon(INDEX iWeapon) {
    switch(iWeapon) {
      case 1: return WEAPON_CHAINSAW;
      case 2: return WEAPON_DOUBLECOLT;
      case 3: return WEAPON_DOUBLESHOTGUN;
      case 4: return WEAPON_MINIGUN;
      case 5: return WEAPON_ROCKETLAUNCHER;
      case 6: return WEAPON_FLAMER; 
      case 7: return WEAPON_LASER;
      case 8: return WEAPON_IRONCANNON;
    }
    return WEAPON_NONE;
  };

  // get selected number for weapon
  INDEX GetSelectedWeapon(WeaponType EwtSelectedWeapon) {
    switch(EwtSelectedWeapon) {
      case WEAPON_KNIFE: case WEAPON_CHAINSAW: return 1;
      case WEAPON_COLT: case WEAPON_DOUBLECOLT: return 2;
      case WEAPON_SINGLESHOTGUN: case WEAPON_DOUBLESHOTGUN: return 3;
      case WEAPON_TOMMYGUN: case WEAPON_MINIGUN: return 4;
      case WEAPON_ROCKETLAUNCHER: case WEAPON_GRENADELAUNCHER: return 5;
      case WEAPON_FLAMER: case WEAPON_SNIPER: return 6;
      case WEAPON_LASER: return 7;
      case WEAPON_IRONCANNON: return 8;
    }
    return 0;
  };

  // get secondary weapon from selected one
  WeaponType GetAltWeapon(WeaponType EwtWeapon) {
    switch (EwtWeapon) {
      case WEAPON_KNIFE: return WEAPON_CHAINSAW;
      case WEAPON_CHAINSAW: return WEAPON_KNIFE;
      case WEAPON_COLT: return WEAPON_DOUBLECOLT;
      case WEAPON_DOUBLECOLT: return WEAPON_COLT;
      case WEAPON_SINGLESHOTGUN: return WEAPON_DOUBLESHOTGUN;
      case WEAPON_DOUBLESHOTGUN: return WEAPON_SINGLESHOTGUN;
      case WEAPON_TOMMYGUN: return WEAPON_MINIGUN;
      case WEAPON_MINIGUN: return WEAPON_TOMMYGUN;
      case WEAPON_ROCKETLAUNCHER: return WEAPON_GRENADELAUNCHER;
      case WEAPON_GRENADELAUNCHER: return WEAPON_ROCKETLAUNCHER;
      case WEAPON_FLAMER: return WEAPON_SNIPER;
      case WEAPON_SNIPER: return WEAPON_FLAMER;
      case WEAPON_LASER: return WEAPON_LASER;
      case WEAPON_IRONCANNON: return WEAPON_IRONCANNON;
    }
    return WEAPON_NONE;
  };

  // select new weapon if possible
  BOOL WeaponSelectOk(WeaponType wtToTry) {
    // if player has weapon and has enough ammo
    if (WeaponExists(m_iAvailableWeapons, wtToTry) && HasAmmo(wtToTry)) {
      // if different weapon
      if (wtToTry != m_iCurrentWeapon) {
        // initiate change
        m_iWantedWeapon = wtToTry;
        m_bChangeWeapon = TRUE;
      }

      return TRUE;
    }

    // no weapon or not enough ammo
    return FALSE;
  };

  // select new weapon when no more ammo
  void SelectNewWeapon() {
    // [Cecil] Added WEAPON_NONE
    switch (m_iCurrentWeapon) {
      case WEAPON_NONE: 
      case WEAPON_KNIFE: case WEAPON_COLT: case WEAPON_DOUBLECOLT: 
      case WEAPON_SINGLESHOTGUN: case WEAPON_DOUBLESHOTGUN:
      case WEAPON_TOMMYGUN: case WEAPON_MINIGUN: case WEAPON_SNIPER:
        WeaponSelectOk(WEAPON_MINIGUN)||
        WeaponSelectOk(WEAPON_TOMMYGUN)||
        WeaponSelectOk(WEAPON_DOUBLESHOTGUN)||
        WeaponSelectOk(WEAPON_SINGLESHOTGUN)||
        WeaponSelectOk(WEAPON_DOUBLECOLT)||
        WeaponSelectOk(WEAPON_COLT)||
        WeaponSelectOk(WEAPON_KNIFE)||
        WeaponSelectOk(WEAPON_NONE);
        break;

      case WEAPON_IRONCANNON:
        WeaponSelectOk(WEAPON_ROCKETLAUNCHER)||
        WeaponSelectOk(WEAPON_GRENADELAUNCHER)||
        WeaponSelectOk(WEAPON_MINIGUN)||
        WeaponSelectOk(WEAPON_TOMMYGUN)||
        WeaponSelectOk(WEAPON_DOUBLESHOTGUN)||
        WeaponSelectOk(WEAPON_SINGLESHOTGUN)||
        WeaponSelectOk(WEAPON_DOUBLECOLT)||
        WeaponSelectOk(WEAPON_COLT)||
        WeaponSelectOk(WEAPON_KNIFE)||
        WeaponSelectOk(WEAPON_NONE);
        break;

      case WEAPON_ROCKETLAUNCHER:
      case WEAPON_GRENADELAUNCHER:
        WeaponSelectOk(WEAPON_ROCKETLAUNCHER)||
        WeaponSelectOk(WEAPON_GRENADELAUNCHER)||
        WeaponSelectOk(WEAPON_MINIGUN)||
        WeaponSelectOk(WEAPON_TOMMYGUN)||
        WeaponSelectOk(WEAPON_DOUBLESHOTGUN)||
        WeaponSelectOk(WEAPON_SINGLESHOTGUN)||
        WeaponSelectOk(WEAPON_DOUBLECOLT)||
        WeaponSelectOk(WEAPON_COLT)||
        WeaponSelectOk(WEAPON_KNIFE)||
        WeaponSelectOk(WEAPON_NONE);
        break;

      case WEAPON_LASER:  case WEAPON_FLAMER:  case WEAPON_CHAINSAW:
        WeaponSelectOk(WEAPON_LASER)||
        WeaponSelectOk(WEAPON_FLAMER)||
        WeaponSelectOk(WEAPON_MINIGUN)||
        WeaponSelectOk(WEAPON_TOMMYGUN)||
        WeaponSelectOk(WEAPON_DOUBLESHOTGUN)||
        WeaponSelectOk(WEAPON_SINGLESHOTGUN)||
        WeaponSelectOk(WEAPON_DOUBLECOLT)||
        WeaponSelectOk(WEAPON_COLT)||
        WeaponSelectOk(WEAPON_KNIFE)||
        WeaponSelectOk(WEAPON_NONE);
        break;

      default:
        WeaponSelectOk(WEAPON_KNIFE)||
        WeaponSelectOk(WEAPON_NONE);
    }
  };

  // does weapon have ammo
  BOOL HasAmmo(WeaponType EwtWeapon) {
    return PredTail()->m_aWeapons[EwtWeapon].HasAmmo(AltFireExists(EwtWeapon));
  };

  // [Cecil] Forced animation flag
  void PlayDefaultAnim(BOOL bForced) {
    ULONG ulFlags = AOF_LOOPING|AOF_NORESTART;

    // [Cecil] Smooth animation if not forcing
    if (!bForced) {
      ulFlags |= AOF_SMOOTHCHANGE;
    }

    switch(m_iCurrentWeapon) {
      case WEAPON_NONE: break;

      case WEAPON_KNIFE:
        m_moWeapon.PlayAnim(KNIFE_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_DOUBLECOLT:
        m_moWeaponSecond.PlayAnim(COLT_ANIM_WAIT1, ulFlags);
      case WEAPON_COLT:
        m_moWeapon.PlayAnim(COLT_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_SINGLESHOTGUN:
        m_moWeapon.PlayAnim(SINGLESHOTGUN_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_DOUBLESHOTGUN:
        m_moWeapon.PlayAnim(DOUBLESHOTGUN_ANIM_WAIT1, ulFlags);
        // [Cecil] Hide the hand
        m_moWeaponSecond.StretchModel(FLOAT3D(0.0f, 0.0f, 0.0f));
        break;

      case WEAPON_TOMMYGUN:
        m_moWeapon.PlayAnim(TOMMYGUN_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_SNIPER:
        m_moWeapon.PlayAnim(SNIPER_ANIM_WAIT01, ulFlags);
        break;

      case WEAPON_MINIGUN:
        m_moWeapon.PlayAnim(MINIGUN_ANIM_WAIT1, ulFlags);

        // [Cecil] Dual minigun
        if (AltFireExists(WEAPON_MINIGUN)) {
          m_moWeaponSecond.PlayAnim(MINIGUN_ANIM_WAIT1, ulFlags);
        }
        break;

      case WEAPON_ROCKETLAUNCHER:
        m_moWeapon.PlayAnim(ROCKETLAUNCHER_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_GRENADELAUNCHER:
        m_moWeapon.PlayAnim(GRENADELAUNCHER_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_FLAMER:
        m_moWeapon.PlayAnim(FLAMER_ANIM_WAIT01, ulFlags);
        break;

      case WEAPON_CHAINSAW:
        m_moWeapon.PlayAnim(CHAINSAW_ANIM_WAIT1, ulFlags);
        break;

      case WEAPON_LASER:
        m_moWeapon.PlayAnim(LASER_ANIM_WAIT01, ulFlags);
        break;

      case WEAPON_IRONCANNON:
        m_moWeapon.PlayAnim(CANNON_ANIM_WAIT01, ulFlags);
        break;

      default: ASSERTALWAYS("Unknown weapon.");
    }
  };

  // Boring animations
  FLOAT KnifeBoring(void) {
    // play boring anim
    INDEX iAnim = KNIFE_ANIM_WAIT1;
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT ColtBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%2) {
      case 0: iAnim = COLT_ANIM_WAIT3; break;
      case 1: iAnim = COLT_ANIM_WAIT4; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT DoubleColtBoring(void) {
    // play boring anim for one colt
    INDEX iAnim;
    switch (IRnd()%2) {
      case 0: iAnim = COLT_ANIM_WAIT3; break;
      case 1: iAnim = COLT_ANIM_WAIT4; break;
    }
    if (IRnd()&1) {
      m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
      return m_moWeapon.GetAnimLength(iAnim);
    } else {
      m_moWeaponSecond.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
      return m_moWeaponSecond.GetAnimLength(iAnim);
    }
  };

  FLOAT SingleShotgunBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%2) {
      case 0: iAnim = SINGLESHOTGUN_ANIM_WAIT2; break;
      case 1: iAnim = SINGLESHOTGUN_ANIM_WAIT3; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT DoubleShotgunBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%3) {
      case 0: iAnim = DOUBLESHOTGUN_ANIM_WAIT2; break;
      case 1: iAnim = DOUBLESHOTGUN_ANIM_WAIT3; break;
      case 2: iAnim = DOUBLESHOTGUN_ANIM_WAIT4; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT TommyGunBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%2) {
      case 0: iAnim = TOMMYGUN_ANIM_WAIT2; break;
      case 1: iAnim = TOMMYGUN_ANIM_WAIT3; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT SniperBoring(void) {
    // play boring anim
    INDEX iAnim;
    iAnim = SNIPER_ANIM_WAIT01;
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT MiniGunBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%3) {
      case 0: iAnim = MINIGUN_ANIM_WAIT2; break;
      case 1: iAnim = MINIGUN_ANIM_WAIT3; break;
      case 2: iAnim = MINIGUN_ANIM_WAIT4; break;
    }

    // [Cecil] Dual minigun
    if (AltFireExists(WEAPON_MINIGUN)) {
      m_moWeaponSecond.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    }

    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT RocketLauncherBoring(void) {
    // play boring anim
    m_moWeapon.PlayAnim(ROCKETLAUNCHER_ANIM_WAIT2, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(ROCKETLAUNCHER_ANIM_WAIT2);
  };

  FLOAT GrenadeLauncherBoring(void) {
    // play boring anim
    m_moWeapon.PlayAnim(GRENADELAUNCHER_ANIM_WAIT2, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(GRENADELAUNCHER_ANIM_WAIT2);
  };

  FLOAT FlamerBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%4) {
      case 0: iAnim = FLAMER_ANIM_WAIT02; break;
      case 1: iAnim = FLAMER_ANIM_WAIT03; break;
      case 2: iAnim = FLAMER_ANIM_WAIT04; break;
      case 3: iAnim = FLAMER_ANIM_WAIT05; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };
  
  FLOAT ChainsawBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%3) {
      case 0: iAnim = CHAINSAW_ANIM_WAIT2; break;
      case 1: iAnim = CHAINSAW_ANIM_WAIT3; break;
      case 2: iAnim = CHAINSAW_ANIM_WAIT4; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT LaserBoring(void) {
    // play boring anim
    INDEX iAnim;
    iAnim = LASER_ANIM_WAIT02;
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  FLOAT CannonBoring(void) {
    // play boring anim
    INDEX iAnim;
    switch (IRnd()%3) {
      case 0: iAnim = CANNON_ANIM_WAIT02; break;
      case 1: iAnim = CANNON_ANIM_WAIT03; break;
      case 2: iAnim = CANNON_ANIM_WAIT04; break;
    }
    m_moWeapon.PlayAnim(iAnim, AOF_SMOOTHCHANGE);
    return m_moWeapon.GetAnimLength(iAnim);
  };

  // find first possible weapon in given direction
  WeaponType FindWeaponInDirection(INDEX iDir) {
    // [Cecil] No position remapping
    INDEX wtOrg = m_iWantedWeapon;
    INDEX wti = wtOrg;

    FOREVER {
      wti += iDir;

      // [Cecil] 1 -> 0
      if (wti < 0) {
        wti = WEAPON_IRONCANNON;
      }

      // [Cecil] Knife -> None
      if (wti > 14) {
        wti = WEAPON_NONE;
      }

      if (wti == wtOrg) {
        break;
      }

      // [Cecil] No position remapping
      WeaponType wt = (WeaponType)wti;

      if (WeaponExists(m_iAvailableWeapons, wt) && HasAmmo(wt)) {
        return wt;
      }
    }

    return m_iWantedWeapon;
  };

  // select new weapon
  void SelectWeaponChange(INDEX iSelect) {
    // [Cecil] No weapons
    if (m_iAvailableWeapons == 0x00) {
      return;
    }
    
    WeaponType EwtTemp;
    // mark that weapon change is required
    m_tmWeaponChangeRequired = _pTimer->CurrentTick();

    // if storing current weapon
    if (iSelect == 0) {
      m_bChangeWeapon = TRUE;
      m_iWantedWeapon = WEAPON_NONE;
      return;
    }

    // if restoring best weapon
    if (iSelect == -4) {
      SelectNewWeapon();
      return;
    }

    // if flipping weapon
    if (iSelect == -3) {
      EwtTemp = GetAltWeapon(m_iWantedWeapon);

    // if selecting previous weapon
    } else if (iSelect == -2) {
      EwtTemp = FindWeaponInDirection(-1);

    // if selecting next weapon
    } else if (iSelect == -1) {
      EwtTemp = FindWeaponInDirection(+1);

    // if selecting directly
    } else {
      // flip current weapon
      if (iSelect == GetSelectedWeapon(m_iWantedWeapon)) {
        EwtTemp = GetAltWeapon(m_iWantedWeapon);

      // change to wanted weapon
      } else {
        EwtTemp = GetStrongerWeapon(iSelect);
        
        // [Cecil] Check if doesn't exist
        // if weapon don't exist or don't have ammo flip it
        if (!WeaponExists(m_iAvailableWeapons, EwtTemp) || !HasAmmo(EwtTemp)) {
          EwtTemp = GetAltWeapon(EwtTemp);
        }
      }
    }

    // [Cecil] Check if weapon exists
    // wanted weapon exist and has ammo
    BOOL bChange = (WeaponExists(m_iAvailableWeapons, EwtTemp) && HasAmmo(EwtTemp));

    if (bChange) {
      m_iWantedWeapon = EwtTemp;
      m_bChangeWeapon = TRUE;
    }
  };

  // [Cecil] Added mirrored flag
  void MinigunSmoke(BOOL bMirrored) {
    if (!hud_bShowWeapon) {
      return;
    }

    // smoke
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    if (pl.m_pstState != PST_DIVE) {
      BOOL b3rdPersonView = (pl.m_penCamera != NULL || pl.m_pen3rdPersonView != NULL);

      // [Cecil] Pipe position
      FLOAT3D vPipe = (b3rdPersonView ? _vMinigunPipe3rdView : _vMinigunPipe);
      FLOAT3D vSpeed = FLOAT3D(-0.06f, FRnd()/4.0f, -0.06f);

      // [Cecil] Mirror the position
      MirrorEffect(vPipe, vSpeed, bMirrored);

      INDEX ctBulletsFired = ClampUp(m_iBulletsOnFireStart - CurrentAmmo(), INDEX(200));

      for (INDEX iSmoke = 0; iSmoke < ctBulletsFired/10; iSmoke++) {
        ShellLaunchData *psldSmoke = &pl.m_asldData[pl.m_iFirstEmptySLD];

        CPlacement3D plPipe;

        if (b3rdPersonView) {
          CalcWeaponPosition3rdPersonView(vPipe, plPipe, FALSE);
        } else {
          CalcWeaponPosition(vPipe, plPipe, FALSE);
        }

        FLOATmatrix3D m;
        MakeRotationMatrixFast(m, plPipe.pl_OrientationAngle);

        psldSmoke->sld_vPos = plPipe.pl_PositionVector + pl.en_vCurrentTranslationAbsolute*iSmoke*_pTimer->TickQuantum;
        psldSmoke->sld_vSpeed = vSpeed*m + pl.en_vCurrentTranslationAbsolute;

        psldSmoke->sld_vUp = FLOAT3D(m(1, 2), m(2, 2), m(3, 2));
        psldSmoke->sld_fSize = 0.75f + ctBulletsFired/50.0f;
        psldSmoke->sld_tmLaunch = _pTimer->CurrentTick() + iSmoke*_pTimer->TickQuantum;
        psldSmoke->sld_estType = ESL_BULLET_SMOKE;

        pl.m_iFirstEmptySLD = (pl.m_iFirstEmptySLD+1) % MAX_FLYING_SHELLS;
      }
    }
  };

  BOOL SniperZoomDiscrete(INDEX iDirection, BOOL &bZoomChanged) {
    bZoomChanged = FALSE;

    // zoom in one zoom level
    if (iDirection > 0) {
      for (INDEX i = 0; i < iSniperDiscreteZoomLevels; i++) {
        if (afSniperZoom[2*i] < m_fSniperFOV) {
          m_fSniperFOV = afSniperZoom[2*i];
          m_fSniperFOVlast = m_fSniperFOV;
          bZoomChanged = TRUE;
          break;
        }
      }

    // zoom out one zoom level
    } else {
      for (INDEX i = iSniperDiscreteZoomLevels; i > 0; i--) {
        if (afSniperZoom[2*i] > m_fSniperFOV) {
          m_fSniperFOV = afSniperZoom[2*i];
          m_fSniperFOVlast = m_fSniperFOV; 
          bZoomChanged = TRUE;
          break;
        }
      }
    }

    if (m_fSniperFOV < 90.0f) { 
      m_bSniping = TRUE;
    } else {
      m_bSniping = FALSE;
    }

    return m_bSniping;
  };

procedures:
  ChangeWeapon() {
    // if really changing weapon, make sure sniping is off and notify owner of the change
    if (m_iCurrentWeapon!=m_iWantedWeapon) {
      m_fSniperFOV = m_fSniperFOVlast = m_fSniperMaxFOV;
      m_bSniping = FALSE;
      m_penPlayer->SendEvent(EWeaponChanged());
    }
    // weapon is changed
    m_bChangeWeapon = FALSE;
    // if this is not current weapon change it
    if (m_iCurrentWeapon != m_iWantedWeapon) {
      // store current weapon
      m_iPreviousWeapon = m_iCurrentWeapon;
      autocall PutDown() EEnd;
      // set new weapon
      m_iCurrentWeapon = m_iWantedWeapon;
      // remember current weapon for console usage
      wpn_iCurrent = m_iCurrentWeapon;
      autocall BringUp() EEnd;
      // start engine sound if chainsaw
      if (m_iCurrentWeapon==WEAPON_CHAINSAW) {
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        pl.m_soWeaponAmbient.Set3DParameters(30.0f, 3.0f, 1.0f, 1.0f);        
        PlaySound(pl.m_soWeaponAmbient, SOUND_CS_IDLE, SOF_3D|SOF_VOLUMETRIC|SOF_LOOP|SOF_SMOOTHCHANGE);                
        if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("ChainsawIdle");}
      }
    }

    jump Idle();
  };

  // put weapon down
  PutDown() {
    // start weapon put down animation
    switch (m_iCurrentWeapon) {
      case WEAPON_NONE:
        break;

      case WEAPON_KNIFE: 
        m_iAnim = KNIFE_ANIM_PULLOUT;
        break;

      case WEAPON_DOUBLECOLT: case WEAPON_COLT:
        m_iAnim = COLT_ANIM_DEACTIVATE;
        break;

      case WEAPON_SINGLESHOTGUN:
        m_iAnim = SINGLESHOTGUN_ANIM_DEACTIVATE;
        break;

      case WEAPON_DOUBLESHOTGUN:
        m_iAnim = DOUBLESHOTGUN_ANIM_DEACTIVATE;
        break;

      case WEAPON_TOMMYGUN:
        m_iAnim = TOMMYGUN_ANIM_DEACTIVATE;
        break;

      case WEAPON_SNIPER:
        m_iAnim = SNIPER_ANIM_DEACTIVATE;
        break;

      case WEAPON_MINIGUN:
        m_iAnim = MINIGUN_ANIM_DEACTIVATE;
        break;

      case WEAPON_ROCKETLAUNCHER:
        m_iAnim = ROCKETLAUNCHER_ANIM_DEACTIVATE;
        break;

      case WEAPON_GRENADELAUNCHER:
        m_iAnim = GRENADELAUNCHER_ANIM_DEACTIVATE;
        break;

      case WEAPON_FLAMER:
        m_iAnim = FLAMER_ANIM_DEACTIVATE;
        break;

      case WEAPON_CHAINSAW: {
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        PlaySound(pl.m_soWeaponAmbient, SOUND_CS_BRINGDOWN, SOF_3D|SOF_VOLUMETRIC|SOF_SMOOTHCHANGE);                
        if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_StopEffect("ChainsawIdle");}
        m_iAnim = CHAINSAW_ANIM_DEACTIVATE;
        break; }

      case WEAPON_LASER:
        m_iAnim = LASER_ANIM_DEACTIVATE;
        break;

      case WEAPON_IRONCANNON:
        m_iAnim = CANNON_ANIM_DEACTIVATE;
        break;

      default: ASSERTALWAYS("Unknown weapon.");
    }

    // start animator
    CPlayerAnimator &plan = (CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator;
    plan.BodyPushAnimation();

    if (m_iCurrentWeapon == WEAPON_NONE) {
      return EEnd();
    }
      
    // --->>>  COLT -> DOUBLE COLT SPECIFIC  <<<---
    if (m_iCurrentWeapon == WEAPON_COLT && m_iWantedWeapon == WEAPON_DOUBLECOLT) {
      return EEnd();
    }

    // --->>>  DOUBLE COLT SPECIFIC  <<<---
    if (m_iCurrentWeapon == WEAPON_DOUBLECOLT) {
      m_moWeaponSecond.PlayAnim(m_iAnim, 0);
    }

    // --->>>  DOUBLE COLT -> COLT SPECIFIC  <<<---
    if (m_iCurrentWeapon == WEAPON_DOUBLECOLT && m_iWantedWeapon == WEAPON_COLT) {
      autowait(m_moWeapon.GetAnimLength(m_iAnim));
      return EEnd();
    }

    // [Cecil] Dual minigun
    if (AltFireExists(WEAPON_MINIGUN)) {
      m_moWeaponSecond.PlayAnim(m_iAnim, 0);
    }

    m_moWeapon.PlayAnim(m_iAnim, 0);
    autowait(m_moWeapon.GetAnimLength(m_iAnim));
    return EEnd();
  };

  // bring up weapon
  BringUp() {
    // reset weapon draw offset
    ResetWeaponMovingOffset();
    // set weapon model for current weapon
    SetCurrentWeaponModel();

    // start current weapon bring up animation
    switch (m_iCurrentWeapon) {
      case WEAPON_NONE:
        break;

      case WEAPON_KNIFE: 
        m_iAnim = KNIFE_ANIM_PULL;
        break;

      case WEAPON_COLT: case WEAPON_DOUBLECOLT:
        m_iAnim = COLT_ANIM_ACTIVATE;
        SetFlare(0, FLARE_REMOVE);
        SetFlare(1, FLARE_REMOVE);
        break;

      case WEAPON_SINGLESHOTGUN:
        m_iAnim = SINGLESHOTGUN_ANIM_ACTIVATE;
        SetFlare(0, FLARE_REMOVE);
        break;

      case WEAPON_DOUBLESHOTGUN:
        m_iAnim = DOUBLESHOTGUN_ANIM_ACTIVATE;
        SetFlare(0, FLARE_REMOVE);
        break;

      case WEAPON_TOMMYGUN:
        m_iAnim = TOMMYGUN_ANIM_ACTIVATE;
        SetFlare(0, FLARE_REMOVE);
        break;

      case WEAPON_SNIPER:
        m_iAnim = SNIPER_ANIM_ACTIVATE;
        SetFlare(0, FLARE_REMOVE);
        break;

      case WEAPON_MINIGUN: {
        CAttachmentModelObject *amo = m_moWeapon.GetAttachmentModel(MINIGUN_ATTACHMENT_BARRELS);
        m_aMiniGunLast = m_aMiniGun = amo->amo_plRelative.pl_OrientationAngle(3);
        m_iAnim = MINIGUN_ANIM_ACTIVATE;
        SetFlare(0, FLARE_REMOVE);
        break; }

      case WEAPON_ROCKETLAUNCHER:
        m_iAnim = ROCKETLAUNCHER_ANIM_ACTIVATE;
        break;

      case WEAPON_GRENADELAUNCHER:
        m_iAnim = GRENADELAUNCHER_ANIM_ACTIVATE;
        break;

      case WEAPON_FLAMER:
        m_iAnim = FLAMER_ANIM_ACTIVATE;
        break;

      case WEAPON_CHAINSAW: {
        m_iAnim = CHAINSAW_ANIM_ACTIVATE;
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        pl.m_soWeaponAmbient.Set3DParameters(30.0f, 3.0f, 1.0f, 1.0f);        
        PlaySound(pl.m_soWeaponAmbient, SOUND_CS_BRINGUP, SOF_3D|SOF_VOLUMETRIC|SOF_LOOP);        
        break; }

      case WEAPON_LASER:
        m_iAnim = LASER_ANIM_ACTIVATE;
        break;

      case WEAPON_IRONCANNON:
        m_iAnim = CANNON_ANIM_ACTIVATE;
        break;

      default: ASSERTALWAYS("Unknown weapon.");
    }
    // start animator
    CPlayerAnimator &plan = (CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator;
    plan.BodyPullAnimation();

    // [Cecil] Reload colts automagically when taking them out
    BOOL bNowColt = (m_iCurrentWeapon == WEAPON_COLT || m_iCurrentWeapon == WEAPON_DOUBLECOLT);
    BOOL bPrevColt = (m_iPreviousWeapon == WEAPON_COLT || m_iPreviousWeapon == WEAPON_DOUBLECOLT);
    
    // [Cecil] Reload mags
    if (bNowColt && !bPrevColt) {
      m_aWeapons[WEAPON_COLT].Reload(TRUE);
      m_aWeapons[WEAPON_DOUBLECOLT].Reload(TRUE);
    }

    // --->>>  DOUBLE COLT -> COLT SPECIFIC  <<<---
    if (m_iPreviousWeapon == WEAPON_DOUBLECOLT && m_iCurrentWeapon == WEAPON_COLT) {
      // mark that weapon change has ended
      m_tmWeaponChangeRequired -= hud_tmWeaponsOnScreen/2;
      return EEnd();
    }

    // --->>>  DOUBLE COLT SPECIFIC  <<<---
    if (m_iCurrentWeapon == WEAPON_DOUBLECOLT) {
      m_moWeaponSecond.PlayAnim(m_iAnim, 0);
    }

    // --->>>  COLT -> COLT DOUBLE SPECIFIC  <<<---
    if (m_iPreviousWeapon == WEAPON_COLT && m_iCurrentWeapon == WEAPON_DOUBLECOLT) {
      autowait(m_moWeapon.GetAnimLength(m_iAnim));
      // mark that weapon change has ended
      m_tmWeaponChangeRequired -= hud_tmWeaponsOnScreen/2;
      return EEnd();
    }

    // [Cecil] Dual minigun
    if (AltFireExists(WEAPON_MINIGUN)) {
      m_moWeaponSecond.PlayAnim(m_iAnim, 0);
    }

    m_moWeapon.PlayAnim(m_iAnim, 0);
    autowait(m_moWeapon.GetAnimLength(m_iAnim));

    // mark that weapon change has ended
    m_tmWeaponChangeRequired -= hud_tmWeaponsOnScreen/2;

    return EEnd();
  };

  // Fire weapon
  Fire() {
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon0, SOUND_SILENCE, SOF_3D|SOF_VOLUMETRIC); // stop possible sounds

    // force ending of weapon change
    m_tmWeaponChangeRequired = 0;

    // [Cecil] Reload mag if needed
    if (CUR_WEAPON.EmptyMag()) {
      jump Reload();
    }

    m_bFireWeapon = TRUE;
    m_bHasAmmo = HasAmmo(m_iCurrentWeapon);

    // if has no ammo select new weapon
    if (!m_bHasAmmo) {
      SelectNewWeapon();
      jump Idle();
    }

    // setup 3D sound parameters
    Setup3DSoundParameters();

    // start weapon firing animation for continuous firing
    if (m_iCurrentWeapon == WEAPON_MINIGUN) {
      jump MiniGunSpinUp();

    } else if (m_iCurrentWeapon == WEAPON_FLAMER) {
      jump FlamerStart();

    } else if (m_iCurrentWeapon == WEAPON_CHAINSAW) {
      jump ChainsawFire();

    } else if (m_iCurrentWeapon == WEAPON_LASER) {
      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRESHORT, AOF_LOOPING);

    } else if (m_iCurrentWeapon == WEAPON_TOMMYGUN) {
      autocall TommyGunStart() EEnd;

    } else if ((m_iCurrentWeapon == WEAPON_IRONCANNON)) {
      jump CannonFireStart();
    }

    // clear last lerped bullet position
    m_iLastBulletPosition = FLOAT3D(32000.0f, 32000.0f, 32000.0f);

    // reset laser barrel (to start shooting always from left up barrel)
    m_iLaserBarrel = 0;

    while (HoldingFire() && m_bHasAmmo) {
      // boring animation
      ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).m_fLastActionTime = _pTimer->CurrentTick();
      wait() {
        on (EBegin) : {
          // fire one shot
          switch (m_iCurrentWeapon) {
            // [Cecil] No weapon action
            case WEAPON_NONE: call NoAction(); break;

            case WEAPON_KNIFE: call SwingKnife(); break;
            case WEAPON_COLT: call FireColt(); break;
            case WEAPON_DOUBLECOLT: call FireDoubleColt(); break;
            case WEAPON_SINGLESHOTGUN: call FireSingleShotgun(); break;
            case WEAPON_DOUBLESHOTGUN: call FireDoubleShotgun(); break;
            case WEAPON_TOMMYGUN: call FireTommyGun(); break;
            case WEAPON_SNIPER: call FireSniper(); break;
            case WEAPON_ROCKETLAUNCHER: call FireRocketLauncher(); break;
            case WEAPON_GRENADELAUNCHER: call FireGrenadeLauncher(); break;
            case WEAPON_LASER: call FireLaser(); break;

            default: ASSERTALWAYS("Unknown weapon.");
          }
          resume;
        }

        on (EEnd) : {
          stop;
        }
      }
    }

    // stop weapon firing animation for continuous firing
    switch (m_iCurrentWeapon) {
      case WEAPON_TOMMYGUN: jump TommyGunStop(); break;
      case WEAPON_MINIGUN:  jump MiniGunSpinDown(); break;
      case WEAPON_FLAMER:   jump FlamerStop(); break;

      case WEAPON_LASER:
        GetAnimator()->FireAnimationOff();
        jump Idle();

      default: {
        jump Idle();
      }
    }
  };

  // [Cecil] Alt fire
  AltFire() {
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon0, SOUND_SILENCE, SOF_3D|SOF_VOLUMETRIC); // stop possible sounds

    // force ending of weapon change
    m_tmWeaponChangeRequired = 0;

    // [Cecil] Reload mag if needed
    if (CUR_WEAPON.EmptyMag()) {
      jump Reload();
    }

    m_bAltFire = TRUE;
    m_bHasAmmo = HasAmmo(m_iCurrentWeapon);

    // if has no ammo select new weapon
    if (!m_bHasAmmo) {
      SelectNewWeapon();
      jump Idle();
    }

    // setup 3D sound parameters
    Setup3DSoundParameters();

    // start weapon firing animation for continuous firing
    if (m_iCurrentWeapon == WEAPON_LASER) {
      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRESHORT, AOF_LOOPING);

    } else if (m_iCurrentWeapon == WEAPON_IRONCANNON) {
      jump NukeCannonFire();
    }

    // clear last lerped bullet position
    m_iLastBulletPosition = FLOAT3D(32000.0f, 32000.0f, 32000.0f);

    while (HoldingAlt() && m_bHasAmmo) {
      // boring animation
      ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).m_fLastActionTime = _pTimer->CurrentTick();

      wait() {
        on (EBegin) : {
          // fire one shot
          switch (m_iCurrentWeapon) {
            case WEAPON_SINGLESHOTGUN: call FireShotgunGrenade(); break;
            case WEAPON_DOUBLESHOTGUN: call FirePunchShotgun(); break;
            case WEAPON_TOMMYGUN: call TommygunBurst(); break;
            case WEAPON_ROCKETLAUNCHER: call SwitchLauncherMode(); break;
            case WEAPON_GRENADELAUNCHER: call FirePoisonGrenade(); break;
            case WEAPON_FLAMER: call FireTeslaGun(); break;
            case WEAPON_SNIPER: call FireAccurateSniper(); break;
            case WEAPON_LASER: call FireDeathRay(); break;

            default: {
              call NoAction();
            }
          }
          resume;
        }

        on (EEnd) : {
          stop;
        }
      }
    }

    // stop weapon firing animation for continuous firing
    if (m_iCurrentWeapon == WEAPON_LASER) { 
      GetAnimator()->FireAnimationOff();
    }

    jump Idle();
  };

  // [Cecil] No action
  NoAction() {
    m_bFireWeapon = FALSE;
    m_bAltFire = FALSE;

    if (m_iCurrentWeapon == WEAPON_NONE) {
      SelectNewWeapon();
    }

    autowait(0.05f);
    return EEnd();
  };
    
  // ***************** SWING KNIFE *****************
  SwingKnife() {
    // animator swing
    GetAnimator()->FireAnimation(BODY_ANIM_KNIFE_ATTACK, 0);
    // sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    // [Cecil] Simplified by removing repeating code
    switch (IRnd() % 2) {
      case 0:
        m_iAnim = KNIFE_ANIM_ATTACK01;
        m_fAnimWaitTime = 0.25f;
        break;

      case 1:
        m_iAnim = KNIFE_ANIM_ATTACK02;
        m_fAnimWaitTime = 0.35f;
        break;
    }
    
    m_moWeapon.PlayAnim(m_iAnim, 0);
    PlaySound(pl.m_soWeapon0, SOUND_KNIFE_BACK, SOF_3D|SOF_VOLUMETRIC);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Knife_back");}

    if (CutWithKnife(0, 0, 3.0f, 2.0f, 0.5f, GetDamage(WEAPON_KNIFE))) {
      // [Cecil] Multiply speed
      autowait(m_fAnimWaitTime * FireSpeedMul());

    } else if (TRUE) {
      // [Cecil] Multiply speed
      autowait(m_fAnimWaitTime/2 * FireSpeedMul());
      CutWithKnife(0, 0, 3.0f, 2.0f, 0.5f, GetDamage(WEAPON_KNIFE));
      autowait(m_fAnimWaitTime/2 * FireSpeedMul());
    }

    if (m_moWeapon.GetAnimLength(m_iAnim)-m_fAnimWaitTime >= _pTimer->TickQuantum) {
      // [Cecil] Multiply speed
      autowait((m_moWeapon.GetAnimLength(m_iAnim) - m_fAnimWaitTime) * FireSpeedMul());
    }
    return EEnd();
  };
  
  // ***************** FIRE COLT *****************
  FireColt() {
    GetAnimator()->FireAnimation(BODY_ANIM_COLT_FIRERIGHT, 0);

    // fire bullet
    FireOneBullet(FirePos(WEAPON_COLT), 500.0f, GetDamage(WEAPON_COLT));

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Colt_fire");}
    DoRecoil();
    SpawnRangeSound(40.0f);

    DecMag(WEAPON_COLT, 1, FALSE);
    DecMag(WEAPON_DOUBLECOLT, 1, FALSE);
    SetFlare(0, FLARE_ADD);
    PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);

    // sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon0, SOUND_COLT_FIRE, SOF_3D|SOF_VOLUMETRIC);

    // random colt fire
    INDEX iAnim;
    switch (IRnd() % 3) {
      case 0: iAnim = COLT_ANIM_FIRE1; break;
      case 1: iAnim = COLT_ANIM_FIRE2; break;
      case 2: iAnim = COLT_ANIM_FIRE3; break;
    }

    m_moWeapon.PlayAnim(iAnim, 0);
    // [Cecil] Multiply speed
    autowait((m_moWeapon.GetAnimLength(iAnim) - 0.05f) * FireSpeedMul());
    m_moWeapon.PlayAnim(COLT_ANIM_WAIT1, AOF_LOOPING|AOF_NORESTART);

    // no more bullets in colt -> reload
    if (CUR_WEAPON.iMag <= 0) {
      jump ReloadColt();
    }
    return EEnd();
  };

  // reload colt
  ReloadColt() {
    // [Cecil] Enough ammo
    if (!CUR_WEAPON.CanReload()) {
      return EEnd();
    }

    // sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon1, SOUND_COLT_RELOAD, SOF_3D|SOF_VOLUMETRIC);

    m_moWeapon.PlayAnim(COLT_ANIM_RELOAD, 0);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Colt_reload");}
    // [Cecil] Multiply speed
    autowait(m_moWeapon.GetAnimLength(COLT_ANIM_RELOAD) * FireSpeedMul());

    // [Cecil] Reload mag
    m_aWeapons[WEAPON_COLT].Reload(TRUE);
    m_aWeapons[WEAPON_DOUBLECOLT].Reload(TRUE);
    return EEnd();
  };

  // ***************** FIRE DOUBLE COLT *****************
  FireDoubleColt() {
    // fire first colt - one bullet less in colt
    GetAnimator()->FireAnimation(BODY_ANIM_COLT_FIRERIGHT, 0);
    FireOneBullet(FirePos(WEAPON_DOUBLECOLT), 500.0f, GetDamage(WEAPON_DOUBLECOLT));

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Colt_fire");}

    DoRecoil();
    SpawnRangeSound(50.0f);
    
    DecMag(WEAPON_COLT, 1, FALSE);
    DecMag(WEAPON_DOUBLECOLT, 1, FALSE);
    SetFlare(0, FLARE_ADD);
    PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);
    // sound
    CPlayer &plSnd = (CPlayer&)*m_penPlayer;
    PlaySound(plSnd.m_soWeapon0, SOUND_COLT_FIRE, SOF_3D|SOF_VOLUMETRIC);

    // random colt fire
    switch (IRnd() % 3) {
      case 0: m_iAnim = COLT_ANIM_FIRE1; break;
      case 1: m_iAnim = COLT_ANIM_FIRE2; break;
      case 2: m_iAnim = COLT_ANIM_FIRE3; break;
    }

    m_moWeapon.PlayAnim(m_iAnim, 0); // play first colt anim
    // [Cecil] Multiply speed
    autowait(m_moWeapon.GetAnimLength(m_iAnim)/2 * FireSpeedMul()); // wait half of the anim

    // fire second colt
    GetAnimator()->FireAnimation(BODY_ANIM_COLT_FIRELEFT, 0);
    m_bMirrorFire = TRUE;
    FireOneBullet(FirePos(WEAPON_DOUBLECOLT), 500.0f, GetDamage(WEAPON_DOUBLECOLT));

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Colt_fire");}
    
    DoRecoil();
    m_iSecondFlare = FLARE_ADD;
    ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).m_iSecondFlare = FLARE_ADD;
    PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);
    m_bMirrorFire = FALSE;

    // sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon1, SOUND_COLT_FIRE, SOF_3D|SOF_VOLUMETRIC);

    m_moWeaponSecond.PlayAnim(m_iAnim, 0);
    // [Cecil] Multiply speed
    autowait(m_moWeapon.GetAnimLength(m_iAnim)/2 * FireSpeedMul()); // wait half of the anim

    // no more bullets in colt -> reload
    if (CUR_WEAPON.iMag <= 0) {
      jump ReloadDoubleColt();
    }
    return EEnd();
  };

  // reload double colt
  ReloadDoubleColt() {
    // [Cecil] Enough ammo
    if (!CUR_WEAPON.CanReload()) {
      return EEnd();
    }

    m_moWeapon.PlayAnim(COLT_ANIM_RELOAD, 0);
    // sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon2, SOUND_COLT_RELOAD, SOF_3D|SOF_VOLUMETRIC);

    // [Cecil] Multiply speed
    // wait half of reload time
    autowait(m_moWeapon.GetAnimLength(COLT_ANIM_RELOAD)/2 * FireSpeedMul());

    m_moWeaponSecond.PlayAnim(COLT_ANIM_RELOAD, 0);
    // sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon3, SOUND_COLT_RELOAD, SOF_3D|SOF_VOLUMETRIC);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Colt_reload");}

    // [Cecil] Multiply speed
    // wait second halt minus half shortest fire animation
    autowait((m_moWeapon.GetAnimLength(COLT_ANIM_RELOAD) - 0.25f) * FireSpeedMul());

    // [Cecil] Reload mag
    m_aWeapons[WEAPON_COLT].Reload(TRUE);
    m_aWeapons[WEAPON_DOUBLECOLT].Reload(TRUE);
    return EEnd();
  };

  // ***************** FIRE SINGLESHOTGUN *****************
  FireSingleShotgun() {
    // fire one shell
    if (CurrentAmmo() > 0) {
      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRELONG, 0);
      FireBullets(FirePos(WEAPON_SINGLESHOTGUN), 500.0f, GetDamage(WEAPON_SINGLESHOTGUN), 7, afSingleShotgunPellets, 0.2f, 0.03f, 0.0f);

      DoRecoil();
      SpawnRangeSound(60.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Snglshotgun_fire");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);
      SetFlare(0, FLARE_ADD);
      PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);
      m_moWeapon.PlayAnim(GetSP()->sp_bCooperative ? SINGLESHOTGUN_ANIM_FIRE1 : SINGLESHOTGUN_ANIM_FIRE1FAST, 0);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      PlaySound(pl.m_soWeapon0, SOUND_SINGLESHOTGUN_FIRE, SOF_3D|SOF_VOLUMETRIC);

      // [Cecil] Pipe effect
      SpawnPipeEffect(_vSingleShotgunShellPos, _vSingleShotgunPipe, FLOAT3D(0.3f, 0.0f, 0.0f), FLOAT3D(0, 0.0f, -12.5f), ESL_SHOTGUN_SMOKE, amp_bWeaponMirrored);

      // [Cecil] Multiply speed
      autowait((GetSP()->sp_bCooperative ? 0.5f : 0.375f) * FireSpeedMul());

      // [Cecil] Drop shell
      DropBulletShell(_vSingleShotgunShellPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_SHOTGUN, amp_bWeaponMirrored);

      // [Cecil] Multiply speed
      autowait((m_moWeapon.GetAnimLength(GetSP()->sp_bCooperative ? SINGLESHOTGUN_ANIM_FIRE1 : SINGLESHOTGUN_ANIM_FIRE1FAST)
                - (GetSP()->sp_bCooperative ? 0.5f : 0.375f)) * FireSpeedMul());

    } else if (TRUE) {
      m_bFireWeapon = m_bHasAmmo = FALSE;
      autowait(0.05f);
    }

    // [Cecil] Check for ammo
    if (!HasAmmo(WEAPON_SINGLESHOTGUN)) {
      SelectNewWeapon();
    }
    return EEnd();
  };

  FireShotgunGrenade() {
    // release spring and fire one grenade
    if (CurrentAlt() > 0) {
      // remember time for spring release
      F_TEMP = _pTimer->CurrentTick();

      m_fWeaponDrawPowerOld = 10.0f;
      m_fWeaponDrawPower = 10.0f;
      m_tmDrawStartTime = 0.0f;

      m_moWeapon.PlayAnim(SINGLESHOTGUN_ANIM_WAIT1, AOF_LOOPING);

      // fire grenade
      FireGrenade(5.0f, FALSE, GetDamageAlt(WEAPON_SINGLESHOTGUN));
      SpawnRangeSound(10.0f);

      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Gnadelauncher");}
      DecAmmo(m_iCurrentWeapon, 1, TRUE);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      PlaySound(pl.m_soWeapon0, SOUND_GRENADELAUNCHER_FIRE, SOF_3D|SOF_VOLUMETRIC);
      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRELONG, 0);

      // release spring
      while (m_fWeaponDrawPower > 0.0f) {
        autowait(_pTimer->TickQuantum);

        m_fWeaponDrawPowerOld = m_fWeaponDrawPower;

        if (m_fWeaponDrawPower > 0.01f * FireSpeed()) {
          m_fWeaponDrawPower *= 0.65f * FireSpeedMul();
        } else {
          m_fWeaponDrawPower = 0.0f;
        }
      }

      // reset moving part's offset
      ResetWeaponMovingOffset();

    } else if (TRUE) {
      autowait(0.05f);
      m_bAltFire = FALSE;
    }

    // [Cecil] Check for ammo
    if (!HasAmmo(WEAPON_SINGLESHOTGUN)) {
      SelectNewWeapon();
    }
    return EEnd();
  };

  // ***************** FIRE DOUBLESHOTGUN *****************
  FireDoubleShotgun() {
    // fire two shell
    if (CurrentAmmo() > 1) {
      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRELONG, 0);
      FireBullets(FirePos(WEAPON_DOUBLESHOTGUN), 500.0f, GetDamage(WEAPON_DOUBLESHOTGUN), 14, afDoubleShotgunPellets, 0.3f, 0.03f, 0.0f);

      DoRecoil();
      SpawnRangeSound(70.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Dblshotgun_fire");}

      DecAmmo(m_iCurrentWeapon, 2, FALSE);
      SetFlare(0, FLARE_ADD);
      PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);

      // [Cecil] Show the hand
      m_moWeaponSecond.StretchModel(FLOAT3D((amp_bWeaponMirrored ? -1.0f : 1.0f), 1.0f, 1.0f));

      m_moWeapon.PlayAnim(GetSP()->sp_bCooperative ? DOUBLESHOTGUN_ANIM_FIRE : DOUBLESHOTGUN_ANIM_FIREFAST, 0);
      m_moWeaponSecond.PlayAnim(GetSP()->sp_bCooperative ? HANDWITHAMMO_ANIM_FIRE : HANDWITHAMMO_ANIM_FIREFAST, 0);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.5f, 1.0f);      // fire
      PlaySound(pl.m_soWeapon0, SOUND_DOUBLESHOTGUN_FIRE, SOF_3D|SOF_VOLUMETRIC);

      // [Cecil] Pipe effects
      SpawnPipeEffect(FLOAT3D(-0.11f, 0.1f, -0.3f), _vDoubleShotgunPipe, FLOAT3D(-0.1f, 0.0f, 0.01f), FLOAT3D(-1, 0.0f, -12.5f), ESL_SHOTGUN_SMOKE, amp_bWeaponMirrored);
      SpawnPipeEffect(FLOAT3D(-0.11f, 0.1f, -0.3f), _vDoubleShotgunPipe, FLOAT3D( 0.1f, 0.0f, -0.2f), FLOAT3D( 1, 0.0f, -12.5f), ESL_SHOTGUN_SMOKE, amp_bWeaponMirrored);

      // [Cecil] Multiply speed
      autowait((GetSP()->sp_bCooperative ? 0.25f : 0.15f) * FireSpeedMul());

      if (CurrentAmmo() >= 2) {
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        PlaySound(pl.m_soWeapon1, SOUND_DOUBLESHOTGUN_RELOAD, SOF_3D|SOF_VOLUMETRIC);
      }

      // [Cecil] Multiply speed
      autowait((m_moWeapon.GetAnimLength(GetSP()->sp_bCooperative ? DOUBLESHOTGUN_ANIM_FIRE : DOUBLESHOTGUN_ANIM_FIREFAST)
                - (GetSP()->sp_bCooperative ? 0.25f : 0.15f)) * FireSpeedMul());

      // no ammo -> change weapon
      if (CurrentAmmo() <= 1) {
        SelectNewWeapon();
      }

    } else {
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }

    return EEnd();
  };

  // [Cecil] Double shotgun alt fire
  FirePunchShotgun() {
    // fire two shell
    if (CurrentAmmo() > 1) {
      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRELONG, 0);
      FireBullets(FirePos(WEAPON_DOUBLESHOTGUN), 500.0f, GetDamageAlt(WEAPON_DOUBLESHOTGUN), 14, afDoubleShotgunPellets, 0.3f, 0.03f, 70.0f);

      DoRecoil();
      SpawnRangeSound(70.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Dblshotgun_fire");}

      DecAmmo(m_iCurrentWeapon, 2, FALSE);
      SetFlare(0, FLARE_ADD);
      PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);

      // [Cecil] Show the hand
      m_moWeaponSecond.StretchModel(FLOAT3D((amp_bWeaponMirrored ? -1.0f : 1.0f), 1.0f, 1.0f));

      m_moWeapon.PlayAnim(GetSP()->sp_bCooperative ? DOUBLESHOTGUN_ANIM_FIRE : DOUBLESHOTGUN_ANIM_FIREFAST, 0);
      m_moWeaponSecond.PlayAnim(GetSP()->sp_bCooperative ? HANDWITHAMMO_ANIM_FIRE : HANDWITHAMMO_ANIM_FIREFAST, 0);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.5f, 1.0f);      // fire
      PlaySound(pl.m_soWeapon0, SOUND_DOUBLESHOTGUN_FIRE, SOF_3D|SOF_VOLUMETRIC);

      // [Cecil] Pipe effects
      SpawnPipeEffect(FLOAT3D(-0.11f, 0.1f, -0.3f), _vDoubleShotgunPipe, FLOAT3D(-0.1f, 0.0f, 0.01f), FLOAT3D(-1, 0.0f, -12.5f), ESL_SHOTGUN_SMOKE, amp_bWeaponMirrored);
      SpawnPipeEffect(FLOAT3D(-0.11f, 0.1f, -0.3f), _vDoubleShotgunPipe, FLOAT3D( 0.1f, 0.0f, -0.2f), FLOAT3D( 1, 0.0f, -12.5f), ESL_SHOTGUN_SMOKE, amp_bWeaponMirrored);

      // [Cecil] Multiply speed
      autowait((GetSP()->sp_bCooperative ? 0.25f : 0.15f) * FireSpeedMul());

      if (CurrentAmmo() >= 2) {
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        PlaySound(pl.m_soWeapon1, SOUND_DOUBLESHOTGUN_RELOAD, SOF_3D|SOF_VOLUMETRIC);
      }

      // [Cecil] Multiply speed
      autowait((m_moWeapon.GetAnimLength(GetSP()->sp_bCooperative ? DOUBLESHOTGUN_ANIM_FIRE : DOUBLESHOTGUN_ANIM_FIREFAST)
                - (GetSP()->sp_bCooperative ? 0.25f : 0.15f)) * FireSpeedMul());

      // no ammo -> change weapon
      if (CurrentAmmo() <= 1) {
        SelectNewWeapon();
      }

    } else {
      m_bAltFire = m_bHasAmmo = FALSE;
    }

    return EEnd();
  };

  // ***************** FIRE TOMMYGUN *****************
  TommyGunStart() {
    m_iBulletsOnFireStart = CurrentAmmo();

    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon0, SOUND_SILENCE, SOF_3D|SOF_VOLUMETRIC); // stop possible sounds

    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.5f, 1.0f); // fire
    PlaySound(pl.m_soWeapon0, SOUND_TOMMYGUN_FIRE, SOF_LOOP|SOF_3D|SOF_VOLUMETRIC);

    PlayLightAnim(LIGHT_ANIM_TOMMYGUN, AOF_LOOPING);
    GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRESHORT, AOF_LOOPING);

    return EEnd();
  };

  TommyGunStop() {
    // smoke
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    if (pl.m_pstState != PST_DIVE && hud_bShowWeapon) {
      INDEX ctBulletsFired = ClampUp(m_iBulletsOnFireStart - CurrentAmmo(), INDEX(100));

      // [Cecil] Pipe position
      FLOAT3D vPipe = _vTommygunPipe;
      FLOAT3D vSpeed = FLOAT3D(-0.06f, 0.0f, -0.06f);

      // [Cecil] Mirror the position
      MirrorEffect(vPipe, vSpeed, amp_bWeaponMirrored);

      for (INDEX iSmoke = 0; iSmoke < ctBulletsFired/6.0f; iSmoke++) {
        ShellLaunchData *psldSmoke = &pl.m_asldData[pl.m_iFirstEmptySLD];

        CPlacement3D plPipe;
        CalcWeaponPosition(vPipe, plPipe, FALSE);

        FLOATmatrix3D m;
        MakeRotationMatrixFast(m, plPipe.pl_OrientationAngle);

        psldSmoke->sld_vPos = plPipe.pl_PositionVector + pl.en_vCurrentTranslationAbsolute*iSmoke*_pTimer->TickQuantum;
        psldSmoke->sld_vSpeed = vSpeed*m + pl.en_vCurrentTranslationAbsolute;

        psldSmoke->sld_vUp = FLOAT3D(m(1, 2), m(2, 2), m(3, 2));
        psldSmoke->sld_fSize = 0.5f + ctBulletsFired/75.0f;
        psldSmoke->sld_tmLaunch = _pTimer->CurrentTick()+iSmoke*_pTimer->TickQuantum;
        psldSmoke->sld_estType = ESL_BULLET_SMOKE;

        pl.m_iFirstEmptySLD = (pl.m_iFirstEmptySLD+1) % MAX_FLYING_SHELLS;
      }
    }

    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 0.0f, 1.0f);      // mute fire
    PlayLightAnim(LIGHT_ANIM_NONE, 0);
    GetAnimator()->FireAnimationOff();
    jump Idle();
  };

  FireTommyGun() {
    // fire one bullet
    if (CurrentAmmo() > 0) {
      // [Cecil] Multiply damage
      FireMachineBullet(FirePos(WEAPON_TOMMYGUN), 500.0f, GetDamage(WEAPON_TOMMYGUN) * FireSpeed(),
                        (GetSP()->sp_bCooperative ? 0.01f : 0.03f), (GetSP()->sp_bCooperative ? 0.5f : 0.0f));

      SpawnRangeSound(50.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Tommygun_fire");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);
      SetFlare(0, FLARE_ADD);
      m_moWeapon.PlayAnim(TOMMYGUN_ANIM_FIRE, AOF_LOOPING|AOF_NORESTART);

      // [Cecil] Drop bullet
      DropBulletShell(_vTommygunShellPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_BULLET, amp_bWeaponMirrored);
      SpawnBubbleEffect(_vTommygunShellPos, FLOAT3D(0.3f, 0.0f, 0.0f), amp_bWeaponMirrored);
      
      // [Cecil] Slowdown bug fix
      autowait(0.05f);
      autowait(0.05f);

      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }
    } else {
      ASSERTALWAYS("TommyGun - Auto weapon change not working.");
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }
    return EEnd();
  };

  // [Cecil] Tommygun alt fire
  TommygunBurst() {
    if (CurrentAmmo() > 0) {
      // remember time for spring release
      F_TEMP = _pTimer->CurrentTick();

      m_fWeaponDrawPowerOld = 10.0f;
      m_fWeaponDrawPower = 10.0f;
      m_tmDrawStartTime = 0.0f;

      // fire some bullets
      m_iAmmoLeft = ClampUp(CurrentAmmo(), (INDEX)5);
      DecAmmo(m_iCurrentWeapon, m_iAmmoLeft, FALSE);

      while (--m_iAmmoLeft >= 0) {
        FireMachineBullet(FirePos(WEAPON_TOMMYGUN), 500.0f, GetDamageAlt(WEAPON_TOMMYGUN), 0.15f, 0.1f);

        // [Cecil] Drop bullet
        DropBulletShell(_vTommygunShellPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_BULLET, amp_bWeaponMirrored);
        SpawnBubbleEffect(_vTommygunShellPos, FLOAT3D(0.3f, 0.0f, 0.0f), amp_bWeaponMirrored);
      }

      SpawnRangeSound(50.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Tommygun_fire");}
      SetFlare(0, FLARE_ADD);
      m_moWeapon.PlayAnim(TOMMYGUN_ANIM_WAIT1, AOF_LOOPING|AOF_NORESTART);
      
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 3.0f, 1.0f);
      PlaySound(pl.m_soWeapon0, SOUND_TOMMYGUN_BURST, SOF_3D|SOF_VOLUMETRIC);

      GetAnimator()->FireAnimation(BODY_ANIM_SHOTGUN_FIRELONG, 0);
      PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);

      // release spring
      while (m_fWeaponDrawPower > 0.0f) {
        autowait(_pTimer->TickQuantum);

        m_fWeaponDrawPowerOld = m_fWeaponDrawPower;

        if (m_fWeaponDrawPower > 0.01f * FireSpeed()) {
          m_fWeaponDrawPower *= 0.2f * FireSpeedMul();
        } else {
          m_fWeaponDrawPower = 0.0f;
        }
      }

      // reset moving part's offset
      ResetWeaponMovingOffset();

      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }
    } else {
      ASSERTALWAYS("TommyGun - Auto weapon change not working.");
      m_bAltFire = m_bHasAmmo = FALSE;
    }
    return EEnd();
  };

  // ***************** FIRE SNIPER *****************
  FireSniper() {
    if (CurrentAmmo() > 0) {
      // fire one bullet
      if (m_bSniping) {
        FireSniperBullet(FLOAT3D(0.0f, 0.0f, 0.0f), 1500.0f, GetDamage(WEAPON_SNIPER), 0.0f);
      } else {
        FireSniperBullet(FirePos(WEAPON_SNIPER), 1000.0f, GetDamage(WEAPON_SNIPER) / 4.0f, 5.0f);
      }
      m_tmLastSniperFire = _pTimer->CurrentTick();

      SpawnRangeSound(50.0f);
      DecAmmo(m_iCurrentWeapon, 1, FALSE);

      if (!m_bSniping) {
        SetFlare(0, FLARE_ADD);
      }
      PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      if (GetSP()->sp_bCooperative) {
        pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.5f, 1.0f);
      } else if (TRUE) {
        pl.m_soWeapon0.Set3DParameters(250.0f, 75.0f, 1.5f, 1.0f);
      }
      PlaySound(pl.m_soWeapon0, SOUND_SNIPER_FIRE, SOF_3D|SOF_VOLUMETRIC);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("SniperFire");}
      
      // animation
      m_moWeapon.PlayAnim(SNIPER_ANIM_FIRE, 0);
      
      // [Cecil] Multiply speed
      autowait(1.0f * FireSpeedMul());

      // [Cecil] Drop bullet
      DropBulletShell(_vSniperShellPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_BULLET, amp_bWeaponMirrored);
      SpawnBubbleEffect(_vSniperShellPos, FLOAT3D(0.3f, 0.0f, 0.0f), amp_bWeaponMirrored);
      
      // [Cecil] Multiply speed
      autowait(0.35f * FireSpeedMul());
      
      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }
    } 
    else {
      ASSERTALWAYS("Sniper - Auto weapon change not working.");
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }
    return EEnd();
  };
  
  FireAccurateSniper() {
    if (CurrentAmmo() > 0) {
      // fire one bullet
      if (m_bSniping) {
        FireSniperBullet(FLOAT3D(0.0f, 0.0f, 0.0f), 1500.0f, GetDamageAlt(WEAPON_SNIPER), 0.0f);
      } else {
        FireSniperBullet(FLOAT3D(0.0f, 0.0f, 0.0f), 1000.0f, GetDamageAlt(WEAPON_SNIPER) / 3.0f, 0.0f);
      }
      m_tmLastSniperFire = _pTimer->CurrentTick();

      SpawnRangeSound(50.0f);
      DecAmmo(m_iCurrentWeapon, 1, FALSE);

      if (!m_bSniping) {
        SetFlare(0, FLARE_ADD);
      }
      PlayLightAnim(LIGHT_ANIM_COLT_SHOTGUN, 0);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      if (GetSP()->sp_bCooperative) {
        pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.5f, 1.0f);
      } else if (TRUE) {
        pl.m_soWeapon0.Set3DParameters(250.0f, 75.0f, 1.5f, 1.0f);
      }
      PlaySound(pl.m_soWeapon0, SOUND_ACCURATE_SNIPER, SOF_3D|SOF_VOLUMETRIC);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("SniperFire");}
      
      // animation
      m_moWeapon.PlayAnim(SNIPER_ANIM_FIRE, 0);
      
      // [Cecil] Multiply speed
      autowait(1.0f * FireSpeedMul());

      // [Cecil] Drop bullet
      DropBulletShell(_vSniperShellPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_BULLET, amp_bWeaponMirrored);
      SpawnBubbleEffect(_vSniperShellPos, FLOAT3D(0.3f, 0.0f, 0.0f), amp_bWeaponMirrored);
      
      // [Cecil] Multiply speed
      autowait(0.7f * FireSpeedMul());
      
      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }
    } 
    else {
      ASSERTALWAYS("Sniper - Auto weapon change not working.");
      m_bAltFire = m_bHasAmmo = FALSE;
    }
    return EEnd();
  };
  
  // ***************** FIRE MINIGUN *****************
  MiniGunSpinUp() {
    // steady anim
    m_moWeapon.PlayAnim(MINIGUN_ANIM_WAIT1, AOF_LOOPING|AOF_NORESTART);

    // [Cecil] Dual minigun
    if (AltFireExists(WEAPON_MINIGUN)) {
      m_moWeaponSecond.PlayAnim(MINIGUN_ANIM_WAIT1, AOF_LOOPING|AOF_NORESTART);
    }

    // no boring animation
    ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).m_fLastActionTime = _pTimer->CurrentTick();

    // clear last lerped bullet position
    m_iLastBulletPosition = FLOAT3D(32000.0f, 32000.0f, 32000.0f);
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    PlaySound(pl.m_soWeapon0, SOUND_SILENCE, SOF_3D|SOF_VOLUMETRIC);      // stop possible sounds
    // initialize sound 3D parameters
    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 2.0f, 1.0f);      // fire
    pl.m_soWeapon1.Set3DParameters(50.0f, 5.0f, 1.0f, 1.0f);      // spinup/spindown/spin
    pl.m_soWeapon2.Set3DParameters(50.0f, 5.0f, 1.0f, 1.0f);      // turn on/off click
  
    // spin start sounds
    PlaySound(pl.m_soWeapon2, SOUND_MINIGUN_CLICK, SOF_3D|SOF_VOLUMETRIC);
    PlaySound(pl.m_soWeapon1, SOUND_MINIGUN_SPINUP, SOF_3D|SOF_VOLUMETRIC);

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Minigun_rotateup");}

    // while not at full speed and fire is held
    while (m_aMiniGunSpeed < MINIGUN_FULLSPEED && HoldingFire()) {
      // every tick
      autowait(MINIGUN_TICKTIME);
      // increase speed
      m_aMiniGunLast = m_aMiniGun;
      m_aMiniGun += m_aMiniGunSpeed*MINIGUN_TICKTIME;
      m_aMiniGunSpeed += MINIGUN_SPINUPACC*MINIGUN_TICKTIME;
    }
    // do not go over full speed
    m_aMiniGunSpeed = ClampUp( m_aMiniGunSpeed, MINIGUN_FULLSPEED);

    // if not holding fire anymore
    if (!HoldingFire()) {
      // start spindown
      jump MiniGunSpinDown();
    }

    // start firing
    jump MiniGunFire();
  };

  MiniGunFire() {
    // spinning sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon1, SOUND_MINIGUN_ROTATE, SOF_3D|SOF_LOOP|SOF_VOLUMETRIC|SOF_SMOOTHCHANGE);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Minigun_rotate");}

    // if firing
    if (HoldingFire() && CurrentAmmo() > 0) {
      // play fire sound
      PlaySound(pl.m_soWeapon0, SOUND_MINIGUN_FIRE, SOF_3D|SOF_LOOP|SOF_VOLUMETRIC);
      PlayLightAnim(LIGHT_ANIM_TOMMYGUN, AOF_LOOPING);
      GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRESHORT, AOF_LOOPING);
    }

    m_iBulletsOnFireStart = CurrentAmmo();

    // while holding fire
    while (HoldingFire()) {
      // check for ammo pickup during empty spinning
      if (!m_bHasAmmo && CurrentAmmo() > 0) {
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        PlaySound(pl.m_soWeapon0, SOUND_MINIGUN_FIRE, SOF_3D|SOF_LOOP|SOF_VOLUMETRIC);
        if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Minigun_fire");}
        PlayLightAnim(LIGHT_ANIM_TOMMYGUN, AOF_LOOPING);
        GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRESHORT, AOF_LOOPING);
        m_bHasAmmo = TRUE;
      }

      // if has ammo
      if (CurrentAmmo() > 0) {
        // [Cecil] Multiply damage
        // fire a bullet
        FireMachineBullet(FirePos(WEAPON_MINIGUN), 750.0f, (AltFireExists(WEAPON_MINIGUN) ? GetDamageAlt(WEAPON_MINIGUN) : GetDamage(WEAPON_MINIGUN)) * FireSpeed(),
                          (GetSP()->sp_bCooperative ? 0.01f : 0.03f), (GetSP()->sp_bCooperative ? 0.5f : 0.0f));
        DoRecoil();
        SpawnRangeSound(60.0f);
        DecAmmo(m_iCurrentWeapon, 1, FALSE);
        SetFlare(0, FLARE_ADD);

        // [Cecil] Drop bullets
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        FLOAT3D vPos = (pl.m_penCamera == NULL && pl.m_pen3rdPersonView == NULL) ? _vMinigunShellPos : _vMinigunShellPos3rdView;

        DropBulletShell(vPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_BULLET, amp_bWeaponMirrored);
        SpawnBubbleEffect(_vMinigunShellPos, FLOAT3D(0.3f, 0.0f, 0.0f), amp_bWeaponMirrored);

        if (AltFireExists(WEAPON_MINIGUN)) {
          DropBulletShell(vPos, FLOAT3D(FRnd()+2.0f, FRnd()+5.0f, -FRnd()-2.0f), ESL_BULLET, !amp_bWeaponMirrored);
          SpawnBubbleEffect(_vMinigunShellPos, FLOAT3D(0.3f, 0.0f, 0.0f), !amp_bWeaponMirrored);
        }

      // if no ammo
      } else {
        if (m_bHasAmmo) {
          MinigunSmoke(amp_bWeaponMirrored);

          // [Cecil] Dual minigun smoke
          if (AltFireExists(WEAPON_MINIGUN)) {
            MinigunSmoke(!amp_bWeaponMirrored);
          }
        }

        // stop fire sound
        m_bHasAmmo = FALSE;
        CPlayer &pl = (CPlayer&)*m_penPlayer;
        PlaySound(pl.m_soWeapon0, SOUND_SILENCE, SOF_3D|SOF_VOLUMETRIC);      // stop possible sounds
        PlayLightAnim(LIGHT_ANIM_NONE, AOF_LOOPING);
        GetAnimator()->FireAnimationOff();
      }
      autowait(MINIGUN_TICKTIME);
      // spin
      m_aMiniGunLast = m_aMiniGun;
      m_aMiniGun+=m_aMiniGunSpeed*MINIGUN_TICKTIME;
    }

    if (m_bHasAmmo) {
      MinigunSmoke(amp_bWeaponMirrored);

      // [Cecil] Dual minigun smoke
      if (AltFireExists(WEAPON_MINIGUN)) {
        MinigunSmoke(!amp_bWeaponMirrored);
      }
    }

    GetAnimator()->FireAnimationOff();
    // stop fire sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 0.0f, 1.0f);      // mute fire
    PlayLightAnim(LIGHT_ANIM_NONE, AOF_LOOPING);
    // start spin down
    jump MiniGunSpinDown();
  };

  MiniGunSpinDown() {
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    // spin down sounds
    PlaySound(pl.m_soWeapon3, SOUND_MINIGUN_CLICK, SOF_3D|SOF_VOLUMETRIC);
    PlaySound(pl.m_soWeapon1, SOUND_MINIGUN_SPINDOWN, SOF_3D|SOF_VOLUMETRIC|SOF_SMOOTHCHANGE);

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_StopEffect("Minigun_rotate");}
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Minigun_rotatedown");}

    // while still spinning and should not fire
    while (m_aMiniGunSpeed > 0 && (!HoldingFire() || CurrentAmmo() <= 0)) {
      autowait(MINIGUN_TICKTIME);

      // spin
      m_aMiniGunLast = m_aMiniGun;
      m_aMiniGun += m_aMiniGunSpeed*MINIGUN_TICKTIME;
      m_aMiniGunSpeed-=MINIGUN_SPINDNACC*MINIGUN_TICKTIME;

      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }

      // if weapon should be changed
      if (m_bChangeWeapon) {
        // stop spinning immediately
        m_aMiniGunSpeed = 0.0f;
        m_aMiniGunLast = m_aMiniGun;
        GetAnimator()->FireAnimationOff();
        jump Idle();
      }
    }

    // clamp some
    m_aMiniGunSpeed = ClampDn(m_aMiniGunSpeed, 0.0f);
    m_aMiniGunLast = m_aMiniGun;

    // if should fire
    if (HoldingFire() && CurrentAmmo() > 0) {
      // start spinup
      jump MiniGunSpinUp();
    }

    // no boring animation
    ((CPlayerAnimator&)*((CPlayer&)*m_penPlayer).m_penAnimator).m_fLastActionTime = _pTimer->CurrentTick();

    // if out of ammo
    if (CurrentAmmo() <= 0) { 
      // can wait without changing while holding fire - specific for movie sequence
      while (HoldingFire() && CurrentAmmo() <= 0) {
        // [Cecil] Slowdown bug fix
        autowait(0.05f);
        autowait(0.05f);
      }

      if (CurrentAmmo() <= 0) {
        // select new weapon
        SelectNewWeapon(); 
      }
    }

    jump Idle();
  };

  // ***************** FIRE ROCKETLAUNCHER *****************
  FireRocketLauncher() {
    // fire one grenade
    if (CurrentAmmo() > 0) {
      GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRELONG, 0);
      m_moWeapon.PlayAnim(ROCKETLAUNCHER_ANIM_FIRE, 0);

      // [Cecil] Custom damage
      FLOAT fDamage = (m_bChainLauncher ? GetDamageAlt(WEAPON_ROCKETLAUNCHER) : GetDamage(WEAPON_ROCKETLAUNCHER));
      FireRocket(fDamage);
      DoRecoil();
      SpawnRangeSound(20.0f);

      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Rocketlauncher_fire");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);
      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;

      if (pl.m_soWeapon0.IsPlaying()) {
        PlaySound(pl.m_soWeapon1, SOUND_ROCKETLAUNCHER_FIRE, SOF_3D|SOF_VOLUMETRIC);
      } else {
        PlaySound(pl.m_soWeapon0, SOUND_ROCKETLAUNCHER_FIRE, SOF_3D|SOF_VOLUMETRIC);
      }

      autowait(0.05f);

      // [Cecil] Rocket model
      StretchRocket(FLOAT3D(0.0f, 0.0f, 0.0f));

      // [Cecil] Multiply speed
      autowait((m_moWeapon.GetAnimLength(ROCKETLAUNCHER_ANIM_FIRE) - 0.05f) * FireSpeedMul());

      // [Cecil] Rocket model
      StretchRocket(FLOAT3D((amp_bWeaponMirrored ? -1.0f : 1.0f), 1.0f, 1.0f));

      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }
    } else {
      ASSERTALWAYS("RocketLauncher - Auto weapon change not working.");
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }
    return EEnd();
  };

  // [Cecil] Rocket Launcher alt fire
  SwitchLauncherMode() {
    m_bChainLauncher = !m_bChainLauncher;

    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon2, SOUND_LAUNCHERMODE, SOF_3D|SOF_VOLUMETRIC);

    // print current type
    CTString strType(0, "Type: %s", (m_bChainLauncher ? TRANS("Chainsaw Launcher") : TRANS("Rocket Launcher")));
    PrintCenterMessage(this, m_penPlayer, Translate(strType.str_String), 1.0f, MSS_NONE);

    // reset model
    SetCurrentWeaponModel();
    autowait(0.05f);

    m_bAltFire = FALSE;
    return EEnd();
  };

  // ***************** FIRE GRENADELAUNCHER *****************
  FireGrenadeLauncher() {
    TM_START = _pTimer->CurrentTick();
    // remember time for spring release
    F_TEMP = _pTimer->CurrentTick();

    F_OFFSET_CHG = 0.0f;
    m_fWeaponDrawPower = 0.0f;
    m_tmDrawStartTime = _pTimer->CurrentTick();

    // [Cecil] Multiply speed
    while (HoldingFire() && (_pTimer->CurrentTick() - TM_START) < 0.75f * FireSpeedMul()) {
      autowait(_pTimer->TickQuantum);

      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - TM_START) / _pTimer->TickQuantum * FireSpeedMul());

      F_OFFSET_CHG = 0.125f/(iPower+2);
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
      m_fWeaponDrawPower += F_OFFSET_CHG;
    }
    m_tmDrawStartTime = 0.0f;

    // release spring and fire one grenade
    if (CurrentAmmo() > 0) {
      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - F_TEMP) / _pTimer->TickQuantum * FireSpeed());

      // fire grenade
      FireGrenade(iPower, FALSE, GetDamage(WEAPON_GRENADELAUNCHER));
      SpawnRangeSound(10.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Gnadelauncher");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      PlaySound(pl.m_soWeapon0, SOUND_GRENADELAUNCHER_FIRE, SOF_3D|SOF_VOLUMETRIC);
      GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRELONG, 0);

      // release spring
      TM_START = _pTimer->CurrentTick();
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;

      while (m_fWeaponDrawPower > 0.0f) {
        autowait(_pTimer->TickQuantum);
        m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
        m_fWeaponDrawPower -= F_OFFSET_CHG;
        m_fWeaponDrawPower = ClampDn( m_fWeaponDrawPower, 0.0f);
        F_OFFSET_CHG = F_OFFSET_CHG*10;
      }

      // reset moving part's offset
      ResetWeaponMovingOffset();

      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();

      } else if (TRUE) {
        // [Cecil] Multiply speed
        autowait(0.25f * FireSpeedMul());
      }

    } else {
      ASSERTALWAYS("GrenadeLauncher - Auto weapon change not working.");
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }

    return EEnd();
  };

  FirePoisonGrenade() {
    TM_START = _pTimer->CurrentTick();
    // remember time for spring release
    F_TEMP = _pTimer->CurrentTick();

    F_OFFSET_CHG = 0.0f;
    m_fWeaponDrawPower = 0.0f;
    m_tmDrawStartTime = _pTimer->CurrentTick();

    // [Cecil] Multiply speed
    while (HoldingAlt() && (_pTimer->CurrentTick() - TM_START) < 0.75f * FireSpeedMul()) {
      autowait(_pTimer->TickQuantum);

      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - TM_START) / _pTimer->TickQuantum * FireSpeedMul());

      F_OFFSET_CHG = 0.125f/(iPower+2);
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
      m_fWeaponDrawPower += F_OFFSET_CHG;
    }
    m_tmDrawStartTime = 0.0f;

    // release spring and fire one grenade
    if (CurrentAmmo() > 0) {
      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - F_TEMP) / _pTimer->TickQuantum * FireSpeed());

      // fire grenade
      FireGrenade(iPower, TRUE, GetDamageAlt(WEAPON_GRENADELAUNCHER));
      SpawnRangeSound(10.0f);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Gnadelauncher");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);

      // sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      PlaySound(pl.m_soWeapon0, SOUND_GRENADELAUNCHER_FIRE, SOF_3D|SOF_VOLUMETRIC);
      GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRELONG, 0);

      // release spring
      TM_START = _pTimer->CurrentTick();
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;

      while (m_fWeaponDrawPower > 0.0f) {
        autowait(_pTimer->TickQuantum);
        m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
        m_fWeaponDrawPower -= F_OFFSET_CHG;
        m_fWeaponDrawPower = ClampDn( m_fWeaponDrawPower, 0.0f);
        F_OFFSET_CHG = F_OFFSET_CHG*10;
      }

      // reset moving part's offset
      ResetWeaponMovingOffset();

      // no ammo -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();

      } else if (TRUE) {
        // [Cecil] Multiply speed
        autowait(0.25f * FireSpeedMul());
      }
    } else {
      ASSERTALWAYS("GrenadeLauncher - Auto weapon change not working.");
      m_bAltFire = m_bHasAmmo = FALSE;
    }

    return EEnd();
  };

  // ***************** FIRE FLAMER *****************
  FlamerStart() {
    m_tmFlamerStart = _pTimer->CurrentTick();
    m_tmFlamerStop = 1e9;
    
    m_moWeapon.PlayAnim(FLAMER_ANIM_FIRESTART, 0);

    // [Cecil] Multiply speed
    autowait(m_moWeapon.GetAnimLength(FLAMER_ANIM_FIRESTART) * FireSpeedMul());

    // play fire sound
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 2.0f, 0.31f);
    pl.m_soWeapon2.Set3DParameters(50.0f, 5.0f, 2.0f, 0.3f);

    PlaySound(pl.m_soWeapon0, SOUND_FL_FIRE, SOF_3D|SOF_LOOP|SOF_VOLUMETRIC);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("FlamethrowerFire");}
    PlaySound(pl.m_soWeapon2, SOUND_FL_START, SOF_3D|SOF_VOLUMETRIC);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("FlamethrowerStart");}

    FireFlame(GetDamage(WEAPON_FLAMER));
    DecAmmo(m_iCurrentWeapon, 1, FALSE);

    autowait(0.05f);
    jump FlamerFire();
  };

  FlamerFire() {
    // while holding fire
    while (HoldingFire() && CurrentAmmo() > 0) {
      FireFlame(GetDamage(WEAPON_FLAMER));

      DecAmmo(m_iCurrentWeapon, 1, FALSE);
      SpawnRangeSound(30.0f);
      
      // [Cecil] Slowdown bug fix
      autowait(0.05f);
      autowait(0.05f);
    }

    if (CurrentAmmo() <= 0) {
      m_bHasAmmo = FALSE;
    }

    jump FlamerStop();
  };

  FlamerStop() {
    m_tmFlamerStop = _pTimer->CurrentTick();

    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon0, SOUND_FL_STOP, SOF_3D|SOF_VOLUMETRIC|SOF_SMOOTHCHANGE);

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_StopEffect("FlamethrowerFire");}
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("FlamethrowerStop");}
    
    FireFlame(GetDamage(WEAPON_FLAMER));

    // [Cecil] Assert flame existence
    // link last flame with nothing (if not NULL or deleted)
    if (ASSERT_ENTITY(m_penFlame)) {
      ((CProjectile&)*m_penFlame).m_penParticles = NULL;
      m_penFlame = NULL;
    }

    m_moWeapon.PlayAnim(FLAMER_ANIM_FIREEND, 0);

    // [Cecil] Multiply speed
    autowait(m_moWeapon.GetAnimLength(FLAMER_ANIM_FIREEND) * FireSpeedMul());
    
    // select new weapon
    if (CurrentAmmo() <= 0) {
      SelectNewWeapon(); 
    }

    jump Idle();
  };

  // [Cecil] Tesla gun
  FireTeslaGun() {
    if (CurrentAmmo() >= 10) {
      m_moWeapon.PlayAnim(FLAMER_ANIM_FIRESTART, 0);
      autowait(0.25f * FireSpeedMul());

      // create lightning
      CPlacement3D plTesla;
      GetTeslaPlacement(plTesla);

      // lightning target position
      FLOAT3D vDir, vTarget;
      AnglesToDirectionVector(plTesla.pl_OrientationAngle, vDir);
      vTarget = plTesla.pl_PositionVector + vDir * Min(m_fRayHitDistance, 50.0f);

      // tesla gun fire
      TeslaGunLightning(this, plTesla.pl_PositionVector, vTarget, 0.2f);

      if (m_penRayHit != NULL && m_fRayHitDistance <= 50.0f) {
        // hit enemies in range
        if (IsDerivedFromClass(m_penRayHit, "Enemy Base")) {
          TeslaBurst(m_penRayHit, vTarget, GetDamageAlt(WEAPON_FLAMER));

        // hit players
        } else if (IsOfClass(m_penRayHit, "Player")) {
          InflictDirectDamage(m_penRayHit, GetPlayer(), DMT_BURNING, 30.0f, m_penRayHit->GetPlacement().pl_PositionVector, FLOAT3D(0.0f, 1.0f, 0.0f));
        }
      }

      // fire sound
      CPlayer &pl = (CPlayer&)*m_penPlayer;
      pl.m_soWeaponAmbient.Set3DParameters(50.0f, 5.0f, 2.0f, 1.0f);
      pl.m_soWeapon2.Set3DParameters(100.0f, 10.0f, 2.0f, 0.95f + FRnd()*0.1f);

      PlaySound(pl.m_soWeaponAmbient, SOUND_TESLA_FIRE, SOF_3D|SOF_VOLUMETRIC);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("FlamethrowerFire");}
      PlaySound(pl.m_soWeapon2, SOUND_TESLA_START1 + IRnd() % 3, SOF_3D|SOF_VOLUMETRIC);
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("FlamethrowerStart");}

      // take ammo
      SpawnRangeSound(30.0f);
      DecAmmo(m_iCurrentWeapon, 10, FALSE);

      autowait(0.25f * FireSpeedMul());

      m_moWeapon.PlayAnim(FLAMER_ANIM_FIREEND, 0);
    }

    // select new weapon
    if (CurrentAmmo() <= 0) {
      SelectNewWeapon();
    }
    
    autowait(0.25f * FireSpeedMul());
    return EEnd();
  };
  
  // ***************** FIRE CHAINSAW *****************
  ChainsawFire() {
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    
    // set the firing sound level
    pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 1.5f, 1.0f);
    PlaySound(pl.m_soWeapon0, SOUND_CS_BEGINFIRE, SOF_3D|SOF_VOLUMETRIC);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("ChainsawBeginFire");}
  
    // bring the chainsaw down to cutting height (fire position)
    m_moWeapon.PlayAnim(CHAINSAW_ANIM_WAIT2FIRE, 0);
    autowait(m_moWeapon.GetAnimLength(CHAINSAW_ANIM_WAIT2FIRE)-0.05f);

    CPlayerAnimator &pa = *GetAnimator();
    pa.FireAnimation(BODY_ANIM_MINIGUN_FIRELONG, 0);
    
    CModelObject *pmoTeeth = GetChainSawTeeth();
    if (pmoTeeth != NULL) {
      pmoTeeth->PlayAnim(TEETH_ANIM_ROTATE, AOF_LOOPING|AOF_NORESTART);
    }

    // firing
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    // mute the chainsaw engine sound
    pl.m_soWeaponAmbient.Set3DParameters(30.0f, 3.0f, 0.5f, 1.0f);        
    
    PlaySound(pl.m_soWeapon0, SOUND_CS_FIRE, SOF_3D|SOF_LOOP|SOF_VOLUMETRIC|SOF_SMOOTHCHANGE);
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_StopEffect("ChainsawIdle");}
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("ChainsawFire");}

    m_moWeapon.PlayAnim(CHAINSAW_ANIM_FIRE, AOF_LOOPING|AOF_NORESTART);  

    // start teeth rotation
    CModelObject *pmo1 = &(m_moWeapon.GetAttachmentModel(CHAINSAW_ATTACHMENT_BLADE)->amo_moModelObject);
    CModelObject *pmo2 = &(pmo1->GetAttachmentModel(BLADE_ATTACHMENT_TEETH)->amo_moModelObject);
    pmo2->PlayAnim(TEETH_ANIM_ROTATE, AOF_LOOPING);

    while (HoldingFire()) {
      autowait(CHAINSAW_UPDATETIME);
      // 200 damage per second
      CutWithChainsaw(0, 0, 3.0f, 2.0f, 1.0f, GetDamage(WEAPON_CHAINSAW) * CHAINSAW_UPDATETIME);
    }
    
    // bring it back to idle position
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    PlaySound(pl.m_soWeapon0, SOUND_CS_ENDFIRE, SOF_3D|SOF_VOLUMETRIC|SOF_SMOOTHCHANGE);

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_StopEffect("ChainsawFire");}
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("ChainsawEnd");}
    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("ChainsawIdle");}

    // restore volume to engine sound
    pl.m_soWeaponAmbient.Set3DParameters(30.0f, 3.0f, 1.0f, 1.0f);        
    
    m_moWeapon.PlayAnim(CHAINSAW_ANIM_FIRE2WAIT, 0);
    autowait(m_moWeapon.GetAnimLength(CHAINSAW_ANIM_FIRE2WAIT));

    // stop teeth rotation
    CModelObject *pmo1 = &(m_moWeapon.GetAttachmentModel(CHAINSAW_ATTACHMENT_BLADE)->amo_moModelObject);
    CModelObject *pmo2 = &(pmo1->GetAttachmentModel(BLADE_ATTACHMENT_TEETH)->amo_moModelObject);
    pmo2->PlayAnim(TEETH_ANIM_DEFAULT, 0);

    CModelObject *pmoTeeth = GetChainSawTeeth();
    if (pmoTeeth != NULL) {
      pmoTeeth->PlayAnim(TEETH_ANIM_DEFAULT, 0);
    }

    jump Idle();
  };

  ChainsawBringUp() {
    // bring it back to idle position
    m_moWeapon.PlayAnim(CHAINSAW_ANIM_FIRE2WAIT, 0);
    autowait(m_moWeapon.GetAnimLength(CHAINSAW_ANIM_FIRE2WAIT));

    jump Idle();
  };

  // ***************** FIRE LASER *****************
  FireLaser() {
    // fire one cell
    if (CurrentAmmo() > 0) {
      // [Cecil] Slowdown bug fix
      autowait(0.05f);
      autowait(0.05f);

      m_moWeapon.PlayAnim(LASER_ANIM_FIRE, AOF_LOOPING|AOF_NORESTART);
      FireLaserRay(GetDamage(WEAPON_LASER));
      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Laser_fire");}
      DecAmmo(m_iCurrentWeapon, 1, FALSE);

      // sound
      SpawnRangeSound(20.0f);
      CPlayer &pl = (CPlayer&)*m_penPlayer;

      // activate barrel anim
      switch (m_iLaserBarrel) {
        case 0: { // barrel lu
          CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(LASER_ATTACHMENT_LEFTUP)->amo_moModelObject);
          pmo->PlayAnim(BARREL_ANIM_FIRE, 0);
          PlaySound(pl.m_soWeapon0, SOUND_LASER_FIRE, SOF_3D|SOF_VOLUMETRIC);
          break; }

        case 3: { // barrel rd
          CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(LASER_ATTACHMENT_RIGHTDOWN)->amo_moModelObject);
          pmo->PlayAnim(BARREL_ANIM_FIRE, 0);
          PlaySound(pl.m_soWeapon1, SOUND_LASER_FIRE, SOF_3D|SOF_VOLUMETRIC);
          break; }

        case 1: { // barrel ld
          CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(LASER_ATTACHMENT_LEFTDOWN)->amo_moModelObject);
          pmo->PlayAnim(BARREL_ANIM_FIRE, 0);
          PlaySound(pl.m_soWeapon2, SOUND_LASER_FIRE, SOF_3D|SOF_VOLUMETRIC);
          break; }

        case 2: { // barrel ru
          CModelObject *pmo = &(m_moWeapon.GetAttachmentModel(LASER_ATTACHMENT_RIGHTUP)->amo_moModelObject);
          pmo->PlayAnim(BARREL_ANIM_FIRE, 0);
          PlaySound(pl.m_soWeapon3, SOUND_LASER_FIRE, SOF_3D|SOF_VOLUMETRIC);
          break; }
      }

      // next barrel
      m_iLaserBarrel = (m_iLaserBarrel+1)&3;

      // no electricity -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }

    } else {
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }

    return EEnd();
  };

  // [Cecil] Laser death ray
  FireDeathRay() {
    if (CurrentAmmo() > 0) {
      m_penGhostBusterRay = CreateEntity(GetPlacement(), CLASS_GHOSTBUSTERRAY);
      EGhostBusterRay egbr;
      egbr.penOwner = this;
      m_penGhostBusterRay->Initialize(egbr);

      m_moWeapon.PlayAnim(LASER_ANIM_FIRE, AOF_LOOPING|AOF_NORESTART);
      PlaySound(GetPlayer()->m_soWeapon0, SOUND_DEATHRAY, SOF_3D|SOF_VOLUMETRIC|SOF_LOOP);

      // extra tick for the ray rendering
      autowait(0.05f);

      // while holding fire
      while (HoldingAlt() && CurrentAmmo() > 0) {
        INDEX iAmmo = Clamp(CurrentAmmo(), (INDEX)1, (INDEX)2);

        if (m_fRayHitDistance <= 100.0f) {
          FireGhostBusterRay(FLOAT(iAmmo) / 2.0f, GetDamageAlt(WEAPON_LASER));
        }

        DecAmmo(m_iCurrentWeapon, iAmmo, FALSE);

        SpawnRangeSound(30.0f);
        autowait(0.05f);
      }

      // stop the death ray
      DestroyRay();
      GetPlayer()->m_soWeapon0.Stop();
    }

    // select new weapon
    if (CurrentAmmo() <= 0) {
      SelectNewWeapon();
    }
    
    autowait(0.05f);
    return EEnd();
  };

  // ***************** FIRE CANNON *****************
  CannonFireStart() {
    m_tmDrawStartTime = _pTimer->CurrentTick();
    TM_START = _pTimer->CurrentTick();
    F_OFFSET_CHG = 0.0f;
    m_fWeaponDrawPower = 0.0f;
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    if (CurrentAmmo() & 1) {
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 3.0f, 1.0f);
      PlaySound(pl.m_soWeapon0, SOUND_CANNON_PREPARE, SOF_3D|SOF_VOLUMETRIC);
    } else {
      pl.m_soWeapon1.Set3DParameters(50.0f, 5.0f, 3.0f, 1.0f);
      PlaySound(pl.m_soWeapon1, SOUND_CANNON_PREPARE, SOF_3D|SOF_VOLUMETRIC);
    }

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Canon_prepare");}

    // [Cecil] Multiply speed
    while (HoldingFire() && (_pTimer->CurrentTick() - TM_START) < 1.0f * FireSpeedMul()) {
      autowait(_pTimer->TickQuantum);
      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - TM_START) / _pTimer->TickQuantum * FireSpeedMul());

      F_OFFSET_CHG = 0.25f/(iPower+2);
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
      m_fWeaponDrawPower += F_OFFSET_CHG;
    }

    m_tmDrawStartTime = 0.0f;
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    if (CurrentAmmo() & 1) {
      // turn off the sound
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 0.0f, 1.0f);
    } else {
      // turn off the sound
      pl.m_soWeapon1.Set3DParameters(50.0f, 5.0f, 0.0f, 1.0f);
    }
    
    // fire one ball
    if (CurrentAmmo() > 0) {
      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - TM_START) / _pTimer->TickQuantum * FireSpeed());
      GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRELONG, 0);

      FLOAT fRange, fFalloff;
      if (GetSP()->sp_bCooperative) {
        fRange = 100.0f;
        fFalloff = 25.0f;
      } else if (TRUE) {
        fRange = 150.0f;
        fFalloff = 30.0f;
      }

      // adjust volume of cannon firing acording to launch power
      if (CurrentAmmo() & 1) {
        pl.m_soWeapon2.Set3DParameters(fRange, fFalloff, 2.0f+iPower*0.05f, 1.0f);
        PlaySound(pl.m_soWeapon2, SOUND_CANNON, SOF_3D|SOF_VOLUMETRIC);
      } else {
        pl.m_soWeapon3.Set3DParameters(fRange, fFalloff, 2.0f+iPower*0.05f, 1.0f);
        PlaySound(pl.m_soWeapon3, SOUND_CANNON, SOF_3D|SOF_VOLUMETRIC);
      }

      m_moWeapon.PlayAnim(CANNON_ANIM_FIRE, 0);
      FireCannonBall(iPower, FALSE, GetDamage(WEAPON_IRONCANNON));

      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Canon");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);
      SpawnRangeSound(30.0f);

      TM_START = _pTimer->CurrentTick();
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;

      // [Cecil] Multiply speed
      while (m_fWeaponDrawPower > 0.0f || _pTimer->CurrentTick() - TM_START < m_moWeapon.GetAnimLength(CANNON_ANIM_FIRE) * FireSpeedMul()) {
        autowait(_pTimer->TickQuantum);
        m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
        m_fWeaponDrawPower -= F_OFFSET_CHG;
        m_fWeaponDrawPower = ClampDn(m_fWeaponDrawPower, 0.0f);
        F_OFFSET_CHG = F_OFFSET_CHG*2;
      }

      // reset moving part's offset
      ResetWeaponMovingOffset();

      // no cannon balls -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }

    } else {
      ASSERTALWAYS("Cannon - Auto weapon change not working.");
      m_bFireWeapon = m_bHasAmmo = FALSE;
    }
    jump Idle();
  };

  // [Cecil] Nuke cannon
  NukeCannonFire() {
    m_tmDrawStartTime = _pTimer->CurrentTick();
    TM_START = _pTimer->CurrentTick();
    F_OFFSET_CHG = 0.0f;
    m_fWeaponDrawPower = 0.0f;
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    if (CurrentAmmo() & 1) {
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 3.0f, 0.67f);
      PlaySound(pl.m_soWeapon0, SOUND_CANNON_PREPARE, SOF_3D|SOF_VOLUMETRIC);
    } else {
      pl.m_soWeapon1.Set3DParameters(50.0f, 5.0f, 3.0f, 0.67f);
      PlaySound(pl.m_soWeapon1, SOUND_CANNON_PREPARE, SOF_3D|SOF_VOLUMETRIC);
    }

    if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Canon_prepare");}

    // [Cecil] Multiply speed
    while (HoldingAlt() && (_pTimer->CurrentTick() - TM_START) < 1.5f * FireSpeedMul()) {
      autowait(_pTimer->TickQuantum);
      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - TM_START) / _pTimer->TickQuantum * FireSpeedMul());

      F_OFFSET_CHG = 0.167f/(iPower+2);
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
      m_fWeaponDrawPower += F_OFFSET_CHG;
    }

    m_tmDrawStartTime = 0.0f;
    CPlayer &pl = (CPlayer&)*m_penPlayer;

    if (CurrentAmmo() & 1) {
      // turn off the sound
      pl.m_soWeapon0.Set3DParameters(50.0f, 5.0f, 0.0f, 1.0f);
    } else {
      // turn off the sound
      pl.m_soWeapon1.Set3DParameters(50.0f, 5.0f, 0.0f, 1.0f);
    }
    
    // fire one ball
    if (CurrentAmmo() > 0) {
      // [Cecil] Multiply power
      INDEX iPower = INDEX((_pTimer->CurrentTick() - TM_START) / _pTimer->TickQuantum * FireSpeed());
      GetAnimator()->FireAnimation(BODY_ANIM_MINIGUN_FIRELONG, 0);

      FLOAT fRange, fFalloff;
      if (GetSP()->sp_bCooperative) {
        fRange = 100.0f;
        fFalloff = 25.0f;
      } else if (TRUE) {
        fRange = 150.0f;
        fFalloff = 30.0f;
      }

      // adjust volume of cannon firing acording to launch power
      if (CurrentAmmo() & 1) {
        pl.m_soWeapon2.Set3DParameters(fRange, fFalloff, 2.0f+iPower*0.05f, 1.0f);
        PlaySound(pl.m_soWeapon2, SOUND_CANNON, SOF_3D|SOF_VOLUMETRIC);
      } else {
        pl.m_soWeapon3.Set3DParameters(fRange, fFalloff, 2.0f+iPower*0.05f, 1.0f);
        PlaySound(pl.m_soWeapon3, SOUND_CANNON, SOF_3D|SOF_VOLUMETRIC);
      }

      m_moWeapon.PlayAnim(CANNON_ANIM_FIRE, 0);
      FireCannonBall(iPower, TRUE, GetDamageAlt(WEAPON_IRONCANNON));

      if(_pNetwork->IsPlayerLocal(m_penPlayer)) {IFeel_PlayEffect("Canon");}

      DecAmmo(m_iCurrentWeapon, 1, FALSE);
      SpawnRangeSound(30.0f);

      TM_START = _pTimer->CurrentTick();
      m_fWeaponDrawPowerOld = m_fWeaponDrawPower;

      // [Cecil] Multiply speed
      while (m_fWeaponDrawPower > 0.0f || _pTimer->CurrentTick() - TM_START < m_moWeapon.GetAnimLength(CANNON_ANIM_FIRE) * FireSpeedMul()) {
        autowait(_pTimer->TickQuantum);
        m_fWeaponDrawPowerOld = m_fWeaponDrawPower;
        m_fWeaponDrawPower -= F_OFFSET_CHG;
        m_fWeaponDrawPower = ClampDn(m_fWeaponDrawPower, 0.0f);
        F_OFFSET_CHG = F_OFFSET_CHG*2;
      }

      // reset moving part's offset
      ResetWeaponMovingOffset();

      // no cannon balls -> change weapon
      if (CurrentAmmo() <= 0) {
        SelectNewWeapon();
      }

    } else {
      ASSERTALWAYS("Cannon - Auto weapon change not working.");
      m_bAltFire = m_bHasAmmo = FALSE;
    }
    jump Idle();
  };

  // Reload weapon
  Reload() {
    m_bReloadWeapon = FALSE;

    // reload
    if (m_iCurrentWeapon == WEAPON_COLT) {
      autocall ReloadColt() EEnd;
    } else if (m_iCurrentWeapon == WEAPON_DOUBLECOLT) {
      autocall ReloadDoubleColt() EEnd;
    }

    jump Idle();
  };

  // Play boring animation
  BoringWeaponAnimation() {
    // select new mode change animation
    FLOAT fWait = 0.0f;

    switch (m_iCurrentWeapon) {
      case WEAPON_KNIFE: fWait = KnifeBoring(); break;
      case WEAPON_COLT: fWait = ColtBoring(); break;
      case WEAPON_DOUBLECOLT: fWait = DoubleColtBoring(); break;
      case WEAPON_SINGLESHOTGUN: fWait = SingleShotgunBoring(); break;
      case WEAPON_DOUBLESHOTGUN: fWait = DoubleShotgunBoring(); break;
      case WEAPON_TOMMYGUN: fWait = TommyGunBoring(); break;
      case WEAPON_SNIPER: fWait = SniperBoring(); break;
      case WEAPON_MINIGUN: fWait = MiniGunBoring(); break;
      case WEAPON_ROCKETLAUNCHER: fWait = RocketLauncherBoring(); break;
      case WEAPON_GRENADELAUNCHER: fWait = GrenadeLauncherBoring(); break;
      case WEAPON_FLAMER: fWait = FlamerBoring(); break;
      case WEAPON_CHAINSAW: fWait = ChainsawBoring(); break;
      case WEAPON_LASER: fWait = LaserBoring(); break;
      case WEAPON_IRONCANNON: fWait = CannonBoring(); break;
      default: ASSERTALWAYS("Unknown weapon.");
    }

    if (fWait > 0.0f) {
      autowait(fWait);
    }

    return EBegin();
  };

  // No weapon actions
  Idle() {
    wait() {
      on (EBegin) : {
        // play default anim
        PlayDefaultAnim(FALSE);

        // weapon changed
        if (m_bChangeWeapon) {
          jump ChangeWeapon();
        }

        // fire pressed start firing
        if (m_bFireWeapon) {
          // [Cecil] Replace with alt fire
          if (GetSP()->AltMode() == 2 && AltFireExists(m_iCurrentWeapon)) {
            jump AltFire();
          }

          jump Fire();
        }

        // [Cecil] Alt fire
        if (m_bAltFire && GetSP()->AltMode() == 1) {
          jump AltFire();
        }

        // reload pressed
        if (m_bReloadWeapon) {
          jump Reload();
        }
        resume;
      }
      // select weapon
      on (ESelectWeapon eSelect) : {
        // try to change weapon
        SelectWeaponChange(eSelect.iWeapon);
        if (m_bChangeWeapon) {
          jump ChangeWeapon();
        }
        resume;
      }

      // fire pressed
      on (EFireWeapon) : {
        // [Cecil] Alt fire
        if (GetSP()->AltMode() == 2 && AltFireExists(m_iCurrentWeapon)) {
          jump AltFire();
        }

        jump Fire();
      }

      // [Cecil] Alt fire
      on (EAltFire) : {
        if (AltFireExists(m_iCurrentWeapon)) {
          jump AltFire();
        }
        resume;
      }

      // reload pressed
      on (EReloadWeapon) : {
        jump Reload();
      }

      // boring weapon animation
      on (EBoringWeapon) : {
        call BoringWeaponAnimation();
      }
    }
  };

  // weapons wait here while player is dead, so that stupid animations wouldn't play
  Stopped() {
    // make sure we restore all rockets if we are holding the rocket launcher
    if (m_iCurrentWeapon == WEAPON_ROCKETLAUNCHER) {
      // [Cecil] Rocket model
      StretchRocket(FLOAT3D((amp_bWeaponMirrored ? -1.0f : 1.0f), 1.0f, 1.0f));
    }

    // kill all possible sounds, animations, etc
    ResetWeaponMovingOffset();
    CPlayer &pl = (CPlayer&)*m_penPlayer;
    pl.m_soWeapon0.Stop();
    pl.m_soWeapon1.Stop();
    pl.m_soWeapon2.Stop();
    pl.m_soWeapon3.Stop();
    PlayLightAnim(LIGHT_ANIM_NONE, 0);

    wait() {
      // after level change
      on (EPostLevelChange) : { return EBegin(); };
      on (EStart) : { return EBegin(); };
      otherwise() : { resume; };
    }
  };

  Main(EWeaponsInit eInit) {
    // remember the initial parameters
    ASSERT(eInit.penOwner!=NULL);
    m_penPlayer = eInit.penOwner;

    // declare yourself as a void
    InitAsVoid();
    SetFlags(GetFlags()|ENF_CROSSESLEVELS|ENF_NOTIFYLEVELCHANGE);
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    // [Cecil] Remember last mirrored state
    _bLastWeaponMirrored = amp_bWeaponMirrored;

    // set weapon model for current weapon
    SetCurrentWeaponModel();

    wait() {
      on (EBegin) : { call Idle(); }
      on (ESelectWeapon eSelect) : {
        // try to change weapon
        SelectWeaponChange(eSelect.iWeapon);
        resume;
      };

      // before level change
      on (EPreLevelChange) : { 
        // stop everything
        m_bFireWeapon = FALSE;

        // [Cecil] Stop alt fire
        m_bAltFire = FALSE;

        call Stopped();
        resume;
      }

      on (EFireWeapon) : {
        // start firing
        m_bFireWeapon = TRUE;
        resume;
      }

      // [Cecil] Alt fire
      on (EAltFire) : {
        if (AltFireExists(m_iCurrentWeapon)) {
          m_bAltFire = TRUE;
        }
        resume;
      }

      on (EReleaseWeapon) : {
        // stop firing
        m_bFireWeapon = FALSE;

        // [Cecil] Stop alt fire
        m_bAltFire = FALSE;

        resume;
      }

      on (EReloadWeapon) : {
        // reload weapon
        m_bReloadWeapon = TRUE;
        resume;
      }

      on (EStop) : { call Stopped(); }
      on (EEnd) : { stop; }
    }

    // cease to exist
    Destroy();
    return;
  };
};
