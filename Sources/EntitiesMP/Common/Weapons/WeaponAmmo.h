#pragma once

#include "WeaponBase.h"

// Weapon ammo
struct SWeaponAmmo : public SWeaponBase {
  INDEX iMaxAmount; // maximum ammo amount
  BOOL bDisplay; // display in the ammo list

  // Constructors
  SWeaponAmmo(void) : SWeaponBase(0, "", 0.0f, ""), iMaxAmount(0), bDisplay(TRUE) {};

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);

  // Set max ammo
  void SetAmmo(INDEX iSet);
};

// Ammo structures and icons
extern CDList<SWeaponAmmo> _awaWeaponAmmo;
extern CWeaponIcons _aAmmoIcons;
