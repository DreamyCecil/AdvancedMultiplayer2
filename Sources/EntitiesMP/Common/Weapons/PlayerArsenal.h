#pragma once

#include "WeaponStruct.h"

// Player's ammo
struct SPlayerAmmo {
  SWeaponAmmo *pAmmo; // ammo reference
  BOOL bWeapon; // has weapons for this ammo

  INDEX iAmount; // current amount
  INDEX iLastAmount; // last amount
  FLOAT tmChanged; // when changed amount

  // Constructors
  SPlayerAmmo(void) : pAmmo(NULL), iAmount(0), iLastAmount(0), tmChanged(0.0f), bWeapon(FALSE) {};
  SPlayerAmmo(SWeaponAmmo *pSetAmmo) : pAmmo(pSetAmmo), iAmount(0), iLastAmount(0), tmChanged(0.0f), bWeapon(FALSE) {};

  // Assignment
  SPlayerAmmo &operator=(const SPlayerAmmo &paOther) {
    this->pAmmo = paOther.pAmmo;
    this->bWeapon = paOther.bWeapon;
    this->iAmount = paOther.iAmount;
    this->iLastAmount = paOther.iLastAmount;
    this->tmChanged = paOther.tmChanged;

    return *this;
  };

  // Write and read
  void Write(CTStream *strm) {
    *strm << bWeapon;
    *strm << iAmount;
    *strm << iLastAmount;
    *strm << tmChanged;
  };

  void Read(CTStream *strm) {
    *strm >> bWeapon;
    *strm >> iAmount;
    *strm >> iLastAmount;
    *strm >> tmChanged;
  };

  // Get max ammo
  inline INDEX Max(void) { return (pAmmo == NULL ? 1 : pAmmo->iAmount); };

  // Check max ammo
  inline BOOL Full(void) {
    if (pAmmo == NULL) {
      return TRUE;
    }
    return (iAmount >= pAmmo->iAmount);
  };
};

// Player's weapon
struct SPlayerWeapon {
  SWeaponStruct *pWeapon; // weapon reference
  SPlayerAmmo *pAmmo; // current ammo for this weapon
  SPlayerAmmo *pAlt; // current alt ammo for this weapon

  // Constructors
  SPlayerWeapon(void) : pWeapon(NULL), pAmmo(NULL), pAlt(NULL) {};
  SPlayerWeapon(SWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt) : pWeapon(pSetWeapon), pAmmo(pSetAmmo), pAlt(pSetAlt) {};

  // Assignment
  SPlayerWeapon &operator=(const SPlayerWeapon &pwOther) {
    this->pWeapon = pwOther.pWeapon;
    this->pAmmo = pwOther.pAmmo;
    this->pAlt = pwOther.pAlt;

    return *this;
  };

  // Get ammo structures
  inline SWeaponAmmo *GetAmmo(void) { return (pWeapon == NULL ? NULL : pWeapon->pAmmo); };
  inline SWeaponAmmo *GetAlt(void)  { return (pWeapon == NULL ? NULL : pWeapon->pAlt); };

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
};

// Player's arsenal
typedef CDArray<SPlayerWeapon> CWeaponArsenal;
typedef CDArray<SPlayerAmmo>   CAmmunition;
