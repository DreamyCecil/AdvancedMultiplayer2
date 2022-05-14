401
%{

#include "StdH.h"
#include "GameMP/SEColors.h"

#include <Engine/Build.h>
#include <Engine/Network/Network.h>
#include <locale.h>

#include "ModelsMP/Player/SeriousSam/Player.h"
#include "ModelsMP/Player/SeriousSam/Body.h"
#include "ModelsMP/Player/SeriousSam/Head.h"

#include "EntitiesMP/PlayerMarker.h"
#include "EntitiesMP/PlayerWeapons.h"
#include "EntitiesMP/PlayerAnimator.h"
#include "EntitiesMP/PlayerView.h"
#include "EntitiesMP/MovingBrush.h"
#include "EntitiesMP/Switch.h"
#include "EntitiesMP/MessageHolder.h"
#include "EntitiesMP/Camera.h"
#include "EntitiesMP/WorldLink.h"
#include "EntitiesMP/MusicHolder.h"
#include "EntitiesMP/EnemyBase.h"
#include "EntitiesMP/PlayerActionMarker.h"
#include "EntitiesMP/BasicEffects.h"
#include "EntitiesMP/BackgroundViewer.h"
#include "EntitiesMP/WorldSettingsController.h"
#include "EntitiesMP/ScrollHolder.h"
#include "EntitiesMP/TextFXHolder.h"
#include "EntitiesMP/SeriousBomb.h"
#include "EntitiesMP/CreditsHolder.h"
#include "EntitiesMP/HudPicHolder.h"

// [Cecil] Extra dependencies
#include "EntitiesMP/PlayerInventory.h"

extern void JumpFromBouncer(CEntity *penToBounce, CEntity *penBouncer);

// From GameMP
#define GRV_SHOWEXTRAS (1L<<0) // add extra stuff like console, weapon, pause

// Gender types
#define GENDER_MALE   0
#define GENDER_FEMALE 1
#define GENDEROFFSET  100 // offset for gender-specific sound components

// [Cecil] Sniper discrete zoom values (moved from PlayerWeapons)
static const INDEX _iSniperDiscreteZoomLevels = 4;
static const FLOAT _afSniperZoom[] = {
  90.0f, 1.0f, 53.1f, 2.0f, 28.0f, 4.0f, 14.2f, 6.0f, 
  //7.2f, 8.0f, 3.56f, 10.0f ,1.8f, 12.0f,
};

// [Cecil] Combo font
static CFontData _fdComboFont;

// [Cecil] Enemy counter
extern INDEX _iAliveEnemies;

// [Cecil] Player visibility
static CTextureObject _toPlayerMarker;
static INDEX amp_iPlayerTags = 2; // 0 - no tag, 1 - only marker, 2 - with name, 3 - with distance
static INDEX amp_bDecoratedPlayerNames = TRUE; // Color and animation tags in player names
static FLOAT amp_fPlayerBrightness = 0.1f; // Player model brightness

// [Cecil] Global controller
#include "EntitiesMP/GlobalController.h"

extern CEntity *_penGlobalController;
#define GLOBAL_CONTROLLER ((CGlobalController *)_penGlobalController)

// [Cecil] Cutscenes
inline CCamera *GetGlobalCamera(void) {
  CCamera *pen = (CCamera *)&*GLOBAL_CONTROLLER->m_penCamera;
  return pen;
};

inline CPlayerActionMarker *GetGlobalAction(void) {
  CPlayerActionMarker *pen = (CPlayerActionMarker *)&*GLOBAL_CONTROLLER->m_penAction;
  return pen;
};

inline INDEX &GetGlobalStopMask(void) {
  return GLOBAL_CONTROLLER->m_iStopMask;
};
%}

// Player view type
enum PlayerViewType {
  0 PVT_PLAYEREYES     "",
  1 PVT_PLAYERAUTOVIEW "",
  2 PVT_SCENECAMERA    "",
  3 PVT_3RDPERSONVIEW  "",
};

// Player model state
enum PlayerState {
  0 PST_STAND  "",
  1 PST_CROUCH "",
  2 PST_SWIM   "",
  3 PST_DIVE   "",
  4 PST_FALL   "",
};

// Event for starting cinematic camera sequence
event ECameraStart {
  CEntityPointer penCamera,
};

// Event for ending cinematic camera sequence
event ECameraStop {
  CEntityPointer penCamera,
};

// Sent when needs to rebirth
event ERebirth {};

// Sent when player was disconnected from game
event EDisconnected {};

// Start auto actions
event EAutoAction {
  CEntityPointer penFirstMarker,
};

// [Cecil] Stop auto actions
event EStopActions {
  FLOAT3D vTeleport,
  ANGLE3D aTeleport,
};

%{
// HUD render
extern void DrawHUD(const CPlayer *penPlayerCurrent, CDrawPort *pdpCurrent, BOOL bSnooping, const CPlayer *penPlayerOwner);
extern void InitHUD(void);
extern void EndHUD(void);

static CTimerValue _tvProbingLast;

// Used to render certain entities only for certain players (like picked items, etc.)
extern ULONG _ulPlayerRenderingMask = 0;

// Temporary BOOL used to discard calculating of 3rd view when calculating absolute view placement
BOOL _bDiscard3rdView = FALSE;

// Damage for the player to blow up
const FLOAT _fBlowUpAmount = 70.0f;

// Computer message adding flags
#define CMF_READ    (1L << 0)
#define CMF_ANALYZE (1L << 1)

// Export current player projection
CAnyProjection3D prPlayerProjection;

// Marker distance
struct MarkerDistance {
  FLOAT md_fMinD;
  CPlayerMarker *md_ppm;
  void Clear(void);
};

int qsort_CompareMarkerDistance(const void *pv0, const void *pv1) {
  MarkerDistance &md0 = *(MarkerDistance*)pv0;
  MarkerDistance &md1 = *(MarkerDistance*)pv1;

  if (md0.md_fMinD < md1.md_fMinD) {
    return +1;
  } else if (md0.md_fMinD > md1.md_fMinD) {
    return -1;
  }

  return 0;
};

static inline FLOAT IntensityAtDistance( FLOAT fFallOff, FLOAT fHotSpot, FLOAT fDistance) {
  // intensity is zero if further than fall-off range
  if (fDistance>fFallOff) {
    return 0.0f;
  }

  // intensity is maximum if closer than hot-spot range
  if (fDistance<fHotSpot) {
    return 1.0f;
  }

  // interpolate if between fall-off and hot-spot range
  return (fFallOff-fDistance) / (fFallOff-fHotSpot);
};

static CTString MakeEmptyString(INDEX ctLen, char ch=' ') {
  char ach[2];
  ach[0] = ch;
  ach[1] = 0;

  CTString strSpaces;

  for (INDEX i = 0; i < ctLen; i++) {
    strSpaces += ach;
  }

  return strSpaces;
};

// Take a two line string and align into one line of minimum given length
static INDEX _ctAlignWidth = 20;

static CTString AlignString(const CTString &strOrg) {
  // split into two lines
  CTString strL = strOrg;
  strL.OnlyFirstLine();

  CTString strR = strOrg;
  strR.RemovePrefix(strL);
  strR.DeleteChar(0);
  
  // get their lengths
  INDEX iLenL = strL.LengthNaked();
  INDEX iLenR = strR.LengthNaked();

  // find number of spaces to insert
  INDEX ctSpaces = ClampDn(_ctAlignWidth - (iLenL + iLenR), (INDEX)1);

  // make aligned string
  return strL + MakeEmptyString(ctSpaces)+strR;
};

static CTString CenterString(const CTString &str) {
  INDEX ctSpaces = ClampDn((_ctAlignWidth - str.LengthNaked()) / (INDEX)2, (INDEX)0);

  return MakeEmptyString(ctSpaces) + str;
};

static CTString PadStringRight(const CTString &str, INDEX iLen) {
  INDEX ctSpaces = ClampDn(iLen - str.LengthNaked(), (INDEX)0);

  return str + MakeEmptyString(ctSpaces);
};

static CTString PadStringLeft(const CTString &str, INDEX iLen) {
  INDEX ctSpaces = ClampDn(iLen - str.LengthNaked(), (INDEX)0);

  return MakeEmptyString(ctSpaces) + str;
};

static void KillAllEnemies(CEntity *penKiller) {
  // for each entity in the world
  {FOREACHINDYNAMICCONTAINER(penKiller->GetWorld()->wo_cenEntities, CEntity, iten) {
    CEntity *pen = iten;

    if (IsDerivedFromClass(pen, "Enemy Base") && !IsOfClass(pen, "Devil")) {
      CEnemyBase *penEnemy = (CEnemyBase*)pen;

      if (penEnemy->m_penEnemy == NULL) {
        continue;
      }

      penKiller->InflictDirectDamage(pen, penKiller, DMT_BULLET,
        penEnemy->GetHealth() + 1.0f, pen->GetPlacement().pl_PositionVector, FLOAT3D(0.0f, 1.0f, 0.0f));
    }
  }}
};

// View angle limits
#define HEADING_MAX 45.0f
#define PITCH_MAX   90.0f

// Player flags
#define PLF_INITIALIZED         (1UL<<0)  // set when player entity is ready to function
#define PLF_VIEWROTATIONCHANGED (1UL<<1)  // for adjusting view rotation separately from legs
#define PLF_JUMPALLOWED         (1UL<<2)  // if jumping is allowed
#define PLF_SYNCWEAPON          (1UL<<3)  // weapon model needs to be synchronized before rendering
#define PLF_AUTOMOVEMENTS       (1UL<<4)  // complete automatic control of movements
#define PLF_DONTRENDER          (1UL<<5)  // don't render view (used at end of level)
#define PLF_CHANGINGLEVEL       (1UL<<6)  // mark that we next are to appear at start of new level
#define PLF_APPLIEDACTION       (1UL<<7)  // used to detect when player is not connected
#define PLF_NOTCONNECTED        (1UL<<8)  // set if the player is not connected
#define PLF_LEVELSTARTED        (1UL<<9)  // marks that level start time was recorded
#define PLF_ISZOOMING           (1UL<<10) // marks that player is zoomed in with the sniper
#define PLF_RESPAWNINPLACE      (1UL<<11) // don't move to marker when respawning (for current death only)
#define PLF_RESETMODELS         (1UL<<12) // [Cecil] Schedule resetting of various models

// How long the pickup message stays on screen
#define PICKEDREPORT_TIME 2.0f

// Cheats
static INDEX cht_iGoToMarker = -1;
static INDEX cht_bKillAll = FALSE;
static INDEX cht_bGiveAll = FALSE;
static INDEX cht_bOpen = FALSE;
static INDEX cht_bAllMessages = FALSE;
static INDEX cht_bRefresh = FALSE;
extern INDEX cht_bGod = FALSE;
extern INDEX cht_bFly = FALSE;
extern INDEX cht_bGhost = FALSE;
extern INDEX cht_bInvisible = FALSE;
extern FLOAT cht_fTranslationMultiplier = 1.0f;
extern INDEX cht_bEnable = FALSE;   

// Interface control
static INDEX hud_bShowAll = TRUE; // used internaly in menu/console
extern INDEX hud_bShowWeapon = TRUE;
extern INDEX hud_bShowMessages = TRUE;
extern INDEX hud_bShowInfo = TRUE;
extern INDEX hud_bShowLatency = FALSE;
extern INDEX hud_iShowPlayers = -1; // auto
extern INDEX hud_iSortPlayers = -1; // auto
extern FLOAT hud_fOpacity = 0.9f;
extern FLOAT hud_fScaling = 1.0f;
extern FLOAT hud_tmWeaponsOnScreen = 3.0f;
extern FLOAT hud_tmLatencySnapshot = 1.0f;
extern INDEX hud_bShowMatchInfo = TRUE;

extern FLOAT plr_fBreathingStrength = 0.0f;
extern FLOAT plr_tmSnoopingTime;

// [Cecil] AMP 2 customization
static INDEX amp_bBloodScreen = TRUE;
extern INDEX amp_bEnemyCounter = TRUE;
static INDEX amp_iComboText = 2;

// Debug commands
extern INDEX cht_bKillFinalBoss = FALSE;
INDEX cht_bDebugFinalBoss = FALSE;
INDEX cht_bDumpFinalBossData = FALSE;
INDEX cht_bDebugFinalBossAnimations = FALSE;
INDEX cht_bDumpPlayerShading = FALSE;

// Misc
static FLOAT plr_fAcceleration  = 100.0f;
static FLOAT plr_fDeceleration  = 60.0f;

// [Cecil] Made extern
extern FLOAT plr_fSpeedForward  = 10.0f;
extern FLOAT plr_fSpeedBackward = 10.0f;
extern FLOAT plr_fSpeedSide     = 10.0f;
extern FLOAT plr_fSpeedUp       = 11.0f;

static FLOAT plr_fViewHeightStand  = 1.9f;
static FLOAT plr_fViewHeightCrouch = 0.7f;
static FLOAT plr_fViewHeightSwim   = 0.4f;
static FLOAT plr_fViewHeightDive   = 0.0f;

extern FLOAT plr_fViewDampFactor        = 0.4f;
extern FLOAT plr_fViewDampLimitGroundUp = 0.1f;
extern FLOAT plr_fViewDampLimitGroundDn = 0.4f;
extern FLOAT plr_fViewDampLimitWater    = 0.1f;

static FLOAT plr_fFrontClipDistance = 0.25f;
static FLOAT plr_fFOV = 90.0f;

static FLOAT net_tmLatencyAvg;
extern INDEX plr_bRenderPicked = FALSE;
extern INDEX plr_bRenderPickedParticles = FALSE;
extern INDEX plr_bOnlySam = FALSE;

extern INDEX ent_bReportBrokenChains = FALSE;
extern FLOAT ent_tmMentalIn = 0.5f;
extern FLOAT ent_tmMentalOut = 0.75f;
extern FLOAT ent_tmMentalFade = 0.5f;

extern FLOAT gfx_fEnvParticlesDensity = 1.0f;
extern FLOAT gfx_fEnvParticlesRange = 1.0f;

// Prediction control vars
extern FLOAT cli_fPredictPlayersRange = 0.0f;
extern FLOAT cli_fPredictItemsRange = 3.0f;
extern FLOAT cli_tmPredictFoe = 10.0f;
extern FLOAT cli_tmPredictAlly = 10.0f;
extern FLOAT cli_tmPredictEnemy  = 10.0f;

static FLOAT plr_fSwimSoundDelay = 0.8f;
static FLOAT plr_fDiveSoundDelay = 1.6f;
static FLOAT plr_fWalkSoundDelay = 0.5f;
static FLOAT plr_fRunSoundDelay  = 0.3f;

// Player that wants to call the computer
DECL_DLL extern class CPlayer *cmp_ppenPlayer = NULL;
// For rendering computer on secondary display in dualhead
DECL_DLL extern class CPlayer *cmp_ppenDHPlayer = NULL;
// Set to update current message in background mode (for dualhead)
DECL_DLL extern BOOL cmp_bUpdateInBackground = FALSE;
// Set for the initial calling computer without rendering the game
DECL_DLL extern BOOL cmp_bInitialStart = FALSE;

// For player HUD and statistics
DECL_DLL extern INDEX plr_iHiScore = 0;

// Precache player components
void CPlayer_Precache(void) {
  CDLLEntityClass *pdec = &CPlayer_DLLClass;

  // precache view
  extern void CPlayerView_Precache(void);
  CPlayerView_Precache();

  // precache all player sounds
  pdec->PrecacheSound(SOUND_WATER_ENTER);
  pdec->PrecacheSound(SOUND_WATER_LEAVE);
  pdec->PrecacheSound(SOUND_WALK_L);
  pdec->PrecacheSound(SOUND_WALK_R);
  pdec->PrecacheSound(SOUND_WALK_SAND_L);
  pdec->PrecacheSound(SOUND_WALK_SAND_R);
  pdec->PrecacheSound(SOUND_SWIM_L);
  pdec->PrecacheSound(SOUND_SWIM_R);
  pdec->PrecacheSound(SOUND_DIVE_L);
  pdec->PrecacheSound(SOUND_DIVE_R);
  pdec->PrecacheSound(SOUND_DIVEIN);
  pdec->PrecacheSound(SOUND_DIVEOUT);
  pdec->PrecacheSound(SOUND_DROWN);
  pdec->PrecacheSound(SOUND_INHALE0);
  pdec->PrecacheSound(SOUND_INHALE1);
  pdec->PrecacheSound(SOUND_INHALE2);
  pdec->PrecacheSound(SOUND_JUMP);
  pdec->PrecacheSound(SOUND_LAND);
  pdec->PrecacheSound(SOUND_WOUNDWEAK);
  pdec->PrecacheSound(SOUND_WOUNDMEDIUM);
  pdec->PrecacheSound(SOUND_WOUNDSTRONG);
  pdec->PrecacheSound(SOUND_WOUNDWATER);
  pdec->PrecacheSound(SOUND_DEATH);
  pdec->PrecacheSound(SOUND_DEATHWATER);
  pdec->PrecacheSound(SOUND_WATERAMBIENT);
  pdec->PrecacheSound(SOUND_WATERBUBBLES);
  pdec->PrecacheSound(SOUND_WATERWALK_L);
  pdec->PrecacheSound(SOUND_WATERWALK_R);
  pdec->PrecacheSound(SOUND_INFO);
  pdec->PrecacheSound(SOUND_WALK_GRASS_L);
  pdec->PrecacheSound(SOUND_WALK_GRASS_R);
  pdec->PrecacheSound(SOUND_WALK_WOOD_L);
  pdec->PrecacheSound(SOUND_WALK_WOOD_R);
  pdec->PrecacheSound(SOUND_WALK_SNOW_L);
  pdec->PrecacheSound(SOUND_WALK_SNOW_R);

  pdec->PrecacheSound(SOUND_F_WATER_ENTER);
  pdec->PrecacheSound(SOUND_F_WATER_LEAVE);
  pdec->PrecacheSound(SOUND_F_WALK_L);
  pdec->PrecacheSound(SOUND_F_WALK_R);
  pdec->PrecacheSound(SOUND_F_WALK_SAND_L);
  pdec->PrecacheSound(SOUND_F_WALK_SAND_R);
  pdec->PrecacheSound(SOUND_F_SWIM_L);
  pdec->PrecacheSound(SOUND_F_SWIM_R);
  pdec->PrecacheSound(SOUND_F_DIVE_L);
  pdec->PrecacheSound(SOUND_F_DIVE_R);
  pdec->PrecacheSound(SOUND_F_DIVEIN);
  pdec->PrecacheSound(SOUND_F_DIVEOUT);
  pdec->PrecacheSound(SOUND_F_DROWN);
  pdec->PrecacheSound(SOUND_F_INHALE0);
  pdec->PrecacheSound(SOUND_F_INHALE1);
  pdec->PrecacheSound(SOUND_F_INHALE2);
  pdec->PrecacheSound(SOUND_F_JUMP);
  pdec->PrecacheSound(SOUND_F_LAND);
  pdec->PrecacheSound(SOUND_F_WOUNDWEAK);
  pdec->PrecacheSound(SOUND_F_WOUNDMEDIUM);
  pdec->PrecacheSound(SOUND_F_WOUNDSTRONG);
  pdec->PrecacheSound(SOUND_F_WOUNDWATER);
  pdec->PrecacheSound(SOUND_F_DEATH);
  pdec->PrecacheSound(SOUND_F_DEATHWATER);
  pdec->PrecacheSound(SOUND_F_WATERWALK_L);
  pdec->PrecacheSound(SOUND_F_WATERWALK_R);
  pdec->PrecacheSound(SOUND_F_WALK_GRASS_L);
  pdec->PrecacheSound(SOUND_F_WALK_GRASS_R);
  pdec->PrecacheSound(SOUND_F_WALK_WOOD_L);
  pdec->PrecacheSound(SOUND_F_WALK_WOOD_R);
  pdec->PrecacheSound(SOUND_F_WALK_SNOW_L);
  pdec->PrecacheSound(SOUND_F_WALK_SNOW_R);
  pdec->PrecacheSound(SOUND_BLOWUP);

  pdec->PrecacheSound(SOUND_SNIPER_ZOOM);
  pdec->PrecacheSound(SOUND_SNIPER_QZOOM);
  pdec->PrecacheSound(SOUND_SILENCE);
  pdec->PrecacheSound(SOUND_POWERUP_BEEP);

  pdec->PrecacheClass(CLASS_BASIC_EFFECT, BET_TELEPORT);
  pdec->PrecacheClass(CLASS_SERIOUSBOMB);

  pdec->PrecacheModel(MODEL_FLESH);
  pdec->PrecacheModel(MODEL_FLESH_APPLE);
  pdec->PrecacheModel(MODEL_FLESH_BANANA);
  pdec->PrecacheModel(MODEL_FLESH_BURGER);
  pdec->PrecacheTexture(TEXTURE_FLESH_RED);
  pdec->PrecacheTexture(TEXTURE_FLESH_GREEN);
  pdec->PrecacheTexture(TEXTURE_FLESH_APPLE);
  pdec->PrecacheTexture(TEXTURE_FLESH_BANANA);
  pdec->PrecacheTexture(TEXTURE_FLESH_BURGER);
  pdec->PrecacheTexture(TEXTURE_FLESH_LOLLY);
  pdec->PrecacheTexture(TEXTURE_FLESH_ORANGE);
  
  // [Cecil] Flesh texture for coloring
  pdec->PrecacheTexture(TEXTURE_FLESH);
  // [Cecil] Token sound
  pdec->PrecacheSound(SOUND_TOKEN);
  // [Cecil] Powerup sound
  pdec->PrecacheSound(SOUND_POWERUP);
  // [Cecil] Fireworks effect
  pdec->PrecacheClass(CLASS_BASIC_EFFECT, BET_FIREWORKS);

  pdec->PrecacheClass(CLASS_BASIC_EFFECT, BET_BLOODSPILL);
  pdec->PrecacheClass(CLASS_BASIC_EFFECT, BET_BLOODSTAIN);
  pdec->PrecacheClass(CLASS_BASIC_EFFECT, BET_BLOODSTAINGROW);
  pdec->PrecacheClass(CLASS_BASIC_EFFECT, BET_BLOODEXPLODE);

  // [Cecil] Voice commands
  for (INDEX iVC = SOUND_CHEERS1; iVC <= SOUND_HELP7; iVC++) {
    pdec->PrecacheSound(iVC);
  }
};

void CPlayer_OnInitClass(void) {
  // [Cecil] Clear current player controls
  extern void ClearPlayerControls(void);
  ClearPlayerControls();

  // [Cecil] Declare console commands for controls
  extern void DeclareControlsCommands(void);
  DeclareControlsCommands();

  _pShell->DeclareSymbol("user FLOAT plr_fSwimSoundDelay;", &plr_fSwimSoundDelay);
  _pShell->DeclareSymbol("user FLOAT plr_fDiveSoundDelay;", &plr_fDiveSoundDelay);
  _pShell->DeclareSymbol("user FLOAT plr_fWalkSoundDelay;", &plr_fWalkSoundDelay);
  _pShell->DeclareSymbol("user FLOAT plr_fRunSoundDelay;",  &plr_fRunSoundDelay);

  _pShell->DeclareSymbol("persistent user FLOAT cli_fPredictPlayersRange;",&cli_fPredictPlayersRange);
  _pShell->DeclareSymbol("persistent user FLOAT cli_fPredictItemsRange;",  &cli_fPredictItemsRange  );
  _pShell->DeclareSymbol("persistent user FLOAT cli_tmPredictFoe;",        &cli_tmPredictFoe        );
  _pShell->DeclareSymbol("persistent user FLOAT cli_tmPredictAlly;",       &cli_tmPredictAlly       );
  _pShell->DeclareSymbol("persistent user FLOAT cli_tmPredictEnemy;",      &cli_tmPredictEnemy      );

  _pShell->DeclareSymbol("     INDEX hud_bShowAll;",  &hud_bShowAll);
  _pShell->DeclareSymbol("user INDEX hud_bShowInfo;", &hud_bShowInfo);
  _pShell->DeclareSymbol("user const FLOAT net_tmLatencyAvg;", &net_tmLatencyAvg);
  _pShell->DeclareSymbol("persistent user INDEX hud_bShowLatency;",  &hud_bShowLatency);
  _pShell->DeclareSymbol("persistent user INDEX hud_iShowPlayers;",  &hud_iShowPlayers);
  _pShell->DeclareSymbol("persistent user INDEX hud_iSortPlayers;",  &hud_iSortPlayers);
  _pShell->DeclareSymbol("persistent user INDEX hud_bShowWeapon;",   &hud_bShowWeapon);
  _pShell->DeclareSymbol("persistent user INDEX hud_bShowMessages;", &hud_bShowMessages);
  _pShell->DeclareSymbol("persistent user FLOAT hud_fScaling;", &hud_fScaling);
  _pShell->DeclareSymbol("persistent user FLOAT hud_fOpacity;", &hud_fOpacity);
  _pShell->DeclareSymbol("persistent user FLOAT hud_tmWeaponsOnScreen;",  &hud_tmWeaponsOnScreen);
  _pShell->DeclareSymbol("persistent user FLOAT hud_tmLatencySnapshot;",  &hud_tmLatencySnapshot);
  _pShell->DeclareSymbol("persistent user FLOAT plr_fBreathingStrength;", &plr_fBreathingStrength);
  _pShell->DeclareSymbol("INDEX cht_bKillFinalBoss;",  &cht_bKillFinalBoss);
  _pShell->DeclareSymbol("INDEX cht_bDebugFinalBoss;", &cht_bDebugFinalBoss);
  _pShell->DeclareSymbol("INDEX cht_bDumpFinalBossData;", &cht_bDumpFinalBossData);
  _pShell->DeclareSymbol("INDEX cht_bDebugFinalBossAnimations;", &cht_bDebugFinalBossAnimations);
  _pShell->DeclareSymbol("INDEX cht_bDumpPlayerShading;", &cht_bDumpPlayerShading);
  _pShell->DeclareSymbol("persistent user INDEX hud_bShowMatchInfo;", &hud_bShowMatchInfo);

  // [Cecil] AMP 2 customization
  _pShell->DeclareSymbol("persistent user INDEX amp_bBloodScreen;", &amp_bBloodScreen);
  _pShell->DeclareSymbol("persistent user INDEX amp_bEnemyCounter;", &amp_bEnemyCounter);
  _pShell->DeclareSymbol("persistent user INDEX amp_iComboText;", &amp_iComboText);
  _pShell->DeclareSymbol("persistent user INDEX amp_iPlayerTags;", &amp_iPlayerTags);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDecoratedPlayerNames;", &amp_bDecoratedPlayerNames);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fPlayerBrightness;", &amp_fPlayerBrightness);

  // cheats
  _pShell->DeclareSymbol("user INDEX cht_bGod;",       &cht_bGod);
  _pShell->DeclareSymbol("user INDEX cht_bFly;",       &cht_bFly);
  _pShell->DeclareSymbol("user INDEX cht_bGhost;",     &cht_bGhost);
  _pShell->DeclareSymbol("user INDEX cht_bInvisible;", &cht_bInvisible);
  _pShell->DeclareSymbol("user INDEX cht_bGiveAll;",   &cht_bGiveAll);
  _pShell->DeclareSymbol("user INDEX cht_bKillAll;",   &cht_bKillAll);
  _pShell->DeclareSymbol("user INDEX cht_bOpen;",      &cht_bOpen);
  _pShell->DeclareSymbol("user INDEX cht_bAllMessages;", &cht_bAllMessages);
  _pShell->DeclareSymbol("user FLOAT cht_fTranslationMultiplier ;", &cht_fTranslationMultiplier);
  _pShell->DeclareSymbol("user INDEX cht_bRefresh;", &cht_bRefresh);
  _pShell->DeclareSymbol("user INDEX cht_bEnableCheats;", &cht_bEnable);

  // this cheat is always enabled
  _pShell->DeclareSymbol("user INDEX cht_iGoToMarker;", &cht_iGoToMarker);

  // player parameters
  _pShell->DeclareSymbol("persistent user FLOAT plr_fFOV;", &plr_fFOV);
  _pShell->DeclareSymbol("persistent user FLOAT plr_fFrontClipDistance;", &plr_fFrontClipDistance);
  _pShell->DeclareSymbol("persistent user INDEX plr_bRenderPicked;", &plr_bRenderPicked);
  _pShell->DeclareSymbol("persistent user INDEX plr_bRenderPickedParticles;", &plr_bRenderPickedParticles);
  _pShell->DeclareSymbol("persistent user INDEX plr_bOnlySam;", &plr_bOnlySam);
  _pShell->DeclareSymbol("persistent user INDEX ent_bReportBrokenChains;", &ent_bReportBrokenChains);
  _pShell->DeclareSymbol("persistent user FLOAT ent_tmMentalIn  ;", &ent_tmMentalIn  );
  _pShell->DeclareSymbol("persistent user FLOAT ent_tmMentalOut ;", &ent_tmMentalOut );
  _pShell->DeclareSymbol("persistent user FLOAT ent_tmMentalFade;", &ent_tmMentalFade);
  _pShell->DeclareSymbol("persistent user FLOAT gfx_fEnvParticlesDensity;", &gfx_fEnvParticlesDensity);
  _pShell->DeclareSymbol("persistent user FLOAT gfx_fEnvParticlesRange;", &gfx_fEnvParticlesRange);

  // player appearance interface
  _pShell->DeclareSymbol("INDEX SetPlayerAppearance(INDEX, INDEX, INDEX, INDEX);", &SetPlayerAppearance);

  // call player weapons persistant variable initialization
  extern void CPlayerWeapons_Init(void);
  CPlayerWeapons_Init();

  // initialize HUD
  InitHUD();

  // [Cecil] Combo font
  DECLARE_CTFILENAME(fnCombo, "Fonts\\Display3-caps.fnt");
  _fdComboFont.Load_t(fnCombo);

  // precache
  CPlayer_Precache();
};

// Player cleanup
void CPlayer_OnEndClass(void) {
  EndHUD();
};

CTString GetDifficultyString(void) {
  if (GetSP()->sp_bMental) {
    return TRANS("Mental");
  }

  switch (GetSP()->sp_gdGameDifficulty) {
    case CSessionProperties::GD_TOURIST: return TRANS("Tourist");
    case CSessionProperties::GD_EASY:    return TRANS("Easy");
    default:
    case CSessionProperties::GD_NORMAL:  return TRANS("Normal");
    case CSessionProperties::GD_HARD:    return TRANS("Hard");
    case CSessionProperties::GD_EXTREME: return TRANS("Serious");
  }
};

// Info structures
static EntityInfo eiPlayerGround = {
  EIBT_FLESH, 80.0f,
  0.0f, 1.7f, 0.0f, // source (eyes)
  0.0f, 1.0f, 0.0f, // target (body)
};

static EntityInfo eiPlayerCrouch = {
  EIBT_FLESH, 80.0f,
  0.0f, 1.2f, 0.0f, // source (eyes)
  0.0f, 0.7f, 0.0f, // target (body)
};

static EntityInfo eiPlayerSwim = {
  EIBT_FLESH, 40.0f,
  0.0f, 0.0f, 0.0f, // source (eyes)
  0.0f, 0.0f, 0.0f, // target (body)
};

// Light animations
#define LIGHT_ANIM_MINIGUN 2
#define LIGHT_ANIM_TOMMYGUN 3
#define LIGHT_ANIM_COLT_SHOTGUN 4
#define LIGHT_ANIM_NONE 5

const char *NameForState(PlayerState pst) {
  switch (pst) {
    case PST_STAND: return "stand";
    case PST_CROUCH: return "crouch";
    case PST_FALL: return "fall";
    case PST_SWIM: return "swim";
    case PST_DIVE: return "dive";
  }
  return "???";
};

// Print explanation on how the player died
void PrintPlayerDeathMessage(CPlayer *ppl, const EDeath &eDeath) {
  CTString strMyName = ppl->GetPlayerName();
  CEntity *penKiller = eDeath.eLastDamage.penInflictor;

  // if killed by a valid entity
  if (penKiller != NULL) {
    // if killed by a player
    if (IsOfClass(penKiller, "Player")) {
      // if not self
      if (penKiller != ppl) {
        CTString strKillerName = ((CPlayer*)penKiller)->GetPlayerName();

        switch (eDeath.eLastDamage.dmtType) {
          case DMT_TELEPORT:   CPrintF(TRANS("%s telefragged %s\n"), strKillerName, strMyName); break;
          case DMT_CLOSERANGE: CPrintF(TRANS("%s cut %s into pieces\n"), strKillerName, strMyName); break;
          case DMT_CHAINSAW:   CPrintF(TRANS("%s cut %s into pieces\n"), strKillerName, strMyName); break;
          case DMT_BULLET:     CPrintF(TRANS("%s poured lead into %s\n"), strKillerName, strMyName); break;
          case DMT_PROJECTILE:
          case DMT_EXPLOSION:  CPrintF(TRANS("%s blew %s away\n"), strKillerName, strMyName); break;
          case DMT_CANNONBALL: CPrintF(TRANS("%s smashed %s with a cannon\n"), strKillerName, strMyName); break;
          case DMT_CANNONBALL_EXPLOSION: CPrintF(TRANS("%s nuked %s\n"), strKillerName, strMyName); break;

          default: CPrintF(TRANS("%s killed %s\n"), strKillerName, strMyName);
        }

      } else {
        // make message from damage type
        switch (eDeath.eLastDamage.dmtType) {
          case DMT_DROWNING:  CPrintF(TRANS("%s drowned\n"), strMyName); break;
          case DMT_BURNING:   CPrintF(TRANS("%s burst into flames\n"), strMyName); break;
          case DMT_SPIKESTAB: CPrintF(TRANS("%s fell into a spike-hole\n"), strMyName); break;
          case DMT_FREEZING:  CPrintF(TRANS("%s has frozen\n"), strMyName); break;
          case DMT_ACID:      CPrintF(TRANS("%s dissolved\n"), strMyName); break;
          case DMT_PROJECTILE:
          case DMT_EXPLOSION: CPrintF(TRANS("%s blew themselves away\n"), strMyName); break;

          default: CPrintF(TRANS("%s has committed suicide\n"), strMyName);
        }
      }

    // if killed by an enemy
    } else if (IsDerivedFromClass(penKiller, "Enemy Base")) {
      // check for telefrag first
      if (eDeath.eLastDamage.dmtType == DMT_TELEPORT) {
        CPrintF(TRANS("%s was telefragged\n"), strMyName);
        return;
      }

      // describe how this enemy killed player
      CPrintF("%s\n", (const char*)((CEnemyBase*)penKiller)->GetPlayerKillDescription(strMyName, eDeath));

    // if killed by some other entity
    } else {
      // make message from damage type
      switch(eDeath.eLastDamage.dmtType) {
        case DMT_SPIKESTAB: CPrintF(TRANS("%s was pierced\n"), strMyName); break;
        case DMT_BRUSH:     CPrintF(TRANS("%s was squashed\n"), strMyName); break;
        case DMT_ABYSS:     CPrintF(TRANS("%s went over the edge\n"), strMyName); break;
        case DMT_IMPACT:    CPrintF(TRANS("%s swashed\n"), strMyName); break;
        case DMT_HEAT:      CPrintF(TRANS("%s stood in the sun for too long\n"), strMyName); break;

        default: CPrintF(TRANS("%s passed away\n"), strMyName);
      }
    }

  // if no entity pointer (shouldn't happen)
  } else {
    CPrintF(TRANS("%s is missing in action\n"), strMyName);
  }
};
%}

class export CPlayer : CPlayerEntity {
name      "Player";
thumbnail "";
features  "ImplementsOnInitClass", "ImplementsOnEndClass", "CanBePredictable";

properties:
  1 CTString m_strName "Name" = "<unnamed player>",
  2 COLOR m_ulLastButtons = 0, // buttons last pressed
  3 FLOAT m_fArmor = 0.0f,     // armor
  4 CTString m_strGroup = "",  // group name for world change
  6 FLOAT m_fMaxHealth = 1.0f, // default health supply player can have
  7 INDEX m_ulFlags = 0,       // various flags

 // [Cecil] Sniping properties (moved from PlayerWeapons)
 10 BOOL m_bSniping = FALSE,
 11 FLOAT m_fSniperMaxFOV = 90.0f,
 12 FLOAT m_fSniperMinFOV = 14.2f,
 13 FLOAT m_fSnipingZoomSpeed = 2.0f,
 14 FLOAT m_fMinimumZoomFOV = 53.1f,
 15 FLOAT m_tmLastSniperFire = 0.0f,
 16 FLOAT m_fSniperFOV     = 90.0f, // sniper FOV
 17 FLOAT m_fLastSniperFOV = 90.0f, // sniper FOV for lerping
  
 20 CEntityPointer m_penAnimator,      // player animator
 21 CEntityPointer m_penView,          // player view
 22 CEntityPointer m_pen3rdPersonView, // player 3rd person view
 23 CEntityPointer m_penInventory, // [Cecil] Player's inventory

 24 INDEX m_iViewState = PVT_PLAYEREYES,     // view state
 25 INDEX m_iLastViewState = PVT_PLAYEREYES, // last view state

 26 CAnimObject m_aoLightAnimation, // light animation object
 27 FLOAT m_fDamageAmmount = 0.0f,  // how much was last wound
 28 FLOAT m_tmWoundedTime  = 0.0f,  // when was last wound
 29 FLOAT m_tmScreamTime   = 0.0f,  // when was last wound sound played

 33 INDEX m_iGender = GENDER_MALE, // male/female offset in various tables
 34 enum PlayerState m_pstState = PST_STAND, // current player state
 35 FLOAT m_fFallTime = 0.0f,    // time passed when falling
 36 FLOAT m_fSwimTime = 0.0f,    // time when started swimming
 45 FLOAT m_tmOutOfWater = 0.0f, // time when got out of water last time
 37 FLOAT m_tmMoveSound = 0.0f,       // last time move sound was played
 38 BOOL  m_bMoveSoundLeft = TRUE,    // left or right walk channel is current
 39 FLOAT m_tmNextAmbientOnce = 0.0f, // next time to play local ambient sound
 43 FLOAT m_tmMouthSoundLast = 0.0f,  // time last played some repeating mouth sound

 40 CEntityPointer m_penCamera,        // camera for current cinematic sequence, or null
 41 CTString m_strCenterMessage = "",  // center message
 42 FLOAT m_tmCenterMessageEnd = 0.0f, // last time to show centered message
 48 BOOL m_bPendingMessage = FALSE,    // message sound pending to be played
 47 FLOAT m_tmMessagePlay = 0.0f,      // when to play the message sound
 49 FLOAT m_tmAnalyseEnd = 0.0f,       // last time to show analysation
 50 BOOL m_bComputerInvoked = FALSE,   // set if computer was invoked at least once
 57 FLOAT m_tmAnimateInbox = -100.0f,  // show animation of inbox icon animation
 
 44 CEntityPointer m_penMainMusicHolder,

 51 FLOAT m_tmLastDamage = -1.0f,
 52 FLOAT m_fMaxDamageAmmount = 0.0f,
 53 FLOAT3D m_vDamage = FLOAT3D(0.0f, 0.0f, 0.0f),
 54 FLOAT m_tmSpraySpawned = -1.0f,
 55 FLOAT m_fSprayDamage = 0.0f,
 56 CEntityPointer m_penSpray,

 // sounds
 65 CSoundObject m_soPowerUpBeep,

 70 CSoundObject m_soMouth,     // breating, yelling etc.
 71 CSoundObject m_soFootL,     // walking etc.
 72 CSoundObject m_soFootR,
 73 CSoundObject m_soBody,          // splashing etc.
 74 CSoundObject m_soLocalAmbientLoop,  // local ambient that only this player hears
 75 CSoundObject m_soLocalAmbientOnce,  // local ambient that only this player hears
 76 CSoundObject m_soMessage,  // message sounds
 77 CSoundObject m_soHighScore, // [Cecil] NOTE: Free sound object, can be repurposed
 78 CSoundObject m_soSpeech,    // for quotes
 79 CSoundObject m_soSniperZoom, // for sniper zoom sound

 81 INDEX m_iMana    = 0,        // current score worth for killed player
 94 FLOAT m_fManaFraction = 0.0f,// fractional part of mana, for slow increase with time
 84 INDEX m_iHighScore = 0,      // internal hiscore for demo playing
 85 INDEX m_iBeatenHighScore = 0,    // hiscore that was beaten
 89 FLOAT m_tmLatency = 0.0f,               // player-server latency (in seconds)
 // for latency averaging
 88 FLOAT m_tmLatencyLastAvg = 0.0f, 
 87 FLOAT m_tmLatencyAvgSum = 0.0f, 
 86 INDEX m_ctLatencyAvg = 0, 

 96 BOOL  m_bEndOfLevel = FALSE,
 97 BOOL  m_bEndOfGame  = FALSE,
 98 INDEX m_iMayRespawn = 0,     // must get to 2 to be able to respawn
 99 FLOAT m_tmSpawned = 0.0f,   // when player was spawned
 100 FLOAT3D m_vDied = FLOAT3D(0.0f, 0.0f, 0.0f),  // where player died (for respawn in-place)
 101 FLOAT3D m_aDied = FLOAT3D(0.0f, 0.0f, 0.0f),

 // statistics
 103 FLOAT m_tmEstTime  = 0.0f,   // time estimated for this level
 105 INDEX m_iTimeScore = 0,
 106 INDEX m_iStartTime = 0,      // game start time (ansi c time_t type)
 107 INDEX m_iEndTime   = 0,      // game end time (ansi c time_t type)
 108 FLOAT m_tmLevelStarted = 0.0f,  // game time when level started
 93 CTString m_strLevelStats = "",  // detailed statistics for each level

 // auto action vars
 110 CEntityPointer m_penActionMarker,  // current marker for auto actions
 111 FLOAT m_fAutoSpeed = 0.0f, // speed to go towards the marker
 112 INDEX m_iAutoOrgWeapon = 0, // original weapon for autoactions
 113 FLOAT3D m_vAutoSpeed = FLOAT3D(0.0f, 0.0f, 0.0f),
 114 FLOAT m_tmSpiritStart = 0.0f,
 115 FLOAT m_tmFadeStart = 0.0f,

 // 'picked up' display vars
 120 FLOAT m_tmLastPicked = -10000.0f,  // when something was last picked up
 121 CTString m_strPickedName = "",     // name of item picked
 122 FLOAT m_fPickedAmmount = 0.0f,     // total picked ammount
 123 FLOAT m_fPickedMana = 0.0f,        // total picked mana

 // shaker values
 130 INDEX m_iLastHealth = 0,
 131 INDEX m_iLastArmor = 0,
 135 FLOAT m_tmHealthChanged = -9,
 136 FLOAT m_tmArmorChanged = -9,
 
 138 FLOAT m_tmMinigunAutoFireStart = -1.0f,

 150 FLOAT3D m_vLastStain  = FLOAT3D(0.0f, 0.0f, 0.0f), // where last stain was left
   
 // for mouse lag elimination via prescanning
 151 ANGLE3D m_aLastRotation = FLOAT3D(0.0f, 0.0f, 0.0f),
 152 ANGLE3D m_aLastViewRotation = FLOAT3D(0.0f, 0.0f, 0.0f),
 153 FLOAT3D m_vLastTranslation = FLOAT3D(0.0f, 0.0f, 0.0f),
 154 ANGLE3D m_aLocalRotation = FLOAT3D(0.0f, 0.0f, 0.0f),
 155 ANGLE3D m_aLocalViewRotation = FLOAT3D(0.0f, 0.0f, 0.0f),
 156 FLOAT3D m_vLocalTranslation = FLOAT3D(0.0f, 0.0f, 0.0f),

 180 FLOAT m_tmChainShakeEnd = 0.0f, // used to determine when to stop shaking due to chainsaw damage
 181 FLOAT m_fChainShakeStrength = 1.0f, // strength of shaking
 182 FLOAT m_fChainShakeFreqMod = 1.0f,  // shaking frequency modifier
 183 FLOAT m_fChainsawShakeDX = 0.0f, 
 184 FLOAT m_fChainsawShakeDY = 0.0f,
 
 // [Cecil] Advanced Multiplayer
 200 FLOAT m_fComboTime = 0.0f,
 201 INDEX m_iCombo = 0,
 202 INDEX m_iComboScore = 0,
 203 INDEX m_iTokens = 0,

 210 CEntityPointer m_penLastAction,
 211 FLOAT3D m_vSpawnPoint = FLOAT3D(0.0f, 0.0f, 0.0f),
 212 BOOL m_bPlayerInit = FALSE,

 220 FLOAT m_fVoiceCommands = -100.0f,

{
  ShellLaunchData ShellLaunchData_array; // array of data describing flying empty shells
  INDEX m_iFirstEmptySLD; // index of last added empty shell

  BulletSprayLaunchData BulletSprayLaunchData_array; // array of data describing flying bullet sprays
  INDEX m_iFirstEmptyBSLD; // index of last added bullet spray

  GoreSprayLaunchData GoreSprayLaunchData_array; // array of data describing gore sprays
  INDEX m_iFirstEmptyGSLD; // index of last added gore spray

  ULONG ulButtonsNow;
  ULONG ulButtonsBefore;
  ULONG ulNewButtons;
  ULONG ulReleasedButtons;

  BOOL bUseButtonHeld;

  // listener
  CSoundListener sliSound;
  // light
  CLightSource m_lsLightSource;

  TIME m_tmPredict; // time to predict the entity to

  // all messages in the inbox
  CDynamicStackArray<CCompMessageID> m_acmiMessages;
  INDEX m_ctUnreadMessages;

  // statistics
  PlayerStats m_psLevelStats;
  PlayerStats m_psLevelTotal;
  PlayerStats m_psGameStats;
  PlayerStats m_psGameTotal;

  CModelObject m_moRender; // model object to render - this one can be customized

  // [Cecil] Extra buttons
  ULONG m_ulButtons1;
  ULONG m_ulButtons2;
}

components:
  2 class CLASS_PLAYER_ANIMATOR "Classes\\PlayerAnimator.ecl",
  3 class CLASS_PLAYER_VIEW     "Classes\\PlayerView.ecl",
  4 class CLASS_BASIC_EFFECT    "Classes\\BasicEffect.ecl",
  5 class CLASS_BLOOD_SPRAY     "Classes\\BloodSpray.ecl", 
  6 class CLASS_SERIOUSBOMB     "Classes\\SeriousBomb.ecl",

 // [Cecil] Extra classes
  7 class CLASS_START     "Classes\\PlayerMarker.ecl",
  8 class CLASS_INVENTORY "Classes\\PlayerInventory.ecl",

 // gender specific sounds - make sure that offset is exactly 100 
 50 sound SOUND_WATER_ENTER  "Sounds\\Player\\WaterEnter.wav",
 51 sound SOUND_WATER_LEAVE  "Sounds\\Player\\WaterLeave.wav",
 52 sound SOUND_WALK_L       "Sounds\\Player\\WalkL.wav",
 53 sound SOUND_WALK_R       "Sounds\\Player\\WalkR.wav",
 54 sound SOUND_SWIM_L       "Sounds\\Player\\SwimL.wav",
 55 sound SOUND_SWIM_R       "Sounds\\Player\\SwimR.wav",
 56 sound SOUND_DIVE_L       "Sounds\\Player\\Dive.wav",
 57 sound SOUND_DIVE_R       "Sounds\\Player\\Dive.wav",
 58 sound SOUND_DIVEIN       "Sounds\\Player\\DiveIn.wav",
 59 sound SOUND_DIVEOUT      "Sounds\\Player\\DiveOut.wav",
 60 sound SOUND_DROWN        "Sounds\\Player\\Drown.wav",
 61 sound SOUND_INHALE0      "Sounds\\Player\\Inhale00.wav",
 62 sound SOUND_JUMP         "Sounds\\Player\\Jump.wav",
 63 sound SOUND_LAND         "Sounds\\Player\\Land.wav",
 66 sound SOUND_DEATH        "Sounds\\Player\\Death.wav",
 67 sound SOUND_DEATHWATER   "Sounds\\Player\\DeathWater.wav",
 70 sound SOUND_WATERWALK_L  "Sounds\\Player\\WalkWaterL.wav",
 71 sound SOUND_WATERWALK_R  "Sounds\\Player\\WalkWaterR.wav",
 72 sound SOUND_INHALE1      "Sounds\\Player\\Inhale01.wav",
 73 sound SOUND_INHALE2      "Sounds\\Player\\Inhale02.wav",
 75 sound SOUND_WALK_SAND_L  "Sounds\\Player\\WalkSandL.wav",
 76 sound SOUND_WALK_SAND_R  "Sounds\\Player\\WalkSandR.wav",
 80 sound SOUND_WOUNDWEAK    "Sounds\\Player\\WoundWeak.wav",
 81 sound SOUND_WOUNDMEDIUM  "Sounds\\Player\\WoundMedium.wav",
 82 sound SOUND_WOUNDSTRONG  "Sounds\\Player\\WoundStrong.wav",
 85 sound SOUND_WOUNDWATER   "Sounds\\Player\\WoundWater.wav",
 86 sound SOUND_WALK_GRASS_L "SoundsMP\\Player\\WalkGrassL.wav",
 87 sound SOUND_WALK_GRASS_R "SoundsMP\\Player\\WalkGrassR.wav",
 88 sound SOUND_WALK_WOOD_L  "SoundsMP\\Player\\WalkWoodL.wav",
 89 sound SOUND_WALK_WOOD_R  "SoundsMP\\Player\\WalkWoodR.wav",
 90 sound SOUND_WALK_SNOW_L  "SoundsMP\\Player\\WalkSnowL.wav",
 91 sound SOUND_WALK_SNOW_R  "SoundsMP\\Player\\WalkSnowR.wav",
 92 sound SOUND_BLOWUP       "SoundsMP\\Player\\BlowUp.wav",

150 sound SOUND_F_WATER_ENTER  "SoundsMP\\Player\\Female\\WaterEnter.wav",
151 sound SOUND_F_WATER_LEAVE  "SoundsMP\\Player\\Female\\WaterLeave.wav",
152 sound SOUND_F_WALK_L       "SoundsMP\\Player\\Female\\WalkL.wav",
153 sound SOUND_F_WALK_R       "SoundsMP\\Player\\Female\\WalkR.wav",
154 sound SOUND_F_SWIM_L       "SoundsMP\\Player\\Female\\SwimL.wav",
155 sound SOUND_F_SWIM_R       "SoundsMP\\Player\\Female\\SwimR.wav",
156 sound SOUND_F_DIVE_L       "SoundsMP\\Player\\Female\\Dive.wav",
157 sound SOUND_F_DIVE_R       "SoundsMP\\Player\\Female\\Dive.wav",
158 sound SOUND_F_DIVEIN       "SoundsMP\\Player\\Female\\DiveIn.wav",
159 sound SOUND_F_DIVEOUT      "SoundsMP\\Player\\Female\\DiveOut.wav",
160 sound SOUND_F_DROWN        "SoundsMP\\Player\\Female\\Drown.wav",
161 sound SOUND_F_INHALE0      "SoundsMP\\Player\\Female\\Inhale00.wav",
162 sound SOUND_F_JUMP         "SoundsMP\\Player\\Female\\Jump.wav",
163 sound SOUND_F_LAND         "SoundsMP\\Player\\Female\\Land.wav",
166 sound SOUND_F_DEATH        "SoundsMP\\Player\\Female\\Death.wav",
167 sound SOUND_F_DEATHWATER   "SoundsMP\\Player\\Female\\DeathWater.wav",
170 sound SOUND_F_WATERWALK_L  "SoundsMP\\Player\\Female\\WalkWaterL.wav",
171 sound SOUND_F_WATERWALK_R  "SoundsMP\\Player\\Female\\WalkWaterR.wav",
172 sound SOUND_F_INHALE1      "SoundsMP\\Player\\Female\\Inhale01.wav",
173 sound SOUND_F_INHALE2      "SoundsMP\\Player\\Female\\Inhale02.wav",
175 sound SOUND_F_WALK_SAND_L  "SoundsMP\\Player\\Female\\WalkSandL.wav",
176 sound SOUND_F_WALK_SAND_R  "SoundsMP\\Player\\Female\\WalkSandR.wav",
180 sound SOUND_F_WOUNDWEAK    "SoundsMP\\Player\\Female\\WoundWeak.wav",
181 sound SOUND_F_WOUNDMEDIUM  "SoundsMP\\Player\\Female\\WoundMedium.wav",
182 sound SOUND_F_WOUNDSTRONG  "SoundsMP\\Player\\Female\\WoundStrong.wav",
185 sound SOUND_F_WOUNDWATER   "SoundsMP\\Player\\Female\\WoundWater.wav",
186 sound SOUND_F_WALK_GRASS_L "SoundsMP\\Player\\Female\\WalkGrassL.wav",
187 sound SOUND_F_WALK_GRASS_R "SoundsMP\\Player\\Female\\WalkGrassR.wav",
188 sound SOUND_F_WALK_WOOD_L  "SoundsMP\\Player\\Female\\WalkWoodL.wav",
189 sound SOUND_F_WALK_WOOD_R  "SoundsMP\\Player\\Female\\WalkWoodR.wav",
190 sound SOUND_F_WALK_SNOW_L  "SoundsMP\\Player\\Female\\WalkSnowL.wav",
191 sound SOUND_F_WALK_SNOW_R  "SoundsMP\\Player\\Female\\WalkSnowR.wav",

// gender-independent sounds
200 sound SOUND_SILENCE      "Sounds\\Misc\\Silence.wav",
201 sound SOUND_SNIPER_ZOOM  "ModelsMP\\Weapons\\Sniper\\Sounds\\Zoom.wav",
206 sound SOUND_SNIPER_QZOOM "ModelsMP\\Weapons\\Sniper\\Sounds\\QuickZoom.wav",
202 sound SOUND_INFO         "Sounds\\Player\\Info.wav",
203 sound SOUND_WATERAMBIENT "Sounds\\Player\\Underwater.wav",
204 sound SOUND_WATERBUBBLES "Sounds\\Player\\Bubbles.wav",
205 sound SOUND_POWERUP_BEEP "SoundsMP\\Player\\PowerUpBeep.wav",

// flesh parts
210 model MODEL_FLESH        "Models\\Effects\\Debris\\Flesh\\Flesh.mdl",
211 model MODEL_FLESH_APPLE  "Models\\Effects\\Debris\\Fruits\\Apple.mdl",
212 model MODEL_FLESH_BANANA "Models\\Effects\\Debris\\Fruits\\Banana.mdl",
213 model MODEL_FLESH_BURGER "Models\\Effects\\Debris\\Fruits\\CheeseBurger.mdl",
214 model MODEL_FLESH_LOLLY  "Models\\Effects\\Debris\\Fruits\\LollyPop.mdl",
215 model MODEL_FLESH_ORANGE "Models\\Effects\\Debris\\Fruits\\Orange.mdl",

220 texture TEXTURE_FLESH_RED    "Models\\Effects\\Debris\\Flesh\\FleshRed.tex",
221 texture TEXTURE_FLESH_GREEN  "Models\\Effects\\Debris\\Flesh\\FleshGreen.tex",
222 texture TEXTURE_FLESH_APPLE  "Models\\Effects\\Debris\\Fruits\\Apple.tex",       
223 texture TEXTURE_FLESH_BANANA "Models\\Effects\\Debris\\Fruits\\Banana.tex",      
224 texture TEXTURE_FLESH_BURGER "Models\\Effects\\Debris\\Fruits\\CheeseBurger.tex",
225 texture TEXTURE_FLESH_LOLLY  "Models\\Effects\\Debris\\Fruits\\LollyPop.tex",
226 texture TEXTURE_FLESH_ORANGE "Models\\Effects\\Debris\\Fruits\\Orange.tex",

// [Cecil] Flesh texture for coloring
250 texture TEXTURE_FLESH "Textures\\Blood\\Flesh.tex",

// [Cecil] Token sound
260 sound SOUND_TOKEN "Sounds\\Player\\Token.wav",
// [Cecil] Powerup sound
261 sound SOUND_POWERUP "SoundsMP\\Items\\PowerUp.wav",

// [Cecil] Voice commands
300 sound SOUND_CHEERS1     "Sounds\\Player\\Commands\\Cheers1.wav",
301 sound SOUND_CHEERS2     "Sounds\\Player\\Commands\\Cheers2.wav",
302 sound SOUND_CHEERS3     "Sounds\\Player\\Commands\\Cheers3.wav",
303 sound SOUND_CHEERS4     "Sounds\\Player\\Commands\\Cheers4.wav",
304 sound SOUND_CHEERS5     "Sounds\\Player\\Commands\\Cheers5.wav",
305 sound SOUND_CHEERS6     "Sounds\\Player\\Commands\\Cheers6.wav",
306 sound SOUND_CHEERS7     "Sounds\\Player\\Commands\\Cheers7.wav",
307 sound SOUND_CHEERS8     "Sounds\\Player\\Commands\\Cheers8.wav",
308 sound SOUND_DARE1       "Sounds\\Player\\Commands\\Dare1.wav",
309 sound SOUND_DARE2       "Sounds\\Player\\Commands\\Dare2.wav",
310 sound SOUND_DARE3       "Sounds\\Player\\Commands\\Dare3.wav",
311 sound SOUND_DARE4       "Sounds\\Player\\Commands\\Dare4.wav",
312 sound SOUND_DARE5       "Sounds\\Player\\Commands\\Dare5.wav",
313 sound SOUND_DARE6       "Sounds\\Player\\Commands\\Dare6.wav",
314 sound SOUND_DARE7       "Sounds\\Player\\Commands\\Dare7.wav",
315 sound SOUND_DARE8       "Sounds\\Player\\Commands\\Dare8.wav",
316 sound SOUND_DARE9       "Sounds\\Player\\Commands\\Dare9.wav",
317 sound SOUND_DOMINATION1 "Sounds\\Player\\Commands\\Domination1.wav",
318 sound SOUND_DOMINATION2 "Sounds\\Player\\Commands\\Domination2.wav",
319 sound SOUND_DOMINATION3 "Sounds\\Player\\Commands\\Domination3.wav",
320 sound SOUND_DOMINATION4 "Sounds\\Player\\Commands\\Domination4.wav",
321 sound SOUND_DOMINATION5 "Sounds\\Player\\Commands\\Domination5.wav",
322 sound SOUND_DOMINATION6 "Sounds\\Player\\Commands\\Domination6.wav",
323 sound SOUND_DOMINATION7 "Sounds\\Player\\Commands\\Domination7.wav",
324 sound SOUND_HELP1       "Sounds\\Player\\Commands\\Help1.wav",
325 sound SOUND_HELP2       "Sounds\\Player\\Commands\\Help2.wav",
326 sound SOUND_HELP3       "Sounds\\Player\\Commands\\Help3.wav",
327 sound SOUND_HELP4       "Sounds\\Player\\Commands\\Help4.wav",
328 sound SOUND_HELP5       "Sounds\\Player\\Commands\\Help5.wav",
329 sound SOUND_HELP6       "Sounds\\Player\\Commands\\Help6.wav",
330 sound SOUND_HELP7       "Sounds\\Player\\Commands\\Help7.wav",

functions:
  // [Cecil] Combo payout
  INDEX GetComboPayout(void) {
    FLOAT fScore = FLOAT(m_iComboScore) / 100.0f;
    INDEX iEnemies = EnemyMul();

    INDEX iPayout = ClampUp(fScore * FLOAT(m_iCombo/2) / iEnemies, 100000.0f);
    return iPayout;
  };

  // [Cecil] Token payout
  INDEX GetTokenPayout(void) {
    return floor(GetComboPayout() / 400.0f * GetSP()->sp_fTokenPayout);
  };

  // [Cecil] Count alive enemies
  INDEX CountAliveEnemies(void) {
    INDEX iEnemies = 0;
    
    {FOREACHINDYNAMICCONTAINER(GetWorld()->wo_cenEntities, CEntity, iten) {
      CEntity *pen = iten;
      
      // skip cannons and non-enemies
      if (IsOfClass(pen, "CannonStatic") || IsOfClass(pen, "CannonRotating") || !IsDerivedFromClass(pen, "Enemy Base")) {
        continue;
      }
      
      CEnemyBase &penEnemy = (CEnemyBase&)*pen;
      
      // skip templates and dead enemies
      if (penEnemy.m_bTemplate || !IsAlive(pen)) {
        continue;
      }
      
      iEnemies++;
    }}

    return iEnemies;
  };

  // [Cecil] Render player tags
  void RenderPlayerTags(CPerspectiveProjection3D &prProjection, CDrawPort *pdp, CPlacement3D &plView) {
    // only in coop
    if (!hud_bShowAll || !GetSP()->sp_bCooperative) {
      return;
    }

    prProjection.ViewerPlacementL() = plView;
    prProjection.ObjectPlacementL() = CPlacement3D(FLOAT3D(0.0f, 0.0f, 0.0f), ANGLE3D(0.0f, 0.0f, 0.0f));
    prProjection.Prepare();

    // relative resolution scaling
    const FLOAT fScalingX = pdp->GetWidth() / 640.0f;
    const FLOAT fScalingY = pdp->GetHeight() / 480.0f;
    const FLOAT fTextScaling = ClampDn(fScalingX * 0.75f, 1.0f);

    pdp->SetFont(_pfdDisplayFont);
    pdp->SetTextScaling(fTextScaling);

    // Render player tags
    if (amp_iPlayerTags > 0) {
      for (INDEX iPlayer = 0; iPlayer < GetMaxPlayers(); iPlayer++) {
        if (iPlayer == GetMyPlayerIndex()) {
          continue;
        }
        
        CEntity *pen = GetPlayerEntity(iPlayer);
        
        // Invalid or invisible player
        if (!ASSERT_ENTITY(pen) || pen->GetRenderType() != RT_MODEL) {
          continue;
        }
        
        CPlayer *penPlayer = (CPlayer*)pen;
        
        // Tag color
        COLOR colTag = (IsAlive(penPlayer) ? 0x6097CC00 : 0xFF000000);
        
        FLOAT3D vSource = GetLerpedPlacement().pl_PositionVector;
        FLOAT3D vTarget = penPlayer->GetLerpedPlacement().pl_PositionVector;

        // Player render position
        FLOAT3D vRenderPos = vTarget + FLOAT3D(0.0f, 0.5f, 0.0f) * penPlayer->GetRotationMatrix();
        FLOAT3D vRelativeToScreen(0.0f, 0.0f, 0.0f);

        const FLOAT fDist = (vTarget - vSource).Length();
        UBYTE ubAlpha = 127 + UBYTE(Clamp((16.0f - fDist) * 8.0f, 0.0f, 128.0f));

        // Player body position
        if (IsAlive(penPlayer)) {
          EntityInfo *peiPlayer = (EntityInfo*)penPlayer->GetEntityInfo();

          // Top of the body
          FLOAT3D vBody = FLOAT3D(peiPlayer->vTargetCenter[0], peiPlayer->vTargetCenter[1]*2.0f + 0.25f, peiPlayer->vTargetCenter[2]) * penPlayer->GetRotationMatrix();

          vRenderPos = vTarget + vBody;
        }

        prProjection.ProjectCoordinate(vRenderPos, vRelativeToScreen);

        if (vRelativeToScreen(3) >= 0.0f) {
          continue;
        }

        // Position on screen and marker size
        FLOAT2D vOnScreen(vRelativeToScreen(1), -vRelativeToScreen(2) + pdp->GetHeight());
        const FLOAT fSize = 6.0f;
        const FLOAT fMarkerSize = fSize * fTextScaling;

        pdp->InitTexture(&_toPlayerMarker);
        pdp->AddTexture(vOnScreen(1) - fMarkerSize, vOnScreen(2) - fMarkerSize*2.0f, vOnScreen(1) + fMarkerSize, vOnScreen(2), colTag|ubAlpha);
        pdp->FlushRenderingQueue();

        // Player name
        CTString strPlayerName = penPlayer->GetName();

        INDEX iMaxChars = 30;
        INDEX iMaxAllow = 32; // Allow two extra characters after the limit

        // Names with colors and animations
        if (amp_bDecoratedPlayerNames) {
          iMaxChars = PosInDecoratedString(strPlayerName, 30);
          iMaxAllow = PosInDecoratedString(strPlayerName, 32);

        // Undecorated names
        } else {
          ProperUndecorate(strPlayerName);
        }

        // Limit length
        if (strPlayerName.Length() > iMaxAllow) {
          strPlayerName.TrimRight(iMaxChars);
          strPlayerName += "^r...";
        }

        // Distance to the player
        if (amp_iPlayerTags >= 3) {
          strPlayerName.PrintF("%s^r (%dm)", strPlayerName, (INDEX)fDist);
        }

        // Render player name with the distance
        if (amp_iPlayerTags >= 2) {
          pdp->PutTextC(strPlayerName, vOnScreen(1), vOnScreen(2) - fMarkerSize*4.0f, colTag|ubAlpha);
        }
      }
    }
  };

  // [Cecil] Release player from auto actions
  void ReleasePlayer(void) {
    m_penActionMarker = NULL;

    // enable animating
    GetPlayerAnimator()->m_bDisableAnimating = FALSE;
  };

  // [Cecil] Purchase a random powerup with tokens
  void PurchasePowerup(void) {
    if (m_iTokens < 50) {
      PrintCenterMessage(this, this, TRANS("Not enough tokens!"), 3.0f, MSS_INFO, TRUE);
      return;
    }

    m_iTokens -= 50;
    PlaySound(m_soMessage, SOUND_POWERUP, SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);

    // list of powerups that player doesn't have
    CStaticStackArray<INDEX> aiPowerups;

    // a powerup with least active time
    INDEX iLeastTimeType = -1;
    FLOAT fLeastTime = -1.0f;

    for (INDEX iType = PUIT_INVULNER; iType <= PUIT_SPEED; iType++) {
      // current powerup time
      FLOAT fPowerup = GetInventory()->GetPowerupRemaining(iType);

      // not activated yet
      if (fPowerup <= 0.0f) {
        aiPowerups.Push() = iType;
        continue;
      }

      // time percentage
      FLOAT fTimeDiff = (fPowerup / GetInventory()->GetPowerupMaxTime(iType));

      // less time than others
      if (fLeastTime < 0.0f || fTimeDiff < fLeastTime) {
        iLeastTimeType = iType;
        fLeastTime = fTimeDiff;
      }
    }

    // random powerup
    EPowerUp ePowerUp;
    ePowerUp.puitType = PUIT_SPEED;

    // pick from the list
    INDEX ctList = aiPowerups.Count();

    if (ctList > 0) {
      ePowerUp.puitType = (PowerUpItemType)aiPowerups[IRnd() % ctList];

    // pick with least time
    } else if (iLeastTimeType != -1) {
      ePowerUp.puitType = (PowerUpItemType)iLeastTimeType;
    }

    ReceiveItem(ePowerUp);
  };

  // [Cecil] Get cutscene camera
  CEntity *GetCamera(void) {
    if (GlobalCutscenes()) {
      return GetGlobalCamera();
    }
    return m_penCamera;
  };

  // [Cecil] Reset cutscene camera
  void ResetCamera(void) {
    if (GlobalCutscenes()) {
      // only the current player can reset
      if (GLOBAL_CONTROLLER->IsActor(this)) {
        _penGlobalController->SendEvent(ECameraStop());
      }
      return;
    }
    m_penCamera = NULL;
  };

  // [Cecil] Get current action
  CEntity *GetAction(void) {
    // actor relies on their own pointer
    if (GlobalCutscenes() && !GLOBAL_CONTROLLER->IsActor(this)) {
      return GetGlobalAction();
    }
    return m_penActionMarker;
  };

  // [Cecil] Set current action
  void SetAction(CEntity *pen) {
    // set actor's pointer
    m_penActionMarker = pen;

    if (IsPredictor()) {
      return;
    }
    
    // only the cutscene actor can set
    if (!GlobalCutscenes() || !GLOBAL_CONTROLLER->IsActor(this)) {
      return;
    }

    // clear the actor if no more actions
    if (!ASSERT_ENTITY(pen)) {
      GLOBAL_CONTROLLER->m_penActor = NULL;
      GLOBAL_CONTROLLER->m_penAction = NULL;

    } else {
      GLOBAL_CONTROLLER->m_penAction = pen;
    }
  };

  // [Cecil] Actions active
  BOOL IsActionActive(void) {
    return GetAction() != NULL;
  };

  // [Cecil] Get center message
  CTString GetCenterMessage(void) {
    if (GlobalCutscenes()) {
      return GLOBAL_CONTROLLER->m_strMessage;
    }
    return m_strCenterMessage;
  };

  // [Cecil] Get center message time
  FLOAT GetMessageTime(void) {
    if (GlobalCutscenes()) {
      return GLOBAL_CONTROLLER->m_tmMessage;
    }
    return m_tmCenterMessageEnd;
  };

  // [Cecil] Use some key
  BOOL UseKey(const ULONG &ulKey) {
    return GetInventory()->UseKey(ulKey);
  };

  // [Cecil] Play animation for the legs
  void PlayLegsAnim(INDEX iAnim, ULONG ulFlags) {
    // Select compatible animations
    switch (iAnim) {
      case PLAYER_ANIM_SPAWN_FALLDOWN:
        iAnim = PLAYER_ANIM_DEATH_BACK;
        ulFlags &= ~AOF_LOOPING;
        break;

      case PLAYER_ANIM_SPAWN_GETUP:
        iAnim = PLAYER_ANIM_STAND;
        break;

      case PLAYER_ANIM_SPAWNPOSE:
      case PLAYER_ANIM_ABYSSFALL:
      case PLAYER_ANIM_ENTERSPACESHIP:
        iAnim = PLAYER_ANIM_DEATH_SPIKES;
        ulFlags &= ~AOF_LOOPING;
        break;

      case PLAYER_ANIM_STATUE_PUT:
      case PLAYER_ANIM_BRIDGEFALLPOSE:
      case PLAYER_ANIM_KEYLIFT:
      case PLAYER_ANIM_INTRO:
        iAnim = PLAYER_ANIM_DEFAULT_ANIMATION;
        break;
    }

    StartModelAnim(iAnim, ulFlags);
  };

  // [Cecil] Play animation for the body
  void PlayBodyAnim(INDEX iAnim, ULONG ulFlags) {
    CModelObject &moBody = GetModelObject()->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO)->amo_moModelObject;

    // Select compatible animation if requested one doesn't exist
    switch (iAnim) {
      case BODY_ANIM_COLT_REDRAWSLOW:
        iAnim = BODY_ANIM_COLT_REDRAW;
        ulFlags &= ~AOF_LOOPING;
        break;

      case BODY_ANIM_SHOTGUN_REDRAWSLOW:
        iAnim = BODY_ANIM_SHOTGUN_REDRAW;
        ulFlags &= ~AOF_LOOPING;
        break;

      case BODY_ANIM_MINIGUN_REDRAWSLOW:
        iAnim = BODY_ANIM_MINIGUN_REDRAW;
        ulFlags &= ~AOF_LOOPING;
        break;

      case BODY_ANIM_BRIDGEFALLPOSE:
        iAnim = BODY_ANIM_DEATH_EASYFALLBACK;
        ulFlags &= ~AOF_LOOPING;
        break;

      case BODY_ANIM_STATUE_PULL: case BODY_ANIM_KEYLIFT:
        iAnim = BODY_ANIM_KNIFE_ATTACK;
          ulFlags &= ~AOF_LOOPING;
        break;

      case BODY_ANIM_SPAWN_FALLDOWN:
        iAnim = BODY_ANIM_DEATH_BACK;
        ulFlags &= ~AOF_LOOPING;
        break;
        
      case BODY_ANIM_COLT_DEACTIVATETOWALK: case BODY_ANIM_SHOTGUN_DEACTIVATETOWALK:
      case BODY_ANIM_MINIGUN_DEACTIVATETOWALK: case BODY_ANIM_LOOKAROUNDONCE:
      case BODY_ANIM_WAIT: case BODY_ANIM_WAITTOLOOKAROUND: case BODY_ANIM_LOOKAROUNDTOWAIT:
      case BODY_ANIM_LOOKAROUND: case BODY_ANIM_NORMALWALK: case BODY_ANIM_SPAWN_GETUP:
        iAnim = BODY_ANIM_DEFAULT_ANIMATION;
        break;

      case BODY_ANIM_SPAWNPOSE: case BODY_ANIM_ABYSSFALL: case BODY_ANIM_ENTERSPACESHIP:
        iAnim = BODY_ANIM_DEATH_SPIKES;
        ulFlags &= ~AOF_LOOPING;
        break;
    }

    moBody.PlayAnim(iAnim, ulFlags);
  };

  INDEX GenderSound(INDEX iSound) {
    return iSound + m_iGender*GENDEROFFSET;
  };

  void AddBouble(FLOAT3D vPos, FLOAT3D vSpeedRelative) {
    ShellLaunchData &sld = m_asldData[m_iFirstEmptySLD];
    sld.sld_vPos = vPos;
    const FLOATmatrix3D &m = GetRotationMatrix();
    FLOAT3D vUp( m(1,2), m(2,2), m(3,2));
    sld.sld_vUp = vUp;
    sld.sld_vSpeed = vSpeedRelative*m;
    sld.sld_tmLaunch = _pTimer->CurrentTick();
    sld.sld_estType = ESL_BUBBLE;
    // move to next shell position
    m_iFirstEmptySLD = (m_iFirstEmptySLD+1) % MAX_FLYING_SHELLS;
  };
  
  // Clear flying shells data array
  void ClearShellLaunchData(void) {
    m_iFirstEmptySLD = 0;

    for (INDEX iShell = 0; iShell < MAX_FLYING_SHELLS; iShell++) {
      m_asldData[iShell].sld_tmLaunch = -100.0f;
    }
  };

  void AddBulletSpray(FLOAT3D vPos, EffectParticlesType eptType, FLOAT3D vStretch) {
    BulletSprayLaunchData &bsld = m_absldData[m_iFirstEmptyBSLD];
    bsld.bsld_vPos = vPos;
    bsld.bsld_vG = en_vGravityDir;
    bsld.bsld_eptType=eptType;
    bsld.bsld_iRndBase=FRnd()*123456;
    bsld.bsld_tmLaunch = _pTimer->CurrentTick();
    bsld.bsld_vStretch=vStretch;
    // move to bullet spray position
    m_iFirstEmptyBSLD = (m_iFirstEmptyBSLD+1) % MAX_BULLET_SPRAYS;
  };

  void ClearBulletSprayLaunchData(void) {
    m_iFirstEmptyBSLD = 0;

    for (INDEX iBulletSpray = 0; iBulletSpray < MAX_BULLET_SPRAYS; iBulletSpray++) {
      m_absldData[iBulletSpray].bsld_tmLaunch = -100.0f;
    }
  };

  void AddGoreSpray( FLOAT3D vPos, FLOAT3D v3rdPos, SprayParticlesType sptType, FLOAT3D vSpilDirection,
    FLOATaabbox3D boxHitted, FLOAT fDamagePower, COLOR colParticles)
  {
    GoreSprayLaunchData &gsld = m_agsldData[m_iFirstEmptyGSLD];
    gsld.gsld_vPos = vPos;
    gsld.gsld_v3rdPos = v3rdPos;
    gsld.gsld_vG = en_vGravityDir;
    gsld.gsld_fGA = en_fGravityA;
    gsld.gsld_sptType = sptType;
    gsld.gsld_boxHitted = boxHitted;
    gsld.gsld_vSpilDirection = vSpilDirection;
    gsld.gsld_fDamagePower=fDamagePower;
    gsld.gsld_tmLaunch = _pTimer->CurrentTick();
    gsld.gsld_colParticles = colParticles;
    // move to bullet spray position
    m_iFirstEmptyGSLD = (m_iFirstEmptyGSLD+1) % MAX_GORE_SPRAYS;
  };

  void ClearGoreSprayLaunchData(void) {
    m_iFirstEmptyGSLD = 0;

    for (INDEX iGoreSpray = 0; iGoreSpray < MAX_GORE_SPRAYS; iGoreSpray++) {
      m_agsldData[iGoreSpray].gsld_tmLaunch = -100.0f;
    }
  };

  void CPlayer(void) {
    // clear flying shells data array
    bUseButtonHeld = FALSE;
    ClearShellLaunchData();
    ClearBulletSprayLaunchData();
    ClearGoreSprayLaunchData();
    m_tmPredict = 0;

    // [Cecil] Reset extra buttons
    m_ulButtons1 = 0;
    m_ulButtons2 = 0;

    // [Cecil] Load player marker texture
    _toPlayerMarker.SetData_t(CTFILENAME("Textures\\Interface\\PlayerMarker.tex"));
    ((CTextureData*)_toPlayerMarker.GetData())->Force(TEX_CONSTANT);
  };

  class CPlayerAnimator *GetPlayerAnimator(void) {
    return (CPlayerAnimator *)&*m_penAnimator;
  };

  // [Cecil] Get inventory entity
  class CPlayerInventory *GetInventory(void) const {
    return (CPlayerInventory *)&*m_penInventory;
  };

  // [Cecil] Get some weapon
  class CPlayerWeapons *GetWeapon(const INDEX &iExtra) const {
    return GetInventory()->GetWeapon(iExtra);
  };

  CPlayerSettings *GetSettings(void) {
    return (CPlayerSettings*)en_pcCharacter.pc_aubAppearance;
  };

  export void Copy(CEntity &enOther, ULONG ulFlags) {
    CPlayerEntity::Copy(enOther, ulFlags);
    CPlayer *penOther = (CPlayer *)(&enOther);

    m_moRender.Copy(penOther->m_moRender);
    m_psLevelStats = penOther->m_psLevelStats;
    m_psLevelTotal = penOther->m_psLevelTotal;
    m_psGameStats  = penOther->m_psGameStats ;
    m_psGameTotal  = penOther->m_psGameTotal ;

    // if creating predictor
    if (ulFlags & COPY_PREDICTOR) {
      // copy positions of launched empty shells
      memcpy(m_asldData, penOther->m_asldData, sizeof(m_asldData));
      m_iFirstEmptySLD = penOther->m_iFirstEmptySLD;

      // all messages in the inbox
      m_acmiMessages.Clear();
      m_ctUnreadMessages = 0;
      SetupLightSource();

    // if normal copying
    } else {
      // copy messages
      m_acmiMessages = penOther->m_acmiMessages;
      m_ctUnreadMessages = penOther->m_ctUnreadMessages;
    }
  };

  // Update smoothed (average latency)
  void UpdateLatency(FLOAT tmLatencyNow) {
    TIME tmNow = _pTimer->GetHighPrecisionTimer().GetSeconds();

    // if not enough time passed
    if (tmNow < m_tmLatencyLastAvg+hud_tmLatencySnapshot) {
      // just sum
      m_tmLatencyAvgSum += tmLatencyNow;
      m_ctLatencyAvg++;

    // if enough time passed
    } else {
      // calculate average
      m_tmLatency = m_tmLatencyAvgSum / m_ctLatencyAvg;

      // reset counters
      m_tmLatencyAvgSum = 0.0f;
      m_ctLatencyAvg = 0;
      m_tmLatencyLastAvg = tmNow;
    }

    if (_pNetwork->IsPlayerLocal(this)) {
      en_tmPing = m_tmLatency;
      net_tmLatencyAvg = en_tmPing;
    }
  }

  // Check character data for invalid values
  void ValidateCharacter(void) {
    // use default model in single player or flyover
    if (!GetSP()->sp_bSinglePlayer) {
      return;
    }

    CPlayerSettings *pps = (CPlayerSettings*)en_pcCharacter.pc_aubAppearance;
    memset(pps->ps_achModelFile, 0, sizeof(pps->ps_achModelFile));
  };

  // Parse gender from your name
  void ParseGender(CTString &strName) {
    if (strName.RemovePrefix("#male#")) {
      m_iGender = GENDER_MALE;
    } else if (strName.RemovePrefix("#female#")) {
      m_iGender = GENDER_FEMALE;
    }

    m_iGender = GENDER_MALE;
  };

  void CheckHighScore(void) {
    // if not playing a demo
    if (!_pNetwork->IsPlayingDemo()) {
      // update local high score with the external one
      if (plr_iHiScore > m_iHighScore) {
        m_iHighScore = plr_iHiScore;
      }
    }

    // if current score is higher than the high score
    if (m_psGameStats.ps_iScore > m_iHighScore) {
      // remember that it was beaten
      if (m_iHighScore > m_iBeatenHighScore) {
        m_iBeatenHighScore = m_iHighScore;
      }
    }
  };

  CTString GetPredictName(void) const {
    if (IsPredicted()) {
      return "PREDICTED";

    } else if (IsPredictor()) {
      return "predictor";

    } else if (GetFlags() & ENF_WILLBEPREDICTED) {
      return "WILLBEPREDICTED";
    }

    return "no prediction";
  };

  // Write to stream
  void Write_t(CTStream *ostr) {
    CPlayerEntity::Write_t(ostr);

    // save array of messages
    ostr->WriteID_t("MSGS");

    INDEX ctMsg = m_acmiMessages.Count();
    *ostr << ctMsg;

    for (INDEX iMsg = 0; iMsg < ctMsg; iMsg++) {
      m_acmiMessages[iMsg].Write_t(*ostr);
    }

    ostr->Write_t(&m_psLevelStats, sizeof(m_psLevelStats));
    ostr->Write_t(&m_psLevelTotal, sizeof(m_psLevelTotal));
    ostr->Write_t(&m_psGameStats, sizeof(m_psGameStats));
    ostr->Write_t(&m_psGameTotal, sizeof(m_psGameTotal));
  };

  // Read from stream
  void Read_t(CTStream *istr) { 
    CPlayerEntity::Read_t(istr);

    // clear flying shells data array
    ClearShellLaunchData();
    ClearBulletSprayLaunchData();
    ClearGoreSprayLaunchData();

    // load array of messages
    istr->ExpectID_t("MSGS");

    INDEX ctMsg;
    *istr >> ctMsg;

    m_acmiMessages.Clear();
    m_ctUnreadMessages = 0;

    if (ctMsg > 0) {
      m_acmiMessages.Push(ctMsg);

      for (INDEX iMsg = 0; iMsg < ctMsg; iMsg++) {
        m_acmiMessages[iMsg].Read_t(*istr);

        if (!m_acmiMessages[iMsg].cmi_bRead) {
          m_ctUnreadMessages++;
        }
      }
    }

    istr->Read_t(&m_psLevelStats, sizeof(m_psLevelStats));
    istr->Read_t(&m_psLevelTotal, sizeof(m_psLevelTotal));
    istr->Read_t(&m_psGameStats , sizeof(m_psGameStats));
    istr->Read_t(&m_psGameTotal , sizeof(m_psGameTotal));

    // set your real appearance if possible
    ValidateCharacter();

    CTString strDummy;
    SetPlayerAppearance(&m_moRender, &en_pcCharacter, strDummy, FALSE);
    ParseGender(strDummy);

    // [Cecil] Schedule animator to sync the weapon and reset various models
    m_ulFlags |= PLF_SYNCWEAPON | PLF_RESETMODELS;

    // setup light source
    SetupLightSource();
  };

  // Get static light source information
  CLightSource *GetLightSource(void) {
    if (!IsPredictor()) {
      return &m_lsLightSource;
    }
    return NULL;
  };

  // Called by other entities to set time prediction parameter
  void SetPredictionTime(TIME tmAdvance) {
    // give time interval in advance to set
    m_tmPredict = _pTimer->CurrentTick() + tmAdvance;
  };

  // Called by engine to get the upper time limit
  TIME GetPredictionTime(void) {
    // return moment in time up to which to predict this entity
    return m_tmPredict;
  };

  // Get maximum allowed range for predicting this entity
  FLOAT GetPredictionRange(void) {
    return cli_fPredictPlayersRange;
  };

  // Add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penAnimator->AddToPrediction();
    m_penView->AddToPrediction();
    m_pen3rdPersonView->AddToPrediction();

    // [Cecil] Player's inventory
    m_penInventory->AddToPrediction();
  };

  // Get in-game time for statistics
  TIME GetStatsInGameTimeLevel(void) {
    if(m_bEndOfLevel) {
      return m_psLevelStats.ps_tmTime;
    }
    return _pNetwork->GetGameTime() - m_tmLevelStarted;
  };

  TIME GetStatsInGameTimeGame(void) {
    if (m_bEndOfLevel) {
      return m_psGameStats.ps_tmTime;
    }
    return m_psGameStats.ps_tmTime + (_pNetwork->GetGameTime() - m_tmLevelStarted);
  };

  FLOAT GetStatsRealWorldTime(void) {
    time_t timeNow;

    if (m_bEndOfLevel) { 
      timeNow = m_iEndTime; 
    } else {
      time(&timeNow);
    }

    return (FLOAT)difftime(timeNow, m_iStartTime);
  };

  CTString GetStatsRealWorldStarted(void) {
    struct tm *newtime;
    newtime = localtime(&m_iStartTime);
    setlocale(LC_ALL, "");

    CTString strTimeline;
    char achTimeLine[256]; 

    strftime(achTimeLine, sizeof(achTimeLine)-1, "%a %x %H:%M", newtime);
    strTimeline = achTimeLine;
    setlocale(LC_ALL, "C");

    return strTimeline;
  };

  // Fill in player statistics
  export void GetStats(CTString &strStats, const CompStatType csType, INDEX ctCharsPerRow) {
    // get proper type of stats
    if (csType == CST_SHORT) {
      GetShortStats(strStats);

    } else {
      ASSERT(csType==CST_DETAIL);

      strStats = "\n";
      _ctAlignWidth = Min(ctCharsPerRow, INDEX(60));

      if (GetSP()->sp_bCooperative) {
        if (GetSP()->sp_bSinglePlayer) {
          GetDetailStatsSP(strStats, 0);
        } else {
          GetDetailStatsCoop(strStats);
        }
      } else {
        GetDetailStatsDM(strStats);
      }
    }
  };

  // Get short one-line statistics - used for savegame descriptions and similar
  void GetShortStats(CTString &strStats) {
    strStats.PrintF(TRANS("%s %s Score: %d Kills: %d/%d"), 
                    GetDifficultyString(), TimeToString(GetStatsInGameTimeLevel()), 
                    m_psLevelStats.ps_iScore, m_psLevelStats.ps_iKills, m_psLevelTotal.ps_iKills);
  };

  // Get detailed statistics for deathmatch game
  void GetDetailStatsDM(CTString &strStats) {
    extern INDEX SetAllPlayersStats(INDEX iSortKey);
    extern CPlayer *_apenPlayers[NET_MAXGAMEPLAYERS];

    // determine type of game
    const BOOL bFragMatch = GetSP()->sp_bUseFrags;

    // fill players table
    const INDEX ctPlayers = SetAllPlayersStats(bFragMatch ? 5 : 3); // sort by frags or by score

    // get time elapsed since the game start
    strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%s", TRANS("TIME"), TimeToString(_pNetwork->GetGameTime())));
    strStats += "\n";

    // find maximum frags/score that one player has
    INDEX iMaxFrags = LowerLimit(INDEX(0));
    INDEX iMaxScore = LowerLimit(INDEX(0));

    {for(INDEX iPlayer = 0; iPlayer < ctPlayers; iPlayer++) {
      CPlayer *penPlayer = _apenPlayers[iPlayer];

      iMaxFrags = Max(iMaxFrags, penPlayer->m_psLevelStats.ps_iKills);
      iMaxScore = Max(iMaxScore, penPlayer->m_psLevelStats.ps_iScore);
    }}

    // print game limits
    const CSessionProperties &sp = *GetSP();

    if (sp.sp_iTimeLimit > 0) {
      FLOAT fTimeLeft = ClampDn(sp.sp_iTimeLimit*60.0f - _pNetwork->GetGameTime(), 0.0f);
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%s", TRANS("TIME LEFT"), TimeToString(fTimeLeft)));
      strStats += "\n";
    }

    if (bFragMatch && sp.sp_iFragLimit > 0) {
      INDEX iFragsLeft = ClampDn(sp.sp_iFragLimit-iMaxFrags, INDEX(0));
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%d", TRANS("FRAGS LEFT"), iFragsLeft));
      strStats += "\n";
    }

    if (!bFragMatch && sp.sp_iScoreLimit > 0) {
      INDEX iScoreLeft = ClampDn(sp.sp_iScoreLimit-iMaxScore, INDEX(0));
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%d", TRANS("SCORE LEFT"), iScoreLeft));
      strStats += "\n";
    }

    strStats += "\n";

    CTString strRank = TRANS("NO.");
    CTString strFrag = (bFragMatch ? TRANS("FRAGS") : TRANS("SCORE"));
    CTString strPing = TRANS("PING");
    CTString strName = TRANS("PLAYER");

    INDEX ctRankChars = Max(strRank.Length(), INDEX(3));
    INDEX ctFragChars = Max(strFrag.Length(), INDEX(7));
    INDEX ctPingChars = Max(strPing.Length(), INDEX(5));
    INDEX ctNameChars = Max(strName.Length(), INDEX(20));

    // header
    strStats += "^cFFFFFF";
    strStats += PadStringRight(strRank, ctRankChars)+" ";
    strStats += PadStringLeft(strFrag, ctFragChars)+" ";
    strStats += PadStringLeft(strPing, ctPingChars)+" ";
    strStats += PadStringRight(strName, ctNameChars)+" ";
    strStats += "^r";
    strStats += "\n\n";

    {for(INDEX iPlayer = 0; iPlayer < ctPlayers; iPlayer++) {
      CTString strLine;
      CPlayer *penPlayer = _apenPlayers[iPlayer];

      INDEX iPing = ceil(penPlayer->en_tmPing*1000.0f);
      INDEX iScore = (bFragMatch ? penPlayer->m_psLevelStats.ps_iKills : penPlayer->m_psLevelStats.ps_iScore);
      CTString strName = penPlayer->GetPlayerName();

      strStats += PadStringRight(CTString(0, "%d", iPlayer+1), ctRankChars)+" ";
      strStats += PadStringLeft(CTString(0, "%d", iScore), ctFragChars)+" ";
      strStats += PadStringLeft(CTString(0, "%d", iPing), ctPingChars)+" ";
      strStats += PadStringRight(strName, ctNameChars)+" ";
      strStats += "\n";
    }}
  };

  // Get singleplayer statistics
  void GetDetailStatsCoop(CTString &strStats) {
    // first put in your full stats
    strStats += "^b" + CenterString(TRANS("YOUR STATS")) + "^r\n";
    strStats += "\n";

    GetDetailStatsSP(strStats, 1);

    // get stats from all players
    extern INDEX SetAllPlayersStats(INDEX iSortKey);
    extern CPlayer *_apenPlayers[NET_MAXGAMEPLAYERS];
    const INDEX ctPlayers = SetAllPlayersStats(3); // sort by score

    // for each player
    PlayerStats psSquadLevel = PlayerStats();
    PlayerStats psSquadGame = PlayerStats();

    {for (INDEX iPlayer = 0; iPlayer < ctPlayers; iPlayer++) {
      CPlayer *penPlayer = _apenPlayers[iPlayer];

      // add values to squad stats
      ASSERT(penPlayer != NULL);
      PlayerStats psLevel = penPlayer->m_psLevelStats;
      PlayerStats psGame  = penPlayer->m_psGameStats ;
      psSquadLevel.ps_iScore   += psLevel.ps_iScore;
      psSquadLevel.ps_iKills   += psLevel.ps_iKills;
      psSquadLevel.ps_iDeaths  += psLevel.ps_iDeaths;
      psSquadLevel.ps_iSecrets += psLevel.ps_iSecrets;
      psSquadGame.ps_iScore    += psGame.ps_iScore;
      psSquadGame.ps_iKills    += psGame.ps_iKills;
      psSquadGame.ps_iDeaths   += psGame.ps_iDeaths;
      psSquadGame.ps_iSecrets  += psGame.ps_iSecrets;
    }}

    // add squad stats
    strStats += "\n";
    strStats += "^b"+CenterString(TRANS("SQUAD TOTAL"))+"^r\n";
    strStats += "\n";

    strStats += CTString(0, "^cFFFFFF%s^r", TranslateConst(en_pwoWorld->GetName(), 0));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("SCORE"), psSquadLevel.ps_iScore));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("DEATHS"), psSquadLevel.ps_iDeaths));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("KILLS"), psSquadLevel.ps_iKills, m_psLevelTotal.ps_iKills));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("SECRETS"), psSquadLevel.ps_iSecrets, m_psLevelTotal.ps_iSecrets));
    strStats += "\n";
    strStats += "\n";

    strStats += CTString("^cFFFFFF")+TRANS("TOTAL")+"^r\n";
    strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("SCORE"), psSquadGame.ps_iScore));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("DEATHS"), psSquadGame.ps_iDeaths));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("KILLS"), psSquadGame.ps_iKills, m_psGameTotal.ps_iKills));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("SECRETS"), psSquadGame.ps_iSecrets, m_psGameTotal.ps_iSecrets));
    strStats += "\n";
    strStats += "\n";

    strStats += "\n";
    strStats += "^b" + CenterString(TRANS("OTHER PLAYERS")) + "^r\n";
    strStats += "\n";

    // for each player
    {for (INDEX iPlayer = 0; iPlayer < ctPlayers; iPlayer++) {
      CPlayer *penPlayer = _apenPlayers[iPlayer];

      // if this one
      if (penPlayer == this) {
        // skip it
        continue;
      }

      // add his stats short
      strStats += "^cFFFFFF" + CenterString(penPlayer->GetPlayerName()) + "^r\n\n";
      penPlayer->GetDetailStatsSP(strStats, 2);
      strStats += "\n";
    }}
  };

  // Get singleplayer statistics
  void GetDetailStatsSP(CTString &strStats, INDEX iCoopType) {
    if (iCoopType <= 1) {
      if (m_bEndOfGame) {
        if (GetSP()->sp_gdGameDifficulty == CSessionProperties::GD_EXTREME) {
          strStats += TRANS("^f4SERIOUS GAME FINISHED,\nMENTAL MODE IS NOW ENABLED!^F\n\n");

        } else if (GetSP()->sp_bMental) {
          strStats += TRANS("^f4YOU HAVE MASTERED THE GAME!^F\n\n");
        }
      }
    }

    if (iCoopType <= 1) {
      // report total score info
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%d", TRANS("TOTAL SCORE"), m_psGameStats.ps_iScore));
      strStats += "\n";
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%s", TRANS("DIFFICULTY"), GetDifficultyString()));
      strStats += "\n";
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%s", TRANS("STARTED"), GetStatsRealWorldStarted()));
      strStats += "\n";
      strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%s", TRANS("PLAYING TIME"), TimeToString(GetStatsRealWorldTime())));
      strStats += "\n";

      if (m_psGameStats.ps_iScore <= plr_iHiScore) {
        strStats += AlignString(CTString(0, "^cFFFFFF%s:^r\n%d", TRANS("HI-SCORE"), plr_iHiScore));
      } else {
        strStats += TRANS("YOU BEAT THE HI-SCORE!");
      }

      strStats += "\n\n";
    }

    // report this level statistics
    strStats += CTString(0, "^cFFFFFF%s^r", TranslateConst(en_pwoWorld->GetName(), 0));
    strStats += "\n";

    if (iCoopType <= 1) {
      if (m_bEndOfLevel) {
        strStats += AlignString(CTString(0, "  %s:\n%s", TRANS("ESTIMATED TIME"), TimeToString(m_tmEstTime)));
        strStats += "\n";

        strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("TIME BONUS"), m_iTimeScore));
        strStats += "\n";
        strStats += "\n";
      }
    }

    strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("SCORE"), m_psLevelStats.ps_iScore));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("KILLS"), m_psLevelStats.ps_iKills, m_psLevelTotal.ps_iKills));
    strStats += "\n";

    if (iCoopType >= 1) {
      strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("DEATHS"), m_psLevelStats.ps_iDeaths, m_psLevelTotal.ps_iDeaths));
      strStats += "\n";
    }

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("SECRETS"), m_psLevelStats.ps_iSecrets, m_psLevelTotal.ps_iSecrets));
    strStats += "\n";

    if (iCoopType <= 1) {
      strStats += AlignString(CTString(0, "  %s:\n%s", TRANS("TIME"), TimeToString(GetStatsInGameTimeLevel())));
      strStats += "\n";
    }

    strStats += "\n";

    // report total game statistics
    strStats += CTString("^cFFFFFF") + TRANS("TOTAL") + "^r";
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("SCORE"), m_psGameStats.ps_iScore));
    strStats += "\n";

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("KILLS"), m_psGameStats.ps_iKills, m_psGameTotal.ps_iKills));
    strStats += "\n";

    if (iCoopType >= 1) {
      strStats += AlignString(CTString(0, "  %s:\n%d", TRANS("DEATHS"), m_psGameStats.ps_iDeaths, m_psGameTotal.ps_iDeaths));
      strStats += "\n";
    }

    strStats += AlignString(CTString(0, "  %s:\n%d/%d", TRANS("SECRETS"), m_psGameStats.ps_iSecrets, m_psGameTotal.ps_iSecrets));
    strStats += "\n";

    if (iCoopType <= 1) {
      strStats += AlignString(CTString(0, "  %s:\n%s", TRANS("GAME TIME"), TimeToString(GetStatsInGameTimeGame())));
      strStats += "\n";
    }

    strStats += "\n";
    
    // set per level outputs
    if (iCoopType < 1) {
      if(m_strLevelStats != "") {
        strStats += CTString("^cFFFFFF")+TRANS("Per level statistics") +"^r\n\n" + m_strLevelStats;
      }
    }
  };

  // Provide info for GameSpy enumeration
  void GetGameSpyPlayerInfo(INDEX iPlayer, CTString &strOut) {
    CTString strKey;
    strKey.PrintF("\\player_%d\\%s", iPlayer, (const char*)GetPlayerName());
    strOut += strKey;

    if (GetSP()->sp_bUseFrags) {
      strKey.PrintF("\\frags_%d\\%d", iPlayer, m_psLevelStats.ps_iKills);
      strOut += strKey;

    } else {
      strKey.PrintF("\\frags_%d\\%d", iPlayer, m_psLevelStats.ps_iScore);
      strOut += strKey;
    }

    strKey.PrintF("\\ping_%d\\%d", iPlayer, INDEX(ceil(en_tmPing * 1000.0f)));
    strOut += strKey;
  };

  // Check if message is in inbox
  BOOL HasMessage(const CTFileName &fnmMessage) {
    ULONG ulHash = fnmMessage.GetHash();
    INDEX ctMsg = m_acmiMessages.Count();

    for (INDEX iMsg = 0; iMsg < ctMsg; iMsg++) {
      if (m_acmiMessages[iMsg].cmi_ulHash == ulHash
       && m_acmiMessages[iMsg].cmi_fnmFileName == fnmMessage) {
        return TRUE;
      }
    }
    return FALSE;
  };

  // Receive a computer message and put it in inbox if not already there
  void ReceiveComputerMessage(const CTFileName &fnmMessage, ULONG ulFlags) {
    // already received
    if (HasMessage(fnmMessage)) {
      return;
    }

    // add it to array
    CCompMessageID &cmi = m_acmiMessages.Push();
    cmi.NewMessage(fnmMessage);
    cmi.cmi_bRead = ulFlags & CMF_READ;

    if (!(ulFlags & CMF_READ)) {
      m_ctUnreadMessages++;
      cmp_bUpdateInBackground = TRUE;
    }

    if (!(ulFlags & CMF_READ) && ulFlags & CMF_ANALYZE) {
      m_tmAnalyseEnd = _pTimer->CurrentTick() + 2.0f;
      m_soMessage.Set3DParameters(25.0f, 5.0f, 1.0f, 1.0f);
      PlaySound(m_soMessage, SOUND_INFO, SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
    }
  };

  void SayVoiceMessage(const CTFileName &fnmMessage) {
    if (GetSettings()->ps_ulFlags & PSF_NOQUOTES) {
      return;
    }

    SetSpeakMouthPitch();
    PlaySound(m_soSpeech, fnmMessage, SOF_3D|SOF_VOLUMETRIC);
  };

  // receive all messages in one directory - cheat
  void CheatAllMessagesDir(const CTString &strDir, ULONG ulFlags) {
    // list the directory
    CDynamicStackArray<CTFileName> afnmDir;
    MakeDirList(afnmDir, strDir, "*.txt", DLI_RECURSIVE);

    // for each file in the directory
    for (INDEX i = 0; i < afnmDir.Count(); i++) {
      CTFileName fnm = afnmDir[i];

      // add the message
      ReceiveComputerMessage(fnm, ulFlags);
    }
  };

  // Receive all messages - cheat
  void CheatAllMessages(void) {
    CheatAllMessagesDir("Data\\Messages\\weapons\\", 0);
    CheatAllMessagesDir("Data\\Messages\\enemies\\", 0);
    CheatAllMessagesDir("DataMP\\Messages\\enemies\\", 0);
    CheatAllMessagesDir("DataMP\\Messages\\information\\", 0);
    CheatAllMessagesDir("DataMP\\Messages\\statistics\\", 0);
    CheatAllMessagesDir("DataMP\\Messages\\weapons\\", 0);
    CheatAllMessagesDir("DataMP\\Messages\\background\\", 0);
  };

  // Mark that an item was picked
  void ItemPicked(const CTString &strName, FLOAT fAmmount) {
    // if nothing picked too long
    if (_pTimer->CurrentTick() > m_tmLastPicked + PICKEDREPORT_TIME) {
      // kill the name
      m_strPickedName = "";

      // reset picked mana
      m_fPickedMana = 0;
    }

    // if different than last picked
    if (m_strPickedName != strName) {
      // remember name
      m_strPickedName = strName;

      // reset picked ammount
      m_fPickedAmmount = 0;
    }

    // increase ammount
    m_fPickedAmmount += fAmmount;
    m_tmLastPicked = _pTimer->CurrentTick();
  };

  // Setup light source
  void SetupLightSource(void) {
    // setup light source
    CLightSource lsNew;
    lsNew.ls_ulFlags = LSF_NONPERSISTENT|LSF_DYNAMIC;
    lsNew.ls_rHotSpot = 1.0f;
    lsNew.ls_colColor = C_WHITE;
    lsNew.ls_rFallOff = 2.5f;
    lsNew.ls_plftLensFlare = NULL;
    lsNew.ls_ubPolygonalMask = 0;
    lsNew.ls_paoLightAnimation = &m_aoLightAnimation;

    m_lsLightSource.ls_penEntity = this;
    m_lsLightSource.SetLightSource(lsNew);
  };

  // Play light animation
  void PlayLightAnim(INDEX iAnim, ULONG ulFlags) {
    if (m_aoLightAnimation.GetData() != NULL) {
      m_aoLightAnimation.PlayAnim(iAnim, ulFlags);
    }
  };

  BOOL AdjustShadingParameters(FLOAT3D &vLightDirection, COLOR &colLight, COLOR &colAmbient) {
    if (cht_bDumpPlayerShading) {
      ANGLE3D a3dHPB;
      DirectionVectorToAngles(-vLightDirection, a3dHPB);

      UBYTE ubAR, ubAG, ubAB;
      UBYTE ubCR, ubCG, ubCB;
      ColorToRGB(colAmbient, ubAR, ubAG, ubAB);
      ColorToRGB(colLight, ubCR, ubCG, ubCB);

      CPrintF("Ambient: %d,%d,%d, Color: %d,%d,%d, Direction HPB (%g,%g,%g)\n",
        ubAR, ubAG, ubAB, ubCR, ubCG, ubCB, a3dHPB(1), a3dHPB(2), a3dHPB(3));
    }

    // make models at least a bit bright in deathmatch
    UBYTE ubH, ubS, ubV;
    ColorToHSV(colAmbient, ubH, ubS, ubV);

    if (!GetSP()->sp_bCooperative) {
      if (ubV < 22) {
        ubV = 22;
        colAmbient = HSVToColor(ubH, ubS, ubV);
      }
      
    // [Cecil] Adjustable brightness in coop
    } else {
      UBYTE ubBrightness = UBYTE(Clamp(amp_fPlayerBrightness, 0.0f, 1.0f) * 255.0f);

      if (ubV < ubBrightness) {
        ubV = ubBrightness;
        colAmbient = HSVToColor(ubH, ubS, ubV);
      }
    }

    return CPlayerEntity::AdjustShadingParameters(vLightDirection, colLight, colAmbient);
  };

  // Get a different model object for rendering
  CModelObject *GetModelForRendering(void) {
    // if not yet initialized
    if (!(m_ulFlags & PLF_INITIALIZED)) { 
      // return base model
      return GetModelObject();
    }

    // lerp player viewpoint
    CPlacement3D plView;
    plView.Lerp(en_plLastViewpoint, en_plViewpoint, _pTimer->GetLerpFactor());

    // body and head attachment animation
    GetPlayerAnimator()->BodyAndHeadOrientation(plView);
    GetPlayerAnimator()->OnPreRender();

    // synchronize your appearance with the default model
    m_moRender.Synchronize(*GetModelObject());

    if (m_ulFlags & PLF_SYNCWEAPON) {
      m_ulFlags &= ~PLF_SYNCWEAPON;
      GetPlayerAnimator()->SyncWeapon();
    }

    // [Cecil] Reset various models
    if (m_ulFlags & PLF_RESETMODELS) {
      m_ulFlags &= ~PLF_RESETMODELS;
      
      for (INDEX iWeapon = 0; iWeapon < 2; iWeapon++) {
        // Attachment lists
        GetPlayerAnimator()->ResetAttachmentList(GetWeapon(iWeapon)->GetCurrent(), iWeapon);

        // Weapon mirroring
        GetWeapon(iWeapon)->ResetMirrorState();

        // Weapon models
        GetWeapon(iWeapon)->m_ubModelsSet = 0;
        GetWeapon(iWeapon)->SetCurrentWeaponModel(GetInventory()->UsingDualWeapons());
      }
    }

    FLOAT tmNow = _pTimer->GetLerpedCurrentTick();

    FLOAT fFading = 1.0f;
    if (m_tmFadeStart != 0.0f) {
      FLOAT fFactor = (tmNow - m_tmFadeStart) / 5.0f;
      fFactor = Clamp(fFactor, 0.0f, 1.0f);
      fFading *= fFactor;
    }

    // if invunerable after spawning
    FLOAT tmSpawnInvulnerability = GetSP()->sp_tmSpawnInvulnerability;

    if (tmSpawnInvulnerability > 0 && tmNow - m_tmSpawned < tmSpawnInvulnerability) {
      // blink fast
      FLOAT fDelta = tmNow-m_tmSpawned;
      fFading *= 0.75f + 0.25f*Sin(fDelta/0.5f * 360);
    }

    COLOR colAlpha = m_moRender.mo_colBlendColor;
    colAlpha = (colAlpha & 0xFFFFFF00) + (COLOR(fFading * 0xFF) & 0xFF);
    m_moRender.mo_colBlendColor = colAlpha;

    // [Cecil] Invisibility
    const BOOL bInvisible = GetInventory()->IsPowerupActive(PUIT_INVISIB);
    const FLOAT fInvis = GetInventory()->GetPowerupRemaining(PUIT_INVISIB);

    // if not connected
    if (m_ulFlags & PLF_NOTCONNECTED) {
      // pulse slowly
      fFading *= 0.25f + 0.25f*Sin(tmNow/2.0f * 360);

    // if invisible
    } else if (bInvisible) {
      FLOAT fIntensity = 0.0f;

      if (fInvis < 3.0f) {
        fIntensity = 0.5f - 0.5f*cos(fInvis * (6.0f * 3.1415927f / 3.0f));
      }

      if (_ulPlayerRenderingMask == (1 << GetMyPlayerIndex())) {
        colAlpha = (colAlpha & 0xFFFFFF00) | (INDEX)(INVISIBILITY_ALPHA_LOCAL + (FLOAT)(254 - INVISIBILITY_ALPHA_LOCAL) * fIntensity);

      } else if (TRUE) {
        if (fInvis < 1.28f) {
          // [Cecil] Invisibility factor
          UBYTE ubInvis = (GetInventory()->GetPowerupFactor(PUIT_INVISIB) * 255);

          colAlpha = (colAlpha & 0xFFFFFF00) | (INDEX)(ubInvis + (FLOAT)(254 - ubInvis) * fIntensity);

        } else if (TRUE) {
          colAlpha = (colAlpha & 0xFFFFFF00) | INVISIBILITY_ALPHA_REMOTE;
        }
      }

      m_moRender.mo_colBlendColor = colAlpha;
    }

    // use the appearance for rendering
    return &m_moRender;
  };

  // Wrapper for action marker getting
  class CPlayerActionMarker *GetActionMarker(void) {
    return (CPlayerActionMarker *)GetAction();
  };

  // [Cecil] Get current auto action type (only valid when action marker exists)
  INDEX GetAutoAction(void) {
    return GetActionMarker()->m_paaAction;
  };

  // Find main music holder if not remembered
  void FindMusicHolder(void) {
    if (m_penMainMusicHolder == NULL) {
      m_penMainMusicHolder = _pNetwork->GetEntityWithName("MusicHolder", 0);
    }

    // [Cecil] Recount enemies
    if (_pNetwork->IsPlayerLocal(this) || _pNetwork->IsPlayingDemo()) {
      _iAliveEnemies = CountAliveEnemies();
    }
  };

  // Update per-level stats
  void UpdateLevelStats(void) {
    // clear stats for this level
    m_psLevelStats = PlayerStats();

    // get music holder
    if (m_penMainMusicHolder == NULL) {
      return;
    }

    CMusicHolder &mh = (CMusicHolder&)*m_penMainMusicHolder;

    // assure proper count enemies in current world
    if (mh.m_ctEnemiesInWorld == 0) {
      mh.CountEnemies();
    }

    // set totals for level and increment for game
    m_psLevelTotal.ps_iKills = mh.m_ctEnemiesInWorld;
    m_psGameTotal.ps_iKills += mh.m_ctEnemiesInWorld;
    m_psLevelTotal.ps_iSecrets = mh.m_ctSecretsInWorld;
    m_psGameTotal.ps_iSecrets += mh.m_ctSecretsInWorld;
  };

  // Check if there is fuss
  BOOL IsFuss(void) {
    // if no music holder
    if (m_penMainMusicHolder == NULL) {
      // no fuss
      return FALSE;
    }

    // if no enemies - no fuss
    return ((CMusicHolder*)&*m_penMainMusicHolder)->m_cenFussMakers.Count() > 0;
  };

  void SetDefaultMouthPitch(void) {
    m_soMouth.Set3DParameters(50.0f, 10.0f, 1.0f, 1.0f);
  };

  void SetRandomMouthPitch(FLOAT fMin, FLOAT fMax) {
    m_soMouth.Set3DParameters(50.0f, 10.0f, 1.0f, Lerp(fMin, fMax, FRnd()));
  };

  void SetSpeakMouthPitch(void) {
    m_soSpeech.Set3DParameters(50.0f, 10.0f, 2.0f, 1.0f);
  };

  // Added: also shake view because of chainsaw firing
  void ApplyShaking(CPlacement3D &plViewer) {
    // chainsaw shaking
    FLOAT fT = _pTimer->GetLerpedCurrentTick();

    if (fT < m_tmChainShakeEnd) {
      m_fChainsawShakeDX = 0.03f*m_fChainShakeStrength * SinFast(fT*m_fChainShakeFreqMod*3300.0f);
      m_fChainsawShakeDY = 0.03f*m_fChainShakeStrength * SinFast(fT*m_fChainShakeFreqMod*2900.0f);
      
      plViewer.pl_PositionVector(1) += m_fChainsawShakeDX;
      plViewer.pl_PositionVector(3) += m_fChainsawShakeDY;
    }

    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc == NULL || pwsc->m_tmShakeStarted < 0.0f) {
      return;
    }

    TIME tm = _pTimer->GetLerpedCurrentTick() - pwsc->m_tmShakeStarted;

    if (tm < 0) {
      return;
    }

    FLOAT fDistance = (plViewer.pl_PositionVector-pwsc->m_vShakePos).Length();
    FLOAT fIntensity = IntensityAtDistance(pwsc->m_fShakeFalloff, 0, fDistance);
    FLOAT fShakeY, fShakeB, fShakeZ;

    if (!pwsc->m_bShakeFadeIn) {
      fShakeY = SinFast(tm*pwsc->m_tmShakeFrequencyY*360.0f)*
        exp(-tm*(pwsc->m_fShakeFade))*
        fIntensity*pwsc->m_fShakeIntensityY;

      fShakeB = SinFast(tm*pwsc->m_tmShakeFrequencyB*360.0f)*
        exp(-tm*(pwsc->m_fShakeFade))*
        fIntensity*pwsc->m_fShakeIntensityB;

      fShakeZ = SinFast(tm*pwsc->m_tmShakeFrequencyZ*360.0f)*
        exp(-tm*(pwsc->m_fShakeFade))*
        fIntensity*pwsc->m_fShakeIntensityZ;

    } else {
      FLOAT ootm = 1.0f/tm;
      fShakeY = SinFast(tm*pwsc->m_tmShakeFrequencyY*360.0f)*
        exp((tm-2)*ootm*(pwsc->m_fShakeFade))*
        fIntensity*pwsc->m_fShakeIntensityY;

      fShakeB = SinFast(tm*pwsc->m_tmShakeFrequencyB*360.0f)*
        exp((tm-2)*ootm*(pwsc->m_fShakeFade))*
        fIntensity*pwsc->m_fShakeIntensityB;

      fShakeZ = SinFast(tm*pwsc->m_tmShakeFrequencyZ*360.0f)*
        exp((tm-2)*ootm*(pwsc->m_fShakeFade))*
        fIntensity*pwsc->m_fShakeIntensityZ;
    }

    plViewer.pl_PositionVector(2) += fShakeY;
    plViewer.pl_PositionVector(3) += fShakeZ;
    plViewer.pl_OrientationAngle(3) += fShakeB;
  };

  COLOR GetWorldGlaring(void) {
    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc == NULL || pwsc->m_tmGlaringStarted < 0.0f) {
      return 0;
    }

    TIME tm = _pTimer->GetLerpedCurrentTick();
    FLOAT fRatio = CalculateRatio(tm, pwsc->m_tmGlaringStarted, pwsc->m_tmGlaringEnded,
      pwsc->m_fGlaringFadeInRatio, pwsc->m_fGlaringFadeOutRatio);

    COLOR colResult = (pwsc->m_colGlade & 0xFFFFFF00) | (UBYTE(fRatio*255.0f));
    return colResult;
  }

  void RenderScroll(CDrawPort *pdp) {
    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc != NULL && pwsc->m_penScrollHolder != NULL) {
      CScrollHolder &sch = (CScrollHolder&)*pwsc->m_penScrollHolder;
      sch.Credits_Render(&sch, pdp);
    }
  }

  void RenderCredits(CDrawPort *pdp) {
    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc != NULL && pwsc->m_penCreditsHolder != NULL) {
      CCreditsHolder &cch = (CCreditsHolder&)*pwsc->m_penCreditsHolder;
      cch.Credits_Render(&cch, pdp);
    }
  };
  
  void RenderTextFX(CDrawPort *pdp) {
    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc != NULL && pwsc->m_penTextFXHolder != NULL) {
      CTextFXHolder &tfx = (CTextFXHolder&)*pwsc->m_penTextFXHolder;
      tfx.TextFX_Render(&tfx, pdp);
    }
  };

  void RenderHudPicFX(CDrawPort *pdp) {
    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc != NULL && pwsc->m_penHudPicFXHolder != NULL) {
      CHudPicHolder &hpfx = (CHudPicHolder &) *pwsc->m_penHudPicFXHolder;
      hpfx.HudPic_Render(&hpfx, pdp);
    }
  };

  // setup viewing parameters for viewing from player or camera
  void SetupView(CDrawPort *pdp, CAnyProjection3D &apr, CEntity *&penViewer, 
    CPlacement3D &plViewer, COLOR &colBlend, BOOL bCamera)
  {
    // read the exact placement of the view for this tick
    GetLerpedAbsoluteViewPlacement(plViewer);
    ASSERT(IsValidFloat(plViewer.pl_OrientationAngle(1)) && IsValidFloat(plViewer.pl_OrientationAngle(2)) && IsValidFloat(plViewer.pl_OrientationAngle(3)));
    // get current entity that the player views from
    penViewer = GetViewEntity();

    INDEX iViewState = m_iViewState;
    
    if (GetCamera() != NULL && bCamera) {
      iViewState = PVT_SCENECAMERA;
      plViewer = GetCamera()->GetLerpedPlacement();
      penViewer = GetCamera();
    }

    // init projection parameters
    CPerspectiveProjection3D prPerspectiveProjection;
    plr_fFOV = Clamp(plr_fFOV, 1.0f, 160.0f);

    // [Cecil] Steam patch workaround
    BOOL bWidescreen = (FLOAT(pdp->GetHeight()) / FLOAT(pdp->GetWidth()) < 0.75f);
    ANGLE aFOV = (bWidescreen ? 110.0f : 90.0f);

    // [Cecil] Sniper zoom multiplier
    aFOV *= Lerp(m_fLastSniperFOV, m_fSniperFOV, _pTimer->GetLerpFactor()) / 90.0f;

    // [Cecil] Custom FOV
    if (GetSP()->sp_bCooperative) {
      aFOV *= (plr_fFOV / 90.0f);
      aFOV = Clamp(aFOV, 1.0f, 179.0f);
    }

    if (m_pstState == PST_DIVE && iViewState == PVT_PLAYEREYES) {
      TIME tmNow = _pTimer->GetLerpedCurrentTick();
      aFOV += sin(tmNow*0.79f)*2.0f;
    }

    ApplyShaking(plViewer);

    colBlend = 0;

    if (iViewState == PVT_SCENECAMERA) {
      CCamera *pcm = (CCamera*)GetCamera();
      prPerspectiveProjection.FOVL() = Lerp(pcm->m_fLastFOV, pcm->m_fFOV, _pTimer->GetLerpFactor());

      if (pcm->m_tmDelta > 0.001f) {
        FLOAT fFactor = (_pTimer->GetLerpedCurrentTick() - pcm->m_tmAtMarker)/pcm->m_tmDelta;
        fFactor = Clamp(fFactor, 0.0f, 1.0f);
        colBlend = LerpColor(pcm->m_colFade0, pcm->m_colFade1, fFactor);

      } else {
        colBlend = pcm->m_colFade0;
      }

    } else {
      prPerspectiveProjection.FOVL() = aFOV;
    }

    prPerspectiveProjection.ScreenBBoxL() = FLOATaabbox2D(FLOAT2D(0.0f, 0.0f), FLOAT2D((FLOAT)pdp->GetWidth(), (FLOAT)pdp->GetHeight()));

    // determine front clip plane
    plr_fFrontClipDistance = Clamp(plr_fFrontClipDistance, 0.05f, 0.50f);

    FLOAT fFCD = plr_fFrontClipDistance;

    // adjust front clip plane if swimming
    if (m_pstState == PST_SWIM && iViewState == PVT_PLAYEREYES) {
      fFCD *= 0.6666f;
    }

    prPerspectiveProjection.FrontClipDistanceL() = fFCD;
    prPerspectiveProjection.AspectRatioL() = 1.0f;

    // set up viewer position
    apr = prPerspectiveProjection;
    apr->ViewerPlacementL() = plViewer;
    apr->ObjectPlacementL() = CPlacement3D(FLOAT3D(0.0f, 0.0f, 0.0f), ANGLE3D(0.0f, 0.0f, 0.0f));

    prPlayerProjection = apr;
    prPlayerProjection->Prepare();
  };

  // listen from a given viewer
  void ListenFromEntity(CEntity *penListener, const CPlacement3D &plSound) {
    FLOATmatrix3D mRotation;
    MakeRotationMatrixFast(mRotation, plSound.pl_OrientationAngle);

    sliSound.sli_vPosition = plSound.pl_PositionVector;
    sliSound.sli_mRotation = mRotation;
    sliSound.sli_fVolume = 1.0f;
    sliSound.sli_vSpeed = en_vCurrentTranslationAbsolute;
    sliSound.sli_penEntity = penListener;

    if (m_pstState == PST_DIVE) {
      sliSound.sli_fFilter = 20.0f;
    } else {
      sliSound.sli_fFilter = 0.0f;
    }

    INDEX iEnv = 0;

    CBrushSector *pbsc = penListener->GetSectorFromPoint(plSound.pl_PositionVector);

    // for each sector around listener
    if (pbsc != NULL) {
      iEnv = pbsc->GetEnvironmentType();
    }

    // get the environment
    CEnvironmentType &et = GetWorld()->wo_aetEnvironmentTypes[iEnv];
    sliSound.sli_iEnvironmentType = et.et_iType;
    sliSound.sli_fEnvironmentSize = et.et_fSize;

    _pSound->Listen(sliSound);
  };

  // render dummy view (not connected yet)
  void RenderDummyView(CDrawPort *pdp) {
    // clear screen
    pdp->Fill( C_BLACK|CT_OPAQUE);
    
    // if not single player
    if (!GetSP()->sp_bSinglePlayer) {
      // print a message
      PIX pixDPWidth  = pdp->GetWidth();
      PIX pixDPHeight = pdp->GetHeight();
      FLOAT fScale = (FLOAT)pixDPWidth/640.0f;

      pdp->SetFont(_pfdDisplayFont);
      pdp->SetTextScaling(fScale);
      pdp->SetTextAspect(1.0f);

      CTString strMsg;
      strMsg.PrintF(TRANS("%s connected"), GetPlayerName());
      pdp->PutTextCXY(strMsg, pixDPWidth*0.5f, pixDPHeight*0.5f, SE_COL_BLUE_NEUTRAL_LT|CT_OPAQUE);
    }
  };

  // render view from player
  void RenderPlayerView(CDrawPort *pdp, BOOL bShowExtras) {
    CAnyProjection3D apr;
    CEntity *penViewer;
    CPlacement3D plViewer;
    COLOR colBlend;

    // for each eye
    for (INDEX iEye = STEREO_LEFT; iEye <= (Stereo_IsEnabled() ? STEREO_RIGHT : STEREO_LEFT); iEye++) {

      // setup view settings
      SetupView(pdp, apr, penViewer, plViewer, colBlend, FALSE);

      // setup stereo rendering
      Stereo_SetBuffer(iEye);
      Stereo_AdjustProjection(*apr, iEye, 1);

      // render the view
      ASSERT(IsValidFloat(plViewer.pl_OrientationAngle(1))&&IsValidFloat(plViewer.pl_OrientationAngle(2))&&IsValidFloat(plViewer.pl_OrientationAngle(3)));

      _ulPlayerRenderingMask = 1 << GetMyPlayerIndex();
      RenderView(*en_pwoWorld, *penViewer, apr, *pdp);
      _ulPlayerRenderingMask = 0;

      if (iEye == STEREO_LEFT) {
        // listen from here
        ListenFromEntity(this, plViewer);
      }

      RenderScroll(pdp);
      RenderTextFX(pdp);
      RenderCredits(pdp);
      RenderHudPicFX(pdp);

      if (hud_bShowAll && bShowExtras) {
        // let the player entity render its interface
        CPlacement3D plLight(_vViewerLightDirection, ANGLE3D(0.0f, 0.0f, 0.0f));
        plLight.AbsoluteToRelative(plViewer);

        RenderHUD(*(CPerspectiveProjection3D *)(CProjection3D *)apr, pdp, 
          plLight.pl_PositionVector, _colViewerLight, _colViewerAmbient, 
          penViewer == this && IsAlive(this), iEye,
          // [Cecil] Pass it here
          plViewer);
      }
    }

    Stereo_SetBuffer(STEREO_BOTH);

    // determine and cache main drawport, size and relative scale
    PIX pixDPWidth  = pdp->GetWidth();
    PIX pixDPHeight = pdp->GetHeight();
    FLOAT fScale = (FLOAT)pixDPWidth/640.0f;

    // [Cecil] Same font
    pdp->SetFont(_pfdDisplayFont);
    pdp->SetTextScaling(fScale);
    pdp->SetTextAspect(1.0f);

    // [Cecil] Override global message
    if (_pTimer->CurrentTick() < m_tmCenterMessageEnd) {
      pdp->PutTextCXY(m_strCenterMessage, pixDPWidth*0.5f, pixDPHeight*0.85f, C_WHITE|0xDD);

    // print center message
    } else if (_pTimer->CurrentTick() < GetMessageTime()) {
      pdp->PutTextCXY(GetCenterMessage(), pixDPWidth*0.5f, pixDPHeight*0.85f, C_WHITE|0xDD);

    // print picked item
    } else if (_pTimer->CurrentTick() < m_tmLastPicked + PICKEDREPORT_TIME) {
      CTString strPicked;

      if (m_fPickedAmmount == 0.0f) {
        strPicked = m_strPickedName;
      } else {
        strPicked.PrintF("%s +%d", m_strPickedName, int(m_fPickedAmmount));
      }

      pdp->PutTextCXY( strPicked, pixDPWidth*0.5f, pixDPHeight*0.82f, C_WHITE|0xDD);

      if (!GetSP()->sp_bCooperative && !GetSP()->sp_bUseFrags && m_fPickedMana >= 1.0f) {
        CTString strValue;
        strValue.PrintF("%s +%d", TRANS("Value"), INDEX(m_fPickedMana));
        pdp->PutTextCXY( strValue, pixDPWidth*0.5f, pixDPHeight*0.85f, C_WHITE|0xDD);
      }
    }

    if (_pTimer->CurrentTick() < m_tmAnalyseEnd) {
      UBYTE ubA = int(sin(_pTimer->CurrentTick()*10.0f)*127 + 128);

      // [Cecil] pixDPHeight*0.2f -> pixDPHeight*0.35f
      pdp->PutTextCXY(TRANS("Analyzing..."), pixDPWidth*0.5f, pixDPHeight*0.35f, SE_COL_BLUE_NEUTRAL_LT|ubA);
    }

    // [Cecil] Print combo amount
    if (hud_bShowAll && GetSP()->sp_fComboTime > 0.0f && m_iCombo > 1) {
      FLOAT fComboScale = fScale * 0.9f;

      pdp->SetFont(&_fdComboFont);
      pdp->SetTextScaling(fComboScale);
      pdp->SetTextAspect(1.0f);
      
      CTString strCombo = CTString(0, "COMBO: ^cffd700X%d", m_iCombo);

      FLOAT2D vComboSize = FLOAT2D(pdp->GetTextWidth(strCombo) + 8.0f*fComboScale, (_fdComboFont.GetHeight()-4.0f) * fComboScale);
      FLOAT fComboDiff = (m_fComboTime - _pTimer->GetLerpedCurrentTick());
      FLOAT fComboFactor = (fComboDiff / GetSP()->sp_fComboTime);

      pdp->Fill(pixDPWidth*0.5f - vComboSize(1)/2.0f,                pixDPHeight*0.2f - vComboSize(2)/2.0f - 3.0f*fComboScale, vComboSize(1), vComboSize(2), 0x0000007F);
      pdp->Fill(pixDPWidth*0.5f - vComboSize(1)/2.0f * fComboFactor, pixDPHeight*0.2f - vComboSize(2)/2.0f - 3.0f*fComboScale, vComboSize(1) * fComboFactor, vComboSize(2), 0xEE9C00FF);

      pdp->PutTextCXY(strCombo, pixDPWidth*0.5f, pixDPHeight*0.2f, 0xFFFFFFFF);

      pdp->SetFont(_pfdDisplayFont);
      pdp->SetTextScaling(fComboScale);

      // character height
      FLOAT fHeight = _pfdDisplayFont->GetHeight() * fComboScale;
      
      if (amp_iComboText > 0) {
        strCombo = CTString(0, "Payout: ^cee9c00%d", GetComboPayout());

        if (amp_iComboText > 1 && GetSP()->sp_fTokenPayout > 0.0f) {
          strCombo += CTString(0, "  ^rTokens: ^cee9c00%d", GetTokenPayout());
        }

        pdp->PutTextCXY(strCombo, pixDPWidth*0.5f, pixDPHeight*0.2f + fHeight*1.5f, 0xCCCCCCFF);
      }
    }
  };

  // Render view from camera
  void RenderCameraView(CDrawPort *pdp, BOOL bListen) {
    CDrawPort dpCamera;
    CDrawPort *pdpCamera = pdp;

    if (GetCamera() != NULL && ((CCamera&)*GetCamera()).m_bWideScreen) {
      pdp->MakeWideScreen(&dpCamera);
      pdpCamera = &dpCamera;
    }

    pdp->Unlock();
    pdpCamera->Lock();

    CAnyProjection3D apr;
    CEntity *penViewer;
    CPlacement3D plViewer;
    COLOR colBlend;

    // for each eye
    for (INDEX iEye = STEREO_LEFT; iEye <= (Stereo_IsEnabled() ? STEREO_RIGHT : STEREO_LEFT); iEye++) {
      // setup view settings
      SetupView(pdpCamera, apr, penViewer, plViewer, colBlend, TRUE);

      // setup stereo rendering
      Stereo_SetBuffer(iEye);
      Stereo_AdjustProjection(*apr, iEye, 1);

      // render the view
      ASSERT(IsValidFloat(plViewer.pl_OrientationAngle(1))&&IsValidFloat(plViewer.pl_OrientationAngle(2))&&IsValidFloat(plViewer.pl_OrientationAngle(3)));

      _ulPlayerRenderingMask = 1 << GetMyPlayerIndex();
      RenderView(*en_pwoWorld, *penViewer, apr, *pdpCamera);
      _ulPlayerRenderingMask = 0;

      // listen from there if needed
      if (bListen && iEye == STEREO_LEFT) {
        ListenFromEntity(penViewer, plViewer);
      }
    }

    Stereo_SetBuffer(STEREO_BOTH);

    RenderScroll(pdpCamera);
    RenderTextFX(pdpCamera);
    RenderCredits(pdpCamera);
    RenderHudPicFX(pdpCamera);

    // add world glaring
    {
      COLOR colGlare = GetWorldGlaring();
      UBYTE ubR, ubG, ubB, ubA;
      ColorToRGBA(colGlare, ubR, ubG, ubB, ubA);

      if (ubA != 0) {
        pdpCamera->dp_ulBlendingRA += ULONG(ubR)*ULONG(ubA);
        pdpCamera->dp_ulBlendingGA += ULONG(ubG)*ULONG(ubA);
        pdpCamera->dp_ulBlendingBA += ULONG(ubB)*ULONG(ubA);
        pdpCamera->dp_ulBlendingA += ULONG(ubA);
      }

      // do all queued screen blendings
      pdpCamera->BlendScreen();
    }

    pdpCamera->Unlock();
    pdp->Lock();

    // camera fading
    if ((colBlend & CT_AMASK) != 0) {
      pdp->Fill(colBlend);
    }

    // [Cecil] Override global message
    BOOL bGlobalMessage = _pTimer->CurrentTick() < GetMessageTime();
    BOOL bLocalMessage = _pTimer->CurrentTick() < m_tmCenterMessageEnd;

    // print center message
    if (bGlobalMessage || bLocalMessage) {
      PIX pixDPWidth = pdp->GetWidth();
      PIX pixDPHeight = pdp->GetHeight();
      FLOAT fScale = (FLOAT)pixDPWidth/640.0f;

      pdp->SetFont(_pfdDisplayFont);
      pdp->SetTextScaling(fScale);
      pdp->SetTextAspect(1.0f);

      pdp->PutTextCXY(bLocalMessage ? m_strCenterMessage : GetCenterMessage(), pixDPWidth*0.5f, pixDPHeight*0.85f, C_WHITE|0xDD);
    }
  };

  void RenderGameView(CDrawPort *pdp, void *pvUserData) {
    BOOL bShowExtras = (ULONG(pvUserData) & GRV_SHOWEXTRAS);
    pdp->Unlock();

    // if not yet initialized
    if (!(m_ulFlags & PLF_INITIALIZED) || (m_ulFlags & PLF_DONTRENDER)) { 
      // render dummy view on the right drawport
      CDrawPort dpView(pdp, TRUE);

      if (dpView.Lock()) {
        RenderDummyView(&dpView);
        dpView.Unlock();
      }

      pdp->Lock();
      return; 
    }

    // if rendering real game view (not thumbnail, or similar)
    if (pvUserData != 0) {
      // if rendered a game view recently
      CTimerValue tvNow = _pTimer->GetHighPrecisionTimer();

      if ((tvNow - _tvProbingLast).GetSeconds() < 0.1) {
        // allow probing
        _pGfx->gl_bAllowProbing = TRUE;
      }

      _tvProbingLast = tvNow;
    }

    // check for dualhead
    BOOL bDualHead = (pdp->IsDualHead() && GetSP()->sp_gmGameMode != CSessionProperties::GM_FLYOVER && !IsActionActive());

    // if dualhead, or no camera active
    if (bDualHead || GetCamera() == NULL) {
      // make left player view
      CDrawPort dpView(pdp, TRUE);

      if (dpView.Lock()) {
        // draw it
        RenderPlayerView(&dpView, bShowExtras);
        dpView.Unlock();
      }
    }

    // if camera active
    if (GetCamera() != NULL) {
      // make left or right camera view
      CDrawPort dpView(pdp, IsActionActive());

      if (dpView.Lock()) {
        // draw it, listen if not dualhead
        RenderCameraView(&dpView, !bDualHead);
        dpView.Unlock();
      }

    // if camera is not active
    } else {
      // if dualhead
      if (bDualHead) {
        // render computer on secondary display
        cmp_ppenDHPlayer = this;
      }
    }

    // all done - lock back the original drawport
    pdp->Lock();
  };

  // Premoving for soft player up-down movement
  void PreMoving(void) {
    GetPlayerAnimator()->StoreLast();
    CPlayerEntity::PreMoving();
  };

  // Do moving
  void DoMoving(void) {
    CPlayerEntity::DoMoving();
    GetPlayerAnimator()->AnimateBanking();

    if (m_penView != NULL) {
      ((CPlayerView&)*m_penView).DoMoving();
    }

    if (m_pen3rdPersonView != NULL) {
      ((CPlayerView&)*m_pen3rdPersonView).DoMoving();
    }

    // [Cecil] Dual weapon position shifting
    GetInventory()->ShiftDualWeapons();
  };

  // Postmoving for soft player up-down movement
  void PostMoving(void) {
    CPlayerEntity::PostMoving();

    // never allow a player to be removed from the list of movers
    en_ulFlags &= ~ENF_INRENDERING;

    GetPlayerAnimator()->AnimateSoftEyes();

    // slowly increase mana with time, faster if player is not moving; (only if alive)
    if (IsAlive(this)) {
      m_fManaFraction += ClampDn(1.0f - en_vCurrentTranslationAbsolute.Length()/20.0f, 0.0f) * 20.0f * _pTimer->TickQuantum;

      INDEX iNewMana = m_fManaFraction;
      m_iMana += iNewMana;
      m_fManaFraction -= iNewMana;
    }

    // if in tourist mode
    if (GetSP()->sp_gdGameDifficulty == CSessionProperties::GD_TOURIST && IsAlive(this)) {
      // slowly increase health with time
      FLOAT fHealth = GetHealth();
      FLOAT fTopHealth = TopHealth();

      if (fHealth < fTopHealth) {
        SetHealth(ClampUp(fHealth + _pTimer->TickQuantum, fTopHealth)); // one unit per second
      }
    }

    // update ray hit for weapon target
    GetWeapon(0)->UpdateTargetingInfo();
    GetWeapon(1)->UpdateTargetingInfo();

    if (m_pen3rdPersonView != NULL) {
      ((CPlayerView&)*m_pen3rdPersonView).PostMoving();
    }

    if (m_penView != NULL) {
      ((CPlayerView&)*m_penView).PostMoving();
    }

    // if didn't have any action in this tick
    if (!(m_ulFlags & PLF_APPLIEDACTION)) {
      // means we are not connected
      SetUnconnected();
    }

    // clear action indicator
    m_ulFlags &= ~PLF_APPLIEDACTION;
  };

  // Set player parameters for unconnected state (between the server loads and player reconnects)
  void SetUnconnected(void) {
    if (m_ulFlags & PLF_NOTCONNECTED) {
      return;
    }

    m_ulFlags |= PLF_NOTCONNECTED;

    // reset to a dummy state
    ForceFullStop();
    SetPhysicsFlags(GetPhysicsFlags() & ~(EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY));
    SetCollisionFlags(GetCollisionFlags() & ~((ECBI_BRUSH|ECBI_MODEL) << ECB_TEST));
    en_plLastViewpoint.pl_OrientationAngle = en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);

    PlayLegsAnim(PLAYER_ANIM_STAND, 0);

    GetPlayerAnimator()->BodyAnimationTemplate(
      BODY_ANIM_NORMALWALK, BODY_ANIM_COLT_STAND, BODY_ANIM_SHOTGUN_STAND, BODY_ANIM_MINIGUN_STAND, 
      AOF_LOOPING|AOF_NORESTART);
  };

  // Set player parameters for connected state
  void SetConnected(void) {
    if (!(m_ulFlags & PLF_NOTCONNECTED)) {
      return;
    }

    m_ulFlags &= ~PLF_NOTCONNECTED;

    SetPhysicsFlags(GetPhysicsFlags() | (EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY));
    SetCollisionFlags(GetCollisionFlags() | ((ECBI_BRUSH|ECBI_MODEL)<<ECB_TEST));
  };

  // Check if player is connected or not
  BOOL IsConnected(void) const {
    return !(m_ulFlags & PLF_NOTCONNECTED);
  };

  // Create a checksum value for sync-check
  void ChecksumForSync(ULONG &ulCRC, INDEX iExtensiveSyncCheck) {
    CPlayerEntity::ChecksumForSync(ulCRC, iExtensiveSyncCheck);
    CRC_AddLONG(ulCRC, m_psLevelStats.ps_iScore);
    CRC_AddLONG(ulCRC, m_iMana);

    if (iExtensiveSyncCheck > 0) {
      CRC_AddFLOAT(ulCRC, m_fManaFraction);
    }

    CRC_AddFLOAT(ulCRC, m_fArmor);
  };

  // Dump sync data to text file
  void DumpSync_t(CTStream &strm, INDEX iExtensiveSyncCheck) {
    CPlayerEntity::DumpSync_t(strm, iExtensiveSyncCheck);
    strm.FPrintF_t("Score: %d\n", m_psLevelStats.ps_iScore);
    strm.FPrintF_t("m_iMana:  %d\n", m_iMana);
    strm.FPrintF_t("m_fManaFraction: %g(%08x)\n", m_fManaFraction, (ULONG&)m_fManaFraction);
    strm.FPrintF_t("m_fArmor: %g(%08x)\n", m_fArmor, (ULONG&)m_fArmor);
  };

  // Leave stain
  virtual void LeaveStain(BOOL bGrow) {
    ESpawnEffect ese;
    FLOAT3D vPoint;
    FLOATplane3D vPlaneNormal;
    FLOAT fDistanceToEdge;

    // get your size
    FLOATaabbox3D box;
    GetBoundingBox(box);
  
    // on plane
    if (GetNearestPolygon(vPoint, vPlaneNormal, fDistanceToEdge)) {
      // if near to polygon and away from last stain point
      if ((vPoint-GetPlacement().pl_PositionVector).Length() < 0.5f
       && (m_vLastStain - vPoint).Length() > 1.0f)
      {
        m_vLastStain = vPoint;
        FLOAT fStretch = box.Size().Length();
        ese.colMuliplier = C_WHITE|CT_OPAQUE;

        // stain
        if (bGrow) {
          ese.betType = BET_BLOODSTAINGROW;
          ese.vStretch = FLOAT3D(fStretch*1.5f, fStretch*1.5f, 1.0f);
        } else {
          ese.betType = BET_BLOODSTAIN;
          ese.vStretch = FLOAT3D(fStretch*0.75f, fStretch*0.75f, 1.0f);
        }

        ese.vNormal = FLOAT3D(vPlaneNormal);
        ese.vDirection = FLOAT3D(0.0f, 0.0f, 0.0f);

        FLOAT3D vPos = vPoint+ese.vNormal/50.0f * (FRnd()+0.5f);
        CEntityPointer penEffect = CreateEntity(CPlacement3D(vPos, ANGLE3D(0.0f, 0.0f, 0.0f)), CLASS_BASIC_EFFECT);
        penEffect->Initialize(ese);
      }
    }
  };

  // [Cecil] Self damage flag
  void DamageImpact(BOOL bSelfDamage, enum DamageType dmtType, FLOAT fDamageAmmount, const FLOAT3D &vHitPoint, const FLOAT3D &vDirection) {
    // if exploded
    if (GetRenderType() != RT_MODEL) {
      // do nothing
      return;
    }

    if (dmtType == DMT_ABYSS || dmtType == DMT_SPIKESTAB) {
      return;
    }

    fDamageAmmount = Clamp(fDamageAmmount, 0.0f, 5000.0f);

    // [Cecil] Explosion types
    BOOL bExplosionDamage = (dmtType == DMT_EXPLOSION || dmtType == DMT_CANNONBALL_EXPLOSION);

    FLOAT fKickDamage = fDamageAmmount;
    if (bExplosionDamage || dmtType == DMT_IMPACT) {
      fKickDamage *= 1.5;
    }

    if (dmtType == DMT_DROWNING || dmtType == DMT_CLOSERANGE) {
      fKickDamage /= 10;
    }

    if (dmtType == DMT_CHAINSAW) {
      fKickDamage /= 10;
    }

    // [Cecil] No rocket jumping
    if (bSelfDamage && bExplosionDamage && GetSP()->sp_iAMPOptions & AMP_NOROCKETJUMP) {
      fKickDamage /= 100;
    }

    // get passed time since last damage
    TIME tmNow = _pTimer->CurrentTick();
    TIME tmDelta = tmNow-m_tmLastDamage;
    m_tmLastDamage = tmNow;

    // fade damage out
    if (tmDelta >= _pTimer->TickQuantum*3) {
      m_vDamage = FLOAT3D(0.0f, 0.0f, 0.0f);
    }

    // add new damage
    FLOAT3D vDirectionFixed;

    if (vDirection.ManhattanNorm() > 0.5f) {
      vDirectionFixed = vDirection;
    } else {
      vDirectionFixed = -en_vGravityDir;
    }

    FLOAT3D vDamageOld = m_vDamage;
    m_vDamage += vDirectionFixed*fKickDamage;
    
    FLOAT fOldLen = vDamageOld.Length();
    FLOAT fNewLen = m_vDamage.Length();
    FLOAT fOldRootLen = Sqrt(fOldLen);
    FLOAT fNewRootLen = Sqrt(fNewLen);

    FLOAT fMassFactor = 200.0f / ((EntityInfo*)GetEntityInfo())->fMass;
    
    if (!IsAlive(this)) {
      fMassFactor /= 3;
    }

    switch (dmtType) {
      case DMT_CLOSERANGE:
      case DMT_CHAINSAW:
      case DMT_DROWNING:
      case DMT_IMPACT:
      case DMT_BRUSH:
      case DMT_BURNING:
        // do nothing
        break;

      default: {
        if (fOldLen != 0.0f) {
          // cancel last push
          GiveImpulseTranslationAbsolute( -vDamageOld/fOldRootLen*fMassFactor);
        }

        // push it back
        GiveImpulseTranslationAbsolute( m_vDamage/fNewRootLen*fMassFactor);
      }
    }

    if (m_fMaxDamageAmmount < fDamageAmmount) {
      m_fMaxDamageAmmount = fDamageAmmount;
    }

    // if it has no spray, or if this damage overflows it
    if ((m_tmSpraySpawned <= _pTimer->CurrentTick() - _pTimer->TickQuantum*8
     || m_fSprayDamage + fDamageAmmount > 50.0f))
    {
      // spawn blood spray
      CPlacement3D plSpray = CPlacement3D(vHitPoint, ANGLE3D(0.0f, 0.0f, 0.0f));
      m_penSpray = CreateEntity(plSpray, CLASS_BLOOD_SPRAY);
      m_penSpray->SetParent(this);

      ESpawnSpray eSpawnSpray;
      eSpawnSpray.colBurnColor = C_WHITE|CT_OPAQUE;
      
      if (m_fMaxDamageAmmount > 10.0f) {
        eSpawnSpray.fDamagePower = 3.0f;

      } else if (m_fSprayDamage + fDamageAmmount > 50.0f) {
        eSpawnSpray.fDamagePower = 2.0f;

      } else {
        eSpawnSpray.fDamagePower = 1.0f;
      }

      eSpawnSpray.sptType = SPT_BLOOD;
      eSpawnSpray.fSizeMultiplier = 1.0f;

      // setup direction of spray
      FLOAT3D vHitPointRelative = vHitPoint - GetPlacement().pl_PositionVector;
      FLOAT3D vReflectingNormal;

      GetNormalComponent(vHitPointRelative, en_vGravityDir, vReflectingNormal);
      vReflectingNormal.Normalize();
      
      vReflectingNormal(1) /= 5.0f;
    
      FLOAT3D vProjectedComponent = vReflectingNormal*(vDirection%vReflectingNormal);
      FLOAT3D vSpilDirection = vDirection - vProjectedComponent*2.0f - en_vGravityDir*0.5f;

      eSpawnSpray.vDirection = vSpilDirection;
      eSpawnSpray.penOwner = this;
    
      // initialize spray
      m_penSpray->Initialize(eSpawnSpray);
      m_tmSpraySpawned = _pTimer->CurrentTick();
      m_fSprayDamage = 0.0f;
      m_fMaxDamageAmmount = 0.0f;
    }

    m_fSprayDamage += fDamageAmmount;
  };

  // Receive damage
  void ReceiveDamage(CEntity *penInflictor, enum DamageType dmtType, FLOAT fDamageAmmount, const FLOAT3D &vHitPoint, const FLOAT3D &vDirection) {
    // don't harm yourself with knife or with rocket in easy/tourist mode
    if (penInflictor == this && (dmtType == DMT_CLOSERANGE || dmtType == DMT_CHAINSAW
     || ((dmtType == DMT_EXPLOSION || dmtType == DMT_CANNONBALL_EXPLOSION || dmtType == DMT_PROJECTILE)
     && GetSP()->sp_gdGameDifficulty<=CSessionProperties::GD_EASY))) {
      return;
    }

    // if not connected
    if (m_ulFlags & PLF_NOTCONNECTED) {
      // noone can harm you
      return;
    }

    // [Cecil] AMP options
    if ((!(GetSP()->sp_iAMPOptions & AMP_HEAT)   && dmtType == DMT_HEAT)
     || (!(GetSP()->sp_iAMPOptions & AMP_IMPACT) && dmtType == DMT_IMPACT)) {
      return;
    }

    // [Cecil] Self damage
    if (penInflictor == this) {
      fDamageAmmount *= GetSP()->sp_fSelfDamage;

    // [Cecil] Enemy damage
    } else if (IsDerivedFromClass(penInflictor, "Enemy Base")) {
      fDamageAmmount *= GetSP()->sp_fEnemyDamage;

    // [Cecil] Player damage
    } else if (IsDerivedFromClass(penInflictor, "Player")) {
      fDamageAmmount *= GetSP()->sp_fPlayerDamage;
    }

    // god mode -> no one can harm you
    if (cht_bGod && CheatsEnabled() ) {
      return;
    }

    // [Cecil] Invulnerability time
    // if invulnerable, nothing can harm you except telefrag or abyss
    if (GetInventory()->IsPowerupActive(PUIT_INVULNER) && dmtType != DMT_ABYSS && dmtType != DMT_TELEPORT) {
      return;
    }

    // if invunerable after spawning
    FLOAT tmSpawnInvulnerability = GetSP()->sp_tmSpawnInvulnerability;

    // [Cecil] Ignore if negative
    if (tmSpawnInvulnerability < 0.0f || (tmSpawnInvulnerability > 0.0f && _pTimer->CurrentTick() - m_tmSpawned < tmSpawnInvulnerability)) {
      // [Cecil] Ignore if not abyss, nor teleport
      if (dmtType != DMT_ABYSS && dmtType != DMT_TELEPORT) {
        return;
      }
    }

    // check for friendly fire
    if (!GetSP()->sp_bFriendlyFire && GetSP()->sp_bCooperative) {
      if (IsOfClass(penInflictor, "Player") && penInflictor != this) {
        return;
      }
    }

    // ignore heat damage if dead
    if (dmtType == DMT_HEAT && !IsAlive(this)) {
      return;
    }

    // adjust for difficulty
    FLOAT fDifficultyDamage = GetSP()->sp_fDamageStrength;
    if (fDifficultyDamage <= 1.0f || penInflictor != this) {
      fDamageAmmount *= fDifficultyDamage;
    }

    // ignore zero damages
    if (fDamageAmmount <= 0) {
      return;
    }

    FLOAT fSubHealth, fSubArmor;
    if (dmtType == DMT_DROWNING) {
      // drowning
      fSubHealth = fDamageAmmount;

    } else {
      // damage and armor
      fSubArmor = fDamageAmmount * 2.0f/3.0f; // 2/3 on armor damage
      fSubHealth = fDamageAmmount - fSubArmor; // 1/3 on health damage
      m_fArmor -= fSubArmor; // decrease armor
      
      // armor below zero -> add difference to health damage
      if (m_fArmor < 0.0f) {
        fSubHealth -= m_fArmor;
        m_fArmor    = 0.0f;
      }
    }

    // if any damage
    if (fSubHealth > 0) { 
      // if camera is active
      if (GetCamera() != NULL) {
        // if the camera has onbreak
        CEntity *penOnBreak = ((CCamera&)*GetCamera()).m_penOnBreak;

        if (penOnBreak != NULL) {
          // trigger it
          SendToTarget(penOnBreak, EET_TRIGGER, this);

        // just deactivate camera
        } else {
          // [Cecil] Changed to a function
          ResetCamera();
        }
      }
    }

    // if the player is doing autoactions
    if (IsActionActive()) {
      // ignore all damage
      return;
    }

    DamageImpact((penInflictor == this), dmtType, fSubHealth, vHitPoint, vDirection);

    // receive damage
    CPlayerEntity::ReceiveDamage( penInflictor, dmtType, fSubHealth, vHitPoint, vDirection);

    // red screen and hit translation
    if (fDamageAmmount > 1.0f) {
      if (IsAlive(this)) {
        m_fDamageAmmount += fDamageAmmount;
        m_tmWoundedTime = _pTimer->CurrentTick();
      }
    }

    // yell (this hurts)
    ESound eSound;
    eSound.EsndtSound = SNDT_PLAYER;
    eSound.penTarget  = this;
    SendEventInRange(eSound, FLOATaabbox3D(GetPlacement().pl_PositionVector, 10.0f));

    // play hurting sound
    if (dmtType == DMT_DROWNING) {
      SetRandomMouthPitch(0.9f, 1.1f);
      PlaySound(m_soMouth, GenderSound(SOUND_DROWN), SOF_3D);
      if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("WoundWater");}

      m_tmMouthSoundLast = _pTimer->CurrentTick();
      PlaySound(m_soLocalAmbientOnce, SOUND_WATERBUBBLES, SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
      m_soLocalAmbientOnce.Set3DParameters(25.0f, 5.0f, 2.0f, Lerp(0.5f, 1.5f, FRnd()) );
      SpawnBubbles(10 + INDEX(FRnd()*10));

    } else if (m_fDamageAmmount > 1.0f) {
      // if not dead
      if (IsAlive(this)) {
        // determine corresponding sound
        INDEX iSound;
        char *strIFeel = NULL;

        if (m_fDamageAmmount < 5.0f) {
          iSound = GenderSound(SOUND_WOUNDWEAK);
          strIFeel = "WoundWeak";

        } else if (m_fDamageAmmount < 25.0f) {
          iSound = GenderSound(SOUND_WOUNDMEDIUM);
          strIFeel = "WoundMedium";

        } else {
          iSound = GenderSound(SOUND_WOUNDSTRONG);
          strIFeel = "WoundStrong";
        }

        // override for diving
        if (m_pstState == PST_DIVE) {
          iSound = GenderSound(SOUND_WOUNDWATER);
          strIFeel = "WoundWater";
        }

        // give some pause inbetween screaming
        TIME tmNow = _pTimer->CurrentTick();

        if (tmNow - m_tmScreamTime > 1.0f) {
          m_tmScreamTime = tmNow;
          SetRandomMouthPitch(0.9f, 1.1f);
          PlaySound(m_soMouth, iSound, SOF_3D);
          if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect(strIFeel);}
        }
      }
    }
  };

  // Should this player blow up (spawn debris)
  BOOL ShouldBlowUp(void) {
    // blow up if
    return
      // allowed
      GetSP()->sp_bGibs && 
      // dead and
      (GetHealth() <= 0) && 
      // has received large enough damage lately and
      (m_vDamage.Length() > _fBlowUpAmount) &&
      // is not blown up already
      GetRenderType() == RT_MODEL;
  };

  // Spawn body parts
  void BlowUp(void) {
    FLOAT3D vNormalizedDamage = m_vDamage - m_vDamage*(_fBlowUpAmount / m_vDamage.Length());
    vNormalizedDamage /= Sqrt(vNormalizedDamage.Length());
    vNormalizedDamage *= 0.75f;

    FLOAT3D vBodySpeed = en_vCurrentTranslationAbsolute - en_vGravityDir*(en_vGravityDir % en_vCurrentTranslationAbsolute);
    const FLOAT fBlowUpSize = 2.0f;

    // readout blood type
    const EBloodType eBloodType = GetBloodType();

    // [Cecil] Switch red and green textures around
    // determine debris texture (color)
    ULONG ulFleshTexture = TEXTURE_FLESH_RED;
    ULONG ulFleshModel   = MODEL_FLESH;

    if (eBloodType == BLD_GREEN) {
      ulFleshTexture = TEXTURE_FLESH_GREEN;
    }

    // [Cecil] Colorful type
    if (eBloodType > BLD_HIPPIE) {
      ulFleshTexture = TEXTURE_FLESH;
    }

    for (INDEX iDebris = 0; iDebris < 4; iDebris++) {
      // flowerpower mode?
      if (eBloodType == BLD_HIPPIE) {
        // [Cecil] IRnd() -> rand()
        switch (rand() % 5) {
          case 1:  ulFleshModel = MODEL_FLESH_APPLE;  ulFleshTexture = TEXTURE_FLESH_APPLE;  break;
          case 2:  ulFleshModel = MODEL_FLESH_BANANA; ulFleshTexture = TEXTURE_FLESH_BANANA; break;
          case 3:  ulFleshModel = MODEL_FLESH_BURGER; ulFleshTexture = TEXTURE_FLESH_BURGER; break;
          case 4:  ulFleshModel = MODEL_FLESH_LOLLY;  ulFleshTexture = TEXTURE_FLESH_LOLLY;  break;
          default: ulFleshModel = MODEL_FLESH_ORANGE; ulFleshTexture = TEXTURE_FLESH_ORANGE; break;
        }
      }

      // [Cecil] Debris color
      COLOR colDebris = 0xFFFFFFFF;

      switch (eBloodType) {
        case BLD_VALENTINE: colDebris = 0xFF00AAFF; break;
        case BLD_HALLOWEEN: colDebris = 0xFF7F00FF; break;
        case BLD_CHRISTMAS: colDebris = ChristmasColor(rand(), 0xFF, 0xFF); break;
      }

      // [Cecil] Moved from above for random colors
      Debris_Begin(EIBT_FLESH, DPT_BLOODTRAIL, BET_BLOODSTAIN, fBlowUpSize, vNormalizedDamage, vBodySpeed, 1.0f, 0.0f, colDebris);

      Debris_Spawn(this, this, ulFleshModel, ulFleshTexture, 0, 0, 0, IRnd()%4, 0.5f,
                   FLOAT3D(FRnd()*0.6f+0.2f, FRnd()*0.6f+0.2f, FRnd()*0.6f+0.2f));
    }

    // leave a stain beneath
    LeaveStain(FALSE);

    PlaySound(m_soBody, SOUND_BLOWUP, SOF_3D);

    // hide yourself (must do this after spawning debris)
    SwitchToEditorModel();
    
    FLOAT fSpeedOrg = en_vCurrentTranslationAbsolute.Length();
    const FLOAT fSpeedMax = 30.0f;

    if (fSpeedOrg > fSpeedMax) {
      en_vCurrentTranslationAbsolute *= fSpeedMax/fSpeedOrg;
    }

    // [Cecil] Christmas fireworks
    if (GetSP()->sp_eEvent == ESE_CHRISTMAS) {
      ESpawnEffect eSpawnEffect;
      eSpawnEffect.colMuliplier = 0xFFFFFFFF;
      eSpawnEffect.betType = BET_FIREWORKS;

      // get enemy center
      EntityInfo *pei = (EntityInfo*)GetEntityInfo();
      FLOAT3D vCenter = FLOAT3D(0.0f, pei->vTargetCenter[1], 0.0f);

      // position and scale
      CPlacement3D plFireworks = CPlacement3D(vCenter * GetRotationMatrix(), ANGLE3D(FRnd() * 360.0f, 0.0f, 0.0f));
      plFireworks.RelativeToAbsolute(GetPlacement());

      FLOAT fScale = (2.0f + FRnd());
      eSpawnEffect.vStretch = FLOAT3D(fScale, fScale, fScale);

      // spawn fireworks
      CEntityPointer penFireworks = CreateEntity(plFireworks, CLASS_BASIC_EFFECT);
      penFireworks->Initialize(eSpawnEffect);
    }
  };

  // Entity info
  void *GetEntityInfo(void) {
    switch (m_pstState) {
      case PST_STAND: case PST_FALL:
        return &eiPlayerGround;
        break;

      case PST_CROUCH:
        return &eiPlayerCrouch;
        break;

      case PST_SWIM: case PST_DIVE:
        return &eiPlayerSwim;
        break;
    }

    return &eiPlayerGround;
  };

  // Receive item
  BOOL ReceiveItem(const CEntityEvent &ee) {
    // [Cecil] Forward to PlayerInventory
    return GetInventory()->ReceiveItem(ee, this);
  };

  // Change Player view
  void ChangePlayerView()
  {
    // change from eyes to 3rd person
    if (m_iViewState == PVT_PLAYEREYES) {
      // spawn 3rd person view camera
      ASSERT(m_pen3rdPersonView == NULL);
      if (m_pen3rdPersonView == NULL) {
        m_pen3rdPersonView = CreateEntity(GetPlacement(), CLASS_PLAYER_VIEW);
        EViewInit eInit;
        eInit.penOwner = this;
        eInit.penCamera = NULL;
        eInit.vtView = VT_3RDPERSONVIEW;
        eInit.bDeathFixed = FALSE;
        m_pen3rdPersonView ->Initialize(eInit);
      }
      
      m_iViewState = PVT_3RDPERSONVIEW;

    // change from 3rd person to eyes
    } else if (m_iViewState == PVT_3RDPERSONVIEW) {
      m_iViewState = PVT_PLAYEREYES;

      // kill 3rd person view
      if (m_pen3rdPersonView != NULL) {
        ((CPlayerView&)*m_pen3rdPersonView).SendEvent(EEnd());
        m_pen3rdPersonView = NULL;
      }
    }
  };

  // if computer is pressed
  void ComputerPressed(void) {
    // call computer if not holding sniper
    if (cmp_ppenPlayer == NULL && _pNetwork->IsPlayerLocal(this)) {
      cmp_ppenPlayer = this;
    }

    m_bComputerInvoked = TRUE;

    // clear analyses message
    m_tmAnalyseEnd = 0;
    m_bPendingMessage = FALSE;
    m_tmMessagePlay = 0;
  }


  // if use is pressed
  void UsePressed(BOOL bOrComputer)
  {
    // cast ray from weapon
    CPlayerWeapons *penWeapons = GetWeapon(0);
    CEntity *pen = penWeapons->m_penRayHit;
    BOOL bSomethingToUse = FALSE;

    // if hit
    if (pen!=NULL) {
      // check switch/messageholder relaying by moving brush
      if (IsOfClass( pen, "Moving Brush")) {
        if (((CMovingBrush&)*pen).m_penSwitch!=NULL) {
          pen = ((CMovingBrush&)*pen).m_penSwitch;
        }
      }

      // if switch and near enough
      if (IsOfClass( pen, "Switch") && penWeapons->m_fRayHitDistance < 2.0f) {
        CSwitch &enSwitch = (CSwitch&)*pen;
        // if switch is useable
        if (enSwitch.m_bUseable) {
          // send it a trigger event
          SendToTarget(pen, EET_TRIGGER, this);
          bSomethingToUse = TRUE;
        }
      }

      // if analyzable
      if (IsOfClass( pen, "MessageHolder") 
        && penWeapons->m_fRayHitDistance<((CMessageHolder*)&*pen)->m_fDistance
        && ((CMessageHolder*)&*pen)->m_bActive) {
        const CTFileName &fnmMessage = ((CMessageHolder*)&*pen)->m_fnmMessage;
        // if player doesn't have that message in database
        if (!HasMessage(fnmMessage)) {
          // add the message
          ReceiveComputerMessage(fnmMessage, CMF_ANALYZE);
          bSomethingToUse = TRUE;
        }
      }
    }
    // if nothing usable under cursor, and may call computer
    if (!bSomethingToUse && bOrComputer) {
      // call computer
      ComputerPressed();

    } else if (!bSomethingToUse) {
      CPlayerWeapons *penWeapon = GetWeapon(0);
     
      // make sure that weapon transition is not in progress
      if (penWeapon->GetCurrent() == WEAPON_SNIPER && penWeapon->GetWanted() == WEAPON_SNIPER) {
        if (m_ulFlags & PLF_ISZOOMING) {
          m_ulFlags &= ~PLF_ISZOOMING;

          m_bSniping = FALSE;
          m_fLastSniperFOV = m_fSniperFOV = m_fSniperMaxFOV;

          PlaySound(m_soSniperZoom, SOUND_SILENCE, SOF_3D);
          if(_pNetwork->IsPlayerLocal(this)) {IFeel_StopEffect("SniperZoom");}

        } else {
          m_ulFlags |= PLF_ISZOOMING;

          m_bSniping = TRUE;
          m_fLastSniperFOV = m_fSniperFOV = m_fMinimumZoomFOV;

          PlaySound(m_soSniperZoom, SOUND_SNIPER_ZOOM, SOF_3D|SOF_LOOP);
          if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("SniperZoom");}
        }
      }
    }
  };

  void SetGameEnd(void) {
    _pNetwork->SetGameFinished();
    // start console for first player possible
    for(INDEX iPlayer=0; iPlayer<GetMaxPlayers(); iPlayer++) {
      CEntity *pen = GetPlayerEntity(iPlayer);
      if (pen!=NULL) {
        if (cmp_ppenPlayer==NULL && _pNetwork->IsPlayerLocal(pen)) {
          cmp_ppenPlayer = (CPlayer*)pen;
        }
      }
    }
  };

  // check if game should be finished
  void CheckGameEnd(void) {
    BOOL bFinished = FALSE;
    // if time limit is out
    INDEX iTimeLimit = GetSP()->sp_iTimeLimit;
    if (iTimeLimit>0 && _pTimer->CurrentTick()>=iTimeLimit*60.0f) {
      bFinished = TRUE;
    }
    // if frag limit is out
    INDEX iFragLimit = GetSP()->sp_iFragLimit;
    if (iFragLimit>0 && m_psLevelStats.ps_iKills>=iFragLimit) {
      bFinished = TRUE;
    }
    // if score limit is out
    INDEX iScoreLimit = GetSP()->sp_iScoreLimit;
    if (iScoreLimit>0 && m_psLevelStats.ps_iScore>=iScoreLimit) {
      bFinished = TRUE;
    }

    if (bFinished) {
      SetGameEnd();
    }
  }

  // Preapply the action packet for local mouselag elimination
  void PreapplyAction( const CPlayerAction &paAction)
  {
  }

  // Called to apply player action to player entity each tick.
  void ApplyAction(const CPlayerAction &paOriginal, FLOAT tmLatency) {
    if (!(m_ulFlags & PLF_INITIALIZED)) {
      return;
    }
    
    // if was not connected
    if (m_ulFlags & PLF_NOTCONNECTED) {
      // set connected state
      SetConnected();
    }

    // mark that the player is connected
    m_ulFlags |= PLF_APPLIEDACTION;

    // make a copy of action for adjustments
    CPlayerAction paAction = paOriginal;

    // [Cecil] Copy extra buttons
    m_ulButtons1 = *reinterpret_cast<ULONG*>(&paAction.pa_aRotation(3));
    m_ulButtons2 = *reinterpret_cast<ULONG*>(&paAction.pa_aViewRotation(3));

    paAction.pa_aRotation(3) = 0.0f;
    paAction.pa_aViewRotation(3) = 0.0f;

    // calculate delta from last received actions
    ANGLE3D aDeltaRotation     = paAction.pa_aRotation     - m_aLastRotation;
    ANGLE3D aDeltaViewRotation = paAction.pa_aViewRotation - m_aLastViewRotation;
    
    if (m_ulFlags & PLF_ISZOOMING) {
      FLOAT fRotationDamping = m_fSniperFOV / m_fSniperMaxFOV;
      aDeltaRotation *= fRotationDamping;
      aDeltaViewRotation *= fRotationDamping;
    }

    m_aLastRotation     = paAction.pa_aRotation;
    m_aLastViewRotation = paAction.pa_aViewRotation;

    paAction.pa_aRotation     = aDeltaRotation;
    paAction.pa_aViewRotation = aDeltaViewRotation;

    // adjust rotations per tick
    paAction.pa_aRotation /= _pTimer->TickQuantum;
    paAction.pa_aViewRotation /= _pTimer->TickQuantum;

    // adjust prediction for remote players only
    CEntity *penMe = this;
    if (IsPredictor()) {
      penMe = penMe->GetPredicted();
    }
    SetPredictable(!_pNetwork->IsPlayerLocal(penMe));

    // check for end of game
    if (!IsPredictor()) {
      CheckGameEnd();
    }

    // limit speeds against abusing
    paAction.pa_vTranslation(1) = Clamp(paAction.pa_vTranslation(1), -plr_fSpeedSide,    plr_fSpeedSide);
    paAction.pa_vTranslation(2) = Clamp(paAction.pa_vTranslation(2), -plr_fSpeedUp,      plr_fSpeedUp);
    paAction.pa_vTranslation(3) = Clamp(paAction.pa_vTranslation(3), -plr_fSpeedForward, plr_fSpeedBackward);

    // if speeds are like walking
    if (Abs(paAction.pa_vTranslation(3)) < plr_fSpeedForward/1.99f
     && Abs(paAction.pa_vTranslation(1)) < plr_fSpeedSide/1.99f) {
      // don't allow falling
      en_fStepDnHeight = 1.5f;

    // if speeds are like running
    } else {
      // allow falling
      en_fStepDnHeight = -1;
    }

    // limit diagonal speed against abusing
    FLOAT3D &v = paAction.pa_vTranslation;
    FLOAT fDiag = Sqrt(v(1)*v(1)+v(3)*v(3));
    if (fDiag>0.01f) {
      FLOAT fDiagLimited = Min(fDiag, plr_fSpeedForward);
      FLOAT fFactor = fDiagLimited/fDiag;
      v(1)*=fFactor;
      v(3)*=fFactor;
    }

    ulButtonsNow = paAction.pa_ulButtons;
    ulButtonsBefore = m_ulLastButtons;
    ulNewButtons = ulButtonsNow & ~ulButtonsBefore;
    ulReleasedButtons = (~ulButtonsNow) & (ulButtonsBefore);

    m_ulLastButtons = ulButtonsNow;         // remember last buttons
    en_plLastViewpoint = en_plViewpoint;    // remember last view point for lerping

    // sniper zooming
    CPlayerWeapons *penWeapon = GetWeapon(0);

    if (penWeapon->GetCurrent() == WEAPON_SNIPER) {
      if (bUseButtonHeld && m_ulFlags & PLF_ISZOOMING) {
        m_fLastSniperFOV = m_fSniperFOV;
        m_fSniperFOV -= m_fSnipingZoomSpeed;

        if (m_fSniperFOV < m_fSniperMinFOV) {
          m_fLastSniperFOV = m_fSniperFOV = m_fSniperMinFOV;

          PlaySound(m_soSniperZoom, SOUND_SILENCE, SOF_3D);
          if(_pNetwork->IsPlayerLocal(this)) {IFeel_StopEffect("SniperZoom");}
        }
      }

      if (ulReleasedButtons & PLACT_USE_HELD) {
         m_fLastSniperFOV = m_fSniperFOV;

         PlaySound(m_soSniperZoom, SOUND_SILENCE, SOF_3D);
         if(_pNetwork->IsPlayerLocal(this)) {IFeel_StopEffect("SniperZoom");}
      }
    }
    
    // if alive
    if (IsAlive(this)) {
      // if not in auto-action mode
      if (!IsActionActive()) {
        // apply actions
        AliveActions(paAction);

      // if in auto-action mode
      } else {
        // do automatic actions
        AutoActions(paAction);
      }

      // [Cecil] Turn collision back on if needed
      if (SPWorld() && GetSP()->sp_iPlayerCollision == 1) {
        if ((m_vSpawnPoint - GetPlacement().pl_PositionVector).Length() > 3.0f) {
          SetCollisionFlags(ECF_MODEL | ((ECBI_PLAYER)<<ECB_IS));
        }
      }

    // if not alive rotate camera view and rebirth on fire
    } else {
      DeathActions(paAction);
    }

    // [Cecil] Check if affected by global cutscenes
    BOOL bGlobalCutscenes = (GlobalCutscenes() && !IsPredictor());
    
    // [Cecil] In singleplayer cutscenes for other players
    if (bGlobalCutscenes && !GLOBAL_CONTROLLER->IsActor(this) && IsAlive(this)) {
      // [Cecil] Hide players during actions
      if (IsActionActive()) {
        if (GetRenderType() != RT_EDITORMODEL) {
          SwitchToEditorModel();
          SetPhysicsFlags(GetPhysicsFlags() & ~EPF_TRANSLATEDBYGRAVITY);
          SetCollisionFlags(GetCollisionFlags() | ((ECBI_PLAYER)<<ECB_PASS));
        }

        // Follow the actor
        if (!GLOBAL_CONTROLLER->IsActor(this)) {
          CPlacement3D plActor = GLOBAL_CONTROLLER->m_penActor->GetPlacement();
          FLOAT3D vDiff = (GetPlacement().pl_PositionVector - plActor.pl_PositionVector);

          if (vDiff.Length() > 0.1f) {
            Teleport(plActor, FALSE);
          }
        }

      // [Cecil] Otherwise show
      } else if (GetRenderType() != RT_MODEL) {
        SwitchToModel();
        SetPhysicsFlags(GetPhysicsFlags() | EPF_TRANSLATEDBYGRAVITY);
        SetCollisionFlags(GetCollisionFlags() & ~((ECBI_PLAYER)<<ECB_PASS));
      }
    }

    if (Abs(_pTimer->CurrentTick() - m_tmAnalyseEnd) < _pTimer->TickQuantum*2) {
      m_tmAnalyseEnd = 0;
      m_bPendingMessage = TRUE;
      m_tmMessagePlay = 0;
    }

    if (m_bPendingMessage && !IsFuss()) {
      m_bPendingMessage = FALSE;
      m_tmMessagePlay = _pTimer->CurrentTick()+1.0f;
      m_tmAnimateInbox = _pTimer->CurrentTick();
    }

    if (Abs(_pTimer->CurrentTick() - m_tmMessagePlay) < _pTimer->TickQuantum*2) {
      m_bPendingMessage = FALSE;
      m_tmAnalyseEnd = 0;

      if (!m_bComputerInvoked && GetSP()->sp_bSinglePlayer) {
        PrintCenterMessage(this, this, TRANS("Press USE to read the message!"), 5.0f, MSS_NONE);
      }
    }

    // wanna cheat a bit?
    if (CheatsEnabled()) {
      Cheats();
    }

    // if teleporting to marker (this cheat is enabled in all versions)
    if (cht_iGoToMarker > 0 && IsAlive(this)) {
      // rebirth player, and it will teleport
      m_iLastViewState = m_iViewState;
      SendEvent(ERebirth());
    }

    // keep latency for eventual printout
    UpdateLatency(tmLatency);

    // check if highscore has changed
    CheckHighScore();

    // [Cecil] Combo mode timer
    FLOAT fComboDiff = (m_fComboTime - _pTimer->CurrentTick());

    if (GetSP()->sp_fComboTime > 0.0f) {
      if (fComboDiff <= 0.0f) {
        // receive combo payout score
        if (GetSP()->sp_bCooperative) {
          EReceiveScore eScore;
          eScore.iPoints = GetComboPayout();
          eScore.bEnemy = FALSE;
          SendEvent(eScore);
        
          if (GetSP()->sp_fTokenPayout > 0.0f) {
            INDEX iAddTokens = GetTokenPayout();
        
            if (iAddTokens > 0) {
              m_iTokens += iAddTokens;
              PlaySound(m_soMessage, SOUND_TOKEN, SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
        
              ItemPicked(TRANS("Combo Tokens"), iAddTokens);
            }
          }
        }
        
        m_iCombo = 0;
        m_iComboScore = 0;
      }
    }

    // [Cecil] Stop players globally
    if (bGlobalCutscenes && GetGlobalStopMask() & (1 << GetMyPlayerIndex())) {
      // stop moving if no marker
      if (GetGlobalAction() == NULL) {
        SetDesiredTranslation(FLOAT3D(0.0f, 0.0f, 0.0f));
        SetDesiredRotation(ANGLE3D(0.0f, 0.0f, 0.0f));
      }

      // stop firing
      GetWeapon(0)->SendEvent(EReleaseWeapon());
      GetWeapon(1)->SendEvent(EReleaseWeapon());

      // remove from the mask
      EStopMask eStop;
      eStop.iPlayer = GetMyPlayerIndex();

      _penGlobalController->SendEvent(eStop);
    }

    // [Cecil] Control weapon flare attachments
    for (INDEX iWeapon = 0; iWeapon < 2; iWeapon++) {
      // get weapon timer
      FLOAT *pfTimer = &GetInventory()->m_tmFlare1;
      BOOL bTimeOut = (_pTimer->CurrentTick() >= pfTimer[iWeapon]);

      // remove flares on timeout
      if (bTimeOut) {
        GetInventory()->GetWeapon(iWeapon)->WeaponFlare(FALSE);
        GetPlayerAnimator()->WeaponFlare(iWeapon, FALSE);
      }
    }
  };

  // Called when player is disconnected
  void Disconnect(void)
  {
    // remember name
    m_strName = GetPlayerName();
    // clear the character, so we don't get re-connected to same entity
    en_pcCharacter = CPlayerCharacter();
    // make main loop exit
    SendEvent(EDisconnected());
  };

  // Called when player character is changed
  void CharacterChanged(const CPlayerCharacter &pcNew) 
  {
    // remember original character
    CPlayerCharacter pcOrg = en_pcCharacter;

    // set the new character
    en_pcCharacter = pcNew;
    ValidateCharacter();

    // if the name has changed
    if (pcOrg.GetName()!=pcNew.GetName()) {
      // report that
      CPrintF(TRANS("%s is now known as %s\n"), 
        pcOrg.GetNameForPrinting(), pcNew.GetNameForPrinting());
    }

    // if the team has changed
    if (pcOrg.GetTeam()!=pcNew.GetTeam()) {
      // report that
      CPrintF(TRANS("%s switched to team %s\n"), 
        pcNew.GetNameForPrinting(), pcNew.GetTeamForPrinting());
    }

    // if appearance changed
    CPlayerSettings *ppsOrg = (CPlayerSettings *)pcOrg.pc_aubAppearance;
    CPlayerSettings *ppsNew = (CPlayerSettings *)pcNew.pc_aubAppearance;
    if (memcmp(ppsOrg->ps_achModelFile, ppsNew->ps_achModelFile, sizeof(ppsOrg->ps_achModelFile))!=0) {
      // update your real appearance if possible
      CTString strNewLook;
      BOOL bSuccess = SetPlayerAppearance(&m_moRender, &en_pcCharacter, strNewLook, /*bPreview=*/FALSE);
      // if succeeded
      if (bSuccess) {
        ParseGender(strNewLook);
        // report that
        CPrintF(TRANS("%s now appears as %s\n"), 
          pcNew.GetNameForPrinting(), strNewLook);
      // if failed
      } else {
        // report that
        CPrintF(TRANS("Cannot change appearance for %s: setting '%s' is unavailable\n"), 
          pcNew.GetNameForPrinting(), (const char*)ppsNew->GetModelFilename());
      }
      // attach weapon to new appearance
      GetPlayerAnimator()->SyncWeapon();
    }

    BOOL b3RDPersonOld = ppsOrg->ps_ulFlags&PSF_PREFER3RDPERSON;
    BOOL b3RDPersonNew = ppsNew->ps_ulFlags&PSF_PREFER3RDPERSON;
    if ((b3RDPersonOld && !b3RDPersonNew && m_iViewState==PVT_3RDPERSONVIEW)
      ||(b3RDPersonNew && !b3RDPersonOld && m_iViewState==PVT_PLAYEREYES) ) {
      ChangePlayerView();
    }
  };


  // Alive actions
  void AliveActions(const CPlayerAction &pa) {
    CPlayerAction paAction = pa;

    // if camera is active
    if (GetCamera() != NULL) {
      // ignore keyboard/mouse/joystick commands
      paAction.pa_vTranslation  = FLOAT3D(0.0f, 0.0f, 0.0f);
      paAction.pa_aRotation     = ANGLE3D(0.0f, 0.0f, 0.0f);
      paAction.pa_aViewRotation = ANGLE3D(0.0f, 0.0f, 0.0f);

      // stop if fire or use is pressed
      if (ulNewButtons & (PLACT_FIRE|PLACT_USE)) {
        // [Cecil] Changed to a function
        ResetCamera();
      }

    } else {
      ButtonsActions(paAction);
    }

    // do the actions
    ActiveActions(paAction);

    // if less than few seconds elapsed since last damage
    FLOAT tmSinceWounding = _pTimer->CurrentTick() - m_tmWoundedTime;
    if( tmSinceWounding<4.0f) {
      // decrease damage ammount
      m_fDamageAmmount *= 1.0f - tmSinceWounding/4.0f;
    } else {
      // reset damage ammount
      m_fDamageAmmount = 0.0f;
    }
  }

  // Auto-actions
  void AutoActions(const CPlayerAction &pa) {
    // if fire, use or computer is pressed
    if (ulNewButtons&(PLACT_FIRE|PLACT_USE|PLACT_COMPUTER)) {
      if (GetCamera() != NULL) {
        CEntity *penOnBreak = ((CCamera&)*GetCamera()).m_penOnBreak;

        if (penOnBreak != NULL) {
          SendToTarget(penOnBreak, EET_TRIGGER, this);
        }
      }
    }

    CPlayerAction paAction = pa;

    // ignore keyboard/mouse/joystick commands
    paAction.pa_vTranslation  = FLOAT3D(0.0f, 0.0f, 0.0f);
    paAction.pa_aRotation     = ANGLE3D(0.0f, 0.0f, 0.0f);
    paAction.pa_aViewRotation = ANGLE3D(0.0f, 0.0f, 0.0f);

    // if moving towards the marker is enabled
    if (m_fAutoSpeed > 0) {
      FLOAT3D vDelta = GetAction()->GetPlacement().pl_PositionVector - GetPlacement().pl_PositionVector;
      FLOAT fDistance = vDelta.Length();

      if (fDistance > 0.1f) {
        vDelta /= fDistance;
        ANGLE aDH = GetRelativeHeading(vDelta);

        // if should hit the marker exactly
        FLOAT fSpeed = m_fAutoSpeed;
        if (GetAutoAction() == PAA_RUNANDSTOP) {
          // adjust speed
          fSpeed = Min(fSpeed, fDistance/_pTimer->TickQuantum);
        }

        // adjust rotation
        if (Abs(aDH) > 5.0f) {
          if (fSpeed>m_fAutoSpeed-0.1f) {
            aDH = Clamp(aDH, -30.0f, 30.0f);
          }
          paAction.pa_aRotation = ANGLE3D(aDH/_pTimer->TickQuantum,0,0);
        }

        // set forward speed
        paAction.pa_vTranslation = FLOAT3D(0.0f, 0.0f, -fSpeed);
      }

    } else {
      paAction.pa_vTranslation = m_vAutoSpeed;
    }

    if (GetAutoAction() == PAA_LOGO_FIRE_MINIGUN || GetAutoAction() == PAA_LOGO_FIRE_INTROSE) {
      if (m_tmMinigunAutoFireStart != -1) {
        FLOAT tmDelta = _pTimer->CurrentTick() - m_tmMinigunAutoFireStart;
        FLOAT aDH = 0.0f;
        FLOAT aDP = 0.0f;
        if (tmDelta >= 0.0f && tmDelta <= 0.75f) {
          aDH = 0.0f;
        } else if (tmDelta >= 0.75f) {
          FLOAT fDT = tmDelta - 0.75f;
          aDH = 1.0f*cos(fDT+PI/2.0f);
          aDP = 0.5f*cos(fDT);
        }

        if (GetAutoAction() == PAA_LOGO_FIRE_INTROSE) {
          FLOAT fRatio = CalculateRatio(tmDelta, 0.25f, 5.0f, 0.1f, 0.1f);
          aDP = 2.0f*sin(tmDelta*200.0f)*fRatio;

          if (tmDelta > 2.5f) {
            aDP+=(tmDelta-2.5f)*4.0f;
          }
        }

        paAction.pa_aRotation = ANGLE3D(aDH/_pTimer->TickQuantum, aDP/_pTimer->TickQuantum,0);
      }
    }

    // do the actions
    if (!(m_ulFlags & PLF_AUTOMOVEMENTS)) {
      ActiveActions(paAction);
    }
  };

  void GetLerpedWeaponPosition(FLOAT3D vRel, CPlacement3D &pl) {
    _bDiscard3rdView = GetViewEntity() != this;

    CPlacement3D plView;
    GetLerpedAbsoluteViewPlacement(plView);

    pl = CPlacement3D(vRel, ANGLE3D(0.0f, 0.0f, 0.0f));
    pl.RelativeToAbsolute(plView);
  };

  void SpawnBubbles(INDEX ctBubbles) {
    for (INDEX iBouble = 0; iBouble < ctBubbles; iBouble++) {
      FLOAT3D vRndRel = FLOAT3D((FRnd()-0.5f)*0.25f, -0.25f, -0.5f+FRnd()/10.0f);
      ANGLE3D aDummy = ANGLE3D(0.0f, 0.0f, 0.0f);
      CPlacement3D plMouth = CPlacement3D(vRndRel, aDummy);

      plMouth.RelativeToAbsolute(en_plViewpoint);
      plMouth.RelativeToAbsolute(GetPlacement());
      FLOAT3D vRndSpd = FLOAT3D((FRnd()-0.5f)*0.25f, (FRnd()-0.5f)*0.25f, (FRnd()-0.5f)*0.25f);
      AddBouble(plMouth.pl_PositionVector, vRndSpd);
    }
  };

  void PlayPowerUpSound(void) {
    m_soPowerUpBeep.Set3DParameters(50.0f, 10.0f, 4.0f, 1.0f);
    PlaySound(m_soPowerUpBeep, SOUND_POWERUP_BEEP, SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
  }

  void ActiveActions(const CPlayerAction &paAction) {
    // translation
    FLOAT3D vTranslation = paAction.pa_vTranslation;
    // turbo speed cheat
    if (cht_fTranslationMultiplier && CheatsEnabled()) { 
      vTranslation *= cht_fTranslationMultiplier;
    }

    // [Cecil] TODO: Call PlayerInventory and check if it's only knives selected
    // enable faster moving if holding knife in DM
    if (GetWeapon(0)->GetCurrent() == WEAPON_KNIFE && !GetSP()->sp_bCooperative) {
      vTranslation *= 1.3f;
    }

    // [Cecil] Speed multipliers
    if (GetSP()->sp_iAMPOptions & AMP_ENABLE && m_fAutoSpeed == 0.0f) {
      vTranslation(1) *= GetSP()->sp_fSpeedMultiplier;
      vTranslation(2) *= GetSP()->sp_fJumpMultiplier;
      vTranslation(3) *= GetSP()->sp_fSpeedMultiplier;
    }

    // [Cecil] Speed time and multiplier
    // enable faster moving (but not higher jumping!) if having SerousSpeed powerup
    if (GetInventory()->IsPowerupActive(PUIT_SPEED) && m_fAutoSpeed == 0.0f) {
      const FLOAT fMul = GetInventory()->GetPowerupFactor(PUIT_SPEED);
      vTranslation(1) *= fMul;
      vTranslation(3) *= fMul;
    }
    
    en_fAcceleration = plr_fAcceleration;
    en_fDeceleration = plr_fDeceleration;

    if (!GetSP()->sp_bCooperative) {
      vTranslation(1) *= 1.35f;
      vTranslation(3) *= 1.35f;
    }

    CContentType &ctUp = GetWorld()->wo_actContentTypes[en_iUpContent];
    CContentType &ctDn = GetWorld()->wo_actContentTypes[en_iDnContent];
    PlayerState pstWanted = PST_STAND;
    BOOL bUpSwimable = (ctUp.ct_ulFlags&CTF_SWIMABLE) && en_fImmersionFactor<=0.99f;
    BOOL bDnSwimable = (ctDn.ct_ulFlags&CTF_SWIMABLE) && en_fImmersionFactor>=0.5f;

    // if considerably inside swimable content
    if (bUpSwimable || bDnSwimable) {
      // allow jumping
      m_ulFlags|=PLF_JUMPALLOWED;
      //CPrintF("swimable %f", en_fImmersionFactor);
      // if totaly inside
      if (en_fImmersionFactor>=0.99f || bUpSwimable) {
        // want to dive
        pstWanted = PST_DIVE;
      // if only partially inside
      } else {
        // want to swim
        pstWanted = PST_SWIM;
      }
    // if not in swimable content
    } else {
      // if has reference
      if (en_penReference!=NULL) {
        // reset fall timer
        m_fFallTime = 0.0f;

      // if no reference
      } else {
        // increase fall time
        m_fFallTime += _pTimer->TickQuantum;
      }
      // if not wanting to jump
      if (vTranslation(2)<0.1f) {
        // allow jumping
        m_ulFlags|=PLF_JUMPALLOWED;
      }

      // if falling
      if (m_fFallTime >= 0.5f) {
        // wants to fall
        pstWanted = PST_FALL;
      // if not falling
      } else {
        // if holding down and really not in air
        if (vTranslation(2)<-0.01f/* && m_fFallTime<0.5f*/) {
          // wants to crouch
          pstWanted = PST_CROUCH;
        // if not holding down
        } else {
          // wants to stand
          pstWanted = PST_STAND;
        }
      }
    }
    //CPrintF("c - %s w - %s", NameForState(m_pstState), NameForState(pstWanted));

    // flying mode - rotate whole player
    if (!(GetPhysicsFlags()&EPF_TRANSLATEDBYGRAVITY)) {
      SetDesiredRotation(paAction.pa_aRotation);
      PlayLegsAnim(PLAYER_ANIM_STAND, AOF_LOOPING|AOF_NORESTART);
      SetDesiredTranslation(vTranslation);

    // normal mode
    } else {
      PlayerState pstOld = m_pstState; 

      // if different state needed
      if (pstWanted!=m_pstState) {
        // check state wanted
        switch(pstWanted) {
        // if wanting to stand
        case PST_STAND: {
          // if can stand here
          if (ChangeCollisionBoxIndexNow(PLAYER_COLLISION_BOX_STAND)) {
            en_plViewpoint.pl_PositionVector(2) = plr_fViewHeightStand;
            if (m_pstState==PST_CROUCH) {
              GetPlayerAnimator()->Rise();
            } else {
              GetPlayerAnimator()->Stand();
            }
            m_pstState = PST_STAND;
          }
                        } break;
        // if wanting to crouch
        case PST_CROUCH: {
          // if can crouch here
          if (ChangeCollisionBoxIndexNow(PLAYER_COLLISION_BOX_CROUCH)) {
            m_pstState = PST_CROUCH;
            en_plViewpoint.pl_PositionVector(2) = plr_fViewHeightCrouch;
            GetPlayerAnimator()->Crouch();
          }
                        } break;
        // if wanting to swim
        case PST_SWIM: {
          // if can swim here
          if (ChangeCollisionBoxIndexNow(PLAYER_COLLISION_BOX_SWIMSMALL)) {
            ChangeCollisionBoxIndexWhenPossible(PLAYER_COLLISION_BOX_SWIM);
            m_pstState = PST_SWIM;
            en_plViewpoint.pl_PositionVector(2) = plr_fViewHeightSwim;
            GetPlayerAnimator()->Swim();
            m_fSwimTime = _pTimer->CurrentTick();
          }
                        } break;
        // if wanting to dive
        case PST_DIVE: {
          // if can dive here
          if (ChangeCollisionBoxIndexNow(PLAYER_COLLISION_BOX_SWIMSMALL)) {
            ChangeCollisionBoxIndexWhenPossible(PLAYER_COLLISION_BOX_SWIM);
            m_pstState = PST_DIVE;
            en_plViewpoint.pl_PositionVector(2) = plr_fViewHeightDive;
            GetPlayerAnimator()->Swim();
          }
                        } break;
        // if wanting to fall
        case PST_FALL: {
          // if can fall here
          if (ChangeCollisionBoxIndexNow(PLAYER_COLLISION_BOX_STAND)) {
            m_pstState = PST_FALL;
            en_plViewpoint.pl_PositionVector(2) = plr_fViewHeightStand;
            GetPlayerAnimator()->Fall();
          }
                        } break;
        }
      }

      // if state changed
      if (m_pstState!=pstOld) {
        // check water entering/leaving
        BOOL bWasInWater = (pstOld==PST_SWIM||pstOld==PST_DIVE);
        BOOL bIsInWater = (m_pstState==PST_SWIM||m_pstState==PST_DIVE);
        // if entered water
        if (bIsInWater && !bWasInWater) {
          PlaySound(m_soBody, GenderSound(SOUND_WATER_ENTER), SOF_3D);
        // if left water
        } else if (!bIsInWater && bWasInWater) {
          PlaySound(m_soBody, GenderSound(SOUND_WATER_LEAVE), SOF_3D);
          m_tmOutOfWater = _pTimer->CurrentTick();
          //CPrintF("gotout ");
        // if in water
        } else if (bIsInWater) {
          // if dived in
          if (pstOld==PST_SWIM && m_pstState == PST_DIVE) {
            PlaySound(m_soFootL, GenderSound(SOUND_DIVEIN), SOF_3D);
            if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("DiveIn");}
            m_bMoveSoundLeft = TRUE;
            m_tmMoveSound = _pTimer->CurrentTick();
          // if dived out
          } else if (m_pstState==PST_SWIM && pstOld==PST_DIVE) {
            PlaySound(m_soFootL, GenderSound(SOUND_DIVEOUT), SOF_3D);
            m_bMoveSoundLeft = TRUE;
            m_tmMoveSound = _pTimer->CurrentTick();
          }
        }
        // if just fell to ground
        if (pstOld==PST_FALL && (m_pstState==PST_STAND||m_pstState==PST_CROUCH)) {
          PlaySound(m_soFootL, GenderSound(SOUND_LAND), SOF_3D);
          if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("Land");}
        }
        // change ambience sounds
        if (m_pstState==PST_DIVE) {
          m_soLocalAmbientLoop.Set3DParameters(50.0f, 10.0f, 0.25f, 1.0f);
          PlaySound(m_soLocalAmbientLoop, SOUND_WATERAMBIENT, 
            SOF_LOOP|SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
        } else if (pstOld==PST_DIVE) {
          m_soLocalAmbientLoop.Stop();
        }
      }
      // if just jumped
      if (en_tmJumped+_pTimer->TickQuantum>=_pTimer->CurrentTick() &&
          en_tmJumped<=_pTimer->CurrentTick() && en_penReference==NULL) {
        // play jump sound
        SetDefaultMouthPitch();
        PlaySound(m_soMouth, GenderSound(SOUND_JUMP), SOF_3D);
        if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("Jump");}
        // disallow jumping
        m_ulFlags&=~PLF_JUMPALLOWED;
      }

      // set density
      if (m_pstState == PST_SWIM || pstWanted == PST_SWIM
        ||(pstWanted == PST_DIVE && m_pstState != pstWanted)) {
        en_fDensity = 500.0f;  // lower density than water
      } else {
        en_fDensity = 1000.0f; // same density as water
      }

      if (_pTimer->CurrentTick()>=m_tmNextAmbientOnce)
      {
        if (m_pstState == PST_DIVE)
        {
          PlaySound(m_soLocalAmbientOnce, SOUND_WATERBUBBLES, 
            SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
          m_soLocalAmbientOnce.Set3DParameters(25.0f, 5.0f, 2.0f, Lerp(0.5f, 1.5f, FRnd()) );
          SpawnBubbles( 5+INDEX(FRnd()*5));
        }
        m_tmNextAmbientOnce = _pTimer->CurrentTick()+5.0f+FRnd();
      }


      // if crouching
      if (m_pstState == PST_CROUCH) {
        // go slower
        vTranslation /= 2.5f;
        // don't go down
        vTranslation(2) = 0.0f;
      }

      // if diving
      if (m_pstState == PST_DIVE) {
        // translate up/down with view pitch
        FLOATmatrix3D mPitch;
        MakeRotationMatrixFast(mPitch, FLOAT3D(0,en_plViewpoint.pl_OrientationAngle(2),0));
        FLOAT fZ = vTranslation(3);
        vTranslation(3) = 0.0f;
        vTranslation += FLOAT3D(0,0,fZ)*mPitch;
      // if swimming
      } else if (m_pstState == PST_SWIM) {
        // translate down with view pitch if large
        FLOATmatrix3D mPitch;
        FLOAT fPitch = en_plViewpoint.pl_OrientationAngle(2);
        if (fPitch>-30.0f) {
          fPitch = 0;
        }
        MakeRotationMatrixFast(mPitch, FLOAT3D(0,fPitch,0));
        FLOAT fZ = vTranslation(3);
        vTranslation(3) = 0.0f;
        vTranslation += FLOAT3D(0,0,fZ)*mPitch;
      }

      // if swimming or diving
      if (m_pstState == PST_SWIM || m_pstState == PST_DIVE) {
        // up/down is slower than on ground
        vTranslation(2)*=0.5f;
      }

      // if just started swimming
      if (m_pstState == PST_SWIM && _pTimer->CurrentTick()<m_fSwimTime+0.5f
        ||_pTimer->CurrentTick()<m_tmOutOfWater+0.5f) {
        // no up/down change
        vTranslation(2)=0;
        //CPrintF(" noup");
      }

      //CPrintF("\n");

      // disable consecutive jumps
      if (!(m_ulFlags&PLF_JUMPALLOWED) && vTranslation(2)>0) {
        vTranslation(2) = 0.0f;
      }

      // set translation
      SetDesiredTranslation(vTranslation);

      // [Cecil] Removed banking rotation
      // set pitch and banking from the normal rotation into the view rotation
      en_plViewpoint.Rotate_HPB(ANGLE3D(
        (ANGLE)((FLOAT)paAction.pa_aRotation(1)*_pTimer->TickQuantum),
        (ANGLE)((FLOAT)paAction.pa_aRotation(2)*_pTimer->TickQuantum), 0.0f));

      // pitch and banking boundaries
      RoundViewAngle(en_plViewpoint.pl_OrientationAngle(2), PITCH_MAX);

      // translation rotate player for heading
      if (vTranslation.Length() > 0.1f) {
        SetDesiredRotation(ANGLE3D(en_plViewpoint.pl_OrientationAngle(1)/_pTimer->TickQuantum, 0.0f, 0.0f));

        if (m_ulFlags & PLF_VIEWROTATIONCHANGED) {
          m_ulFlags &= ~PLF_VIEWROTATIONCHANGED;
          FLOATmatrix3D mViewRot;
          MakeRotationMatrixFast(mViewRot, ANGLE3D(en_plViewpoint.pl_OrientationAngle(1),0,0));
          FLOAT3D vTransRel = vTranslation*mViewRot;
          SetDesiredTranslation(vTransRel);
        }

        en_plViewpoint.pl_OrientationAngle(1) = 0.0f;

      // rotate head, body and legs
      } else {
        m_ulFlags |= PLF_VIEWROTATIONCHANGED;
        SetDesiredRotation(ANGLE3D(0.0f, 0.0f, 0.0f));
        ANGLE aDiff = en_plViewpoint.pl_OrientationAngle(1) - HEADING_MAX;
        if (aDiff > 0.0f) {
          SetDesiredRotation(ANGLE3D(aDiff/_pTimer->TickQuantum, 0.0f, 0.0f));
        }
        aDiff = en_plViewpoint.pl_OrientationAngle(1) + HEADING_MAX;
        if (aDiff < 0.0f) {
          SetDesiredRotation(ANGLE3D(aDiff/_pTimer->TickQuantum, 0.0f, 0.0f));
        }
        RoundViewAngle(en_plViewpoint.pl_OrientationAngle(1), HEADING_MAX);
      }

      // play moving sounds
      FLOAT fWantSpeed = en_vDesiredTranslationRelative.Length();
      FLOAT fGoesSpeed = en_vCurrentTranslationAbsolute.Length();
      BOOL bOnGround = (m_pstState == PST_STAND)||(m_pstState == PST_CROUCH);
      BOOL bRunning = bOnGround && fWantSpeed>5.0f && fGoesSpeed>5.0f;
      BOOL bWalking = bOnGround && !bRunning && fWantSpeed>2.0f && fGoesSpeed>2.0f;
      BOOL bSwimming = (m_pstState == PST_SWIM) && fWantSpeed>2.0f && fGoesSpeed>2.0f;
      BOOL bDiving = (m_pstState == PST_DIVE) && fWantSpeed>2.0f && fGoesSpeed>2.0f;
      TIME tmNow = _pTimer->CurrentTick();
      INDEX iSoundWalkL = SOUND_WALK_L;
      INDEX iSoundWalkR = SOUND_WALK_R;
      if ((ctDn.ct_ulFlags&CTF_SWIMABLE) && en_fImmersionFactor>=0.1f) {
        iSoundWalkL = SOUND_WATERWALK_L;
        iSoundWalkR = SOUND_WATERWALK_R;
      } else if (en_pbpoStandOn!=NULL && 
        en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_SAND) {
        iSoundWalkL = SOUND_WALK_SAND_L;
        iSoundWalkR = SOUND_WALK_SAND_R;
      } else if (en_pbpoStandOn!=NULL && 
        en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_RED_SAND) {
        iSoundWalkL = SOUND_WALK_SAND_L;
        iSoundWalkR = SOUND_WALK_SAND_R;
      } else if (en_pbpoStandOn!=NULL && 
        (en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_GRASS ||
         en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_GRASS_SLIDING ||
         en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_GRASS_NOIMPACT )) {
        iSoundWalkL = SOUND_WALK_GRASS_L;
        iSoundWalkR = SOUND_WALK_GRASS_R;
      } else if (en_pbpoStandOn!=NULL && 
        en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_WOOD) {
        iSoundWalkL = SOUND_WALK_WOOD_L;
        iSoundWalkR = SOUND_WALK_WOOD_R;
      } else if (en_pbpoStandOn!=NULL && 
        en_pbpoStandOn->bpo_bppProperties.bpp_ubSurfaceType==SURFACE_SNOW) {
        iSoundWalkL = SOUND_WALK_SNOW_L;
        iSoundWalkR = SOUND_WALK_SNOW_R;
      }
      else {
      }
      iSoundWalkL+=m_iGender*GENDEROFFSET;
      iSoundWalkR+=m_iGender*GENDEROFFSET;
      if (bRunning) {
        if (tmNow>m_tmMoveSound+plr_fRunSoundDelay) {
          m_tmMoveSound = tmNow;
          m_bMoveSoundLeft = !m_bMoveSoundLeft;
          if (m_bMoveSoundLeft) {
            PlaySound(m_soFootL, iSoundWalkL, SOF_3D);
          } else {
            PlaySound(m_soFootR, iSoundWalkR, SOF_3D);
          }
        }
      } else if (bWalking) {
        if (tmNow>m_tmMoveSound+plr_fWalkSoundDelay) {
          m_tmMoveSound = tmNow;
          m_bMoveSoundLeft = !m_bMoveSoundLeft;
          if (m_bMoveSoundLeft) {
            PlaySound(m_soFootL, iSoundWalkL, SOF_3D);
          } else {
            PlaySound(m_soFootR, iSoundWalkR, SOF_3D);
          }
        }
      } else if (bDiving) {
        if (tmNow>m_tmMoveSound+plr_fDiveSoundDelay) {
          m_tmMoveSound = tmNow;
          m_bMoveSoundLeft = !m_bMoveSoundLeft;
          if (m_bMoveSoundLeft) {
            PlaySound(m_soFootL, GenderSound(SOUND_DIVE_L), SOF_3D);
          } else {
            PlaySound(m_soFootR, GenderSound(SOUND_DIVE_R), SOF_3D);
          }
        }
      } else if (bSwimming) {
        if (tmNow>m_tmMoveSound+plr_fSwimSoundDelay) {
          m_tmMoveSound = tmNow;
          m_bMoveSoundLeft = !m_bMoveSoundLeft;
          if (m_bMoveSoundLeft) {
            PlaySound(m_soFootL, GenderSound(SOUND_SWIM_L), SOF_3D);
          } else {
            PlaySound(m_soFootR, GenderSound(SOUND_SWIM_R), SOF_3D);
          }
        }
      }
    
      // if player is almost out of air
      TIME tmBreathDelay = tmNow-en_tmLastBreathed;
      if (en_tmMaxHoldBreath-tmBreathDelay<20.0f) {
        // play drowning sound once in a while
        if (m_tmMouthSoundLast+2.0f<tmNow) {
          m_tmMouthSoundLast = tmNow;
          SetRandomMouthPitch(0.9f, 1.1f);
          PlaySound(m_soMouth, GenderSound(SOUND_DROWN), SOF_3D);
        }
      }

      // animate player
      GetPlayerAnimator()->AnimatePlayer();
    }
  };

  // Round view angle
  void RoundViewAngle(ANGLE &aViewAngle, ANGLE aRound) {
    if (aViewAngle > aRound) {
      aViewAngle = aRound;
    }
    if (aViewAngle < -aRound) {
      aViewAngle = -aRound;
    }
  };

  // Death actions
  void DeathActions(const CPlayerAction &paAction) {
    // set heading, pitch and banking from the normal rotation into the camera view rotation
    if (m_penView!=NULL) {
      ASSERT(IsPredicted()&&m_penView->IsPredicted()||IsPredictor()&&m_penView->IsPredictor()||!IsPredicted()&&!m_penView->IsPredicted()&&!IsPredictor()&&!m_penView->IsPredictor());
      en_plViewpoint.pl_PositionVector = FLOAT3D(0.0f, 1.0f, 0.0f);

      // [Cecil] Removed banking rotation
      en_plViewpoint.pl_OrientationAngle += (ANGLE3D(
        (ANGLE)((FLOAT)paAction.pa_aRotation(1) * _pTimer->TickQuantum),
        (ANGLE)((FLOAT)paAction.pa_aRotation(2) * _pTimer->TickQuantum), 0.0f));
    }

    // [Cecil] Respawn if action is active
    // if death is finished and fire just released again and this is not a predictor
    if (m_iMayRespawn == 2 && (ulReleasedButtons & PLACT_FIRE || IsActionActive()) && !IsPredictor()) {
      // if singleplayer
      if (GetSP()->sp_bSinglePlayer) {
        // load quick savegame
        _pShell->Execute("gam_bQuickLoad=1;");
      // if deathmatch or similar
      } else if( !GetSP()->sp_bCooperative) {
        // rebirth
        SendEvent(EEnd());
      // if cooperative
      } else {
        // if holding down reload button
        if (m_ulLastButtons&PLACT_RELOAD) {
          // forbid respawning in-place
          m_ulFlags &= ~PLF_RESPAWNINPLACE;
        }
        // if playing on credits
        if (GetSP()->sp_ctCredits!=0) {
          // if playing on infinite credits or some credits left
          if (GetSP()->sp_ctCredits==-1 || GetSP()->sp_ctCreditsLeft!=0) {
            // decrement credits
            if (GetSP()->sp_ctCredits!=-1) {
              ((CSessionProperties*)GetSP())->sp_ctCreditsLeft--;
            }

            // initiate respawn
            CPrintF(TRANS("%s is riding the gun again\n"), GetPlayerName());
            SendEvent(EEnd());

            // report number of credits left
            if (GetSP()->sp_ctCredits>0) {
              if (GetSP()->sp_ctCreditsLeft==0) {
                CPrintF(TRANS("  no more credits left!\n"));
              } else {
                CPrintF(TRANS("  %d credits left\n"), GetSP()->sp_ctCreditsLeft);
              }
            }
          // if no more credits left
          } else {
            // report that you cannot respawn
            CPrintF(TRANS("%s rests in peace - out of credits\n"), GetPlayerName());
          }
        }
      }
    }
    // check fire released once after death
    if (m_iMayRespawn==1 && !(ulButtonsNow&PLACT_FIRE)) {
      m_iMayRespawn=2;
    }
  };


  // Buttons actions
  void ButtonsActions(CPlayerAction &paAction) {
    // if selecting a new weapon select it
    if ((ulNewButtons & PLACT_SELECT_WEAPON_MASK) != 0) {
      ESelectWeapon eSelect;
      eSelect.iWeapon = (ulNewButtons & PLACT_SELECT_WEAPON_MASK) >> PLACT_SELECT_WEAPON_SHIFT;

      GetWeapon(0)->SendEvent(eSelect);
    }

    // [Cecil] Pull out extra weapon
    if (ulNewButtons & PLACT_SELECT_MODIFIER) {
      GetInventory()->WeaponSelectionModifier();
    }

    // next weapon zooms out when in sniping mode
    if (ulNewButtons & PLACT_WEAPON_NEXT) {
      if (m_bSniping) {
        ApplySniperZoom(0);

      } else {
        ESelectWeapon eSelect;
        eSelect.iWeapon = -1;
        
        GetWeapon(0)->SendEvent(eSelect);
      }
    }
    
    // previous weapon zooms in when in sniping mode
    if (ulNewButtons & PLACT_WEAPON_PREV) {
      if (m_bSniping) {
        ApplySniperZoom(1);

      } else {
        ESelectWeapon eSelect;
        eSelect.iWeapon = -2;

        GetWeapon(0)->SendEvent(eSelect);
      }
    }

    if (ulNewButtons & PLACT_WEAPON_FLIP) {
      ESelectWeapon eSelect;
      eSelect.iWeapon = -3;

      GetWeapon(0)->SendEvent(eSelect);
    }

    // [Cecil] Extra weapon is selected
    BOOL bExtraWeapon = GetInventory()->UsingDualWeapons();

    // if fire is pressed
    if (ulNewButtons & PLACT_FIRE) {
      GetWeapon(bExtraWeapon)->SendEvent(EFireWeapon());
    }

    // if fire is released
    if (ulReleasedButtons & PLACT_FIRE) {
      GetWeapon(bExtraWeapon)->SendEvent(EReleaseWeapon());
    }

    // [Cecil] Alt fire
    BOOL bExtraFire = FALSE;

    if (GetSP()->AltMode() == 1) {
      // secondary fire on main weapon
      if (!bExtraWeapon) {
        if (ulNewButtons & PLACT_ALTFIRE) {
          GetWeapon(0)->SendEvent(EAltFire());
        }

        if (ulReleasedButtons & PLACT_ALTFIRE) {
          GetWeapon(0)->SendEvent(EReleaseWeapon());
        }

      // primary fire on main weapon
      } else {
        bExtraFire = TRUE;
      }

    // secondary fire on main weapon
    } else if (GetSP()->AltMode() == 2) {
      bExtraFire = TRUE;
    }
    
    // [Cecil] Fire main weapon on alt fire button
    if (bExtraWeapon && bExtraFire) {
      if (ulNewButtons & PLACT_ALTFIRE) {
        GetWeapon(0)->SendEvent(EFireWeapon());
      }

      if (ulReleasedButtons & PLACT_ALTFIRE) {
        GetWeapon(0)->SendEvent(EReleaseWeapon());
      }
    }

    // if reload is pressed
    if (ulReleasedButtons & PLACT_RELOAD) {
      GetWeapon(0)->SendEvent(EReloadWeapon());
      GetWeapon(1)->SendEvent(EReloadWeapon());
    }

    // if fire bomb is pressed
    if (ulNewButtons & PLACT_FIREBOMB) {
      // [Cecil] Use bombs from the inventory
      CPlayerInventory &penInventory = *GetInventory();

      if (penInventory.m_iBombs > 0 && penInventory.m_tmBombFired + 4.0f < _pTimer->CurrentTick()) {
        penInventory.m_iLastBombs = penInventory.m_iBombs;
        penInventory.m_iBombs--;
        penInventory.m_tmBombFired = _pTimer->CurrentTick();
        
        ESeriousBomb esb;
        esb.penOwner = this;

        CEntityPointer penBomb = CreateEntity(GetPlacement(), CLASS_SERIOUSBOMB);
        penBomb->Initialize(esb);
      }
    }

    // [Cecil] Spend tokens
    if (ulNewButtons & PLACT_TOKENS && GetSP()->sp_fComboTime > 0.0f && GetSP()->sp_fTokenPayout > 0.0f) {
      PurchasePowerup();
    }

    // if use is pressed
    if (ulNewButtons & PLACT_USE) {
      if (GetWeapon(0)->GetCurrent() == WEAPON_SNIPER) {
        UsePressed(FALSE);

      } else {
        UsePressed(ulNewButtons & PLACT_COMPUTER);
      }

    // if USE is not detected due to doubleclick and player is holding sniper
    } else if (ulNewButtons & PLACT_SNIPER_USE && GetWeapon(0)->GetCurrent() == WEAPON_SNIPER) {
      UsePressed(FALSE);

    // if computer is pressed
    } else if (ulNewButtons & PLACT_COMPUTER) {
      ComputerPressed();
    }
    
    // if use is being held
    if (ulNewButtons & PLACT_USE_HELD) {
      bUseButtonHeld = TRUE;
    }

    // if use is released
    if (ulReleasedButtons & PLACT_USE_HELD) {
      bUseButtonHeld = FALSE;  
    }

    // if sniper zoomin is pressed
    if (ulNewButtons & PLACT_SNIPER_ZOOMIN) {
      ApplySniperZoom(1);
    }

    // if sniper zoomout is pressed
    if (ulNewButtons & PLACT_SNIPER_ZOOMOUT) {
      ApplySniperZoom(0);
    }

    // if 3rd person view is pressed
    if (ulNewButtons & PLACT_3RD_PERSON_VIEW) {
      ChangePlayerView();
    }

    // apply center view
    if (ulButtonsNow & PLACT_CENTER_VIEW) {
      // center view with speed of 45 degrees per 1/20 seconds
      paAction.pa_aRotation(2) += Clamp( -en_plViewpoint.pl_OrientationAngle(2)/_pTimer->TickQuantum, -900.0f, +900.0f);
    }

    // [Cecil] Voice commands
    if (m_ulButtons1 > 0 && m_fVoiceCommands < _pTimer->CurrentTick()) {
      INDEX iSound = SOUND_SILENCE;
      CTString strCommand = "";
      
      switch (m_ulButtons1) {
        case 1:
          iSound = SOUND_CHEERS1 + (IRnd() % 8);
          strCommand = "Cheers!";
          break;

        case 2:
          iSound = SOUND_DARE1 + (IRnd() % 9);
          strCommand = "Come here!";
          break;

        case 3:
          iSound = SOUND_DOMINATION1 + (IRnd() % 7);
          strCommand = "Take that!";
          break;

        case 4:
          iSound = SOUND_HELP1 + (IRnd() % 7);
          strCommand = "Help!";
          break;
      }

      SetSpeakMouthPitch();
      PlaySound(m_soSpeech, iSound, SOF_3D|SOF_VOLUMETRIC);

      if (strCommand != "") {
        CPrintF("%s^r: %s\n", en_pcCharacter.GetNameForPrinting(), strCommand);
      }

      // set cooldown
      m_fVoiceCommands = _pTimer->CurrentTick() + 2.0f;
    }
  };

  // [Cecil] Apply sniper zoom (moved from PlayerWeapons)
  BOOL SniperZoomDiscrete(INDEX iDirection, BOOL &bZoomChanged) {
    bZoomChanged = FALSE;

    // zoom in one zoom level
    if (iDirection > 0) {
      for (INDEX i = 0; i < _iSniperDiscreteZoomLevels; i++) {
        if (_afSniperZoom[2 * i] < m_fSniperFOV) {
          m_fSniperFOV = _afSniperZoom[2 * i];
          m_fLastSniperFOV = m_fSniperFOV;

          bZoomChanged = TRUE;
          break;
        }
      }

    // zoom out one zoom level
    } else {
      for (INDEX i = _iSniperDiscreteZoomLevels; i > 0; i--) {
        if (_afSniperZoom[2 * i] > m_fSniperFOV) {
          m_fSniperFOV = _afSniperZoom[2 * i];
          m_fLastSniperFOV = m_fSniperFOV;

          bZoomChanged = TRUE;
          break;
        }
      }
    }

    m_bSniping = (m_fSniperFOV < 90.0f);
    return m_bSniping;
  };

  void ApplySniperZoom(BOOL bZoomIn) {
    // do nothing if not holding sniper and if not in sniping mode
    if (GetWeapon(0)->GetCurrent() != WEAPON_SNIPER || m_bSniping == FALSE) {
      return;
    }

    BOOL bZoomChanged;

    if (SniperZoomDiscrete(bZoomIn, bZoomChanged)) {
      if (bZoomChanged) { 
        PlaySound(m_soSniperZoom, SOUND_SNIPER_QZOOM, SOF_3D); 
      }
      m_ulFlags |= PLF_ISZOOMING;

    } else {
      m_ulFlags &= ~PLF_ISZOOMING;

      PlaySound(m_soSniperZoom, SOUND_SILENCE, SOF_3D);
      if(_pNetwork->IsPlayerLocal(this)) {IFeel_StopEffect("SniperZoom");}
    }
  };

  // check if cheats can be active
  BOOL CheatsEnabled(void) {
    return (GetSP()->sp_ctMaxPlayers == 1 || GetSP()->sp_bQuickTest) && GetAction() == NULL;
  };

  // Cheats
  void Cheats(void) {
    BOOL bFlyOn = cht_bFly || cht_bGhost;
    // fly mode
    BOOL bIsFlying = !(GetPhysicsFlags() & EPF_TRANSLATEDBYGRAVITY);
    if (bFlyOn && !bIsFlying) {
      SetPhysicsFlags(GetPhysicsFlags() & ~(EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY));
      en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);
    } else if (!bFlyOn && bIsFlying) {
      SetPhysicsFlags(GetPhysicsFlags() | EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY);
      en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);
    }

    // ghost mode
    BOOL bIsGhost = !(GetCollisionFlags() & ((ECBI_BRUSH|ECBI_MODEL)<<ECB_TEST));
    if (cht_bGhost && !bIsGhost) {
      SetCollisionFlags(GetCollisionFlags() & ~((ECBI_BRUSH|ECBI_MODEL)<<ECB_TEST));
    } else if (!cht_bGhost && bIsGhost) {
      SetCollisionFlags(GetCollisionFlags() | ((ECBI_BRUSH|ECBI_MODEL)<<ECB_TEST));
    }

    // [Cecil] Invisibility active
    if (cht_bInvisible || GetInventory()->IsPowerupActive(PUIT_INVISIB)) {
      SetFlags(GetFlags() | ENF_INVISIBLE);
    } else {
      SetFlags(GetFlags() & ~ENF_INVISIBLE);
    }

    // cheat
    if (cht_bGiveAll) {
      cht_bGiveAll = FALSE;
      GetInventory()->CheatGiveAll();
    }

    if (cht_bKillAll) {
      cht_bKillAll = FALSE;
      KillAllEnemies(this);
    }

    if (cht_bOpen) {
      cht_bOpen = FALSE;
      GetWeapon(0)->CheatOpen();
    }
    
    if (cht_bAllMessages) {
      cht_bAllMessages = FALSE;
      CheatAllMessages();
    }
    
    if (cht_bRefresh) {
      cht_bRefresh = FALSE;
      SetHealth(TopHealth());
    }
  };

  // Get current placement that the player views from in absolute space.
  void GetLerpedAbsoluteViewPlacement(CPlacement3D &plView) {
    if (!(m_ulFlags&PLF_INITIALIZED)) {
      plView = GetPlacement();
      _bDiscard3rdView=FALSE;
      return;
    }

    BOOL bSharpTurning = 
      (GetSettings()->ps_ulFlags&PSF_SHARPTURNING) &&
      _pNetwork->IsPlayerLocal((CPlayer*)GetPredictionTail());

    // lerp player viewpoint
    FLOAT fLerpFactor = _pTimer->GetLerpFactor();
    plView.Lerp(en_plLastViewpoint, en_plViewpoint, fLerpFactor);

    // moving banking and soft eyes
    GetPlayerAnimator()->ChangeView(plView);
    // body and head attachment animation
    GetPlayerAnimator()->BodyAndHeadOrientation(plView);

    // return player eyes view
    if (m_iViewState == PVT_PLAYEREYES || _bDiscard3rdView) {
      CPlacement3D plPosLerped = GetLerpedPlacement();
      if (bSharpTurning) {
        // get your prediction tail
        CPlayer *pen = (CPlayer*)GetPredictionTail();

        // add local rotation
        if (m_ulFlags & PLF_ISZOOMING) {
          FLOAT fRotationDamping = m_fSniperFOV / m_fSniperMaxFOV;
          plView.pl_OrientationAngle = pen->en_plViewpoint.pl_OrientationAngle + (pen->m_aLocalRotation-pen->m_aLastRotation) * fRotationDamping;

        } else {
          plView.pl_OrientationAngle = pen->en_plViewpoint.pl_OrientationAngle + (pen->m_aLocalRotation-pen->m_aLastRotation);
        }
        
        // [Cecil] Removed banking rotation
        // make sure it doesn't go out of limits
        RoundViewAngle(plView.pl_OrientationAngle(2), PITCH_MAX);

        // compensate for rotations that happen to the player without his/hers will
        // (rotating brushes, weird gravities...)
        // (these need to be lerped)
        ANGLE3D aCurr = pen->GetPlacement().pl_OrientationAngle;
        ANGLE3D aLast = pen->en_plLastPlacement.pl_OrientationAngle;
        ANGLE3D aDesired = pen->en_aDesiredRotationRelative*_pTimer->TickQuantum;
        FLOATmatrix3D mCurr;      MakeRotationMatrixFast(mCurr, aCurr);
        FLOATmatrix3D mLast;      MakeRotationMatrixFast(mLast, aLast);
        FLOATmatrix3D mDesired;   MakeRotationMatrixFast(mDesired, aDesired);
        mDesired = en_mRotation*(mDesired*!en_mRotation);
        FLOATmatrix3D mForced = !mDesired*mCurr*!mLast; // = aCurr-aLast-aDesired;
        ANGLE3D aForced; DecomposeRotationMatrixNoSnap(aForced, mForced);
        if (aForced.MaxNorm()<1E-2) {
          aForced = ANGLE3D(0.0f, 0.0f, 0.0f);
        }
        FLOATquat3D qForced; qForced.FromEuler(aForced);
        FLOATquat3D qZero;   qZero.FromEuler(ANGLE3D(0.0f, 0.0f, 0.0f));
        FLOATquat3D qLerped = Slerp(fLerpFactor, qZero, qForced);
        FLOATmatrix3D m;
        qLerped.ToMatrix(m);
        m=m*mDesired*mLast;
        DecomposeRotationMatrixNoSnap(plPosLerped.pl_OrientationAngle, m);
      }
      plView.RelativeToAbsoluteSmooth(plPosLerped);
    // 3rd person view
    } else if (m_iViewState == PVT_3RDPERSONVIEW) {
      plView = m_pen3rdPersonView->GetLerpedPlacement();
    // camera view for player auto actions
    } else if (m_iViewState == PVT_PLAYERAUTOVIEW) {
      plView = m_penView->GetLerpedPlacement();
    // camera view for stored sequences
    } else {
      ASSERTALWAYS("Unknown player view");
    }
    _bDiscard3rdView=FALSE;
  };

  // Get current entity that the player views from.
  CEntity *GetViewEntity(void) {
    // player eyes
    if (m_iViewState == PVT_PLAYEREYES) {
      return this;
    // 3rd person view
    } else if (m_iViewState == PVT_3RDPERSONVIEW) {
      if (m_ulFlags&PLF_ISZOOMING) {
        return this;
      }
      if (((CPlayerView&)*m_pen3rdPersonView).m_fDistance>2.0f) {
        return m_pen3rdPersonView;
      } else {
        return this;
      }
    // camera
    } else if (m_iViewState == PVT_PLAYERAUTOVIEW) {
      if (((CPlayerView&)*m_penView).m_fDistance>2.0f) {
        return m_penView;
      } else {
        return this;
      }
    // invalid view
    } else {
      ASSERTALWAYS("Unknown player view");
      return NULL;
    }
  };

  void RenderChainsawParticles(BOOL bThird)
  {
    FLOAT fStretch=1.0f;
    if( bThird)
    {
      fStretch=0.4f;
    }
    // render chainsaw cutting brush particles
    FLOAT tmNow = _pTimer->GetLerpedCurrentTick();
    for( INDEX iSpray=0; iSpray<MAX_BULLET_SPRAYS; iSpray++)
    {
      BulletSprayLaunchData &bsld = m_absldData[iSpray];
      FLOAT fLife=1.25f;
      if( tmNow > (bsld.bsld_tmLaunch+fLife)) { continue;}
      Particles_BulletSpray(bsld.bsld_iRndBase, bsld.bsld_vPos, bsld.bsld_vG,
        bsld.bsld_eptType, bsld.bsld_tmLaunch, bsld.bsld_vStretch*fStretch, 1.0f);
    }

    // render chainsaw cutting model particles
    for( INDEX iGore=0; iGore<MAX_GORE_SPRAYS; iGore++)
    {
      GoreSprayLaunchData &gsld = m_agsldData[iGore];
      FLOAT fLife=2.0f;
      if( tmNow > (gsld.gsld_tmLaunch+fLife)) { continue;}
      FLOAT3D vPos=gsld.gsld_vPos;
      if( bThird)
      {
        vPos=gsld.gsld_v3rdPos;
      }
      Particles_BloodSpray(gsld.gsld_sptType, vPos, gsld.gsld_vG, gsld.gsld_fGA,
        gsld.gsld_boxHitted, gsld.gsld_vSpilDirection,
        gsld.gsld_tmLaunch, gsld.gsld_fDamagePower*fStretch, gsld.gsld_colParticles);
    }
  }

  // Draw player interface on screen.
  void RenderHUD(CPerspectiveProjection3D &prProjection, CDrawPort *pdp,
                 FLOAT3D vViewerLightDirection, COLOR colViewerLight, COLOR colViewerAmbient,
                 BOOL bRenderWeapon, INDEX iEye,
                 // [Cecil] Pass it here
                 CPlacement3D &plAbsoluteLerpedView)
  {
    CPlacement3D plViewOld = prProjection.ViewerPlacementR();

    // render weapon models if needed
    BOOL bRenderModels = _pShell->GetINDEX("gfx_bRenderModels");

    // do not render weapon if sniping
    if (hud_bShowWeapon && bRenderModels && !m_bSniping) {
      // render weapons only if view is from player eyes
      GetWeapon(0)->RenderWeaponModel(prProjection, pdp, vViewerLightDirection, colViewerLight, colViewerAmbient, bRenderWeapon, iEye);
      GetWeapon(1)->RenderWeaponModel(prProjection, pdp, vViewerLightDirection, colViewerLight, colViewerAmbient, bRenderWeapon, iEye);
    }

    // if is first person
    if (m_iViewState == PVT_PLAYEREYES) {
      prProjection.ViewerPlacementL() = plViewOld;
      prProjection.Prepare();
      CAnyProjection3D apr;
      apr = prProjection;
      Stereo_AdjustProjection(*apr, iEye, 1);
      Particle_PrepareSystem(pdp, apr);
      Particle_PrepareEntity( 2.0f, FALSE, FALSE, this);
      RenderChainsawParticles(FALSE);
      Particle_EndSystem();
    }

    // [Cecil] Render player tags
    RenderPlayerTags(prProjection, pdp, plAbsoluteLerpedView);

    // render crosshair if sniper zoom not active
    CPlacement3D plView;

    if (m_iViewState == PVT_PLAYEREYES) {
      // player view
      plView = en_plViewpoint;
      plView.RelativeToAbsolute(GetPlacement());

    } else if (m_iViewState == PVT_3RDPERSONVIEW) {
      // camera view
      plView = ((CPlayerView&)*m_pen3rdPersonView).GetPlacement();
    }

    if (!m_bSniping) {
      GetWeapon(0)->RenderCrosshair(prProjection, pdp, plView);
    }

    // get your prediction tail
    CPlayer *pen = (CPlayer*)GetPredictionTail();
    // do screen blending
    ULONG ulR = 255, ulG = 0, ulB = 0; // red for wounding
    ULONG ulA = pen->m_fDamageAmmount*5.0f;
    
    // if less than few seconds elapsed since last damage
    FLOAT tmSinceWounding = _pTimer->CurrentTick() - pen->m_tmWoundedTime;

    if (tmSinceWounding < 4.0f) {
      // decrease damage ammount
      if (tmSinceWounding < 0.001f) {
        ulA = (ulA + 64) / 2;
      }
    }

    // [Cecil] Blood screen
    if (amp_bBloodScreen) {
      // add rest of blend ammount
      ulA = ClampUp(ulA, (ULONG)224);

      if (m_iViewState == PVT_PLAYEREYES) {
        pdp->dp_ulBlendingRA += ulR*ulA;
        pdp->dp_ulBlendingGA += ulG*ulA;
        pdp->dp_ulBlendingBA += ulB*ulA;
        pdp->dp_ulBlendingA  += ulA;
      }
    }

    // add world glaring
    {
      COLOR colGlare = GetWorldGlaring();
      UBYTE ubR, ubG, ubB, ubA;
      ColorToRGBA(colGlare, ubR, ubG, ubB, ubA);
      if (ubA!=0) {
        pdp->dp_ulBlendingRA += ULONG(ubR)*ULONG(ubA);
        pdp->dp_ulBlendingGA += ULONG(ubG)*ULONG(ubA);
        pdp->dp_ulBlendingBA += ULONG(ubB)*ULONG(ubA);
        pdp->dp_ulBlendingA  += ULONG(ubA);
      }
    }

    // do all queued screen blendings
    pdp->BlendScreen();

    // render status info line (if needed)
    if (hud_bShowInfo) { 
      // get player or its predictor
      BOOL bSnooping = FALSE;
      CPlayer *penHUDPlayer = this;
      CPlayer *penHUDOwner  = this;

      if (penHUDPlayer->IsPredicted()) {
        penHUDPlayer = (CPlayer *)penHUDPlayer->GetPredictor();
      }

      // check if snooping is needed
      CPlayerWeapons *pen = (CPlayerWeapons*)&*penHUDPlayer->GetWeapon(0);

      TIME tmDelta = _pTimer->CurrentTick() - pen->m_tmSnoopingStarted;
      if (tmDelta < plr_tmSnoopingTime) {
        ASSERT(pen->m_penTargeting!=NULL);
        penHUDPlayer = (CPlayer*)&*pen->m_penTargeting;
        bSnooping = TRUE;
      }

      DrawHUD(penHUDPlayer, pdp, bSnooping, penHUDOwner);
    }
  }

  // try to find start marker for deathmatch (re)spawning
  CEntity *GetDeathmatchStartMarker(void)
  {
    // get number of markers
    CTString strPlayerStart = "Player Start - ";
    INDEX ctMarkers = _pNetwork->GetNumberOfEntitiesWithName(strPlayerStart);
    // if none
    if (ctMarkers==0) {
      // fail
      return NULL;
    }
    // if only one
    if (ctMarkers==1) {
      // get that one
      return _pNetwork->GetEntityWithName(strPlayerStart, 0);
    }
    // if at least two markers found...

    // create tables of markers and their distances from players
    CStaticArray<MarkerDistance> amdMarkers;
    amdMarkers.New(ctMarkers);
    // for each marker
    {for(INDEX iMarker=0; iMarker<ctMarkers; iMarker++) {
      amdMarkers[iMarker].md_ppm = (CPlayerMarker*)_pNetwork->GetEntityWithName(strPlayerStart, iMarker);
      if (amdMarkers[iMarker].md_ppm==NULL) {
        return NULL;  // (if there is any invalidity, fail completely)
      }
      // get min distance from any player
      FLOAT fMinD = UpperLimit(0.0f);
      for (INDEX iPlayer=0; iPlayer<GetMaxPlayers(); iPlayer++) {
        CPlayer *ppl = (CPlayer *)&*GetPlayerEntity(iPlayer);
        if (ppl==NULL) { 
          continue;
        }
        FLOAT fD = 
          (amdMarkers[iMarker].md_ppm->GetPlacement().pl_PositionVector-
           ppl->GetPlacement().pl_PositionVector).Length();
        if (fD<fMinD) {
          fMinD = fD;
        }
      }
      amdMarkers[iMarker].md_fMinD = fMinD;
    }}

    // now sort the list
    qsort(&amdMarkers[0], ctMarkers, sizeof(amdMarkers[0]), &qsort_CompareMarkerDistance);
    ASSERT(amdMarkers[0].md_fMinD>=amdMarkers[ctMarkers-1].md_fMinD);
    // choose marker among one of the 50% farthest
    INDEX ctFarMarkers = ctMarkers/2;
    ASSERT(ctFarMarkers>0);
    INDEX iStartMarker = IRnd()%ctFarMarkers;
    // find first next marker that was not used lately
    INDEX iMarker=iStartMarker;
    FOREVER{
      if (_pTimer->CurrentTick()>amdMarkers[iMarker].md_ppm->m_tmLastSpawned+1.0f) {
        break;
      }
      iMarker = (iMarker+1)%ctMarkers;
      if (iMarker==iStartMarker) {
        break;
      }
    }
    // return that
    return amdMarkers[iMarker].md_ppm;
  }

  void InitializePlayer() {
    // set viewpoint position inside the entity
    en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);
    en_plViewpoint.pl_PositionVector = FLOAT3D(0.0f, plr_fViewHeightStand, 0.0f);
    en_plLastViewpoint = en_plViewpoint;

    // clear properties
    m_ulFlags &= PLF_INITIALIZED|PLF_LEVELSTARTED|PLF_RESPAWNINPLACE;  // must not clear initialized flag
    m_fFallTime = 0.0f;
    m_pstState = PST_STAND;
    m_fDamageAmmount = 0.0f;
    m_tmWoundedTime = 0.0f;

    // [Cecil] Reset powerup timers
    GetInventory()->ResetPowerups();

    // [Cecil] Stop water ambience sound
    m_soLocalAmbientLoop.Stop();

    // initialize animator
    GetPlayerAnimator()->Initialize();
    // restart weapons if needed
    GetWeapon(0)->SendEvent(EStart());
    GetWeapon(1)->SendEvent(EStart());

    // initialise last positions for particles
    Particles_AfterBurner_Prepare(this);

    // set flags
    SetPhysicsFlags(EPF_MODEL_WALKING|EPF_HASLUNGS);
    
    // [Cecil] Turn off collision if needed
    if (SPWorld() && GetSP()->sp_iPlayerCollision != 0) {
      SetCollisionFlags(ECF_MODEL | ((ECBI_PLAYER)<<ECB_IS) | ((ECBI_PLAYER)<<ECB_PASS));
    } else {
      SetCollisionFlags(ECF_MODEL | ((ECBI_PLAYER)<<ECB_IS));
    }

    SetFlags(GetFlags() | ENF_ALIVE);
    // animation
    PlayLegsAnim(PLAYER_ANIM_STAND, AOF_LOOPING);
    TeleportPlayer(WLT_FIXED);
  };

  // [Cecil] Add Y offset
  FLOAT3D GetTeleportingOffset(BOOL bAddY) {
    // find player index
    INDEX iPlayer = GetMyPlayerIndex();

    // create offset from marker
    const FLOAT fOffsetY = 0.1f * bAddY;  // how much to offset up (as precaution not to spawn in floor)
    //FLOAT3D vOffsetRel = FLOAT3D(0.0f, fOffsetY, 0.0f);

    // [Cecil] No offset on singleplayer maps or if ignoring collision
    if (GetSP()->sp_bSinglePlayer || (SPWorld() && (GetSP()->sp_iPlayerCollision != 0 || GLOBAL_CONTROLLER->IsActor(this)))) {
      return FLOAT3D(0.0f, fOffsetY, 0.0f);
    }

    // [Cecil] For cooperative mode
    if (GetSP()->sp_bCooperative) {
      FLOAT fRow = floor(FLOAT(iPlayer) / 4.0f);
      FLOAT fCol = FLOAT(iPlayer % 4);

      // [Cecil] Standard offset in coop maps
      if (!SPWorld()) {
        return FLOAT3D(-3.0f + fCol*2.0f, fOffsetY, -3.0f + fRow*2.0f);
      }
      
      // [Cecil] Put players closer on singleplayer maps
      return FLOAT3D(-0.75f + fCol*0.5f, fOffsetY, -0.75f + fRow*0.5f);
    }

    return FLOAT3D(0.0f, fOffsetY, 0.0f);
  };

  void RemapLevelNames(INDEX &iLevel) {
    switch (iLevel) {
      case 10:
        iLevel = 1;
        break;
      case 11:
        iLevel = 2;
        break;
      case 12:
        iLevel = 3;
        break;
      case 13:
        iLevel = 4;
        break;
      case 14:
        iLevel = 5;
        break;
      case 15:
        iLevel = 6;
        break;
      case 21:
        iLevel = 7;
        break;
      case 22:
        iLevel = 8;
        break;
      case 23:
        iLevel = 9;
        break;
      case 24:
        iLevel = 10;
        break;
      case 31:
        iLevel = 11;
        break;
      case 32:
        iLevel = 12;
        break;
      case 33:
        iLevel = 13;
        break;
      default:
        iLevel = -1;
        break;
    }
  }
  
  
  void TeleportPlayer(enum WorldLinkType EwltType) {
    INDEX iLevel = -1;
    CTString strLevelName = GetWorld()->wo_fnmFileName.FileName();
    
    //strLevelName.ScanF("%02d_", &iLevel);
    INDEX u, v;
    u = v = -1;
    strLevelName.ScanF("%01d_%01d_", &u, &v);
    iLevel = u*10+v;
    
    RemapLevelNames(iLevel);
            
    if (iLevel > 0) {
      ((CSessionProperties*)GetSP())->sp_ulLevelsMask |= 1 << (iLevel-1);
    }

    // find player index
    INDEX iPlayer = GetMyPlayerIndex();
    // player placement
    CPlacement3D plSet = GetPlacement();
    // [Cecil] No telefrag
    // teleport in dummy space
    Teleport(CPlacement3D(FLOAT3D(32000.0f + 100.0f*iPlayer, 32000.0f, 0), ANGLE3D(0.0f, 0.0f, 0.0f)), FALSE);
    // force yourself to standing state
    ForceCollisionBoxIndexChange(PLAYER_COLLISION_BOX_STAND);
    en_plViewpoint.pl_PositionVector(2) = plr_fViewHeightStand;
    GetPlayerAnimator()->m_bDisableAnimating = FALSE;
    GetPlayerAnimator()->Stand();
    m_pstState = PST_STAND;

    // create offset from marker
    FLOAT3D vOffsetRel = GetTeleportingOffset(TRUE);

    // no player start initially
    BOOL bSetHealth = FALSE;      // for getting health from marker
    BOOL bAdjustHealth = FALSE;   // for getting adjusting health to 50-100 interval
    CEntity *pen = NULL;

    if (GetSP()->sp_bCooperative) {
      if (cht_iGoToMarker >= 0) {
        // try to find fast go marker
        CTString strPlayerStart;
        strPlayerStart.PrintF("Player Start - %d", (INDEX)cht_iGoToMarker);
        pen = _pNetwork->GetEntityWithName(strPlayerStart, 0);
        pen->SendEvent(ETrigger());
        cht_iGoToMarker = -1;
        bSetHealth = TRUE;
        bAdjustHealth = FALSE;

      // if there is coop respawn marker
      } else if (m_penMainMusicHolder != NULL && !(m_ulFlags & PLF_CHANGINGLEVEL)) {
        CMusicHolder *pmh = (CMusicHolder *)&*m_penMainMusicHolder;
        if (pmh->m_penRespawnMarker != NULL) {
          // get it
          pen = pmh->m_penRespawnMarker;
          bSetHealth = TRUE;
          bAdjustHealth = FALSE;
        }
      }

      // if quick start is enabled (in wed)
      if (pen == NULL && GetSP()->sp_bQuickTest && m_strGroup == "") {
        // try to find quick start marker
        CTString strPlayerStart;
        strPlayerStart.PrintF("Player Quick Start");
        pen = _pNetwork->GetEntityWithName(strPlayerStart, 0);
        bSetHealth = TRUE;
        bAdjustHealth = FALSE;
      }

      // if no start position yet
      if (pen == NULL) {
        // try to find normal start marker
        CTString strPlayerStart;
        strPlayerStart.PrintF("Player Start - %s", m_strGroup);
        pen = _pNetwork->GetEntityWithName(strPlayerStart, 0);
        if (m_strGroup == "") {
          bSetHealth = TRUE;
          bAdjustHealth = FALSE;
        } else {
          if (EwltType == WLT_FIXED) {
            bSetHealth = FALSE;
            bAdjustHealth = TRUE;
          } else {
            bSetHealth = FALSE;
            bAdjustHealth = FALSE;
          }
        }
      }

      // if no start position yet
      if (pen == NULL) {
        // try to find normal start marker without group anyway
        CTString strPlayerStart;
        strPlayerStart.PrintF("Player Start - ");
        pen = _pNetwork->GetEntityWithName(strPlayerStart, 0);
        bSetHealth = TRUE;
        bAdjustHealth = FALSE;
      }

    } else {
      bSetHealth = TRUE;
      bAdjustHealth = FALSE;
      // try to find start marker by random
      pen = GetDeathmatchStartMarker();

      if (pen != NULL) {
        ((CPlayerMarker&)*pen).m_tmLastSpawned = _pTimer->CurrentTick();
      }
    }

    // if respawning in place
    if ((m_ulFlags&PLF_RESPAWNINPLACE) && pen != NULL && !((CPlayerMarker*)&*pen)->m_bNoRespawnInPlace) {
      m_ulFlags &= ~PLF_RESPAWNINPLACE;
      // set default params
      SetHealth(TopHealth());

      m_iMana  = GetSP()->sp_iInitialMana;
      m_fArmor = 0.0f;

      // [Cecil] No telefrag
      // teleport where you were when you were killed
      Teleport(CPlacement3D(m_vDied, m_aDied), FALSE);

    // if start marker is found
    } else if (pen != NULL) {
      // if there is no respawn marker yet
      if (m_penMainMusicHolder != NULL) {
        CMusicHolder *pmh = (CMusicHolder *)&*m_penMainMusicHolder;
        if (pmh->m_penRespawnMarker == NULL) {
          // set it
          pmh->m_penRespawnMarker = pen;
        }
      }

      CPlayerMarker &penStart = (CPlayerMarker&)*pen;

      // set player characteristics
      if (bSetHealth) {
        SetHealth(penStart.m_fHealth/100.0f*TopHealth());
        m_iMana  = GetSP()->sp_iInitialMana;
        m_fArmor = penStart.m_fShield;

      } else if (bAdjustHealth) {
        FLOAT fHealth = GetHealth();
        FLOAT fTopHealth = TopHealth();
        if (fHealth < fTopHealth) {
          SetHealth(ClampUp(fHealth+fTopHealth/2.0f, fTopHealth));
        }
      }

      // if should start in computer
      if (penStart.m_bStartInComputer && GetSP()->sp_bSinglePlayer) {
        // mark that
        if (_pNetwork->IsPlayerLocal(this)) {
          cmp_ppenPlayer = this;
        }
        cmp_bInitialStart = TRUE;
      }

      // start with first message linked to the marker
      CMessageHolder *penMessage = (CMessageHolder *)&*penStart.m_penMessage;
      // while there are some messages to add
      while (penMessage!=NULL && IsOfClass(penMessage, "MessageHolder")) {
        const CTFileName &fnmMessage = penMessage->m_fnmMessage;
        // if player doesn't have that message in database
        if (!HasMessage(fnmMessage)) {
          // add the message
          ReceiveComputerMessage(fnmMessage, 0);
        }
        // go to next message holder in list
        penMessage = (CMessageHolder *)&*penMessage->m_penNext;
      }

      // set weapons
      if (!GetSP()->sp_bCooperative) {
        GetInventory()->InitWeapons(penStart.m_iGiveWeapons, 0, 0, penStart.m_fMaxAmmoRatio);

      } else {
        GetInventory()->InitWeapons(penStart.m_iGiveWeapons, penStart.m_iTakeWeapons, penStart.m_iTakeAmmo, penStart.m_fMaxAmmoRatio);
      }

      // start position relative to link
      if (EwltType == WLT_RELATIVE) {
        plSet.AbsoluteToRelative(_SwcWorldChange.plLink);   // relative to link position
        plSet.RelativeToAbsolute(penStart.GetPlacement());  // absolute to start marker position

        // [Cecil] No telefrag
        Teleport(plSet, FALSE);
      // fixed start position
      } else if (EwltType == WLT_FIXED) {
        CPlacement3D plNew = penStart.GetPlacement();
        vOffsetRel *= penStart.en_mRotation;
        plNew.pl_PositionVector += vOffsetRel;

        // [Cecil] No telefrag
        Teleport(plNew, FALSE);
      // error -> teleport to zero
      } else {
        ASSERTALWAYS("Unknown world link type");

        // [Cecil] No telefrag
        Teleport(CPlacement3D(vOffsetRel, ANGLE3D(0.0f, 0.0f, 0.0f)), FALSE);
      }

      // [Cecil] Trigger the start target
      if (!IsPredictor()) {
        penStart.TriggerTarget(this);
      }

    // default start position
    } else {
      // set player characteristics
      SetHealth(TopHealth());

      m_iMana = GetSP()->sp_iInitialMana;
      m_fArmor = 0.0f;

      // set weapons
      GetInventory()->InitWeapons(0, 0, 0, 0);

      // start position
      Teleport(CPlacement3D(vOffsetRel, ANGLE3D(0.0f, 0.0f, 0.0f)));
    }

    // send teleport event to all entities in range
    SendEventInRange(ETeleport(), FLOATaabbox3D(GetPlacement().pl_PositionVector, 200.0f));

    // stop moving
    ForceFullStop();

    // remember maximum health
    m_fMaxHealth = TopHealth();

    // if in singleplayer mode
    if (GetSP()->sp_bSinglePlayer && GetSP()->sp_gmGameMode != CSessionProperties::GM_FLYOVER) {
      CWorldSettingsController *pwsc = GetWSC(this);
      if (pwsc!=NULL && pwsc->m_bNoSaveGame) {
        NOTHING;
      } else {
        // save quick savegame
        _pShell->Execute("gam_bQuickSave=1;");
      }
    }

    // remember level start time
    if (!(m_ulFlags&PLF_LEVELSTARTED)) {
      m_ulFlags |= PLF_LEVELSTARTED;
      m_tmLevelStarted = _pNetwork->GetGameTime();
    }

    // reset model appearance
    CTString strDummy;
    SetPlayerAppearance(GetModelObject(), NULL, strDummy, /*bPreview=*/FALSE);
    ValidateCharacter();
    SetPlayerAppearance(&m_moRender, &en_pcCharacter, strDummy, /*bPreview=*/FALSE);
    ParseGender(strDummy);

    GetPlayerAnimator()->SetWeapon(FALSE);
    GetPlayerAnimator()->SetWeapon(TRUE);
    m_ulFlags |= PLF_SYNCWEAPON;

    // spawn teleport effect
    SpawnTeleport();

    // return from editor model (if was fragged into pieces)
    SwitchToModel();
    m_tmSpawned = _pTimer->CurrentTick();

    // [Cecil] Remember spawn point
    m_vSpawnPoint = GetPlacement().pl_PositionVector;

    en_tmLastBreathed = _pTimer->CurrentTick()+0.1f;  // do not take breath when spawned in air
  };

  // note: set estimated time in advance
  void RecordEndOfLevelData(void)
  {
    // must not be called multiple times
    ASSERT(!m_bEndOfLevel);
    // clear analyses message
    m_tmAnalyseEnd = 0;
    m_bPendingMessage = FALSE;
    m_tmMessagePlay = 0;
    // mark end of level
    m_iMayRespawn = 0;
    m_bEndOfLevel = TRUE;
    // remember end time
    time(&m_iEndTime);
    // add time score
    TIME tmLevelTime = _pTimer->CurrentTick()-m_tmLevelStarted;
    m_psLevelStats.ps_tmTime = tmLevelTime;
    m_psGameStats.ps_tmTime += tmLevelTime;
    FLOAT fTimeDelta = ClampDn(FLOAT(floor(m_tmEstTime) - floor(tmLevelTime)), 0.0f);
    m_iTimeScore = floor(fTimeDelta*100.0f);
    m_psLevelStats.ps_iScore+=m_iTimeScore;
    m_psGameStats.ps_iScore+=m_iTimeScore;

    // record stats for this level and add to global table
    CTString strStats;
    strStats.PrintF(TRANS("%s\n  Time:   %s\n  Score: %9d\n  Kills:   %03d/%03d\n  Secrets:   %02d/%02d\n"), 
        TranslateConst(en_pwoWorld->GetName(), 0), TimeToString(tmLevelTime), 
        m_psLevelStats.ps_iScore,
        m_psLevelStats.ps_iKills, m_psLevelTotal.ps_iKills,
        m_psLevelStats.ps_iSecrets, m_psLevelTotal.ps_iSecrets);
    m_strLevelStats += strStats;
  }

  // spawn teleport effect
  void SpawnTeleport(void) {
    // if in singleplayer
    if (GetSP()->sp_bSinglePlayer) {
      // no spawn effects
      return;
    }

    ESpawnEffect ese;
    ese.colMuliplier = C_WHITE|CT_OPAQUE;
    ese.betType = BET_TELEPORT;
    ese.vNormal = FLOAT3D(0,1,0);
    FLOATaabbox3D box;
    GetBoundingBox(box);
    FLOAT fEntitySize = box.Size().MaxNorm()*2;
    ese.vStretch = FLOAT3D(fEntitySize, fEntitySize, fEntitySize);
    CEntityPointer penEffect = CreateEntity(GetPlacement(), CLASS_BASIC_EFFECT);
    penEffect->Initialize(ese);
  };

  // render particles
  void RenderParticles(void) {
    FLOAT tmNow = _pTimer->GetLerpedCurrentTick();
    
    // render empty shells
    Particles_EmptyShells( this, m_asldData);

    if (Particle_GetViewer()==this) {
      Particles_ViewerLocal(this);
    }
    else
    {
      // if is not first person
      RenderChainsawParticles(TRUE);

      // glowing powerups
      if (IsAlive(this)){
        // [Cecil] Powerup particles
        GetInventory()->PowerupParticles(this, GetModelForRendering(), GetLerpedPlacement(), FLOAT2D(0.15f, 0.03f));

        if (!GetSP()->sp_bCooperative) {
          CPlayerWeapons *wpn = GetWeapon(0);

          if (m_tmLastSniperFire == _pTimer->CurrentTick()) {
            CAttachmentModelObject &amoBody = *GetModelObject()->GetAttachmentModel(PLAYER_ATTACHMENT_TORSO);
            FLOATmatrix3D m;
            MakeRotationMatrix(m, amoBody.amo_plRelative.pl_OrientationAngle);

            FLOAT3D vSource = wpn->m_vBulletSource + FLOAT3D(0.0f, 0.1f, -0.4f) * GetRotationMatrix() * m;
            Particles_SniperResidue(this, vSource , wpn->m_vBulletTarget);
          }
        }
      }
    }
            
    // spirit particles
    if( m_tmSpiritStart != 0.0f)
    {
      Particles_Appearing(this, m_tmSpiritStart);
    }
  }

  // [Cecil] Replaced CPlayerActionMarker with CEntity, added everyone flag
  void TeleportToAutoMarker(CEntity *penMarker, BOOL bEveryone) 
  {
    // [Cecil] Allow teleporting everyone
    if (GetSP()->sp_bCooperative && (!SPWorld() || bEveryone)) {
      // for each player
      for (INDEX iPlayer = 0; iPlayer < GetMaxPlayers(); iPlayer++) {
        CEntity *penPlayer = GetPlayerEntity(iPlayer);

        // [Cecil] Assert player existence
        if (ASSERT_ENTITY(penPlayer)) {
          CPlayer *ppl = (CPlayer*)penPlayer;

          // put it at marker
          CPlacement3D pl = penMarker->GetPlacement();
          FLOAT3D vOffsetRel = ppl->GetTeleportingOffset(TRUE);

          pl.pl_PositionVector += vOffsetRel * penMarker->en_mRotation;
          ppl->Teleport(pl, FALSE);

          // remember new respawn place
          ppl->m_vDied = pl.pl_PositionVector;
          ppl->m_aDied = pl.pl_OrientationAngle;

          // [Cecil] New spawn point for dead players
          if (!IsAlive(penPlayer)) {
            ppl->m_vSpawnPoint = pl.pl_PositionVector;
          }
        }
      }

    // otherwise
    } else {
      // put yourself at marker
      CPlacement3D pl = penMarker->GetPlacement();
      FLOAT3D vOffsetRel = GetTeleportingOffset(TRUE);

      pl.pl_PositionVector += vOffsetRel * penMarker->en_mRotation;
      Teleport(pl, FALSE);
    }
  };

  // check whether this time we respawn in place or on marker
  void CheckDeathForRespawnInPlace(EDeath eDeath)
  {
    // if respawning in place is not allowed
    if (!GetSP()->sp_bRespawnInPlace) {
      // skip further checks
      return;
    }
    // if killed by a player or enemy
    CEntity *penKiller = eDeath.eLastDamage.penInflictor;
    if (IsOfClass(penKiller, "Player") || IsDerivedFromClass(penKiller, "Enemy Base")) {
      // mark for respawning in place
      m_ulFlags |= PLF_RESPAWNINPLACE;
      m_vDied = GetPlacement().pl_PositionVector;
      m_aDied = GetPlacement().pl_OrientationAngle;
    }
  }

procedures:
  Wounded(EDamage eDamage) {
    return;
  };

  WorldChange() {
    // if in single player
    if (GetSP()->sp_bSinglePlayer) {
      // mark world as visited
      CTString strDummy("1");
      SaveStringVar(GetWorld()->wo_fnmFileName.NoExt()+".vis", strDummy);
    }

    // find music holder on new world
    FindMusicHolder();

    // store group name
    m_strGroup = _SwcWorldChange.strGroup;
    TeleportPlayer((WorldLinkType)_SwcWorldChange.iType);

    // setup light source
    SetupLightSource();

    // make sure we discontinue zooming
    m_fLastSniperFOV = m_fSniperFOV = m_fSniperMaxFOV;      
    m_bSniping = FALSE;

    m_ulFlags &= ~PLF_ISZOOMING;

    // turn off possible chainsaw engine sound
    GetInventory()->MuteWeaponAmbient();

    // update per-level stats
    UpdateLevelStats();
    m_ulFlags |= PLF_INITIALIZED;
    m_ulFlags &= ~PLF_CHANGINGLEVEL;
    return;
  };

  WorldChangeDead() {
    // forbid respawning in-place when changing levels while dead
    m_ulFlags &= ~PLF_RESPAWNINPLACE;

    // if in single player
    if (GetSP()->sp_bSinglePlayer) {
      // mark world as visited
      CTString strDummy("1");
      SaveStringVar(GetWorld()->wo_fnmFileName.NoExt()+".vis", strDummy);
    }

    // find music holder on new world
    FindMusicHolder();
    // store group name

    autocall Rebirth() EReturn;

    // setup light source
    SetupLightSource();

    // update per-level stats
    UpdateLevelStats();
    m_ulFlags |= PLF_INITIALIZED;
    m_ulFlags &= ~PLF_CHANGINGLEVEL;
    return;
  }

  Death(EDeath eDeath) {
    // stop firing when dead
    GetWeapon(0)->SendEvent(EReleaseWeapon());
    GetWeapon(1)->SendEvent(EReleaseWeapon());

    // stop all looping ifeel effects
    if(_pNetwork->IsPlayerLocal(this))
    {
      IFeel_StopEffect("ChainsawFire");
      IFeel_StopEffect("FlamethrowerFire");
      IFeel_StopEffect("ChainsawIdle");
      IFeel_StopEffect("SniperZoom");
      IFeel_StopEffect("Minigun_rotate");
    }
    
    // make sure sniper zoom is stopped 
    m_ulFlags &= ~PLF_ISZOOMING;
    m_bSniping = FALSE;
    m_fLastSniperFOV = m_fSniperFOV = m_fSniperMaxFOV;
    
    // stop weapon sounds
    PlaySound(m_soSniperZoom, SOUND_SILENCE, SOF_3D);
    GetInventory()->MuteWeaponAmbient();

    // stop rotating minigun
    GetWeapon(0)->m_fMoveLast = GetWeapon(0)->m_fMoveStart;
    GetWeapon(1)->m_fMoveLast = GetWeapon(1)->m_fMoveStart;

    // [Cecil] Destroy death ray
    GetWeapon(0)->DestroyRay();
    GetWeapon(1)->DestroyRay();
    
    // if in single player, or if this is a predictor entity
    if (GetSP()->sp_bSinglePlayer || IsPredictor()) {
      // do not print anything
      NOTHING;
    // if in cooperative, but not single player
    } else if (GetSP()->sp_bCooperative) {
      // just print death message, no score updating
      PrintPlayerDeathMessage(this, eDeath);
      // check whether this time we respawn in place or on marker
      CheckDeathForRespawnInPlace(eDeath);
      // increase number of deaths
      m_psLevelStats.ps_iDeaths += 1;
      m_psGameStats.ps_iDeaths += 1;
    // if not in cooperative, and not single player
    } else {
      // print death message
      PrintPlayerDeathMessage(this, eDeath);
      // get the killer pointer
      CEntity *penKiller = eDeath.eLastDamage.penInflictor;
      // initially, not killed by a player
      CPlayer *pplKillerPlayer = NULL;

      // if killed by some entity
      if (penKiller!=NULL) {
        // if killed by player
        if (IsOfClass(penKiller, "Player")) {
          // if someone other then you
          if (penKiller!=this) {
            pplKillerPlayer = (CPlayer*)penKiller;
            EReceiveScore eScore;
            eScore.iPoints = m_iMana;
            
            // [Cecil] Mark as an enemy
            eScore.bEnemy = (!GetSP()->sp_bSinglePlayer && !GetSP()->sp_bCooperative);

            eDeath.eLastDamage.penInflictor->SendEvent(eScore);
            eDeath.eLastDamage.penInflictor->SendEvent(EKilledEnemy());
          // if it was yourself
          } else {
            m_psLevelStats.ps_iScore -= m_iMana;
            m_psGameStats.ps_iScore -= m_iMana;
            m_psLevelStats.ps_iKills -= 1;
            m_psGameStats.ps_iKills -= 1;
          }
        // if killed by non-player
        } else {
          m_psLevelStats.ps_iScore -= m_iMana;
          m_psGameStats.ps_iScore -= m_iMana;
          m_psLevelStats.ps_iKills -= 1;
          m_psGameStats.ps_iKills -= 1;
        }
      // if killed by NULL (shouldn't happen, but anyway)
      } else {
        m_psLevelStats.ps_iScore -= m_iMana;
        m_psGameStats.ps_iScore -= m_iMana;
        m_psLevelStats.ps_iKills -= 1;
        m_psGameStats.ps_iKills -= 1;
      }

      // if playing scorematch
      if (!GetSP()->sp_bUseFrags) {
        // if killed by a player
        if (pplKillerPlayer!=NULL) {
          // print how much that player gained
          CPrintF(TRANS("  %s: +%d points\n"), pplKillerPlayer->GetPlayerName(), m_iMana);
        // if it was a suicide, or an accident
        } else {
          // print how much you lost
          CPrintF(TRANS("  %s: -%d points\n"), GetPlayerName(), m_iMana);
        }
      }

      // increase number of deaths
      m_psLevelStats.ps_iDeaths += 1;
      m_psGameStats.ps_iDeaths += 1;
    }

    // store last view
    m_iLastViewState = m_iViewState;

    // mark player as death
    SetFlags(GetFlags() & ~ENF_ALIVE);

    // stop player
    SetDesiredTranslation(FLOAT3D(0.0f, 0.0f, 0.0f));
    SetDesiredRotation(ANGLE3D(0.0f, 0.0f, 0.0f));

    // remove weapon from hand
    GetPlayerAnimator()->RemoveWeapon(FALSE);
    GetPlayerAnimator()->RemoveWeapon(TRUE);

    // kill weapon animations
    GetWeapon(0)->SendEvent(EStop());
    GetWeapon(1)->SendEvent(EStop());

    // if in deathmatch
    if (!GetSP()->sp_bCooperative) {
      // drop current weapon as item so others can pick it
      GetWeapon(0)->DropWeapon();
    }

    // play death
    INDEX iAnim1;
    INDEX iAnim2;
    if (m_pstState == PST_SWIM || m_pstState == PST_DIVE) {
      iAnim1 = PLAYER_ANIM_DEATH_UNDERWATER;
      iAnim2 = BODY_ANIM_DEATH_UNDERWATER;

    } else if (eDeath.eLastDamage.dmtType==DMT_SPIKESTAB) {
      iAnim1 = PLAYER_ANIM_DEATH_SPIKES;
      iAnim2 = BODY_ANIM_DEATH_SPIKES;

    } else if (eDeath.eLastDamage.dmtType==DMT_ABYSS) {
      iAnim1 = PLAYER_ANIM_ABYSSFALL;
      iAnim2 = BODY_ANIM_ABYSSFALL;

    } else {
      FLOAT3D vFront;
      GetHeadingDirection(0, vFront);
      FLOAT fDamageDir = m_vDamage%vFront;
      if (fDamageDir<0) {
        if (Abs(fDamageDir)<10.0f) {
          iAnim1 = PLAYER_ANIM_DEATH_EASYFALLBACK;
          iAnim2 = BODY_ANIM_DEATH_EASYFALLBACK;
        } else {
          iAnim1 = PLAYER_ANIM_DEATH_BACK;
          iAnim2 = BODY_ANIM_DEATH_BACK;
        }
      } else {
        if (Abs(fDamageDir)<10.0f) {
          iAnim1 = PLAYER_ANIM_DEATH_EASYFALLFORWARD;
          iAnim2 = BODY_ANIM_DEATH_EASYFALLFORWARD;
        } else {
          iAnim1 = PLAYER_ANIM_DEATH_FORWARD;
          iAnim2 = BODY_ANIM_DEATH_FORWARD;
        }
      }
    }
    en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);

    PlayLegsAnim(iAnim1, 0);
    PlayBodyAnim(iAnim2, 0);

    // set physic flags
    SetPhysicsFlags(EPF_MODEL_CORPSE);
    SetCollisionFlags(ECF_CORPSE);

    // set density to float out of water
    en_fDensity = 400.0f;

    // play sound
    if (m_pstState==PST_DIVE) {
      SetDefaultMouthPitch();
      PlaySound(m_soMouth, GenderSound(SOUND_DEATHWATER), SOF_3D);
      if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("DeathWater");}
    } else {
      SetDefaultMouthPitch();
      PlaySound(m_soMouth, GenderSound(SOUND_DEATH), SOF_3D);
      if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("Death");}
    }

    // initialize death camera view
    ASSERT(m_penView == NULL);
    if (m_penView == NULL) {
      m_penView = CreateEntity(GetPlacement(), CLASS_PLAYER_VIEW);
      EViewInit eInit;
      eInit.penOwner = this;
      eInit.penCamera = NULL;
      eInit.vtView = VT_PLAYERDEATH;
      eInit.bDeathFixed = eDeath.eLastDamage.dmtType==DMT_ABYSS;
      m_penView->Initialize(eInit);
    }
                     
    if (ShouldBlowUp()) {
      BlowUp();
    } else {
      // leave a stain beneath
      LeaveStain(TRUE);
    }

    m_iMayRespawn = 0;
    // wait for anim of death
    wait (1.2f) {
      on (EBegin) : {
        // set new view status
        m_iViewState = PVT_PLAYERAUTOVIEW;
        resume;
      }

      // when anim is finished
      on (ETimer) : {
        // allow respawning
        m_iMayRespawn = 1;
        resume;
      }

      // when damaged
      on (EDamage eDamage) : { 
        if (eDamage.dmtType==DMT_ABYSS) {
          if (m_penView!=NULL) {
            ((CPlayerView*)&*m_penView)->m_bFixed = TRUE;
          }
        }
        // if should blow up now (and not already blown up)
        if (ShouldBlowUp()) {
          // do it
          BlowUp();
        }
        resume; 
      }

      on (EDeath) : { resume; }

      // if player pressed fire
      on (EEnd) : { 
        // NOTE: predictors must never respawn since player markers for respawning are not predicted
        // if this is not predictor
        if (!IsPredictor()) { 
          // stop waiting
          stop; 
        }
      }

      // if autoaction is received
      on (EAutoAction eAutoAction) : {
        // if we are in coop
        if (GetSP()->sp_bCooperative && !GetSP()->sp_bSinglePlayer) {
          // if the marker is teleport marker
          if (eAutoAction.penFirstMarker != NULL && 
            ((CPlayerActionMarker*)&*eAutoAction.penFirstMarker)->m_paaAction == PAA_TELEPORT) {
            // teleport there
            TeleportToAutoMarker(eAutoAction.penFirstMarker, FALSE);
          }
        }
        // ignore the actions
        resume;
      }

      on (EDisconnected) : { pass; }
      on (EReceiveScore) : { pass; }
      on (EKilledEnemy) : { pass; }
      on (EPreLevelChange) : { pass; }
      on (EPostLevelChange) : { pass; }

      // [Cecil] Pass new weapon
      on (EWeaponItem) : { pass; }

      otherwise() : { resume; }
    }

    return ERebirth();
  };

  TheEnd() {
    // if not playing demo
    if (!_pNetwork->IsPlayingDemo()) {
      // record high score in single player only
      if (GetSP()->sp_bSinglePlayer) {
        _pShell->Execute("gam_iRecordHighScore=0;");
      }
    }

    // if current difficulty is serious
    if (GetSP()->sp_gdGameDifficulty==CSessionProperties::GD_EXTREME) {
      // activate the mental mode
      _pShell->Execute("sam_bMentalActivated=1;");
    }

    // stop firing when end
    GetWeapon(0)->SendEvent(EReleaseWeapon());
    GetWeapon(1)->SendEvent(EReleaseWeapon());

    // mark player as dead
    SetFlags(GetFlags()&~ENF_ALIVE);
    // stop player
    SetDesiredTranslation(FLOAT3D(0.0f, 0.0f, 0.0f));
    SetDesiredRotation(ANGLE3D(0.0f, 0.0f, 0.0f));

    // look straight
    PlayLegsAnim(PLAYER_ANIM_STAND, 0);
    GetPlayerAnimator()->BodyAnimationTemplate(
      BODY_ANIM_NORMALWALK, BODY_ANIM_COLT_STAND, BODY_ANIM_SHOTGUN_STAND, BODY_ANIM_MINIGUN_STAND, 
      AOF_LOOPING|AOF_NORESTART);

    en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);

    // call computer
    m_bEndOfGame = TRUE;
    SetGameEnd();

    wait () {
      on (EBegin) : { resume; }
      on (EReceiveScore) : { pass; }
      on (EKilledEnemy) : { pass; }
      on (ECenterMessage) : { pass; }

      // [Cecil] Pass new weapon
      on (EWeaponItem) : { pass; }

      otherwise() : { resume; }
    }
  };

  FirstInit() {
    // clear use button and zoom flag
    bUseButtonHeld = FALSE;
    
    // restore last view
    m_iViewState = m_iLastViewState;

    // stop and kill camera
    if (m_penView != NULL) {
      ((CPlayerView&)*m_penView).SendEvent(EEnd());
      m_penView = NULL;
    }

    FindMusicHolder();

    // update per-level stats
    UpdateLevelStats();

    // initialize player (from PlayerMarker)
    InitializePlayer();

    // add statistics message
    ReceiveComputerMessage(CTFILENAME("Data\\Messages\\Statistics\\Statistics.txt"), CMF_READ);

    if (GetSettings()->ps_ulFlags & PSF_PREFER3RDPERSON) {
      ChangePlayerView();
    }

    // [Cecil] Mark as initialized
    m_bPlayerInit = TRUE;

    return;
  };

  Rebirth() {
    bUseButtonHeld = FALSE;

    // restore last view
    m_iViewState = m_iLastViewState;

    // [Cecil] Clear inventory ammunition
    if (!(m_ulFlags & PLF_RESPAWNINPLACE)) {
      GetInventory()->ClearWeapons();
    }

    // stop and kill camera
    if (m_penView != NULL) {
      ((CPlayerView&)*m_penView).SendEvent(EEnd());
      m_penView = NULL;
    }

    // stop and kill flame
    CEntityPointer penFlame = GetChildOfClass("Flame");
    if (penFlame!=NULL)
    {
      // send the event to stop burning
      EStopFlaming esf;
      esf.m_bNow=TRUE;
      penFlame->SendEvent(esf);
    }

    if (m_penView != NULL) {
      ((CPlayerView&)*m_penView).SendEvent(EEnd());
      m_penView = NULL;
    }

    FindMusicHolder();

    // initialize player (from PlayerMarker)
    InitializePlayer();

    return EReturn();
  };


  // auto action - go to current marker
  AutoGoToMarker(EVoid) {
    ULONG ulFlags = AOF_LOOPING|AOF_NORESTART;

    INDEX iAnim = GetModelObject()->GetAnim();
    if( iAnim!=PLAYER_ANIM_STAND)
    {
      ulFlags |= AOF_SMOOTHCHANGE;
    }

    GetPlayerAnimator()->m_bAttacking = FALSE;
    GetPlayerAnimator()->BodyWalkAnimation();

    if (m_fAutoSpeed>plr_fSpeedForward/2) {
      PlayLegsAnim(PLAYER_ANIM_RUN, ulFlags);
    } else {
      PlayLegsAnim(PLAYER_ANIM_NORMALWALK, ulFlags);
    }

    // wait a bit while not at the marker
    while ((GetAction()->GetPlacement().pl_PositionVector - GetPlacement().pl_PositionVector).Length() > 1.0f) {
      autowait(_pTimer->TickQuantum);
    }

    // return to auto-action loop
    return EReturn();
  }

  // auto action - go to current marker and stop there
  AutoGoToMarkerAndStop(EVoid) {
    ULONG ulFlags = AOF_LOOPING|AOF_NORESTART;

    INDEX iAnim = GetModelObject()->GetAnim();
    if( iAnim!=PLAYER_ANIM_STAND)
    {
      ulFlags |= AOF_SMOOTHCHANGE;
    }

    GetPlayerAnimator()->BodyWalkAnimation();

    if (m_fAutoSpeed>plr_fSpeedForward/2) {
      PlayLegsAnim(PLAYER_ANIM_RUN, ulFlags);
    } else {
      PlayLegsAnim(PLAYER_ANIM_NORMALWALK, ulFlags);
    }

    // wait a bit while not at the marker
    while ((GetAction()->GetPlacement().pl_PositionVector - GetPlacement().pl_PositionVector).Length() > m_fAutoSpeed * _pTimer->TickQuantum * 2.0f) {
      autowait(_pTimer->TickQuantum);
    }

    // disable auto speed
    m_fAutoSpeed = 0.0f;

    GetPlayerAnimator()->BodyStillAnimation();
    PlayLegsAnim(PLAYER_ANIM_STAND, AOF_LOOPING|AOF_NORESTART);

    // stop moving
    ForceFullStop();

    // return to auto-action loop
    return EReturn();
  }

  // auto action - use an item
  AutoUseItem(EVoid) {
    // start pulling the item
    GetPlayerAnimator()->BodyPullItemAnimation();
    PlayLegsAnim(PLAYER_ANIM_STATUE_PUT, 0);

    autowait(0.2f);

    // item appears
    CPlayerActionMarker *ppam = GetActionMarker();

    if (IsOfClass(ppam->m_penItem, "KeyItem")) {
      CModelObject &moItem = ppam->m_penItem->GetModelObject()->GetAttachmentModel(0)->amo_moModelObject;
      GetPlayerAnimator()->SetItem(&moItem);
    }

    autowait(2.0f);

    // the item is in place
    GetPlayerAnimator()->BodyRemoveItem();

    CPlayerActionMarker *ppam = GetActionMarker();

    // if marker points to a trigger
    if (ppam->m_penTrigger != NULL) {
      // trigger it
      SendToTarget(ppam->m_penTrigger, EET_TRIGGER, this);
    }

    // fake that player has passed through the door controller
    if (ppam->m_penDoorController != NULL) {
      EPass ePass;
      ePass.penOther = this;
      ppam->m_penDoorController->SendEvent(ePass);
    }
    
    autowait(1.05f);

    GetPlayerAnimator()->BodyRemoveItem();

    // return to auto-action loop
    return EReturn();
  }

  // auto action - pick an item
  AutoPickItem(EVoid) {
    // start pulling the item
    GetPlayerAnimator()->BodyPickItemAnimation();
    PlayLegsAnim(PLAYER_ANIM_KEYLIFT, 0);

    autowait(1.2f);

    CPlayerActionMarker *ppam = GetActionMarker();

    // if marker points to a trigger
    if (ppam->m_penTrigger != NULL) {
      // trigger it
      SendToTarget(ppam->m_penTrigger, EET_TRIGGER, this);
    }

    // item appears
    if (IsOfClass(ppam->m_penItem, "KeyItem")) {
      CModelObject &moItem = ppam->m_penItem->GetModelObject()->GetAttachmentModel(0)->amo_moModelObject;
      GetPlayerAnimator()->SetItem(&moItem);

      EPass ePass;
      ePass.penOther = this;
      ppam->m_penItem->SendEvent(ePass);
    }

    autowait(2.4f + GetActionMarker()->m_tmWait);

    GetPlayerAnimator()->BodyRemoveItem();

    // return to auto-action loop
    return EReturn();
  }

  AutoFallDown(EVoid) {
    PlayLegsAnim(PLAYER_ANIM_BRIDGEFALLPOSE, 0);
    PlayBodyAnim(BODY_ANIM_BRIDGEFALLPOSE, 0);

    autowait(GetActionMarker()->m_tmWait);

    // return to auto-action loop
    return EReturn();
  }

  AutoFallToAbys(EVoid) {
    PlayLegsAnim(PLAYER_ANIM_ABYSSFALL, AOF_LOOPING);
    PlayBodyAnim(BODY_ANIM_ABYSSFALL, AOF_LOOPING);

    autowait(GetActionMarker()->m_tmWait);

    // return to auto-action loop
    return EReturn();
  }

  // auto action - look around
  AutoLookAround(EVoid) {
    PlayLegsAnim(PLAYER_ANIM_BACKPEDAL, 0);
    m_vAutoSpeed = FLOAT3D(0,0,plr_fSpeedForward/4/0.75f);
    PlayBodyAnim(BODY_ANIM_NORMALWALK, 0);

    autowait(GetModelObject()->GetCurrentAnimLength()/2);

    m_vAutoSpeed = FLOAT3D(0.0f, 0.0f, 0.0f);
 
    // start looking around
    PlayLegsAnim(PLAYER_ANIM_STAND, 0);
    PlayBodyAnim(BODY_ANIM_LOOKAROUND, 0);

    // wait given time
    autowait(GetPlayerAnimator()->GetBody()->GetCurrentAnimLength()+0.1f);

    // return to auto-action loop
    return EReturn();
  }

  AutoTeleport(EVoid) {
    // teleport there
    TeleportToAutoMarker(GetAction(), FALSE);

    // return to auto-action loop
    return EReturn();
  }

  AutoAppear(EVoid) {
    // hide the model
    SwitchToEditorModel();

    // put it at marker
    Teleport(GetActionMarker()->GetPlacement());

    // make it rotate in spawnpose
    SetPhysicsFlags(GetPhysicsFlags() & ~(EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY));
    m_ulFlags |= PLF_AUTOMOVEMENTS;

    SetDesiredRotation(ANGLE3D(60.0f, 0.0f, 0.0f));

    PlayLegsAnim(PLAYER_ANIM_SPAWNPOSE, AOF_LOOPING);
    PlayBodyAnim(BODY_ANIM_SPAWNPOSE, AOF_LOOPING);

    // start stardust appearing
    m_tmSpiritStart = _pTimer->CurrentTick();
    // wait till it appears
    autowait(5);

    // start model appearing
    SwitchToModel();
    m_tmFadeStart = _pTimer->CurrentTick();
    // wait till it appears
    autowait(5);
    // fixate full opacity
    COLOR colAlpha = GetModelObject()->mo_colBlendColor;
    GetModelObject()->mo_colBlendColor = colAlpha|0xFF;

    // put it to normal state
    SetPhysicsFlags(GetPhysicsFlags() | EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY);
    SetDesiredRotation(ANGLE3D(0.0f, 0.0f, 0.0f));
    m_ulFlags&=~PLF_AUTOMOVEMENTS;

    // play animation to fall down
    PlayLegsAnim(PLAYER_ANIM_SPAWN_FALLDOWN, 0);
    PlayBodyAnim(BODY_ANIM_SPAWN_FALLDOWN, 0);

    autowait(GetModelObject()->GetCurrentAnimLength());
    
    // play animation to get up
    PlayLegsAnim(PLAYER_ANIM_SPAWN_GETUP, AOF_SMOOTHCHANGE);
    PlayBodyAnim(BODY_ANIM_SPAWN_GETUP, AOF_SMOOTHCHANGE);

    autowait(GetModelObject()->GetCurrentAnimLength());

    // return to auto-action loop
    return EReturn();
  }

  TravellingInBeam() {
    // put it at marker
    Teleport(GetActionMarker()->GetPlacement());

    // make it rotate in spawnpose
    SetPhysicsFlags(GetPhysicsFlags() & ~(EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY));
    m_ulFlags |= PLF_AUTOMOVEMENTS;

    SetDesiredRotation(ANGLE3D(60.0f, 0.0f, 0.0f));
    SetDesiredTranslation(ANGLE3D(0.0f, 20.0f, 0.0f));

    PlayLegsAnim(PLAYER_ANIM_SPAWNPOSE, AOF_LOOPING);
    PlayBodyAnim(BODY_ANIM_SPAWNPOSE, AOF_LOOPING);

    // wait till it appears
    autowait(8.0f);
    // switch to model
    SwitchToEditorModel();
    // return to auto-action loop
    return EReturn();
  }
  
  LogoFireMinigun(EVoid) {
    // put it at marker
    CPlacement3D pl = GetActionMarker()->GetPlacement();
    pl.pl_PositionVector += FLOAT3D(0.0f, 0.01f, 0.0f)*GetActionMarker()->en_mRotation;
    Teleport(pl);

    en_plViewpoint.pl_OrientationAngle(1) = 20.0f;
    en_plLastViewpoint.pl_OrientationAngle = en_plViewpoint.pl_OrientationAngle;

    // stand in pose
    PlayLegsAnim(PLAYER_ANIM_INTRO, AOF_LOOPING);
    // remember time for rotating view start
    m_tmMinigunAutoFireStart = _pTimer->CurrentTick();
    // wait some time for fade in and to look from left to right with out firing
    //autowait(0.75f);
    GetWeapon(0)->SendEvent(EFireWeapon());
    autowait(2.5f);
    GetWeapon(0)->SendEvent(EReleaseWeapon());

    // stop minigun shaking
    PlayBodyAnim(BODY_ANIM_MINIGUN_STAND, 0);

    autowait(0.5f);

    // ---------- Apply shake
    CWorldSettingsController *pwsc = NULL;
    // obtain bcg viewer
    CBackgroundViewer *penBcgViewer = (CBackgroundViewer *) GetWorld()->GetBackgroundViewer();
    if( penBcgViewer != NULL)
    {
      pwsc = (CWorldSettingsController *) &*penBcgViewer->m_penWorldSettingsController;
      pwsc->m_tmShakeStarted = _pTimer->CurrentTick();
      pwsc->m_vShakePos = GetPlacement().pl_PositionVector;
      pwsc->m_fShakeFalloff = 250.0f;
      pwsc->m_fShakeFade = 3.0f;

      pwsc->m_fShakeIntensityZ = 0.1f*2.0f;
      pwsc->m_tmShakeFrequencyZ = 5.0f;
      pwsc->m_fShakeIntensityY = 0.0f;
      pwsc->m_fShakeIntensityB = 0.0f;

      pwsc->m_bShakeFadeIn = FALSE;

      /*
      pwsc->m_fShakeIntensityY = 0.1f*2.0f;
      pwsc->m_tmShakeFrequencyY = 5.0f;
      pwsc->m_fShakeIntensityB = 2.5f*1.5f;
      pwsc->m_tmShakeFrequencyB = 7.2f;
      */
    }

    // stop rotating body
    m_tmMinigunAutoFireStart = -1;
    autowait(5.0f);
    IFeel_StopEffect(NULL);
    autowait(5.0f);

    return EReturn();
  }

  AutoStoreWeapon(EVoid) {
    // store current weapon slowly
    GetPlayerAnimator()->BodyAnimationTemplate(BODY_ANIM_WAIT, 
      BODY_ANIM_COLT_REDRAWSLOW, BODY_ANIM_SHOTGUN_REDRAWSLOW, BODY_ANIM_MINIGUN_REDRAWSLOW, 0);

    autowait(GetPlayerAnimator()->m_fBodyAnimTime);

    m_iAutoOrgWeapon = GetWeapon(0)->GetCurrent();

    GetWeapon(0)->m_iCurrentWeapon = WEAPON_NONE;
    GetWeapon(0)->m_iWantedWeapon = WEAPON_NONE;
    GetWeapon(1)->m_iCurrentWeapon = WEAPON_NONE;
    GetWeapon(1)->m_iWantedWeapon = WEAPON_NONE;

    GetInventory()->MuteWeaponAmbient();

    // sync apperances
    GetPlayerAnimator()->SyncWeapon();

    // remove weapon attachment
    GetPlayerAnimator()->RemoveWeapon(FALSE);
    GetPlayerAnimator()->RemoveWeapon(TRUE);

    GetPlayerAnimator()->SyncWeapon();

    GetWeapon(0)->m_iCurrentWeapon = m_iAutoOrgWeapon;

    GetPlayerAnimator()->BodyAnimationTemplate(BODY_ANIM_WAIT, BODY_ANIM_COLT_DEACTIVATETOWALK,
      BODY_ANIM_SHOTGUN_DEACTIVATETOWALK, BODY_ANIM_MINIGUN_DEACTIVATETOWALK, AOF_SMOOTHCHANGE);

    GetWeapon(0)->m_iCurrentWeapon = WEAPON_NONE;

    autowait(GetPlayerAnimator()->m_fBodyAnimTime);

    // return to auto-action loop
    return EReturn();
  }

  // perform player auto actions
  DoAutoActions(EVoid) {
    // don't look up/down
    en_plViewpoint.pl_OrientationAngle = ANGLE3D(0.0f, 0.0f, 0.0f);

    // disable playeranimator animating
    GetPlayerAnimator()->m_bDisableAnimating = TRUE;

    // [Cecil] Disable collision
    if (GlobalCutscenes() && GetSP()->sp_iPlayerCollision != 2) {
      SetCollisionFlags(ECF_MODEL | ((ECBI_PLAYER)<<ECB_IS) | ((ECBI_PLAYER)<<ECB_PASS));
    }

    // [Cecil] Reset last action
    m_penLastAction = NULL;

    // while there is some marker
    while (GetAction() != NULL && IsOfClass(GetAction(), "PlayerActionMarker"))
    {
      // if should wait
      if (GetAutoAction() == PAA_WAIT) {
        // play still anim
        PlayBodyAnim(BODY_ANIM_WAIT, AOF_NORESTART|AOF_LOOPING);
        // wait given time
        autowait(GetActionMarker()->m_tmWait);

      } else if (GetAutoAction() == PAA_STOPANDWAIT) {
        // play still anim
        PlayLegsAnim(PLAYER_ANIM_STAND, 0);
        PlayBodyAnim(BODY_ANIM_WAIT, AOF_NORESTART|AOF_LOOPING);
        // wait given time
        autowait(GetActionMarker()->m_tmWait);

      // if should teleport here
      } else if (GetAutoAction() == PAA_APPEARING) {
        autocall AutoAppear() EReturn;

      } else if (GetAutoAction() == PAA_TRAVELING_IN_BEAM) {
        autocall TravellingInBeam() EReturn;

      } else if (GetAutoAction() == PAA_INTROSE_SELECT_WEAPON) {
        // order playerweapons to select weapon
        ESelectWeapon eSelect;
        eSelect.iWeapon = 1;
        GetWeapon(0)->SendEvent(eSelect);

      } else if (GetAutoAction() == PAA_LOGO_FIRE_INTROSE) {
        autocall LogoFireMinigun() EReturn;

      } else if (GetAutoAction() == PAA_LOGO_FIRE_MINIGUN) {
        autocall LogoFireMinigun() EReturn;

      // if should appear here
      } else if (GetAutoAction() == PAA_TELEPORT) {
        autocall AutoTeleport() EReturn;

      // if should wait for trigger
      } else if (GetAutoAction() == PAA_WAITFOREVER) {
        // wait forever
        wait() {
          on (EBegin) : { resume; }
          otherwise() : { pass; }
        }

      // if should store weapon
      } else if (GetAutoAction() == PAA_STOREWEAPON) {
        autocall AutoStoreWeapon() EReturn;
      
      // if should draw weapon
      } else if (GetAutoAction() == PAA_DRAWWEAPON) {
        // order playerweapons to select best weapon
        ESelectWeapon eSelect;
        eSelect.iWeapon = -4;
        GetWeapon(0)->SendEvent(eSelect);

        // [Cecil] Store the extra weapon
        eSelect.iWeapon = 0;
        GetWeapon(1)->SendEvent(eSelect);

      // if should wait
      } else if (GetAutoAction() == PAA_LOOKAROUND) {
        autocall AutoLookAround() EReturn;

      // if should use item
      } else if (GetAutoAction() == PAA_USEITEM) {
        // use it
        autocall AutoUseItem() EReturn;

      // if should pick item
      } else if (GetAutoAction() == PAA_PICKITEM) {
        // pick it
        autocall AutoPickItem() EReturn;

      // if falling from bridge
      } else if (GetAutoAction() == PAA_FALLDOWN) {
        // fall
        autocall AutoFallDown() EReturn;

      // if releasing player
      } else if (GetAutoAction() == PAA_RELEASEPLAYER) {
        if (GetCamera() != NULL) {
          ((CCamera*)&*GetCamera())->m_bStopMoving = TRUE;
        }

        // [Cecil] Changed to a function
        ResetCamera();

        // if currently not having any weapon in hand
        if (GetWeapon(0)->m_iCurrentWeapon == WEAPON_NONE) {
          // order playerweapons to select best weapon
          ESelectWeapon eSelect;
          eSelect.iWeapon = -4;
          GetWeapon(0)->SendEvent(eSelect);
        }

        // sync weapon, just in case
        m_ulFlags |= PLF_SYNCWEAPON;
        m_tmSpiritStart = 0;

      // if start computer
      } else if (GetAutoAction() == PAA_STARTCOMPUTER) {
        // mark that
        if (_pNetwork->IsPlayerLocal(this) && GetSP()->sp_bSinglePlayer) {
          cmp_ppenPlayer = this;
          cmp_bInitialStart = TRUE;
        }

      // if start introscroll
      } else if (GetAutoAction() == PAA_STARTINTROSCROLL) {
        _pShell->Execute("sam_iStartCredits=1;");

      // if start credits
      } else if (GetAutoAction() == PAA_STARTCREDITS) {
        _pShell->Execute("sam_iStartCredits=2;");

      // if stop scroller
      } else if (GetAutoAction() == PAA_STOPSCROLLER) {
        _pShell->Execute("sam_iStartCredits=-1;");

      // if should run to the marker
      } else if (GetAutoAction() == PAA_RUN) {
        // go to it
        m_fAutoSpeed = plr_fSpeedForward * GetActionMarker()->m_fSpeed;
        autocall AutoGoToMarker() EReturn;

      // if should run to the marker and stop exactly there
      } else if (GetAutoAction() == PAA_RUNANDSTOP) {
        // go to it
        m_fAutoSpeed = plr_fSpeedForward * GetActionMarker()->m_fSpeed;
        autocall AutoGoToMarkerAndStop() EReturn;

      // if should record end-of-level stats
      } else if (GetAutoAction() == PAA_RECORDSTATS) {

        if (GetSP()->sp_bSinglePlayer || GetSP()->sp_bPlayEntireGame) {
          // remeber estimated time
          m_tmEstTime = GetActionMarker()->m_tmWait;
          // record stats
          RecordEndOfLevelData();
        } else {
          SetGameEnd();
        }

      // if should show statistics to the player
      } else if (GetAutoAction() == PAA_SHOWSTATS) {
        // call computer
        if (cmp_ppenPlayer == NULL && _pNetwork->IsPlayerLocal(this) && GetSP()->sp_bSinglePlayer) {
          m_bEndOfLevel = TRUE;
          cmp_ppenPlayer = this;
          m_ulFlags |= PLF_DONTRENDER;

          while (m_bEndOfLevel) {
            wait (_pTimer->TickQuantum) {
              on (ETimer) : { stop; }
              on (EReceiveScore) : { pass; }
              on (EKilledEnemy) : { pass; }
              on (ECenterMessage) : { pass; }
              on (EPostLevelChange) : { 
                m_ulFlags &= !PLF_DONTRENDER;
                m_bEndOfLevel = FALSE;
                pass; 
              }

              // [Cecil] Pass new weapon
              on (EWeaponItem) : { pass; }

              otherwise() : { resume; }
            }
          }
          m_ulFlags &= !PLF_DONTRENDER;
        }
      // if end of entire game
      } else if (GetAutoAction() == PAA_ENDOFGAME) {
        // record stats
        jump TheEnd();

      } else if (GetAutoAction() == PAA_NOGRAVITY) {
        SetPhysicsFlags(GetPhysicsFlags() & ~(EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY));
        if (GetActionMarker()->GetParent() != NULL) {
          SetParent(GetActionMarker()->GetParent());
        }

      } else if (GetAutoAction() == PAA_TURNONGRAVITY) {
        SetPhysicsFlags(GetPhysicsFlags()|EPF_TRANSLATEDBYGRAVITY|EPF_ORIENTEDBYGRAVITY);
        SetParent(NULL);

      } else if (TRUE) {
        ASSERT(FALSE);
      }

      // if marker points to a trigger
      if (GetActionMarker()->m_penTrigger != NULL && GetAutoAction() != PAA_PICKITEM) {
        // trigger it
        SendToTarget(GetActionMarker()->m_penTrigger, EET_TRIGGER, this);
      }

      // [Cecil] Save last marker that affect position
      INDEX iAction = GetAutoAction();

      if (iAction == PAA_RUN || iAction == PAA_RUNANDSTOP || iAction == PAA_TELEPORT
       || iAction == PAA_APPEARING || iAction == PAA_TRAVELING_IN_BEAM
       || iAction == PAA_LOGO_FIRE_INTROSE || iAction == PAA_LOGO_FIRE_MINIGUN) {
        m_penLastAction = GetAction();
      }

      SetAction(GetActionMarker()->m_penTarget);
    }
    
    // disable auto speed
    m_fAutoSpeed = 0.0f;

    // [Cecil] If global cutscenes
    if (GlobalCutscenes()) {
      // [Cecil] Teleport everyone back after the sequence
      if (m_penLastAction != NULL) {
        for (INDEX iPlayer = 0; iPlayer < GetMaxPlayers(); iPlayer++) {
          CEntity *pen = GetPlayerEntity(iPlayer);

          if (ASSERT_ENTITY(pen)) {
            CPlayer *penPlayer = (CPlayer*)pen;

            // bring everyone back out of the dummy state
            EStopActions eStop;
            eStop.vTeleport = GetPlacement().pl_PositionVector;
            eStop.aTeleport = GetPlacement().pl_OrientationAngle;

            penPlayer->SendEvent(eStop);
          }
        }
      }

      // [Cecil] Autosave after the cutscene
      if (GetSP()->sp_iAMPOptions & AMP_AUTOSAVE) {
        CPlacement3D plStart = GetPlacement();
        plStart.pl_PositionVector -= GetTeleportingOffset(FALSE)*GetRotationMatrix();

        CEntity *penStart = CreateEntity(plStart, CLASS_START);
        CPlayerMarker *ppmStart = (CPlayerMarker*)penStart;
        ppmStart->m_iGiveWeapons = GetInventory()->GetCurrentWeaponMask();
        ppmStart->m_fMaxAmmoRatio = 0.5f;

        // name it after the current tick
        INDEX iTick = (_pTimer->CurrentTick() / _pTimer->TickQuantum);
        ppmStart->m_strGroup.PrintF("AMP2_%d", iTick);

        penStart->Initialize();

        ETrigger eTrigger;
        eTrigger.penCaused = this;
        penStart->SendEvent(eTrigger);
      }
    }

    // must clear marker, in case it was invalid
    SetAction(NULL);

    // enable playeranimator animating
    GetPlayerAnimator()->m_bDisableAnimating = FALSE;

    // [Cecil] Enable collision
    if (GlobalCutscenes() && GetSP()->sp_iPlayerCollision != 2) {
      SetCollisionFlags(ECF_MODEL | ((ECBI_PLAYER)<<ECB_IS));
    }

    // return to main loop
    return EVoid();
  };

  Main() {
    // remember start time
    time(&m_iStartTime);

    m_ctUnreadMessages = 0;
    SetFlags(GetFlags()|ENF_CROSSESLEVELS|ENF_NOTIFYLEVELCHANGE);
    InitAsEditorModel();

    // set default model for physics etc
    CTString strDummy;
    SetPlayerAppearance(GetModelObject(), NULL, strDummy, /*bPreview=*/FALSE);
    // set your real appearance if possible
    ValidateCharacter();
    SetPlayerAppearance(&m_moRender, &en_pcCharacter, strDummy, /*bPreview=*/FALSE);
    ParseGender(strDummy);

    // if unsuccessful
    if (GetModelObject()->GetData()==NULL) {
      // never proceed with initialization - player cannot work
      return;
    }

    //const FLOAT fSize = 2.1f/1.85f;
    //GetModelObject()->StretchModel(FLOAT3D(fSize, fSize, fSize));
    ModelChangeNotify();

    // wait a bit to allow other entities to start
    wait (0.2f) { // this is 4 ticks, it has to be at least more than musicchanger for enemy counting
      on (EBegin) : { resume; }
      on (ETimer) : { stop; }
      on (EDisconnected) : { 
        Destroy(); 
        return;
      }
    }

    // do not use predictor if not yet initialized
    if (IsPredictor()) { // !!!!####
      Destroy();
      return;
    }

    // appear
    SwitchToModel();
    m_ulFlags|=PLF_INITIALIZED;

    // set initial vars
    en_tmMaxHoldBreath = 60.0f;
    en_fDensity = 1000.0f;    // same density as water - to be able to dive freely

    ModelChangeNotify();

    // [Cecil] Create inventory
    m_penInventory = CreateEntity(GetPlacement(), CLASS_INVENTORY);
    EInventoryInit eInitInventory;
    eInitInventory.penPlayer = this;
    m_penInventory->Initialize(eInitInventory);

    // spawn animator
    m_penAnimator = CreateEntity(GetPlacement(), CLASS_PLAYER_ANIMATOR);
    EAnimatorInit eInitAnimator;
    eInitAnimator.penPlayer = this;
    m_penAnimator->Initialize(eInitAnimator);

    // set sound default parameters
    m_soMouth.Set3DParameters(50.0f, 10.0f, 1.0f, 1.0f);
    m_soFootL.Set3DParameters(20.0f, 2.0f, 1.0f, 1.0f);
    m_soFootR.Set3DParameters(20.0f, 2.0f, 1.0f, 1.0f);
    m_soBody.Set3DParameters(25.0f, 5.0f, 1.0f, 1.0f);
    m_soMessage.Set3DParameters(25.0f, 5.0f, 1.0f, 1.0f);
    m_soSniperZoom.Set3DParameters(25.0f, 5.0f, 1.0f, 1.0f);
      
    // setup light source
    SetupLightSource();

    // set light animation if available
    try {
      m_aoLightAnimation.SetData_t(CTFILENAME("Animations\\BasicEffects.ani"));
    } catch (char *strError) {
      WarningMessage(TRANS("Cannot load Animations\\BasicEffects.ani: %s"), strError);
    }
    PlayLightAnim(LIGHT_ANIM_NONE, 0);

    wait() {
      on (EBegin) : { call FirstInit(); }
      on (ERebirth) : { call Rebirth(); }
      on (EDeath eDeath) : { call Death(eDeath); }
      on (EDamage eDamage) : { call Wounded(eDamage); }

      on (EPreLevelChange) : { 
        m_ulFlags &= ~PLF_INITIALIZED; 
        m_ulFlags |= PLF_CHANGINGLEVEL;
        m_ulFlags &= ~PLF_LEVELSTARTED;
        resume; 
      }

      on (EPostLevelChange) : {
        if (GetSP()->sp_bSinglePlayer || IsAlive(this)) {
          call WorldChange(); 
        } else {
          call WorldChangeDead(); 
        }
      }

      on (ETakingBreath eTakingBreath ) : {
        SetDefaultMouthPitch();
        if (eTakingBreath.fBreathDelay<0.2f) {
          PlaySound(m_soMouth, GenderSound(SOUND_INHALE0), SOF_3D);
        } else if (eTakingBreath.fBreathDelay<0.8f) {
          PlaySound(m_soMouth, GenderSound(SOUND_INHALE1), SOF_3D);
        } else {
          PlaySound(m_soMouth, GenderSound(SOUND_INHALE2), SOF_3D);
        }
        resume;
      }

      on (ECameraStart eStart) : {
        m_penCamera = eStart.penCamera;

        // stop player
        if (GetAction() == NULL) {
          SetDesiredTranslation(FLOAT3D(0.0f, 0.0f, 0.0f));
          SetDesiredRotation(ANGLE3D(0.0f, 0.0f, 0.0f));
        }

        // stop firing
        GetWeapon(0)->SendEvent(EReleaseWeapon());
        GetWeapon(1)->SendEvent(EReleaseWeapon());
        resume;
      }

      on (ECameraStop eCameraStop) : {
        if (m_penCamera == eCameraStop.penCamera) {
          m_penCamera = NULL;
        }
        resume;
      }

      on (ECenterMessage eMsg) : {
        m_strCenterMessage = eMsg.strMessage;
        m_tmCenterMessageEnd = _pTimer->CurrentTick() + eMsg.tmLength;

        if (eMsg.mssSound == MSS_INFO) {
          m_soMessage.Set3DParameters(25.0f, 5.0f, 1.0f, 1.0f);
          PlaySound(m_soMessage, SOUND_INFO, SOF_3D|SOF_VOLUMETRIC|SOF_LOCAL);
        }
        resume;
      }

      on (EComputerMessage eMsg) : {
        ReceiveComputerMessage(eMsg.fnmMessage, CMF_ANALYZE);
        resume;
      }

      on (EVoiceMessage eMsg) : {
        SayVoiceMessage(eMsg.fnmMessage);
        resume;
      }

      on (EAutoAction eAutoAction) : {
        // remember first marker
        m_penActionMarker = eAutoAction.penFirstMarker;

        // do the actions
        call DoAutoActions();
      }

      // [Cecil] Stop auto actions
      on (EStopActions eStop) : {
        ReleasePlayer();

        // Teleport
        CPlacement3D pl(eStop.vTeleport, eStop.aTeleport);
        pl.Translate_OwnSystem(GetTeleportingOffset(TRUE));

        Teleport(pl, FALSE);
        resume;
      }

      on (EReceiveScore eScore) : {
        m_psLevelStats.ps_iScore += eScore.iPoints;
        m_psGameStats.ps_iScore += eScore.iPoints;
        m_iMana += eScore.iPoints*GetSP()->sp_fManaTransferFactor;
        CheckHighScore();

        // [Cecil] Combo mode
        if (eScore.bEnemy && GetSP()->sp_fComboTime > 0.0f) {
          // enemy combos
          if (GetSP()->sp_bSinglePlayer || GetSP()->sp_bCooperative) {
            if (m_iCombo < 100 || GetSP()->sp_iAMPOptions & AMP_UNLIMITCOMBO) {
              m_iCombo++;
              m_fComboTime = _pTimer->CurrentTick() + GetSP()->sp_fComboTime;
              
              m_iComboScore += eScore.iPoints;
              m_iComboScore = Clamp(m_iComboScore, (INDEX)0, (INDEX)100000);
            }

          // player combos
          } else {
            if (m_iCombo < 15) {
              m_iCombo++;
              m_fComboTime = _pTimer->CurrentTick() + GetSP()->sp_fComboTime;
              
              m_iComboScore += eScore.iPoints;
              m_iComboScore = Clamp(m_iComboScore, (INDEX)0, (INDEX)100000);
            }
          }
        }
        resume;
      }

      // [Cecil] New weapon
      on (EWeaponItem eWeapon) : {
        ReceiveItem(eWeapon);
        resume;
      }

      on (EKilledEnemy) : {
        m_psLevelStats.ps_iKills += 1;
        m_psGameStats.ps_iKills += 1;
        resume;
      }

      on (ESecretFound) : {
        m_psLevelStats.ps_iSecrets += 1;
        m_psGameStats.ps_iSecrets += 1;
        resume;
      }

      on (EWeaponChanged) : {
        // make sure we discontinue zooming (even if not changing from sniper)
        m_fSniperFOV = m_fLastSniperFOV = m_fSniperMaxFOV;
        m_bSniping = FALSE;
        m_ulFlags &= ~PLF_ISZOOMING;

        PlaySound(m_soSniperZoom, SOUND_SILENCE, SOF_3D);        
        if(_pNetwork->IsPlayerLocal(this)) {IFeel_StopEffect("SniperZoom");}

        resume;
      }

      // EEnd should not arrive here
      on (EEnd) : {
        ASSERT(FALSE);
        resume;
      }

      // if player is disconnected
      on (EDisconnected) : {
        // exit the loop
        stop;
      }

      // support for jumping using bouncers
      on (ETouch eTouch) : {
        if (IsOfClass(eTouch.penOther, "Bouncer")) {
          JumpFromBouncer(this, eTouch.penOther);
          // play jump sound
          SetDefaultMouthPitch();
          PlaySound(m_soMouth, GenderSound(SOUND_JUMP), SOF_3D);
          if(_pNetwork->IsPlayerLocal(this)) {IFeel_PlayEffect("Jump");}
        }
        resume;
      }
    }

    // we get here if the player is disconnected from the server

    // if we have some keys
    if (!IsPredictor() && GetInventory()->m_iKeys != 0) {
      // find first live player
      CPlayer *penNextPlayer = NULL;

      for (INDEX iPlayer = 0; iPlayer < GetMaxPlayers(); iPlayer++) {
        CPlayer *pen = (CPlayer*)&*GetPlayerEntity(iPlayer);

        if (pen != NULL && pen != this && IsAlive(pen) && !(pen->GetFlags() & ENF_DELETED)) {
          penNextPlayer = pen;
        }
      }

      // if any found
      if (penNextPlayer != NULL) {
        // transfer keys to that player
        CPrintF(TRANS("%s leaving, all keys transfered to %s\n"), 
          (const char*)m_strName, (const char*)penNextPlayer->GetPlayerName());
        penNextPlayer->GetInventory()->m_iKeys |= GetInventory()->m_iKeys;
      }
    }

    // spawn teleport effect
    SpawnTeleport();

    // [Cecil] Destroy inventory
    m_penInventory->SendEvent(EEnd());

    // cease to exist
    m_penAnimator->Destroy();

    if (m_penView != NULL) {
      m_penView->Destroy();
    }

    if (m_pen3rdPersonView != NULL) {
      m_pen3rdPersonView->Destroy();
    }

    Destroy();

    return;
  };
};
