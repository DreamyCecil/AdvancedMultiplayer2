// [Cecil] World & Gameplay Options Flags
#define AMP_ENABLE       (1 << 0)
#define AMP_HEAT         (1 << 1)
#define AMP_IMPACT       (1 << 2)
#define AMP_STARTAMMO    (1 << 3)
#define AMP_ROCKETS      (1 << 4)
#define AMP_UNLIMITCOMBO (1 << 5)
#define AMP_ENEMIES      (1 << 6)
#define AMP_KEEPSECRETS  (1 << 7)
#define AMP_AUTOSAVE     (1 << 8)
#define AMP_BALANCED     (1 << 9)
#define AMP_TAKEWEAPONS  (1 << 10)
#define AMP_NOROCKETJUMP (1 << 11)
#define AMP_CONVERSION   (1 << 12)
#define AMP_SHAREWEAPONS (1 << 13)

// [Cecil] Weapon Giver & Item Removal Flags
#define IRF_KNIFE     (1 << 0)
#define IRF_COLT      (1 << 1)
#define IRF_DCOLT     (1 << 2)
#define IRF_SHOTGUN   (1 << 3)
#define IRF_DSHOTGUN  (1 << 4)
#define IRF_TOMMYGUN  (1 << 5)
#define IRF_MINIGUN   (1 << 6)
#define IRF_RLAUNCHER (1 << 7)
#define IRF_GLAUNCHER (1 << 8)
#define IRF_CHAINSAW  (1 << 9)
#define IRF_FLAMER    (1 << 10)
#define IRF_LASER     (1 << 11)
#define IRF_SNIPER    (1 << 12)
#define IRF_CANNON    (1 << 13)

#define IRF_INVUL  (1 << 14)
#define IRF_INVIS  (1 << 15)
#define IRF_DAMAGE (1 << 16)
#define IRF_SPEED  (1 << 17)

// [Cecil] Weapon alt fire flags
#define WAF_SHOTGUN   (1 << 3)
#define WAF_DSHOTGUN  (1 << 4)
#define WAF_TOMMYGUN  (1 << 5)
#define WAF_MINIGUN   (1 << 6)
#define WAF_RLAUNCHER (1 << 7)
#define WAF_GLAUNCHER (1 << 8)
#define WAF_FLAMER    (1 << 10)
#define WAF_LASER     (1 << 11)
#define WAF_SNIPER    (1 << 12)
#define WAF_CANNON    (1 << 13)

// [Cecil] Dual weapon modes
#define DWP_NO     0
#define DWP_TWO    1
#define DWP_ALWAYS 2

#define DWP_TYPE_MASK 0x3

// [Cecil] Dual weapon flags
#define DWF_ALLWEAPONS (1 << 2)

// [Cecil] Seasonal events
enum ESpecialEvent {
  ESE_NONE,
  ESE_VALENTINE, // 14th of February / a week with 14th on the 4th day
  ESE_BIRTHDAY,  // 21st of March / the whole of March
  ESE_HALLOWEEN, // the whole of october
  ESE_CHRISTMAS, // from 15th of December to 15th of January
};

// Class responsible for describing game session
class CSessionProperties {
  public:
    enum GameMode {
      GM_FLYOVER = -1,
      GM_COOPERATIVE = 0,
      GM_SINGLEPLAYER, // [Cecil] SP maps in cooperative
      GM_SCOREMATCH,
      GM_FRAGMATCH,
    };

    enum GameDifficulty {
      GD_TOURIST = -1,
      GD_EASY = 0,
      GD_NORMAL,
      GD_HARD,
      GD_EXTREME,
    };

    INDEX sp_ctMaxPlayers;   // maximum number of players in game
    BOOL sp_bWaitAllPlayers; // wait for all players to connect
    BOOL sp_bQuickTest;      // set when game is tested from wed
    BOOL sp_bCooperative;    // players are not intended to kill each other
    BOOL sp_bSinglePlayer;   // single player mode has some special rules
    BOOL sp_bUseFrags;       // set if frags matter instead of score

    enum GameMode sp_gmGameMode; // general game rules

    enum GameDifficulty sp_gdGameDifficulty;
    ULONG sp_ulSpawnFlags;
    BOOL sp_bMental; // set if mental mode engaged

    INDEX sp_iScoreLimit; // stop game after a player/team reaches given score
    INDEX sp_iFragLimit;  // stop game after a player/team reaches given score
    INDEX sp_iTimeLimit;  // stop game after given number of minutes elapses

    BOOL sp_bTeamPlay;         // players are divided in teams
    BOOL sp_bFriendlyFire;     // can harm player of same team
    BOOL sp_bWeaponsStay;      // weapon items do not dissapear when picked-up
    BOOL sp_bAmmoStays;        // ammo items do not dissapear when picked-up
    BOOL sp_bHealthArmorStays; // health/armor items do exist
    BOOL sp_bPlayEntireGame;   // don't finish after one level in coop
    BOOL sp_bAllowHealth;      // health items do exist
    BOOL sp_bAllowArmor;       // armor items do exist
    BOOL sp_bInfiniteAmmo;     // ammo is not consumed when firing
    BOOL sp_bRespawnInPlace;   // players respawn on the place where they were killed, not on markers (coop only)

    FLOAT sp_fEnemyMovementSpeed; // enemy speed multiplier
    FLOAT sp_fEnemyAttackSpeed;   // enemy speed multiplier
    FLOAT sp_fDamageStrength;     // multiplier when damaged
    FLOAT sp_fAmmoQuantity;       // multiplier when picking up ammo
    FLOAT sp_fManaTransferFactor; // multiplier for the killed player mana that is to be added to killer's mana
    INDEX sp_iInitialMana;        // life price (mana that each player'll have upon respawning)
    FLOAT sp_fExtraEnemyStrength;          // fixed adder for extra enemy power 
    FLOAT sp_fExtraEnemyStrengthPerPlayer; // adder for extra enemy power per each player playing

    INDEX sp_ctCredits; // number of credits for this game
    INDEX sp_ctCreditsLeft; // number of credits left on this level
    FLOAT sp_tmSpawnInvulnerability; // how many seconds players are invunerable after respawning

    BOOL sp_bGibs; // enable/disable gibbing
    BOOL sp_bEndOfGame; // marked when dm game is finished (any of the limits reached)
    ULONG sp_ulLevelsMask; // mask of visited levels so far
    BOOL sp_bUseExtraEnemies; // spawn extra multiplayer enemies

    // [Cecil] Advanced Multiplayer Options
    INDEX sp_iAMPOptions; // main gameplay flags
    FLOAT sp_fSpeedMultiplier;
    FLOAT sp_fJumpMultiplier;
    FLOAT sp_fStartHealth;
    FLOAT sp_fMaxHealth;
    FLOAT sp_fMaxArmor;
    INDEX sp_iEnemyMultiplier;
    FLOAT sp_fFireSpeed;
    FLOAT sp_fAmmoMultiplier;
    FLOAT sp_fPowerupTimeMul;
    FLOAT sp_fEnemyDamage;
    FLOAT sp_fPlayerDamage;
    FLOAT sp_fSelfDamage;

    FLOAT sp_fComboTime;
    FLOAT sp_fTokenPayout;
    INDEX sp_iDualWeapons;
    INDEX sp_iAltFire;
    INDEX sp_iPlayerCollision;
    INDEX sp_iWeaponItems;
    INDEX sp_iReplaceWeapons;
    INDEX sp_iWeaponGiver; // weapon giver flags
    INDEX sp_iItemRemoval; // item removal flags
    FLOAT sp_fBossResistance;

    ESpecialEvent sp_eEvent;

    // [Cecil] Get alt fire mode
    INDEX AltMode(void) const {
      // two bits for modes
      return (sp_iAltFire & 0x3);
    };

    // [Cecil] Get dual weapons mode
    INDEX DualWeapons(void) const {
      return (sp_iDualWeapons & DWP_TYPE_MASK);
    };
};

// NOTE: Never instantiate CSessionProperties, as its size is not fixed to the size defined in engine
//       Use CUniversalSessionProperties for instantiating an object
class CUniversalSessionProperties {
  public:
    union {
      CSessionProperties usp_sp;
      UBYTE usp_aubDummy[NET_MAXSESSIONPROPERTIES];
    };

    // Must have exact the size as allocated block in engine
    CUniversalSessionProperties() { 
      ASSERT(sizeof(CSessionProperties) <= NET_MAXSESSIONPROPERTIES); 
      ASSERT(sizeof(CUniversalSessionProperties) == NET_MAXSESSIONPROPERTIES); 
    }

    operator CSessionProperties&(void) { return usp_sp; }
};

