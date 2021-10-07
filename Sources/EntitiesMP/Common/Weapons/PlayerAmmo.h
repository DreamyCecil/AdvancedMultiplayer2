#pragma once

#include "WeaponAmmo.h"

// Player's ammo
struct SPlayerAmmo {
  CWeaponAmmo *pwaAmmoStruct; // ammo reference
  INDEX iAmount; // current amount
  
  // Local variables for the HUD
  BOOL bWeapon; // has weapons for this ammo
  INDEX iLastAmount; // last amount
  FLOAT tmChanged; // when changed amount

  // Constructors
  SPlayerAmmo(void);
  SPlayerAmmo(CWeaponAmmo *pSetAmmo);

  // Assignment
  SPlayerAmmo &operator=(const SPlayerAmmo &paOther);

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);

  // Get max ammo
  inline INDEX &Max(void) {
    return pwaAmmoStruct->iMaxAmount;
  };
  
  // Check max ammo
  inline BOOL Full(void) {
    return (iAmount >= pwaAmmoStruct->iMaxAmount);
  };
  
  // Set max ammo
  inline void SetMax(void) {
    iAmount = Max();
  };
};

// Player's arsenal type
typedef DSArray<SPlayerAmmo> CAmmunition;
