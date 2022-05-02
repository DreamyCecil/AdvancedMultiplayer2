409
%{
#include "StdH.h"

#include "EntitiesMP/Player.h"
#include "EntitiesMP/PlayerWeapons.h"
%}

// Individual player controls with console commands
enum EPlayerControls {
  0 PCTL_MOVEFORWARD       "ctl_bMoveForward",
  1 PCTL_MOVEBACKWARD      "ctl_bMoveBackward",
  2 PCTL_MOVELEFT          "ctl_bMoveLeft",
  3 PCTL_MOVERIGHT         "ctl_bMoveRight",
  4 PCTL_MOVEUP            "ctl_bMoveUp",
  5 PCTL_MOVEDOWN          "ctl_bMoveDown",

  6 PCTL_TURNLEFT          "ctl_bTurnLeft",
  7 PCTL_TURNRIGHT         "ctl_bTurnRight",
  8 PCTL_TURNUP            "ctl_bTurnUp",
  9 PCTL_TURNDOWN          "ctl_bTurnDown",
 10 PCTL_TURNBANKINGLEFT   "ctl_bTurnBankingLeft",
 11 PCTL_TURNBANKINGRIGHT  "ctl_bTurnBankingRight",
 12 PCTL_CENTERVIEW        "ctl_bCenterView",

 13 PCTL_LOOKLEFT          "ctl_bLookLeft",
 14 PCTL_LOOKRIGHT         "ctl_bLookRight",
 15 PCTL_LOOKUP            "ctl_bLookUp",
 16 PCTL_LOOKDOWN          "ctl_bLookDown",
 17 PCTL_LOOKBANKINGLEFT   "ctl_bLookBankingLeft", 
 18 PCTL_LOOKBANKINGRIGHT  "ctl_bLookBankingRight",

 19 PCTL_SELECTWEAPON      "\x20 ctl_bSelectWeapon", // 32 types of weapons (19 - 51)

 52 PCTL_WEAPONNEXT        "ctl_bWeaponNext",
 53 PCTL_WEAPONPREV        "ctl_bWeaponPrev",
 54 PCTL_WEAPONFLIP        "ctl_bWeaponFlip",

 55 PCTL_WALK              "ctl_bWalk",         
 56 PCTL_STRAFE            "ctl_bStrafe",       
 57 PCTL_FIRE              "ctl_bFire",         
 58 PCTL_RELOAD            "ctl_bReload",       
 59 PCTL_USE               "ctl_bUse",          
 60 PCTL_COMPUTER          "ctl_bComputer",     
 61 PCTL_USEORCOMPUTER     "ctl_bUseOrComputer",
 62 PCTL_USEORCOMPUTERLAST "", // for internal use
 63 PCTL_3RDPERSONVIEW     "ctl_b3rdPersonView",

 64 PCTL_SNIPERZOOMIN      "ctl_bSniperZoomIn",
 65 PCTL_SNIPERZOOMOUT     "ctl_bSniperZoomOut",
 66 PCTL_FIREBOMB          "ctl_bFireBomb",
 
 // [Cecil] New buttons
 67 PCTL_ALTFIRE           "ctl_bAltFire",
 68 PCTL_TOKENS            "ctl_bTokens",
 69 PCTL_SELECTMODIFIER    "ctl_bWeaponSelectionModifier",

 70 PCTL_LAST "", // amount of buttons
};

%{
// Array of controls
static INDEX _aiPlayerControls[PCTL_LAST];

// Controls key with different states
struct SControlsKey {
  INDEX bPressed; // pressed the key
  INDEX bHolding; // holding the key
  INDEX bReleased; // released the key

  // Contructor
  SControlsKey(void) : bPressed(FALSE), bHolding(FALSE), bReleased(FALSE) {};

  // Update key states
  void Update(const BOOL &bHoldingState) {
    bPressed  = (bHoldingState && !bHolding);
    bReleased = (!bHoldingState && bHolding);
    bHolding = bHoldingState;
  };
};

// Voice commands menu
static SControlsKey _ckMenu;

extern INDEX ctl_bVoiceCommands = FALSE; // show voice commands menu
extern INDEX _iVoiceCommand = 0; // current voice command

// Mirrored shooting for dual weapons
static INDEX amp_bMirrorDualFire = TRUE;
extern INDEX amp_bWeaponMirrored;

// Dual fire on a single fire button
static SControlsKey _ckDualFire;
static INDEX amp_bDualWeaponFire = FALSE; // use dual weapon fire
static INDEX amp_bDualFireMultiplier = TRUE; // multiply delay by the fire speed

static FLOAT amp_fDualFireDelay = 0.3f; // delay between both weapons
static FLOAT _tmLastDualFire = -1.0f; // last time the fire button has been pressed

// Player speeds
extern FLOAT plr_fSpeedForward;
extern FLOAT plr_fSpeedBackward;
extern FLOAT plr_fSpeedSide;
extern FLOAT plr_fSpeedUp;

// Controls modifiers (moved from Player)
static FLOAT ctl_tmComputerDoubleClick = 0.5f; // double click delay for calling computer
static FLOAT _tmLastUseOrCompPressed = -10.0f; // for computer double click

// Speeds for button rotation
static FLOAT ctl_fButtonRotationSpeedH = 300.0f;
static FLOAT ctl_fButtonRotationSpeedP = 150.0f;
static FLOAT ctl_fButtonRotationSpeedB = 150.0f;

// Modifier for axis strafing
static FLOAT ctl_fAxisStrafingModifier = 1.0f;

// Declare console commands for controls
extern void DeclareControlsCommands(void) {
  for (INDEX i = 0; i < PCTL_LAST; i++) {
    // key command
    CTString strKey = EPlayerControls_enum.NameForValue(i);

    // no command
    if (strKey == "") {
      continue;
    }

    // first character is array size
    char cSize = strKey[0];
    BOOL bArray = FALSE;

    if (cSize < 'A') {
      // remove array size and a space
      strKey.DeleteChar(0);
      strKey.DeleteChar(0);
      bArray = TRUE;
    }

    CTString strDeclare = "";
    strDeclare.PrintF("user INDEX %s", strKey);

    // add array size
    if (bArray) {
      strDeclare.PrintF("%s[%d]", strDeclare, (int)cSize);
    }

    // declaration end
    strDeclare += ";";

    _pShell->DeclareSymbol(strDeclare, &_aiPlayerControls[i]);
    
    // increase index by the array size
    if (bArray) {
      i += cSize;
    }
  }

  // local controls
  _pShell->DeclareSymbol("user INDEX ctl_bVoiceCommands;", &ctl_bVoiceCommands);
  
  // misc mod options
  _pShell->DeclareSymbol("persistent user INDEX amp_bMirrorDualFire;", &amp_bMirrorDualFire);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDualWeaponFire;", &amp_bDualWeaponFire);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDualFireMultiplier;", &amp_bDualFireMultiplier);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fDualFireDelay;", &amp_fDualFireDelay);

  // declare player control variables (moved from Player)
  _pShell->DeclareSymbol("persistent user FLOAT ctl_tmComputerDoubleClick;", &ctl_tmComputerDoubleClick);
  _pShell->DeclareSymbol("persistent user FLOAT ctl_fButtonRotationSpeedH;", &ctl_fButtonRotationSpeedH);
  _pShell->DeclareSymbol("persistent user FLOAT ctl_fButtonRotationSpeedP;", &ctl_fButtonRotationSpeedP);
  _pShell->DeclareSymbol("persistent user FLOAT ctl_fButtonRotationSpeedB;", &ctl_fButtonRotationSpeedB);
  _pShell->DeclareSymbol("persistent user FLOAT ctl_fAxisStrafingModifier;", &ctl_fAxisStrafingModifier);
};

// [Cecil] Moved from Player

// Individual player controls
struct PlayerControls {
  FLOAT3D aRotation;
  FLOAT3D aViewRotation;
  FLOAT3D vTranslation;

  // [Cecil] Controls masks
  ULONG ulControls1;
  ULONG ulControls2;
  ULONG ulControls3;
};

static struct PlayerControls pctlCurrent;

// [Cecil] Controls mask manipulation
#define CTL_CONTROLS_MASK(_Key) ((&pctlCurrent.ulControls1)[(_Key) / 32])
#define CTL_CONTROLS_KEY(_Key) (1 << ((_Key) % 32))

// [Cecil] Set controls key into the mask
#define CTL_SET_KEY(_Key, _State) \
  if (_State) CTL_CONTROLS_MASK(_Key) |=  CTL_CONTROLS_KEY(_Key); \
  else        CTL_CONTROLS_MASK(_Key) &= ~CTL_CONTROLS_KEY(_Key)

// [Cecil] Get controls key from the mask
#define CTL_GET_KEY(_Key) (CTL_CONTROLS_MASK(_Key) & CTL_CONTROLS_KEY(_Key))
#define CTL_GET_KEY_ARRAY(_Key, _Index) (CTL_CONTROLS_MASK(_Key + _Index) & CTL_CONTROLS_KEY(_Key + _Index))

// [Cecil] Clear current player controls
extern void ClearPlayerControls(void) {
  memset(&pctlCurrent, 0, sizeof(pctlCurrent));
};

// Define address and size of player controls structure
DECL_DLL extern void *ctl_pvPlayerControls = _aiPlayerControls;
DECL_DLL extern const SLONG ctl_slPlayerControlsSize = sizeof(_aiPlayerControls);

// Compose action packet from current controls
DECL_DLL void ctl_ComposeActionPacket(const CPlayerCharacter &pc, CPlayerAction &paAction, BOOL bPreScan) {
  // allow double axis controls
  paAction.pa_aRotation += paAction.pa_aViewRotation;

  CPlayerSettings *pps = (CPlayerSettings *)pc.pc_aubAppearance;

  // [Cecil] Set controls into controls masks
  for (INDEX iSetKey = 0; iSetKey < PCTL_LAST; iSetKey++) {
    CTL_SET_KEY(iSetKey, _aiPlayerControls[iSetKey]);
  }

  // if strafing
  if (CTL_GET_KEY(PCTL_STRAFE)) {
    // move rotation left/right into translation left/right
    paAction.pa_vTranslation(1) = -paAction.pa_aRotation(1)*ctl_fAxisStrafingModifier;
    paAction.pa_aRotation(1) = 0;
  }

  // if centering view
  if (CTL_GET_KEY(PCTL_CENTERVIEW)) {
    // don't allow moving view up/down
    paAction.pa_aRotation(2) = 0.0f;
  }

  // multiply axis actions with speed
  paAction.pa_vTranslation(1) *= plr_fSpeedSide;
  paAction.pa_vTranslation(2) *= plr_fSpeedUp;

  if (paAction.pa_vTranslation(3) < 0.0f) {
    paAction.pa_vTranslation(3) *= plr_fSpeedForward;
  } else {
    paAction.pa_vTranslation(3) *= plr_fSpeedBackward;
  }

  // find local player
  CPlayer *penThis = NULL;
  INDEX ctPlayers = CEntity::GetMaxPlayers();

  for (INDEX iPlayer = 0; iPlayer < ctPlayers; iPlayer++) {
    CPlayer *pen = (CPlayer*)CEntity::GetPlayerEntity(iPlayer);

    if (pen != NULL && pen->en_pcCharacter == pc) {
      penThis = pen;
      break;
    }
  }

  // not found
  if (penThis == NULL) {
    return;
  }

  // accumulate local rotation
  penThis->m_aLocalRotation += paAction.pa_aRotation;
  penThis->m_aLocalViewRotation += paAction.pa_aViewRotation;
  penThis->m_vLocalTranslation += paAction.pa_vTranslation;

  // no button checking if prescanning
  if (bPreScan) {
    return;
  }

  // add movement actions
  if (CTL_GET_KEY(PCTL_MOVEFORWARD)) {
    paAction.pa_vTranslation(3) -= plr_fSpeedForward;
  }

  if (CTL_GET_KEY(PCTL_MOVEBACKWARD)) {
    paAction.pa_vTranslation(3) += plr_fSpeedBackward;
  }

  if (CTL_GET_KEY(PCTL_MOVELEFT) || (CTL_GET_KEY(PCTL_STRAFE) && CTL_GET_KEY(PCTL_TURNLEFT))) {
    paAction.pa_vTranslation(1) -= plr_fSpeedSide;
  }

  if (CTL_GET_KEY(PCTL_MOVERIGHT) || (CTL_GET_KEY(PCTL_STRAFE) && CTL_GET_KEY(PCTL_TURNRIGHT))) {
    paAction.pa_vTranslation(1) += plr_fSpeedSide;
  }

  if (CTL_GET_KEY(PCTL_MOVEUP)) {
    paAction.pa_vTranslation(2) += plr_fSpeedUp;
  }

  if (CTL_GET_KEY(PCTL_MOVEDOWN)) {
    paAction.pa_vTranslation(2) -= plr_fSpeedUp;
  }

  // add rotation actions
  const FLOAT fQuantum = _pTimer->TickQuantum;
  if (CTL_GET_KEY(PCTL_TURNLEFT)  && !CTL_GET_KEY(PCTL_STRAFE))  {
    penThis->m_aLocalRotation(1) += ctl_fButtonRotationSpeedH*fQuantum;
  }

  if (CTL_GET_KEY(PCTL_TURNRIGHT) && !CTL_GET_KEY(PCTL_STRAFE))  {
    penThis->m_aLocalRotation(1) -= ctl_fButtonRotationSpeedH*fQuantum;
  }

  if (CTL_GET_KEY(PCTL_TURNUP))  {
    penThis->m_aLocalRotation(2) += ctl_fButtonRotationSpeedP*fQuantum;
  }

  if (CTL_GET_KEY(PCTL_TURNDOWN))  {
    penThis->m_aLocalRotation(2) -= ctl_fButtonRotationSpeedP*fQuantum;
  }

  // add look actions
  if (CTL_GET_KEY(PCTL_LOOKLEFT))  {
    penThis->m_aLocalViewRotation(1) += ctl_fButtonRotationSpeedH*fQuantum;
  }

  if (CTL_GET_KEY(PCTL_LOOKRIGHT))  {
    penThis->m_aLocalViewRotation(1) -= ctl_fButtonRotationSpeedH*fQuantum;
  }

  if (CTL_GET_KEY(PCTL_LOOKUP))  {
    penThis->m_aLocalViewRotation(2) += ctl_fButtonRotationSpeedP*fQuantum;
  }

  if (CTL_GET_KEY(PCTL_LOOKDOWN))  {
    penThis->m_aLocalViewRotation(2) -= ctl_fButtonRotationSpeedP*fQuantum;
  }

  // use current accumulated rotation
  paAction.pa_aRotation = penThis->m_aLocalRotation;
  paAction.pa_aViewRotation = penThis->m_aLocalViewRotation;

  // slower speed while walking
  if (CTL_GET_KEY(PCTL_WALK)) {
    paAction.pa_vTranslation(1) /= 2.0f;
    paAction.pa_vTranslation(3) /= 2.0f;
  }

  // [Cecil] Reserve banking rotation for more buttons
  paAction.pa_aRotation(3) = 0.0f;
  paAction.pa_aViewRotation(3) = 0.0f;
  
  // [Cecil] Make button masks
  ULONG &ulButtons1 = *reinterpret_cast<ULONG*>(&paAction.pa_aRotation(3));
  ULONG &ulButtons2 = *reinterpret_cast<ULONG*>(&paAction.pa_aViewRotation(3));

  // [Cecil] Voice commands menu button
  _ckMenu.Update(ctl_bVoiceCommands);

  // [Cecil] Reset the voice command
  if (_ckMenu.bPressed) {
    _iVoiceCommand = 0;
  }

  // [Cecil] Add selected voice command
  if (_ckMenu.bReleased && _iVoiceCommand > 0) {
    ulButtons1 += _iVoiceCommand;
  }
  
  // reset all button actions
  paAction.pa_ulButtons = 0;

  // set weapon selection bits
  for (INDEX i = 1; i < 32; i++) {
    if (CTL_GET_KEY_ARRAY(PCTL_SELECTWEAPON, i)) {
      paAction.pa_ulButtons = (i << PLACT_SELECT_WEAPON_SHIFT);
      break;
    }
  }

  // [Cecil] Change voice command if opened the menu
  if (_ckMenu.bHolding) {
    if (CTL_GET_KEY(PCTL_WEAPONNEXT)) {
      _iVoiceCommand = (_iVoiceCommand+1) % 5;
    }

    if (CTL_GET_KEY(PCTL_WEAPONPREV)) {
      _iVoiceCommand--;
      if (_iVoiceCommand < 0) {
        _iVoiceCommand = 4;
      }
    }

  } else {
    if (CTL_GET_KEY(PCTL_WEAPONNEXT)) {
      paAction.pa_ulButtons |= PLACT_WEAPON_NEXT;
    }
    if (CTL_GET_KEY(PCTL_WEAPONPREV)) {
      paAction.pa_ulButtons |= PLACT_WEAPON_PREV;
    }
  }

  // [Cecil] Reset fire buttons if selecting an extra weapon
  if (CTL_GET_KEY(PCTL_SELECTMODIFIER)) {
    CTL_SET_KEY(PCTL_FIRE, FALSE);
    CTL_SET_KEY(PCTL_ALTFIRE, FALSE);
  }

  // [Cecil] Fire controls
  BOOL abFireControlsStates[2] = {
    CTL_GET_KEY(PCTL_FIRE),
    CTL_GET_KEY(PCTL_ALTFIRE),
  };

  // [Cecil] Using dual weapons
  BOOL bDualWeapons = FALSE;

  if (penThis->m_bPlayerInit) {
    bDualWeapons = (penThis->GetWeapon(1)->GetCurrent() != WEAPON_NONE);
  }

  if (bDualWeapons) {
    // dual fire button
    if (amp_bDualWeaponFire) {
      // depends on holding the fire button
      _ckDualFire.Update(CTL_GET_KEY(PCTL_FIRE));

      // reset the alt fire key
      abFireControlsStates[1] = FALSE;

      // set dual fire time
      if (_ckDualFire.bPressed) {
        _tmLastDualFire = _pTimer->GetRealTimeTick();
      }

      // reset time
      if (_ckDualFire.bReleased) {
        _tmLastDualFire = -1.0f;
      }

      // multiply by fire speed
      FLOAT fDelay = Abs(amp_fDualFireDelay) * (amp_bDualFireMultiplier ? FireSpeedMul() : 1.0f);

      // if reached the delayed time
      if (_tmLastDualFire > 0.0f && _tmLastDualFire + fDelay <= _pTimer->GetRealTimeTick()) {
        // fire another weapon
        abFireControlsStates[1] = TRUE;
      }

      // swap controls if negative delay
      if (amp_fDualFireDelay < 0.0f) {
        Swap(abFireControlsStates[0], abFireControlsStates[1]);
      }
    }

    // swap fire controls if mirrored weapons
    if (amp_bMirrorDualFire && amp_bWeaponMirrored) {
      Swap(abFireControlsStates[0], abFireControlsStates[1]);
    }
  }
  
  // set button pressed flags
  paAction.pa_ulButtons |= (CTL_GET_KEY(PCTL_WEAPONFLIP)   ? PLACT_WEAPON_FLIP : 0)
                        | (abFireControlsStates[0]         ? PLACT_FIRE : 0)
                        | (CTL_GET_KEY(PCTL_RELOAD)        ? PLACT_RELOAD : 0)
                        | (CTL_GET_KEY(PCTL_USE)           ? PLACT_USE|PLACT_USE_HELD|PLACT_SNIPER_USE : 0)
                        | (CTL_GET_KEY(PCTL_COMPUTER)      ? PLACT_COMPUTER : 0)
                        | (CTL_GET_KEY(PCTL_3RDPERSONVIEW) ? PLACT_3RD_PERSON_VIEW : 0)
                        | (CTL_GET_KEY(PCTL_CENTERVIEW)    ? PLACT_CENTER_VIEW : 0)
                        | (CTL_GET_KEY(PCTL_FIREBOMB)      ? PLACT_FIREBOMB : 0)
                        // use button
                        | (CTL_GET_KEY(PCTL_USEORCOMPUTER) ? PLACT_USE_HELD|PLACT_SNIPER_USE : 0)
                        | (CTL_GET_KEY(PCTL_SNIPERZOOMIN)  ? PLACT_SNIPER_ZOOMIN : 0)
                        | (CTL_GET_KEY(PCTL_SNIPERZOOMOUT) ? PLACT_SNIPER_ZOOMOUT : 0)
                        // [Cecil] New buttons
                        | (abFireControlsStates[1]          ? PLACT_ALTFIRE : 0)
                        | (CTL_GET_KEY(PCTL_TOKENS)         ? PLACT_TOKENS : 0)
                        | (CTL_GET_KEY(PCTL_SELECTMODIFIER) ? PLACT_SELECT_MODIFIER : 0);

  // if 'use or comp' has been pressed
  if (CTL_GET_KEY(PCTL_USEORCOMPUTER) && !CTL_GET_KEY(PCTL_USEORCOMPUTERLAST)) {
    // no double-click
    if (ctl_tmComputerDoubleClick == 0 || (pps->ps_ulFlags & PSF_COMPSINGLECLICK)) {
      // press both
      paAction.pa_ulButtons |= PLACT_USE|PLACT_COMPUTER;

    // double-click
    } else {
      // computer if double click
      if (_pTimer->GetRealTimeTick() <= _tmLastUseOrCompPressed + ctl_tmComputerDoubleClick) {
        paAction.pa_ulButtons |= PLACT_COMPUTER;

      // use if single click
      } else {
        paAction.pa_ulButtons |= PLACT_USE;
      }
    }

    _tmLastUseOrCompPressed = _pTimer->GetRealTimeTick();
  }

  // remember old userorcomp pressed state
  CTL_SET_KEY(PCTL_USEORCOMPUTERLAST, CTL_GET_KEY(PCTL_USEORCOMPUTER));
};
%}
