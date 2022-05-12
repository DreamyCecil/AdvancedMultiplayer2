#pragma once

#include "AmmoStruct.h"

// Player's ammo
struct SPlayerAmmo {
  CAmmoStruct *pasAmmoStruct; // ammo reference
  INDEX iAmount; // current amount
  
  // Local variables for the HUD
  BOOL bWeapon; // has weapons for this ammo
  INDEX iLastAmount; // last amount
  FLOAT tmChanged; // when changed amount

  // Constructors
  SPlayerAmmo(void);
  SPlayerAmmo(CAmmoStruct *pSetAmmo);

  // Assignment
  SPlayerAmmo &operator=(const SPlayerAmmo &paOther);

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);

  // Get max ammo
  inline INDEX &Max(void) {
    return pasAmmoStruct->iMaxAmount;
  };
  
  // Check max ammo
  inline BOOL Full(void) {
    return (iAmount >= pasAmmoStruct->iMaxAmount);
  };
  
  // Set max ammo
  inline void SetMax(void) {
    iAmount = Max();
  };
};

// Player's arsenal type
typedef CStaticArray<SPlayerAmmo> CAmmunition;
