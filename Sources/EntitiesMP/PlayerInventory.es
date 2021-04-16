408
%{
#include "StdH.h"
#include "EntitiesMP/Player.h"
#include "EntitiesMP/PlayerWeapons.h"

#define PLAYER_POWERUPS 4

// Max powerup times
static const FLOAT _afPowerupMaxTime[PLAYER_POWERUPS] = {
  30.0f,
  30.0f,
  40.0f,
  20.0f,
};

// Powerup factors
static const FLOAT _afPowerupFactor[PLAYER_POWERUPS] = {
  0.0625f, // alpha percentage (other players)
  0.0f, // received damage
  4.0f, // damage multiplier
  2.0f, // speed multiplier
};
%}

uses "EntitiesMP/PowerUpItem";

// Input parameter for the inventory
event EInventoryInit {
  CEntityPointer penPlayer, // who owns it
};

%{
void CPlayerInventory_Precache(void) {
  CDLLEntityClass *pdec = &CPlayerInventory_DLLClass;
};
%}

class export CPlayerInventory : CRationalEntity {
name      "Player Inventory";
thumbnail "";
features  "CanBePredictable";

properties:
  1 CEntityPointer m_penPlayer, // player who owns it
  2 CEntityPointer m_penWeapons1, // player's main weapon
  3 CEntityPointer m_penWeapons2, // player's extra weapon

 // Powerup timers
 10 FLOAT m_tmInvis  = 0.0f,
 11 FLOAT m_tmInvul  = 0.0f,
 12 FLOAT m_tmDamage = 0.0f,
 13 FLOAT m_tmSpeed  = 0.0f,

{
  // Player's personal arsenal
  CWeaponArsenal m_aWeapons;
  CAmmunition m_aAmmo;
}

components:
  1 class CLASS_WEAPONS "Classes\\PlayerWeapons.ecl",

functions:
  // Constructor
  void CPlayerInventory(void) {
    // copy ammo
    INDEX ctAmmo = _awaWeaponAmmo.Count();
    m_aAmmo.New(ctAmmo);

    for (INDEX iAmmo = 0; iAmmo < ctAmmo; iAmmo++) {
      m_aAmmo[iAmmo].pwaAmmoStruct = &_awaWeaponAmmo[iAmmo];
    }

    // copy weapons
    INDEX ctWeapons = _awsPlayerWeapons.Count();
    m_aWeapons.New(ctWeapons);

    for (INDEX iWeapon = 0; iWeapon < ctWeapons; iWeapon++) {
      SPlayerWeapon &pw = m_aWeapons[iWeapon];
      pw.pwsWeapon = &_awsPlayerWeapons[iWeapon];

      // set ammo
      ULONG *pulID = pw.GetAmmoID();

      if (pulID != NULL) {
        pw.ppaAmmo = &m_aAmmo[*pulID];
      }
      
      // set alt ammo
      pulID = pw.GetAltID();

      if (pulID != NULL) {
        pw.ppaAlt = &m_aAmmo[*pulID];
      }
    }

    // [Cecil] TEMP: See copied weapons
    /*CTString str = "";
    for (iWeapon = 0; iWeapon < ctWeapons; iWeapon++) {
      SPlayerWeapon &pw = m_aWeapons[iWeapon];

      str.PrintF("%s%d: ammo: %d, alt %d\n", str, pw.pwsWeapon->ulID, (pw.GetAmmoID() != NULL ? *pw.GetAmmoID() : -1), (pw.GetAltID() != NULL ? *pw.GetAltID() : -1));
    }
    FatalError(str);*/
  };

  // Write weapons and ammo
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

  // Read weapons and ammo
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

  // Add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penPlayer->AddToPrediction();
    m_penWeapons1->AddToPrediction();
    m_penWeapons2->AddToPrediction();
  };

  // Get predicted inventory
  CPlayerInventory *PredTail(void) {
    return (CPlayerInventory*)GetPredictionTail();
  };

  // Get player entity
  CPlayer *GetPlayer(void) {
    return (CPlayer*)&*m_penPlayer;
  };

  // Get some weapon
  CPlayerWeapons *GetWeapon(const INDEX &iExtra) {
    return (CPlayerWeapons*)&*(&m_penWeapons1)[iExtra];
  };

  // Render particles
  void RenderParticles(void) {
  };

  // Weapon functions

  // Clear weapons
  void ClearWeapons(void) {
    // don't clear secret weapons in coop
    BOOL bClear = !GetSP()->sp_bCooperative || !(GetSP()->sp_iAMPOptions & AMP_KEEPSECRETS);

    if (bClear) {
      // 0x03 -> 0x00
      GetWeapon(0)->m_iAvailableWeapons = 0x00;
      GetWeapon(1)->m_iAvailableWeapons = 0x00;
    }

    // clear ammo amounts
    INDEX iClear;
    for (iClear = 0; iClear < m_aAmmo.Count(); iClear++) {
      m_aAmmo[iClear].iAmount = 0;
    }

    // clear magazines
    for (iClear = 0; iClear < m_aWeapons.Count(); iClear++) {
      m_aWeapons[iClear].iMag = 0;
    }
  };

  // Cheat give all
  void CheatGiveAll(void) {
    // all weapons
    GetWeapon(0)->m_iAvailableWeapons = 0x3FFF;
    GetWeapon(1)->m_iAvailableWeapons = 0x3FFF;

    // [Cecil] Give all ammo
    for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
      m_aAmmo[i].SetMax();
    }

    // precache eventual new weapons
    GetWeapon(0)->Precache();
  };

  // Clamp amounts of all ammunition to maximum values
  void ClampAllAmmo(void) {
    for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
      INDEX &iAmmo = m_aAmmo[i].iAmount;
      
      // limit ammo
      iAmmo = ClampUp(iAmmo, m_aAmmo[i].Max());
    }
  };

  // Get current ammo
  INDEX CurrentAmmo(const INDEX &iWeapon) {
    SPlayerAmmo *ppaAmmo = PredTail()->m_aWeapons[iWeapon].ppaAmmo;
    return (ppaAmmo == NULL ? 0 : ppaAmmo->iAmount);
  };

  /*INDEX CurrentAlt(void) {
    SPlayerAmmo *ppaAlt = PredTail()->CUR_WEAPON.ppaAlt;
    return (ppaAlt == NULL ? 0 : ppaAlt->iAmount);
  };

  // Get weapon's ammo
  SPlayerAmmo *GetWeaponAmmo(BOOL bAlt) {
    SPlayerAmmo *ppaAmmo = CUR_WEAPON.ppaAmmo;
    SPlayerAmmo *ppaAlt = CUR_WEAPON.ppaAlt;

    return (bAlt ? ppaAlt : ppaAmmo);
  };*/

  // Get weapon damage
  FLOAT GetDamage(INDEX iWeapon) {
    SWeaponStruct &ws = *m_aWeapons[iWeapon].pwsWeapon;
    BOOL bCoop = (GetSP()->sp_bCooperative || ws.fDamageDM <= 0.0f);
    
    return (bCoop ? ws.fDamage : ws.fDamageDM);
  };

  FLOAT GetDamageAlt(INDEX iWeapon) {
    SWeaponStruct &ws = *m_aWeapons[iWeapon].pwsWeapon;
    BOOL bCoop = (GetSP()->sp_bCooperative || ws.fDamageAltDM <= 0.0f);
    
    return (bCoop ? ws.fDamageAlt : ws.fDamageAltDM);
  };

  // Powerup functions

  // Render powerup particles for some entity
  void PowerupParticles(CEntity *pen, CModelObject *pmo, const CPlacement3D &pl, const FLOAT2D &vFactors) {
    const FLOAT tmNow = _pTimer->CurrentTick();

    // invulnerability and damage
    const BOOL bInvul = m_tmInvul > tmNow;
    const BOOL bDamage = m_tmDamage > tmNow;

    if (bInvul && bDamage) {
      Particles_ModelGlow2(pmo, pl, Max(m_tmDamage, m_tmInvul), PT_STAR08, vFactors(1), 2, vFactors(2), 0xff00ff00);

    } else if (bInvul) {
      Particles_ModelGlow2(pmo, pl, m_tmInvul, PT_STAR05, vFactors(1), 2, vFactors(2), 0x3333ff00);

    } else if (bDamage) {
      Particles_ModelGlow2(pmo, pl, m_tmDamage, PT_STAR08, vFactors(1), 2, vFactors(2), 0xff777700);
    }

    // entity specific
    if (!ASSERT_ENTITY(pen)) {
      return;
    }

    if (m_tmSpeed > tmNow) {
      Particles_RunAfterBurner(pen, m_tmSpeed, 0.3f, 0);
    }
  };

  // Current powerup time
  FLOAT GetPowerupTime(INDEX iPowerup) {
    return (&m_tmInvis)[iPowerup];
  };

  // Remaining powerup time
  FLOAT GetPowerupRemaining(INDEX iPowerup) {
    return (&m_tmInvis)[iPowerup] - _pTimer->CurrentTick();
  };

  // Max powerup time
  FLOAT GetPowerupMaxTime(INDEX iPowerup) {
    return _afPowerupMaxTime[iPowerup];
  };

  // Activate some powerup
  void ActivatePowerup(INDEX iPowerup) {
    (&m_tmInvis)[iPowerup] = _pTimer->CurrentTick() + GetPowerupMaxTime(iPowerup) * GetSP()->sp_fPowerupTimeMul;
  };

  // Check if a powerup is active
  BOOL IsPowerupActive(INDEX iPowerup) {
    return (&m_tmInvis)[iPowerup] > _pTimer->CurrentTick();
  };

  // Reset powerup timers
  void ResetPowerups(void) {
    for (INDEX i = 0; i < PLAYER_POWERUPS; i++) {
      (&m_tmInvis)[i] = 0.0f;
    }
  };

  // Special powerup factor or multiplier
  FLOAT GetPowerupFactor(INDEX iPowerup) {
    return _afPowerupFactor[iPowerup];
  };

procedures:
  // Entry point
  Main(EInventoryInit eInit) {
    // remember the initial parameters
    ASSERT(eInit.penPlayer != NULL);
    m_penPlayer = eInit.penPlayer;
    ASSERT(IsOfClass(m_penOwner, "Player"));

    InitAsVoid();
    SetFlags(GetFlags() | ENF_CROSSESLEVELS);
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    // spawn weapons
    EWeaponsInit eInitWeapons;
    eInitWeapons.penOwner = m_penPlayer;

    m_penWeapons1 = CreateEntity(GetPlacement(), CLASS_WEAPONS);
    m_penWeapons1->Initialize(eInitWeapons);

    m_penWeapons2 = CreateEntity(GetPlacement(), CLASS_WEAPONS);
    eInitWeapons.iMirror = 1;
    m_penWeapons2->Initialize(eInitWeapons);

    wait() {
      on (EBegin) : {
        resume;
      }

      on (EEnd) : {
        stop;
      }
    }

    // destroy weapons
    m_penWeapons1->Destroy();
    m_penWeapons2->Destroy();
    
    // cease to exist
    Destroy();

    return;
  };
};
