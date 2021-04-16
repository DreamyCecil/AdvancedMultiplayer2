408
%{
#include "StdH.h"
#include "EntitiesMP/Player.h"
#include "EntitiesMP/PlayerWeapons.h"

// Extra functions
#include "EntitiesMP/Common/ExtraFunc.h"

// Ammo types to default ammo set
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

  // Initialize weapons
  void InitWeapons(const INDEX &iGiveWeapons, const INDEX &iTakeWeapons, const INDEX &iTakeAmmo, const FLOAT &fAmmoRatio) {
    GetWeapon(0)->InitializeWeapons(iGiveWeapons, iTakeWeapons, iTakeAmmo, fAmmoRatio);
    GetWeapon(1)->InitializeWeapons(iGiveWeapons, iTakeWeapons, iTakeAmmo, fAmmoRatio);

    // precache new weapons
    GetWeapon(0)->Precache();
  };

  // Prepare weapons (moved from InitializeWeapons)
  void PrepareWeapons(const ULONG &ulNewWeapons, const INDEX &iTakeAmmo, const FLOAT &fAmmoRatio) {
    // starting ammo
    const BOOL bStartAmmo = (GetSP()->sp_iAMPOptions & AMP_STARTAMMO);

    // for each new weapon
    for (INDEX iWeapon = WEAPON_KNIFE; iWeapon < WEAPON_LAST; iWeapon++) {
      if (WeaponExists(ulNewWeapons, iWeapon)) {
        // add default amount of ammo
        AddDefaultAmmoForWeapon(iWeapon, (bStartAmmo ? 1.0f : fAmmoRatio));
      }
    }

    // don't take starting ammo
    if (!bStartAmmo) {
      // take away first 8 ammo types
      for (INDEX iTake = 1; iTake <= 8; iTake++) {
        INDEX iAmmoBit = (1 << _aiTakeAmmoBits[iTake-1]);

        if (iTakeAmmo & iAmmoBit) {
          m_aAmmo[iTake].iAmount = 0;
        }
      }
    }
    
    // reload weapons
    for (INDEX iReload = 0; iReload < m_aWeapons.Count(); iReload++) {
      m_aWeapons[iReload].Reload(0);
      m_aWeapons[iReload].Reload(1);
    }
  };

  // Pull out extra weapon
  void WeaponSelectionModifier(void) {
    ESelectWeapon eSelect;

    // pick the same weapon
    if (GetWeapon(1)->GetCurrent() == WEAPON_NONE) {
      eSelect.iWeapon = GetWeapon(0)->GetCurrent();
      eSelect.bAbsolute = TRUE;
      
    // put away the weapon
    } else {
      eSelect.iWeapon = WEAPON_NONE;
      eSelect.bAbsolute = TRUE;
    }

    GetWeapon(1)->SendEvent(eSelect);
  };

  // Add default amount of ammo when receiving a weapon
  void AddDefaultAmmoForWeapon(const INDEX &iWeapon, FLOAT fMaxAmmoRatio) {
    // add all ammo if infinite
    if (GetSP()->sp_bInfiniteAmmo) {
      fMaxAmmoRatio = 1.0f;
    }
    
    // get weapon
    SPlayerWeapon &pw = m_aWeapons[iWeapon];
    SWeaponStruct &ws = *pw.pwsWeapon;

    // define ammo amounts
    FLOAT fPickupAmmo = Max(FLOAT(ws.iPickup), pw.MaxAmmo() * fMaxAmmoRatio);
    INDEX iPickupAlt = ws.iPickupAlt;

    // ammo references
    SPlayerAmmo *ppaAmmo = pw.ppaAmmo;
    SPlayerAmmo *ppaAlt = pw.ppaAlt;

    // add ammo
    if (ppaAmmo != NULL) {
      ppaAmmo->iAmount += fPickupAmmo;
      AddManaToPlayer(fPickupAmmo * ws.fMana * MANA_AMMO);
    }

    // add alt ammo
    if (ppaAlt != NULL) {
      ppaAlt->iAmount += iPickupAlt;
      AddManaToPlayer(iPickupAlt * ws.fMana * MANA_AMMO);
    }

    // make sure we don't have more ammo than maximum
    ClampAllAmmo();
  };

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
      m_aWeapons[iClear].aiMag[0] = 0;
      m_aWeapons[iClear].aiMag[1] = 0;
    }
  };

  // Receive new weapon
  BOOL ReceiveWeapon(const CEntityEvent &ee) {
    ASSERT(ee.ee_slEvent == EVENTCODE_EWeaponItem);
    
    // get weapon type
    INDEX iReceiveType = ((EWeaponItem &)ee).iWeapon;

    // random weapon item
    if (iReceiveType == WIT_RANDOM) {
      iReceiveType = WeaponItemType(IRnd() % 13);

      // replace weapons with unlimited ammo with something else
      if ((iReceiveType == WIT_KNIFE    && GetWeapon(0)->m_iAvailableWeapons & IRF_KNIFE)
       || (iReceiveType == WIT_CHAINSAW && GetWeapon(0)->m_iAvailableWeapons & IRF_CHAINSAW)
       || (iReceiveType == WIT_COLT     && GetWeapon(0)->m_iAvailableWeapons & IRF_COLT && GetWeapon(0)->m_iAvailableWeapons & IRF_DCOLT)) {
        iReceiveType = WeaponItemType(IRnd() % 10 + 3);
      }

    } else {
      // don't receive disabled weapons
      BOOL bEnabled = (GetSP()->sp_iItemRemoval & _aiWeaponItemFlags[iReceiveType]);

      if (!bEnabled) {
        return TRUE;
      }
    }

    // don't give anything on pickup
    if (GetSP()->sp_iWeaponItems == 0) {
      return TRUE;
    }

    INDEX wit = iReceiveType;

    switch (iReceiveType) {
      // knife item
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
    if (iReceiveType == WEAPON_COLT && (GetWeapon(0)->m_iAvailableWeapons & (1 << (WEAPON_COLT-1)))) {
      iReceiveType = WEAPON_DOUBLECOLT;
    }

    ULONG ulOldWeapons = GetWeapon(0)->m_iAvailableWeapons;
    GetWeapon(0)->m_iAvailableWeapons |= 1 << (iReceiveType-1);
    GetWeapon(1)->m_iAvailableWeapons |= 1 << (iReceiveType-1);

    // precache eventual new weapons
    GetWeapon(0)->Precache();

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

    if (iSelectionSetting == PS_WAS_ALL) {
      bAutoSelect = TRUE;

    } else if (iSelectionSetting == PS_WAS_ONLYNEW) {
      if (GetWeapon(0)->m_iAvailableWeapons & ~ulOldWeapons) {
        bAutoSelect = TRUE;
      }

    } else if (iSelectionSetting == PS_WAS_BETTER) {
      if (GetWeapon(0)->GetCurrent() < iReceiveType) {
        bAutoSelect = TRUE;
      }
    }

    if (bAutoSelect) {
      // select it
      if (GetWeapon(0)->WeaponSelectOk((WeaponType)iReceiveType)) {
        GetWeapon(0)->SendEvent(EBegin());
      }
    }

    return TRUE;
  };

  // Receive ammo
  BOOL ReceiveAmmo(const CEntityEvent &ee) {
    ASSERT(ee.ee_slEvent == EVENTCODE_EAmmoItem);

    // if infinite ammo is on
    if (GetSP()->sp_bInfiniteAmmo) {
      // pick all items anyway (items that exist in this mode are only those that
      // trigger something when picked - so they must be picked)
      return TRUE;
    }

    EAmmoItem &Eai = (EAmmoItem&)ee;

    // find proper ammo type
    INDEX iType = _aiAmmoSetTypes[Eai.EaitType];

    // invalid type
    if (iType == -1) {
      CPrintF("^cff0000Warning: Picking invalid ammo type: %d^r\n", Eai.EaitType);
      return TRUE;

    // back packs
    } else if (Eai.EaitType == AIT_BACKPACK || Eai.EaitType == AIT_SERIOUSPACK) {
      // add ammo
      switch (Eai.EaitType) {
        case AIT_BACKPACK:
          m_aAmmo[1].iAmount +=  20 * GetSP()->sp_fAmmoQuantity * AmmoMul();
          m_aAmmo[2].iAmount += 200 * GetSP()->sp_fAmmoQuantity * AmmoMul();
          m_aAmmo[3].iAmount +=   5 * GetSP()->sp_fAmmoQuantity * AmmoMul();

          GetPlayer()->ItemPicked(TRANS("Ammo pack"), 0);
          AddManaToPlayer(100.0f * MANA_AMMO);
          break;

        case AIT_SERIOUSPACK: {
          // give all ammo
          for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
            m_aAmmo[i].SetMax();
          }

          GetPlayer()->ItemPicked(TRANS("All Ammo"), 0);
          AddManaToPlayer(1000.0f * MANA_AMMO);
        } break;
      }

      return TRUE;
    }

    // ammo amount
    INDEX iAmmo = ceil(FLOAT(Eai.iQuantity) * AmmoMul());

    // ammo reference
    SPlayerAmmo &paAmmo = m_aAmmo[iType];

    // enough ammo
    if (paAmmo.iAmount >= paAmmo.Max()) {
      paAmmo.SetMax();
      return FALSE;
    }
    
    // add ammo
    paAmmo.iAmount += iAmmo;

    CTString &strPick = paAmmo.pwaAmmoStruct->strPickup;
    GetPlayer()->ItemPicked(Translate(strPick.str_String), iAmmo);

    AddManaToPlayer(iAmmo * paAmmo.pwaAmmoStruct->fMana * MANA_AMMO);

    // make sure we don't have more ammo than maximum
    ClampAllAmmo();

    return TRUE;
  };

  // Receive ammo pack
  BOOL ReceiveAmmoPack(const CEntityEvent &ee) {
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
          CTString &strPick = m_aAmmo[i].pwaAmmoStruct->strPickup;
          strMessage.PrintF("%s%s %d", strMessage, Translate(strPick.str_String), aiSet[i-1]);
        }
      }

      GetPlayer()->ItemPicked(strMessage, 0);
      return TRUE;
    }

    return FALSE;
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

  // Mute weapon ambient sounds
  void MuteWeaponAmbient(void) {
    GetWeapon(0)->m_soWeaponAmbient.Stop();
    GetWeapon(1)->m_soWeaponAmbient.Stop();
  };

  // Check the alt fire
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

  // Clamp amounts of all ammunition to maximum values
  void ClampAllAmmo(void) {
    for (INDEX i = 0; i < m_aAmmo.Count(); i++) {
      INDEX &iAmmo = m_aAmmo[i].iAmount;
      
      // limit ammo
      iAmmo = ClampUp(iAmmo, m_aAmmo[i].Max());
    }
  };

  // Add some mana to the player
  void AddManaToPlayer(const INDEX &iMana) {
    GetPlayer()->m_iMana += iMana;
    GetPlayer()->m_fPickedMana += iMana;
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
    
    eInitWeapons.bExtra = TRUE;
    m_penWeapons2 = CreateEntity(GetPlacement(), CLASS_WEAPONS);
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
