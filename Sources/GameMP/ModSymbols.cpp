#include "stdafx.h"

// World Options
static INDEX amp_bEnableOptions = TRUE;
static INDEX amp_bConversion = FALSE;

static FLOAT amp_fSpeedMultiplier = 1.0f;
static FLOAT amp_fJumpMultiplier = 1.0f;
static FLOAT amp_fStartHealth = 100.0f;
static FLOAT amp_fMaxHealth = 200.0f;
static FLOAT amp_fMaxArmor = 200.0f;

static INDEX amp_iEnemyMultiplier = 1;
static INDEX amp_bBalancedEnemies = FALSE;
static FLOAT amp_fFireSpeed = 1.0f;
static FLOAT amp_fAmmoMultiplier = 1.0f;
static FLOAT amp_fPowerupTimeMul = 1.0f;
static INDEX amp_bHeatDamage = TRUE;
static INDEX amp_bImpactDamage = TRUE;
static FLOAT amp_fEnemyDamage = 1.0f;
static FLOAT amp_fPlayerDamage = 1.0f;
static FLOAT amp_fSelfDamage = 1.0f;

// Gameplay Options
static INDEX amp_bStartAmmo = FALSE;
static INDEX amp_bRocketDestruction = TRUE;

static INDEX amp_iDualWeapons = 1;
static INDEX amp_bAllDualWeapons = FALSE;

static INDEX amp_iAltFire = 0;
static INDEX amp_bShotgunAlt   = TRUE;
static INDEX amp_bDShotgunAlt  = TRUE;
static INDEX amp_bTommygunAlt  = TRUE;
static INDEX amp_bMinigunAlt   = TRUE;
static INDEX amp_bRLauncherAlt = TRUE;
static INDEX amp_bGLauncherAlt = TRUE;
static INDEX amp_bFlamerAlt    = TRUE;
static INDEX amp_bSniperAlt    = TRUE;
static INDEX amp_bLaserAlt     = TRUE;
static INDEX amp_bCannonAlt    = TRUE;

static FLOAT amp_fComboTime = 2.0f;
static INDEX amp_bUnlimitedCombos = FALSE;
static FLOAT amp_fTokenPayout = 1.0f;
static INDEX amp_bStrongerEnemies = FALSE;
static FLOAT amp_fBossResistance = 1.0f;
static INDEX amp_bNoRocketJump = FALSE;

static INDEX amp_bKeepSecrets = FALSE;
static INDEX amp_bSharedWeapons = FALSE;
static INDEX amp_iPlayerCollision = 0;
static INDEX amp_bAutosave = TRUE;

// Weapon Giver
static INDEX amp_bKnifeEnable     = TRUE;
static INDEX amp_bChainsawEnable  = FALSE;
static INDEX amp_bColtEnable      = TRUE;
static INDEX amp_bDColtEnable     = FALSE;
static INDEX amp_bShotgunEnable   = FALSE;
static INDEX amp_bDShotgunEnable  = FALSE;
static INDEX amp_bTommygunEnable  = FALSE;
static INDEX amp_bMinigunEnable   = FALSE;
static INDEX amp_bRLauncherEnable = FALSE;
static INDEX amp_bGLauncherEnable = FALSE;
static INDEX amp_bFlamerEnable    = FALSE;
static INDEX amp_bSniperEnable    = FALSE;
static INDEX amp_bLaserEnable     = FALSE;
static INDEX amp_bCannonEnable    = FALSE;

// Item Removal
static INDEX amp_iWeaponItems = 3;
static INDEX amp_iReplaceWeapons = 0;
static INDEX amp_bTakeWeapons = TRUE;

static INDEX amp_bKnifeItemEnable     = TRUE;
static INDEX amp_bChainsawItemEnable  = TRUE;
static INDEX amp_bColtItemEnable      = TRUE;
static INDEX amp_bShotgunItemEnable   = TRUE;
static INDEX amp_bDShotgunItemEnable  = TRUE;
static INDEX amp_bTommygunItemEnable  = TRUE;
static INDEX amp_bMinigunItemEnable   = TRUE;
static INDEX amp_bRLauncherItemEnable = TRUE;
static INDEX amp_bGLauncherItemEnable = TRUE;
static INDEX amp_bFlamerItemEnable    = TRUE;
static INDEX amp_bSniperItemEnable    = TRUE;
static INDEX amp_bLaserItemEnable     = TRUE;
static INDEX amp_bCannonItemEnable    = TRUE;

static INDEX amp_bInvulItem = TRUE;
static INDEX amp_bInvisItem = TRUE;
static INDEX amp_bDamageItem = TRUE;
static INDEX amp_bSpeedItem = TRUE;

// Restore default game options
static void RestoreDefaultOptions(void) {
  // World Options
  amp_bEnableOptions = TRUE;
  amp_bConversion = FALSE;

  amp_fSpeedMultiplier = 1.0f;
  amp_fJumpMultiplier = 1.0f;
  amp_fStartHealth = 100.0f;
  amp_fMaxHealth = 200.0f;
  amp_fMaxArmor = 200.0f;

  amp_iEnemyMultiplier = 1;
  amp_bBalancedEnemies = FALSE;
  amp_fFireSpeed = 1.0f;
  amp_fAmmoMultiplier = 1.0f;
  amp_fPowerupTimeMul = 1.0f;
  amp_bHeatDamage = TRUE;
  amp_bImpactDamage = TRUE;
  amp_fEnemyDamage = 1.0f;
  amp_fPlayerDamage = 1.0f;
  amp_fSelfDamage = 1.0f;

  // Gameplay Options
  amp_bStartAmmo = FALSE;
  amp_bRocketDestruction = TRUE;

  amp_iDualWeapons = 1;
  amp_bAllDualWeapons = FALSE;

  amp_iAltFire = 0;
  amp_bShotgunAlt   = TRUE;
  amp_bDShotgunAlt  = TRUE;
  amp_bTommygunAlt  = TRUE;
  amp_bMinigunAlt   = TRUE;
  amp_bRLauncherAlt = TRUE;
  amp_bGLauncherAlt = TRUE;
  amp_bFlamerAlt    = TRUE;
  amp_bSniperAlt    = TRUE;
  amp_bLaserAlt     = TRUE;
  amp_bCannonAlt    = TRUE;

  amp_fComboTime = 2.0f;
  amp_bUnlimitedCombos = FALSE;
  amp_fTokenPayout = 1.0f;
  amp_bStrongerEnemies = FALSE;
  amp_fBossResistance = 1.0f;
  amp_bNoRocketJump = FALSE;

  amp_bKeepSecrets = FALSE;
  amp_bSharedWeapons = FALSE;
  amp_iPlayerCollision = 0;
  amp_bAutosave = TRUE;

  // Weapon Giver
  amp_bKnifeEnable     = TRUE;
  amp_bChainsawEnable  = FALSE;
  amp_bColtEnable      = TRUE;
  amp_bDColtEnable     = FALSE;
  amp_bShotgunEnable   = FALSE;
  amp_bDShotgunEnable  = FALSE;
  amp_bTommygunEnable  = FALSE;
  amp_bMinigunEnable   = FALSE;
  amp_bRLauncherEnable = FALSE;
  amp_bGLauncherEnable = FALSE;
  amp_bFlamerEnable    = FALSE;
  amp_bSniperEnable    = FALSE;
  amp_bLaserEnable     = FALSE;
  amp_bCannonEnable    = FALSE;

  // Item Removal
  amp_iWeaponItems = 3;
  amp_iReplaceWeapons = 0;
  amp_bTakeWeapons = TRUE;

  amp_bKnifeItemEnable     = TRUE;
  amp_bChainsawItemEnable  = TRUE;
  amp_bColtItemEnable      = TRUE;
  amp_bShotgunItemEnable   = TRUE;
  amp_bDShotgunItemEnable  = TRUE;
  amp_bTommygunItemEnable  = TRUE;
  amp_bMinigunItemEnable   = TRUE;
  amp_bRLauncherItemEnable = TRUE;
  amp_bGLauncherItemEnable = TRUE;
  amp_bFlamerItemEnable    = TRUE;
  amp_bSniperItemEnable    = TRUE;
  amp_bLaserItemEnable     = TRUE;
  amp_bCannonItemEnable    = TRUE;

  amp_bInvulItem = TRUE;
  amp_bInvisItem = TRUE;
  amp_bDamageItem = TRUE;
  amp_bSpeedItem = TRUE;
};

// Declare mod symbols
extern void DeclareExtraSymbols(void) {
  // World Options
  _pShell->DeclareSymbol("persistent user INDEX amp_bEnableOptions;", &amp_bEnableOptions);
  _pShell->DeclareSymbol("persistent user INDEX amp_bConversion;", &amp_bConversion);

  _pShell->DeclareSymbol("persistent user FLOAT amp_fSpeedMultiplier;", &amp_fSpeedMultiplier);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fJumpMultiplier;", &amp_fJumpMultiplier);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fStartHealth;", &amp_fStartHealth);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fMaxHealth;", &amp_fMaxHealth);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fMaxArmor;", &amp_fMaxArmor);

  _pShell->DeclareSymbol("persistent user INDEX amp_iEnemyMultiplier;", &amp_iEnemyMultiplier);
  _pShell->DeclareSymbol("persistent user INDEX amp_bBalancedEnemies;", &amp_bBalancedEnemies);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fFireSpeed;", &amp_fFireSpeed);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fAmmoMultiplier;", &amp_fAmmoMultiplier);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fPowerupTimeMul;", &amp_fPowerupTimeMul);
  _pShell->DeclareSymbol("persistent user INDEX amp_bHeatDamage;", &amp_bHeatDamage);
  _pShell->DeclareSymbol("persistent user INDEX amp_bImpactDamage;", &amp_bImpactDamage);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fEnemyDamage;", &amp_fEnemyDamage);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fPlayerDamage;", &amp_fPlayerDamage);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fSelfDamage;", &amp_fSelfDamage);

  // Gameplay Options
  _pShell->DeclareSymbol("persistent user INDEX amp_bStartAmmo;", &amp_bStartAmmo);
  _pShell->DeclareSymbol("persistent user INDEX amp_bRocketDestruction;", &amp_bRocketDestruction);

  _pShell->DeclareSymbol("persistent user INDEX amp_iDualWeapons;", &amp_iDualWeapons);
  _pShell->DeclareSymbol("persistent user INDEX amp_bAllDualWeapons;", &amp_bAllDualWeapons);

  _pShell->DeclareSymbol("persistent user INDEX amp_iAltFire;", &amp_iAltFire);
  _pShell->DeclareSymbol("persistent user INDEX amp_bShotgunAlt;", &amp_bShotgunAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDShotgunAlt;", &amp_bDShotgunAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bTommygunAlt;", &amp_bTommygunAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bMinigunAlt;", &amp_bMinigunAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bRLauncherAlt;", &amp_bRLauncherAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bGLauncherAlt;", &amp_bGLauncherAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bFlamerAlt;", &amp_bFlamerAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bSniperAlt;", &amp_bSniperAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bLaserAlt;", &amp_bLaserAlt);
  _pShell->DeclareSymbol("persistent user INDEX amp_bCannonAlt;", &amp_bCannonAlt);

  _pShell->DeclareSymbol("persistent user FLOAT amp_fComboTime;", &amp_fComboTime);
  _pShell->DeclareSymbol("persistent user INDEX amp_bUnlimitedCombos;", &amp_bUnlimitedCombos);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fTokenPayout;", &amp_fTokenPayout);
  _pShell->DeclareSymbol("persistent user INDEX amp_bStrongerEnemies;", &amp_bStrongerEnemies);
  _pShell->DeclareSymbol("persistent user FLOAT amp_fBossResistance;", &amp_fBossResistance);
  _pShell->DeclareSymbol("persistent user INDEX amp_bNoRocketJump;", &amp_bNoRocketJump);

  _pShell->DeclareSymbol("persistent user INDEX amp_bKeepSecrets;", &amp_bKeepSecrets);
  _pShell->DeclareSymbol("persistent user INDEX amp_bSharedWeapons;", &amp_bSharedWeapons);
  _pShell->DeclareSymbol("persistent user INDEX amp_iPlayerCollision;", &amp_iPlayerCollision);
  _pShell->DeclareSymbol("persistent user INDEX amp_bAutosave;", &amp_bAutosave);

  // Weapon Giver
  _pShell->DeclareSymbol("persistent user INDEX amp_bKnifeEnable;", &amp_bKnifeEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bChainsawEnable;", &amp_bChainsawEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bColtEnable;", &amp_bColtEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDColtEnable;", &amp_bDColtEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bShotgunEnable;", &amp_bShotgunEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDShotgunEnable;", &amp_bDShotgunEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bTommygunEnable;", &amp_bTommygunEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bMinigunEnable;", &amp_bMinigunEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bRLauncherEnable;", &amp_bRLauncherEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bGLauncherEnable;", &amp_bGLauncherEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bFlamerEnable;", &amp_bFlamerEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bSniperEnable;", &amp_bSniperEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bLaserEnable;", &amp_bLaserEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bCannonEnable;", &amp_bCannonEnable);

  // Item Removal
  _pShell->DeclareSymbol("persistent user INDEX amp_iWeaponItems;", &amp_iWeaponItems);
  _pShell->DeclareSymbol("persistent user INDEX amp_iReplaceWeapons;", &amp_iReplaceWeapons);
  _pShell->DeclareSymbol("persistent user INDEX amp_bTakeWeapons;", &amp_bTakeWeapons);

  _pShell->DeclareSymbol("persistent user INDEX amp_bKnifeItemEnable;", &amp_bKnifeItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bChainsawItemEnable;", &amp_bChainsawItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bColtItemEnable;", &amp_bColtItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bShotgunItemEnable;", &amp_bShotgunItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDShotgunItemEnable;", &amp_bDShotgunItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bTommygunItemEnable;", &amp_bTommygunItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bMinigunItemEnable;", &amp_bMinigunItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bRLauncherItemEnable;", &amp_bRLauncherItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bGLauncherItemEnable;", &amp_bGLauncherItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bFlamerItemEnable;", &amp_bFlamerItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bSniperItemEnable;", &amp_bSniperItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bLaserItemEnable;", &amp_bLaserItemEnable);
  _pShell->DeclareSymbol("persistent user INDEX amp_bCannonItemEnable;", &amp_bCannonItemEnable);

  _pShell->DeclareSymbol("persistent user INDEX amp_bInvulItem;", &amp_bInvulItem);
  _pShell->DeclareSymbol("persistent user INDEX amp_bInvisItem;", &amp_bInvisItem);
  _pShell->DeclareSymbol("persistent user INDEX amp_bDamageItem;", &amp_bDamageItem);
  _pShell->DeclareSymbol("persistent user INDEX amp_bSpeedItem;", &amp_bSpeedItem);

  // Restore default game options
  _pShell->DeclareSymbol("user void amp_RestoreDefaults(void);", &RestoreDefaultOptions);
};

// Get seasonal event
ESpecialEvent CurrentSeasonalEvent(void) {
  // get current time
  struct tm *tmNow;
  time_t slTime;
  time(&slTime);
  tmNow = localtime(&slTime);

  // current day
  const int iMonth = tmNow->tm_mon;
  const int iDay = tmNow->tm_mday;

  // get month
  switch (iMonth) {
    // February (Valentine's day)
    case 1:
      if (iDay >= 10 && iDay <= 17) {
        return ESE_VALENTINE;
      }
      break;

    // March (Sam's birthday)
    case 2:
      if (iDay >= 19 && iDay <= 23) {
        return ESE_BIRTHDAY;
      }
      break;

    // October (Halloween)
    case 9: return ESE_HALLOWEEN;

    // December (Christmas)
    case 11:
      if (tmNow->tm_mday >= 15) {
        return ESE_CHRISTMAS;
      }
      break;

    // January (Christmas)
    case 0:
      if (tmNow->tm_mday <= 15) {
        return ESE_CHRISTMAS;
      }
      break;
  }

  return ESE_NONE;
};

// Set new options
extern void SetAdvancedParameters(CSessionProperties &sp) {
  const BOOL bOpt = amp_bEnableOptions;

  sp.sp_fSpeedMultiplier = (bOpt ? amp_fSpeedMultiplier : 1.0f);
  sp.sp_fJumpMultiplier  = (bOpt ? amp_fJumpMultiplier : 1.0f);
  sp.sp_fStartHealth     = (bOpt ? amp_fStartHealth : 100.0f);
  sp.sp_fMaxHealth       = (bOpt ? amp_fMaxHealth : 200.0f);
  sp.sp_fMaxArmor        = (bOpt ? amp_fMaxArmor : 200.0f);

  sp.sp_iEnemyMultiplier = (bOpt ? amp_iEnemyMultiplier : 1);
  sp.sp_fFireSpeed       = (bOpt ? Clamp(amp_fFireSpeed, 0.01f, 100.0f) : 1.0f);
  sp.sp_fAmmoMultiplier  = (bOpt ? amp_fAmmoMultiplier : 1.0f);
  sp.sp_fPowerupTimeMul  = (bOpt ? amp_fPowerupTimeMul : 1.0f);
  sp.sp_fEnemyDamage     = (bOpt ? amp_fEnemyDamage : 1.0f);
  sp.sp_fPlayerDamage    = (bOpt ? amp_fPlayerDamage : 1.0f);
  sp.sp_fSelfDamage      = (bOpt ? amp_fSelfDamage : 1.0f);

  sp.sp_iPlayerCollision = amp_iPlayerCollision;
  sp.sp_iWeaponItems = amp_iWeaponItems;
  sp.sp_iReplaceWeapons = amp_iReplaceWeapons;

  sp.sp_fComboTime = amp_fComboTime;
  sp.sp_fTokenPayout = amp_fTokenPayout;
  sp.sp_fBossResistance = amp_fBossResistance;

  // main options
  sp.sp_iAMPOptions = (amp_bEnableOptions ? AMP_ENABLE : 0)
                    | (amp_bConversion    ? AMP_CONVERSION : 0)
                    | ((bOpt && amp_bHeatDamage)      ? AMP_HEAT : 0)
                    | ((bOpt && amp_bImpactDamage)    ? AMP_IMPACT : 0)
                    | ((bOpt && amp_bBalancedEnemies) ? AMP_BALANCED : 0)
                    | (amp_bStartAmmo         ? AMP_STARTAMMO : 0)
                    | (amp_bRocketDestruction ? AMP_ROCKETS : 0)
                    | (amp_bUnlimitedCombos   ? AMP_UNLIMITCOMBO : 0)
                    | (amp_bStrongerEnemies   ? AMP_ENEMIES : 0)
                    | (amp_bKeepSecrets       ? AMP_KEEPSECRETS : 0)
                    | (amp_bSharedWeapons     ? AMP_SHAREWEAPONS : 0)
                    | (amp_bAutosave          ? AMP_AUTOSAVE : 0)
                    | (amp_bTakeWeapons       ? AMP_TAKEWEAPONS : 0)
                    | (amp_bNoRocketJump      ? AMP_NOROCKETJUMP : 0);

  // weapon alt fire
  sp.sp_iAltFire = (amp_bShotgunAlt   ? WAF_SHOTGUN : 0)
                 | (amp_bDShotgunAlt  ? WAF_DSHOTGUN : 0)
                 | (amp_bTommygunAlt  ? WAF_TOMMYGUN : 0)
                 | (amp_bMinigunAlt   ? WAF_MINIGUN : 0)
                 | (amp_bRLauncherAlt ? WAF_RLAUNCHER : 0)
                 | (amp_bGLauncherAlt ? WAF_GLAUNCHER : 0)
                 | (amp_bFlamerAlt    ? WAF_FLAMER : 0)
                 | (amp_bSniperAlt    ? WAF_SNIPER : 0)
                 | (amp_bLaserAlt     ? WAF_LASER : 0)
                 | (amp_bCannonAlt    ? WAF_CANNON : 0);

  // two bits for the alt fire mode
  sp.sp_iAltFire |= (amp_iAltFire & 0x3);
  
  // dual weapons
  sp.sp_iDualWeapons = (amp_bAllDualWeapons ? DWF_ALLWEAPONS : 0);

  // dual weapons type
  sp.sp_iDualWeapons |= (amp_iDualWeapons & DWP_TYPE_MASK);

  // weapon giver
  sp.sp_iWeaponGiver = (amp_bKnifeEnable     ? IRF_KNIFE : 0)
                     | (amp_bChainsawEnable  ? IRF_CHAINSAW : 0)
                     | (amp_bColtEnable      ? IRF_COLT : 0)
                     | (amp_bDColtEnable     ? IRF_DCOLT : 0)
                     | (amp_bShotgunEnable   ? IRF_SHOTGUN : 0)
                     | (amp_bDShotgunEnable  ? IRF_DSHOTGUN : 0)
                     | (amp_bTommygunEnable  ? IRF_TOMMYGUN : 0)
                     | (amp_bMinigunEnable   ? IRF_MINIGUN : 0)
                     | (amp_bRLauncherEnable ? IRF_RLAUNCHER : 0)
                     | (amp_bGLauncherEnable ? IRF_GLAUNCHER : 0)
                     | (amp_bFlamerEnable    ? IRF_FLAMER : 0)
                     | (amp_bSniperEnable    ? IRF_SNIPER : 0)
                     | (amp_bLaserEnable     ? IRF_LASER : 0)
                     | (amp_bCannonEnable    ? IRF_CANNON : 0);

  // item removal
  sp.sp_iItemRemoval = (amp_bKnifeItemEnable     ? IRF_KNIFE : 0)
                     | (amp_bChainsawItemEnable  ? IRF_CHAINSAW : 0)
                     | (amp_bColtItemEnable      ? IRF_COLT|IRF_DCOLT : 0)
                     | (amp_bShotgunItemEnable   ? IRF_SHOTGUN : 0)
                     | (amp_bDShotgunItemEnable  ? IRF_DSHOTGUN : 0)
                     | (amp_bTommygunItemEnable  ? IRF_TOMMYGUN : 0)
                     | (amp_bMinigunItemEnable   ? IRF_MINIGUN : 0)
                     | (amp_bRLauncherItemEnable ? IRF_RLAUNCHER : 0)
                     | (amp_bGLauncherItemEnable ? IRF_GLAUNCHER : 0)
                     | (amp_bFlamerItemEnable    ? IRF_FLAMER : 0)
                     | (amp_bSniperItemEnable    ? IRF_SNIPER : 0)
                     | (amp_bLaserItemEnable     ? IRF_LASER : 0)
                     | (amp_bCannonItemEnable    ? IRF_CANNON : 0)
                     | (amp_bInvulItem  ? IRF_INVUL : 0)
                     | (amp_bInvisItem  ? IRF_INVIS : 0)
                     | (amp_bDamageItem ? IRF_DAMAGE : 0)
                     | (amp_bSpeedItem  ? IRF_SPEED : 0);
  
  // seasonal event
  sp.sp_eEvent = CurrentSeasonalEvent();
};
