#pragma once

#include "WeaponStruct.h"
#include "PlayerAmmo.h"

// Player's weapon
struct SPlayerWeapon {
  CWeaponStruct *pwsWeapon; // weapon reference
  SPlayerAmmo *ppaAmmo; // current ammo for this weapon
  SPlayerAmmo *ppaAlt; // current alt ammo for this weapon

  INDEX iPicked; // amount of times the weapon has been picked up
  INDEX aiMag[2]; // current ammo in the magazine (main and extra weapons)

  // Constructors
  SPlayerWeapon(void);
  SPlayerWeapon(CWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt);

  // Assignment
  SPlayerWeapon &operator=(const SPlayerWeapon &pwOther);

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);

  // Get ammo structures
  inline CWeaponAmmo *GetAmmo(void) {
    return pwsWeapon->pwaAmmo;
  };

  inline CWeaponAmmo *GetAlt(void) {
    return pwsWeapon->pwaAlt;
  };

  // Get ammo ID
  ULONG *GetAmmoID(void);
  ULONG *GetAltID(void);

  // Get ammo amounts
  inline INDEX CurrentAmmo(void) {
    return (ppaAmmo == NULL ? 0 : ppaAmmo->iAmount);
  };

  inline INDEX CurrentAlt(void) {
    return (ppaAlt == NULL  ? 0 : ppaAlt->iAmount);
  };

  inline INDEX MaxAmmo(void) {
    return (ppaAmmo == NULL ? 1 : ppaAmmo->Max());
  };

  inline INDEX MaxAlt(void) {
    return (ppaAlt == NULL  ? 1 : ppaAlt->Max());
  };

  // Get decreasing ammo amounts
  inline INDEX GetDecAmmo(const INDEX &iType) {
    return pwsWeapon->aiDecAmmo[iType];
  };

  // Check for ammo
  BOOL HasAmmo(BOOL bCheckAlt);

  // Check full mag
  inline BOOL FullMag(const INDEX &iExtra) {
    return (aiMag[iExtra] >= pwsWeapon->iMaxMag);
  };

  // Reload magazine
  void Reload(const INDEX &iExtra, BOOL bMax = FALSE);

  // Can reload magazine
  inline BOOL CanReload(const INDEX &iExtra) {
    return (!FullMag(iExtra) && CurrentAmmo() > aiMag[iExtra]);
  };

  // Empty magazine
  inline BOOL EmptyMag(const INDEX &iExtra) {
    return (pwsWeapon->iMaxMag > 0 && aiMag[iExtra] <= 0);
  };

  // Get weapon group
  inline UBYTE GetGroup(void) {
    return pwsWeapon->ubGroup;
  };
  
  // Can be dual
  inline BOOL DualWeapon(void) {
    // no dual weapons
    if (GetSP()->DualWeapons() == DWP_NO) {
      return FALSE;
    }

    // all weapons or only the marked ones
    return (GetSP()->sp_iDualWeapons & DWF_ALLWEAPONS || pwsWeapon->bDualWeapon);
  };

  // Can be selected as an extra weapon
  inline BOOL ExtraWeapon(void) {
    // no dual weapons
    if (GetSP()->DualWeapons() == DWP_NO) {
      return FALSE;
    }

    // always or only if two
    BOOL bBoth = (GetSP()->DualWeapons() == DWP_ALWAYS || iPicked >= 2);

    // can be dual and picked enough up
    return (DualWeapon() && bBoth);
  };

  // Get weapon position
  inline SWeaponPos GetPosition(void) {
    return pwsWeapon->wpsPos;
  };
};

// Player's arsenal type
typedef CDArray<SPlayerWeapon> CWeaponArsenal;
