#pragma once

#include "WeaponStruct.h"

// Player's ammo
struct SPlayerAmmo {
  SWeaponAmmo *pwaAmmoStruct; // ammo reference
  INDEX iAmount; // current amount
  
  // Local variables for the HUD
  BOOL bWeapon; // has weapons for this ammo
  INDEX iLastAmount; // last amount
  FLOAT tmChanged; // when changed amount

  // Constructors
  SPlayerAmmo(void) : pwaAmmoStruct(NULL), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};
  SPlayerAmmo(SWeaponAmmo *pSetAmmo) : pwaAmmoStruct(pSetAmmo), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};

  // Assignment
  SPlayerAmmo &operator=(const SPlayerAmmo &paOther) {
    this->pwaAmmoStruct = paOther.pwaAmmoStruct;
    this->iAmount = paOther.iAmount;

    this->bWeapon = paOther.bWeapon;
    this->iLastAmount = paOther.iLastAmount;
    this->tmChanged = paOther.tmChanged;

    return *this;
  };

  // Write and read
  void Write(CTStream *strm) {
    *strm << iAmount;
  };

  void Read(CTStream *strm) {
    *strm >> iAmount;
  };

  // Get max ammo
  inline INDEX &Max(void) { return pwaAmmoStruct->iMaxAmount; };

  // Check max ammo
  inline BOOL Full(void) {
    return (iAmount >= pwaAmmoStruct->iMaxAmount);
  };

  // Set max ammo
  inline void SetMax(void) {
    iAmount = Max();
  };
};

// Player's weapon
struct SPlayerWeapon {
  SWeaponStruct *pwsWeapon; // weapon reference
  SPlayerAmmo *ppaAmmo; // current ammo for this weapon
  SPlayerAmmo *ppaAlt; // current alt ammo for this weapon
  INDEX iMag; // current ammo in the magazine

  // Constructors
  SPlayerWeapon(void) : pwsWeapon(NULL), ppaAmmo(NULL), ppaAlt(NULL), iMag(0) {};
  SPlayerWeapon(SWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt) :
    pwsWeapon(pSetWeapon), ppaAmmo(pSetAmmo), ppaAlt(pSetAlt), iMag(0) {};

  // Assignment
  SPlayerWeapon &operator=(const SPlayerWeapon &pwOther) {
    this->pwsWeapon = pwOther.pwsWeapon;
    this->ppaAmmo = pwOther.ppaAmmo;
    this->ppaAlt = pwOther.ppaAlt;
    this->iMag = pwOther.iMag;

    return *this;
  };

  // Write and read
  void Write(CTStream *strm) {
    *strm << iMag;
  };

  void Read(CTStream *strm) {
    *strm >> iMag;
  };

  // Get ammo structures
  inline SWeaponAmmo *GetAmmo(void) { return pwsWeapon->pwaAmmo; };
  inline SWeaponAmmo *GetAlt(void)  { return pwsWeapon->pwaAlt; };

  // Get ammo ID
  ULONG *GetAmmoID(void);
  ULONG *GetAltID(void);

  // Get ammo amounts
  inline INDEX CurrentAmmo(void) { return (ppaAmmo == NULL ? 0 : ppaAmmo->iAmount); };
  inline INDEX CurrentAlt(void)  { return (ppaAlt == NULL  ? 0 : ppaAlt->iAmount); };
  inline INDEX MaxAmmo(void) { return (ppaAmmo == NULL ? 1 : ppaAmmo->Max()); };
  inline INDEX MaxAlt(void)  { return (ppaAlt == NULL  ? 1 : ppaAlt->Max()); };

  // Check for ammo
  BOOL HasAmmo(BOOL bCheckAlt);

  // Check full mag
  inline BOOL FullMag(void) { return (iMag >= pwsWeapon->iMaxMag); };

  // Reload magazine
  void Reload(BOOL bMax = FALSE);

  // Can reload magazine
  inline BOOL CanReload(void) { return (!FullMag() && CurrentAmmo() > iMag); };

  // Empty magazine
  inline BOOL EmptyMag(void) { return (pwsWeapon->iMaxMag > 0 && iMag <= 0); };

  // Get weapon position
  inline SWeaponPos GetPosition(void) { return pwsWeapon->wpsPos; };
};

// Player's arsenal
typedef CDArray<SPlayerWeapon> CWeaponArsenal;
typedef CDArray<SPlayerAmmo>   CAmmunition;
