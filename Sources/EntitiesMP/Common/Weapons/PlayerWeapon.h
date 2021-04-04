#pragma once

#include "WeaponStruct.h"
#include "PlayerAmmo.h"

// Player's weapon
struct SPlayerWeapon {
  SWeaponStruct *pwsWeapon; // weapon reference
  SPlayerAmmo *ppaAmmo; // current ammo for this weapon
  SPlayerAmmo *ppaAlt; // current alt ammo for this weapon
  INDEX iMag; // current ammo in the magazine

  // Constructors
  SPlayerWeapon(void);
  SPlayerWeapon(SWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt);

  // Assignment
  SPlayerWeapon &operator=(const SPlayerWeapon &pwOther);

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);

  // Get ammo structures
  inline SWeaponAmmo *GetAmmo(void) {
    return pwsWeapon->pwaAmmo;
  };

  inline SWeaponAmmo *GetAlt(void) {
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

  // Check for ammo
  BOOL HasAmmo(BOOL bCheckAlt);

  // Check full mag
  inline BOOL FullMag(void) {
    return (iMag >= pwsWeapon->iMaxMag);
  };

  // Reload magazine
  void Reload(BOOL bMax = FALSE);

  // Can reload magazine
  inline BOOL CanReload(void) {
    return (!FullMag() && CurrentAmmo() > iMag);
  };

  // Empty magazine
  inline BOOL EmptyMag(void) {
    return (pwsWeapon->iMaxMag > 0 && iMag <= 0);
  };

  // Get weapon position
  inline SWeaponPos GetPosition(void) {
    return pwsWeapon->wpsPos;
  };
};

// Player's arsenal type
typedef CDArray<SPlayerWeapon> CWeaponArsenal;
