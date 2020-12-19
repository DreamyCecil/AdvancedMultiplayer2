#include "stdafx.h"
#include "Game.h"

extern FLOAT gam_afEnemyMovementSpeed[5];
extern FLOAT gam_afEnemyAttackSpeed[5];
extern FLOAT gam_afDamageStrength[5];
extern FLOAT gam_afAmmoQuantity[5];
extern FLOAT gam_fManaTransferFactor;
extern FLOAT gam_fExtraEnemyStrength;
extern FLOAT gam_fExtraEnemyStrengthPerPlayer;
extern INDEX gam_iCredits;
extern FLOAT gam_tmSpawnInvulnerability;
extern INDEX gam_iScoreLimit;
extern INDEX gam_iFragLimit;
extern INDEX gam_iTimeLimit;
extern INDEX gam_ctMaxPlayers;
extern INDEX gam_bWaitAllPlayers;
extern INDEX gam_bAmmoStays;
extern INDEX gam_bHealthArmorStays;
extern INDEX gam_bAllowHealth;
extern INDEX gam_bAllowArmor;
extern INDEX gam_bInfiniteAmmo;
extern INDEX gam_bRespawnInPlace;
extern INDEX gam_bPlayEntireGame;
extern INDEX gam_bWeaponsStay;
extern INDEX gam_bFriendlyFire;
extern INDEX gam_iInitialMana;
extern INDEX gam_iQuickStartDifficulty;
extern INDEX gam_iQuickStartMode;
extern INDEX gam_bQuickStartMP;
extern INDEX gam_iStartDifficulty;
extern INDEX gam_iStartMode;
extern INDEX gam_iBlood;
extern INDEX gam_bGibs;
extern INDEX gam_bUseExtraEnemies;
extern CTString gam_strGameSpyExtras;

// [Cecil] World Options
extern INDEX amp_bEnableOptions;
extern INDEX amp_bConversion;

extern FLOAT amp_fSpeedMultiplier;
extern FLOAT amp_fJumpMultiplier;
extern FLOAT amp_fStartHealth;
extern FLOAT amp_fMaxHealth;
extern FLOAT amp_fMaxArmor;

extern INDEX amp_iEnemyMultiplier;
extern INDEX amp_bBalancedEnemies;
extern FLOAT amp_fFireSpeed;
extern FLOAT amp_fAmmoMultiplier;
extern FLOAT amp_fPowerupTimeMul;
extern INDEX amp_bHeatDamage;
extern INDEX amp_bImpactDamage;
extern FLOAT amp_fEnemyDamage;
extern FLOAT amp_fPlayerDamage;
extern FLOAT amp_fSelfDamage;

// [Cecil] Gameplay Options
extern INDEX amp_bStartAmmo;
extern INDEX amp_bRocketDestruction;

extern INDEX amp_iAltFire;
extern INDEX amp_bShotgunAlt;
extern INDEX amp_bDShotgunAlt;
extern INDEX amp_bTommygunAlt;
extern INDEX amp_bMinigunAlt;
extern INDEX amp_bRLauncherAlt;
extern INDEX amp_bGLauncherAlt;
extern INDEX amp_bFlamerAlt;
extern INDEX amp_bSniperAlt;
extern INDEX amp_bLaserAlt;
extern INDEX amp_bCannonAlt;

extern FLOAT amp_fComboTime;
extern INDEX amp_bUnlimitedCombos;
extern FLOAT amp_fTokenPayout;
extern INDEX amp_bStrongerEnemies;
extern FLOAT amp_fBossResistance;
extern INDEX amp_bNoRocketJump;

extern INDEX amp_bKeepSecrets;
extern INDEX amp_iPlayerCollision;
extern INDEX amp_bAutosave;

// [Cecil] Weapon Giver
extern INDEX amp_bKnifeEnable;
extern INDEX amp_bChainsawEnable;
extern INDEX amp_bColtEnable;
extern INDEX amp_bDColtEnable;
extern INDEX amp_bShotgunEnable;
extern INDEX amp_bDShotgunEnable;
extern INDEX amp_bTommygunEnable;
extern INDEX amp_bMinigunEnable;
extern INDEX amp_bRLauncherEnable;
extern INDEX amp_bGLauncherEnable;
extern INDEX amp_bFlamerEnable;
extern INDEX amp_bSniperEnable;
extern INDEX amp_bLaserEnable;
extern INDEX amp_bCannonEnable;

// [Cecil] Item Removal
extern INDEX amp_iWeaponItems;
extern INDEX amp_iReplaceWeapons;
extern INDEX amp_bTakeWeapons;

extern INDEX amp_bKnifeItemEnable;
extern INDEX amp_bChainsawItemEnable;
extern INDEX amp_bColtItemEnable;
extern INDEX amp_bShotgunItemEnable;
extern INDEX amp_bDShotgunItemEnable;
extern INDEX amp_bTommygunItemEnable;
extern INDEX amp_bMinigunItemEnable;
extern INDEX amp_bRLauncherItemEnable;
extern INDEX amp_bGLauncherItemEnable;
extern INDEX amp_bFlamerItemEnable;
extern INDEX amp_bSniperItemEnable;
extern INDEX amp_bLaserItemEnable;
extern INDEX amp_bCannonItemEnable;

extern INDEX amp_bInvulItem;
extern INDEX amp_bInvisItem;
extern INDEX amp_bDamageItem;
extern INDEX amp_bSpeedItem;

// [Cecil] Set new options
static void SetAdvancedParameters(CSessionProperties &sp) {
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
};

static void SetGameModeParameters(CSessionProperties &sp) {
  sp.sp_gmGameMode = (CSessionProperties::GameMode) Clamp(INDEX(gam_iStartMode), -1L, 3L);

  switch (sp.sp_gmGameMode) {
    default:
      ASSERT(FALSE);
    case CSessionProperties::GM_COOPERATIVE:
    case CSessionProperties::GM_SINGLEPLAYER:
      sp.sp_ulSpawnFlags |= SPF_SINGLEPLAYER|SPF_COOPERATIVE;
      break;
    case CSessionProperties::GM_FLYOVER:
      sp.sp_ulSpawnFlags |= SPF_FLYOVER|SPF_MASK_DIFFICULTY;
      break;
    case CSessionProperties::GM_SCOREMATCH:
    case CSessionProperties::GM_FRAGMATCH:
      sp.sp_ulSpawnFlags |= SPF_DEATHMATCH;
      break;
  }
};

static void SetDifficultyParameters(CSessionProperties &sp) {
  INDEX iDifficulty = gam_iStartDifficulty;
  if (iDifficulty==4) {
    sp.sp_bMental = TRUE;
    iDifficulty=2;
  } else {
    sp.sp_bMental = FALSE;
  }
  sp.sp_gdGameDifficulty = (CSessionProperties::GameDifficulty) Clamp(INDEX(iDifficulty), -1L, 3L);

  switch (sp.sp_gdGameDifficulty) {
  case CSessionProperties::GD_TOURIST:
    sp.sp_ulSpawnFlags = SPF_EASY;//SPF_TOURIST; !!!!
    sp.sp_fEnemyMovementSpeed = gam_afEnemyMovementSpeed [0];
    sp.sp_fEnemyAttackSpeed   = gam_afEnemyAttackSpeed   [0];
    sp.sp_fDamageStrength     = gam_afDamageStrength     [0];
    sp.sp_fAmmoQuantity       = gam_afAmmoQuantity       [0];
    break;
  case CSessionProperties::GD_EASY:
    sp.sp_ulSpawnFlags = SPF_EASY;
    sp.sp_fEnemyMovementSpeed = gam_afEnemyMovementSpeed [1];
    sp.sp_fEnemyAttackSpeed   = gam_afEnemyAttackSpeed   [1];
    sp.sp_fDamageStrength     = gam_afDamageStrength     [1];
    sp.sp_fAmmoQuantity       = gam_afAmmoQuantity       [1];
    break;
  default:
    ASSERT(FALSE);
  case CSessionProperties::GD_NORMAL:
    sp.sp_ulSpawnFlags = SPF_NORMAL;
    sp.sp_fEnemyMovementSpeed = gam_afEnemyMovementSpeed [2];
    sp.sp_fEnemyAttackSpeed   = gam_afEnemyAttackSpeed   [2];
    sp.sp_fDamageStrength     = gam_afDamageStrength     [2];
    sp.sp_fAmmoQuantity       = gam_afAmmoQuantity       [2];
    break;
  case CSessionProperties::GD_HARD:
    sp.sp_ulSpawnFlags = SPF_HARD;
    sp.sp_fEnemyMovementSpeed = gam_afEnemyMovementSpeed [3];
    sp.sp_fEnemyAttackSpeed   = gam_afEnemyAttackSpeed   [3];
    sp.sp_fDamageStrength     = gam_afDamageStrength     [3];
    sp.sp_fAmmoQuantity       = gam_afAmmoQuantity       [3];
    break;
  case CSessionProperties::GD_EXTREME:
    sp.sp_ulSpawnFlags = SPF_EXTREME;
    sp.sp_fEnemyMovementSpeed = gam_afEnemyMovementSpeed [4];
    sp.sp_fEnemyAttackSpeed   = gam_afEnemyAttackSpeed   [4];
    sp.sp_fDamageStrength     = gam_afDamageStrength     [4];
    sp.sp_fAmmoQuantity       = gam_afAmmoQuantity       [4];
    break;
  }
};

// set properties for a single player session
void CGame::SetSinglePlayerSession(CSessionProperties &sp) {
  // clear
  memset(&sp, 0, sizeof(sp));

  SetDifficultyParameters(sp);
  SetGameModeParameters(sp);
  sp.sp_ulSpawnFlags &= ~SPF_COOPERATIVE;

  sp.sp_bEndOfGame = FALSE;

  sp.sp_ctMaxPlayers = 1;
  sp.sp_bWaitAllPlayers = FALSE;
  sp.sp_bQuickTest = FALSE;
  sp.sp_bCooperative = TRUE;
  sp.sp_bSinglePlayer = TRUE;
  sp.sp_bUseFrags = FALSE;

  sp.sp_iScoreLimit = 0;
  sp.sp_iFragLimit  = 0; 
  sp.sp_iTimeLimit  = 0; 

  sp.sp_ctCredits     = 0;
  sp.sp_ctCreditsLeft = 0;
  sp.sp_tmSpawnInvulnerability = 0;

  sp.sp_bTeamPlay = FALSE;
  sp.sp_bFriendlyFire = FALSE;
  sp.sp_bWeaponsStay = FALSE;
  sp.sp_bPlayEntireGame = TRUE;

  sp.sp_bAmmoStays        = FALSE;
  sp.sp_bHealthArmorStays = FALSE;
  sp.sp_bAllowHealth = TRUE;
  sp.sp_bAllowArmor = TRUE;
  sp.sp_bInfiniteAmmo = FALSE;
  sp.sp_bRespawnInPlace = FALSE;
  sp.sp_fExtraEnemyStrength          = 0;
  sp.sp_fExtraEnemyStrengthPerPlayer = 0;

  // [Cecil] Doesn't depend on the game
  //sp.sp_iBlood = Clamp( gam_iBlood, 0L, 3L);
  sp.sp_bGibs  = gam_bGibs;

  SetAdvancedParameters(sp);
};

// set properties for a quick start session
void CGame::SetQuickStartSession(CSessionProperties &sp) {
  gam_iStartDifficulty = gam_iQuickStartDifficulty;
  gam_iStartMode = gam_iQuickStartMode;

  // same as single player
  if (!gam_bQuickStartMP) {
    SetSinglePlayerSession(sp);
  } else {
    SetMultiPlayerSession(sp);
  }
  // quick start type
  sp.sp_bQuickTest = TRUE;
};

// set properties for a multiplayer session
void CGame::SetMultiPlayerSession(CSessionProperties &sp) {
  // clear
  memset(&sp, 0, sizeof(sp));

  SetDifficultyParameters(sp);
  SetGameModeParameters(sp);

  // [Cecil] Exclude coop flag for singleplayer mode
  if (sp.sp_gmGameMode == CSessionProperties::GM_SINGLEPLAYER) {
    sp.sp_ulSpawnFlags &= ~SPF_COOPERATIVE;
  } else {
    sp.sp_ulSpawnFlags &= ~SPF_SINGLEPLAYER;
  }

  sp.sp_bEndOfGame = FALSE;

  sp.sp_bQuickTest = FALSE;
  // [Cecil] Singleplayer in coop counts as coop
  sp.sp_bCooperative = (sp.sp_gmGameMode == CSessionProperties::GM_COOPERATIVE || sp.sp_gmGameMode == CSessionProperties::GM_SINGLEPLAYER);
  sp.sp_bSinglePlayer = FALSE;
  sp.sp_bPlayEntireGame = gam_bPlayEntireGame;
  sp.sp_bUseFrags = (sp.sp_gmGameMode == CSessionProperties::GM_FRAGMATCH);
  sp.sp_bWeaponsStay = gam_bWeaponsStay;
  sp.sp_bFriendlyFire = gam_bFriendlyFire;
  sp.sp_ctMaxPlayers = gam_ctMaxPlayers;
  sp.sp_bWaitAllPlayers = gam_bWaitAllPlayers;

  sp.sp_bAmmoStays        = gam_bAmmoStays       ;
  sp.sp_bHealthArmorStays = gam_bHealthArmorStays;
  sp.sp_bAllowHealth      = gam_bAllowHealth     ;
  sp.sp_bAllowArmor       = gam_bAllowArmor      ;
  sp.sp_bInfiniteAmmo     = gam_bInfiniteAmmo    ;
  sp.sp_bRespawnInPlace   = gam_bRespawnInPlace  ;

  sp.sp_fManaTransferFactor = gam_fManaTransferFactor;
  sp.sp_fExtraEnemyStrength          = gam_fExtraEnemyStrength         ;
  sp.sp_fExtraEnemyStrengthPerPlayer = gam_fExtraEnemyStrengthPerPlayer;
  sp.sp_iInitialMana        = gam_iInitialMana;

  // [Cecil] Doesn't depend on the game
  //sp.sp_iBlood = Clamp( gam_iBlood, 0L, 3L);
  sp.sp_bGibs  = gam_bGibs;
  sp.sp_tmSpawnInvulnerability = gam_tmSpawnInvulnerability;

  sp.sp_bUseExtraEnemies = gam_bUseExtraEnemies;

  SetAdvancedParameters(sp);

  // set credits and limits
  if (sp.sp_bCooperative) {
    sp.sp_ctCredits     = gam_iCredits;
    sp.sp_ctCreditsLeft = gam_iCredits;
    sp.sp_iScoreLimit = 0;
    sp.sp_iFragLimit  = 0;
    sp.sp_iTimeLimit  = 0;
    sp.sp_bAllowHealth = TRUE;
    sp.sp_bAllowArmor  = TRUE;

  } else {
    sp.sp_ctCredits     = -1;
    sp.sp_ctCreditsLeft = -1;
    sp.sp_iScoreLimit = gam_iScoreLimit;
    sp.sp_iFragLimit  = gam_iFragLimit;
    sp.sp_iTimeLimit  = gam_iTimeLimit;
    sp.sp_bWeaponsStay = FALSE;
    sp.sp_bAmmoStays = FALSE;
    sp.sp_bHealthArmorStays = FALSE;
    if (sp.sp_bUseFrags) {
      sp.sp_iScoreLimit = 0;
    } else {
      sp.sp_iFragLimit = 0;
    }
  }
};

BOOL IsMenuEnabled(const CTString &strMenuName) {
  if (strMenuName=="Single Player") {
    return FALSE;
  } else if (strMenuName=="Network"      ) {
    return TRUE;
  } else if (strMenuName=="Split Screen" ) {
    return TRUE;
  } else if (strMenuName=="High Score"   ) {
    return FALSE;
  } else if (strMenuName=="Training"   ) {
    return FALSE;
  } else if (strMenuName=="Technology Test") {
    return TRUE;
  } else {
    return TRUE;
  }
};

CTString GetGameTypeName(INDEX iMode) {
  switch (iMode) {
  default:
    return "";
    break;
  case CSessionProperties::GM_COOPERATIVE:
    return TRANS("Cooperative");
    break;
  case CSessionProperties::GM_SINGLEPLAYER:
    return TRANS("Singleplayer Maps");
    break;
  case CSessionProperties::GM_FLYOVER:
    return TRANS("Flyover");
    break;
  case CSessionProperties::GM_SCOREMATCH:
    return TRANS("Scorematch");
    break;
  case CSessionProperties::GM_FRAGMATCH:
    return TRANS("Fragmatch");
    break;
  }
};

CTString GetCurrentGameTypeName() {
  const CSessionProperties &sp = *GetSP();
  return GetGameTypeName(sp.sp_gmGameMode);
};

CTString GetGameSpyRulesInfo(void) {
  CTString strOut;
  CTString strKey;
  const CSessionProperties &sp = *GetSP();


  CTString strDifficulty;
  if (sp.sp_bMental) {
    strDifficulty = TRANS("Mental");
  } else {
    switch(sp.sp_gdGameDifficulty) {
    case CSessionProperties::GD_TOURIST:
      strDifficulty = TRANS("Tourist");
      break;
    case CSessionProperties::GD_EASY:
      strDifficulty = TRANS("Easy");
      break;
    default:
      ASSERT(FALSE);
    case CSessionProperties::GD_NORMAL:
      strDifficulty = TRANS("Normal");
      break;
    case CSessionProperties::GD_HARD:
      strDifficulty = TRANS("Hard");
      break;
    case CSessionProperties::GD_EXTREME:
      strDifficulty = TRANS("Serious");
      break;
    }
  }

  strKey.PrintF("\\difficulty\\%s", (const char*)strDifficulty);
  strOut+=strKey;

  strKey.PrintF("\\friendlyfire\\%d", sp.sp_bFriendlyFire?0:1);
  strOut+=strKey;
  
  strKey.PrintF("\\weaponsstay\\%d", sp.sp_bWeaponsStay?0:1);
  strOut+=strKey;

  strKey.PrintF("\\ammostays\\%d", sp.sp_bAmmoStays                   ?0:1); strOut+=strKey;
  strKey.PrintF("\\healthandarmorstays\\%d", sp.sp_bHealthArmorStays  ?0:1); strOut+=strKey;
  strKey.PrintF("\\allowhealth\\%d", sp.sp_bAllowHealth               ?0:1); strOut+=strKey;
  strKey.PrintF("\\allowarmor\\%d", sp.sp_bAllowArmor                 ?0:1); strOut+=strKey;
  strKey.PrintF("\\infiniteammo\\%d", sp.sp_bInfiniteAmmo             ?0:1); strOut+=strKey;
  strKey.PrintF("\\respawninplace\\%d", sp.sp_bRespawnInPlace         ?0:1); strOut+=strKey;

  if (sp.sp_bCooperative) {
    if (sp.sp_ctCredits<0) {
      strKey.PrintF("\\credits\\infinite");
      strOut+=strKey;
    } else if (sp.sp_ctCredits>0) {
      strKey.PrintF("\\credits\\%d", sp.sp_ctCredits);
      strOut+=strKey;
      strKey.PrintF("\\credits_left\\%d", sp.sp_ctCreditsLeft);
      strOut+=strKey;
    }
  } else {
    if (sp.sp_bUseFrags && sp.sp_iFragLimit>0) {
      strKey.PrintF("\\fraglimit\\%d", sp.sp_iFragLimit);
      strOut+=strKey;
    }
    if (!sp.sp_bUseFrags && sp.sp_iScoreLimit>0) {
      strKey.PrintF("\\fraglimit\\%d", sp.sp_iScoreLimit);
      strOut+=strKey;
    }
    if (sp.sp_iTimeLimit>0) {
      strKey.PrintF("\\timelimit\\%d", sp.sp_iTimeLimit);
      strOut+=strKey;
    }
  }

  strOut+=gam_strGameSpyExtras;
  return strOut;
};

ULONG GetSpawnFlagsForGameType(INDEX iGameType) {
  switch(iGameType) {
    default:
      ASSERT(FALSE);
    case CSessionProperties::GM_COOPERATIVE:  return SPF_COOPERATIVE;
    case CSessionProperties::GM_SINGLEPLAYER: return SPF_SINGLEPLAYER;
    // [Cecil] Allow coop maps in deathmatch
    case CSessionProperties::GM_SCOREMATCH:   return SPF_COOPERATIVE|SPF_DEATHMATCH;
    case CSessionProperties::GM_FRAGMATCH:    return SPF_COOPERATIVE|SPF_DEATHMATCH;
  };
};