#pragma once

#include "WeaponStruct.h"

// Player's ammo
struct SPlayerAmmo {
  SWeaponAmmo *pAmmoStruct; // ammo reference
  INDEX iAmount; // current amount
  
  // Local variables for the HUD
  BOOL bWeapon; // has weapons for this ammo
  INDEX iLastAmount; // last amount
  FLOAT tmChanged; // when changed amount

  // Constructors
  SPlayerAmmo(void) : pAmmoStruct(NULL), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};
  SPlayerAmmo(SWeaponAmmo *pSetAmmo) : pAmmoStruct(pSetAmmo), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};

  // Assignment
  SPlayerAmmo &operator=(const SPlayerAmmo &paOther) {
    this->pAmmoStruct = paOther.pAmmoStruct;
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
  inline INDEX &Max(void) { return pAmmoStruct->iMaxAmount; };

  // Check max ammo
  inline BOOL Full(void) {
    return (iAmount >= pAmmoStruct->iMaxAmount);
  };

  // Set max ammo
  inline void SetMax(void) {
    iAmount = Max();
  };
};

// Player's weapon
struct SPlayerWeapon {
  SWeaponStruct *pWeaponStruct; // weapon reference
  SPlayerAmmo *pAmmo; // current ammo for this weapon
  SPlayerAmmo *pAlt; // current alt ammo for this weapon
  INDEX iMag; // current ammo in the magazine

  // Constructors
  SPlayerWeapon(void) : pWeaponStruct(NULL), pAmmo(NULL), pAlt(NULL), iMag(0) {};
  SPlayerWeapon(SWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt) :
    pWeaponStruct(pSetWeapon), pAmmo(pSetAmmo), pAlt(pSetAlt), iMag(0) {};

  // Assignment
  SPlayerWeapon &operator=(const SPlayerWeapon &pwOther) {
    this->pWeaponStruct = pwOther.pWeaponStruct;
    this->pAmmo = pwOther.pAmmo;
    this->pAlt = pwOther.pAlt;
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
  inline SWeaponAmmo *GetAmmo(void) { return pWeaponStruct->pAmmo; };
  inline SWeaponAmmo *GetAlt(void)  { return pWeaponStruct->pAlt; };

  // Get ammo ID
  ULONG *GetAmmoID(void);
  ULONG *GetAltID(void);

  // Get ammo amounts
  inline INDEX CurrentAmmo(void) { return (pAmmo == NULL ? 0 : pAmmo->iAmount); };
  inline INDEX CurrentAlt(void)  { return (pAlt == NULL  ? 0 : pAlt->iAmount); };
  inline INDEX MaxAmmo(void) { return (pAmmo == NULL ? 1 : pAmmo->Max()); };
  inline INDEX MaxAlt(void)  { return (pAlt == NULL  ? 1 : pAlt->Max()); };

  // Check for ammo
  BOOL HasAmmo(BOOL bCheckAlt);

  // Check full mag
  inline BOOL FullMag(void) { return (iMag >= pWeaponStruct->iMaxMag); };

  // Reload magazine
  void Reload(BOOL bMax = FALSE);

  // Can reload magazine
  inline BOOL CanReload(void) { return (!FullMag() && CurrentAmmo() > iMag); };

  // Get weapon position
  inline SWeaponPos GetPosition(void) { return pWeaponStruct->wpsPos; };
};

// Player's arsenal
typedef CDArray<SPlayerWeapon> CWeaponArsenal;
typedef CDArray<SPlayerAmmo>   CAmmunition;
