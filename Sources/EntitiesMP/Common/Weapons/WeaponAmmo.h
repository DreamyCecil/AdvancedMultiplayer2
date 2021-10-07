#pragma once

#include "WeaponBase.h"

// Weapon ammo
class CWeaponAmmo : public CWeaponBase {
  public:
    INDEX iMaxAmount; // maximum ammo amount
    BOOL bDisplay; // display in the ammo list

    // Constructors
    CWeaponAmmo(void) : CWeaponBase(0, "", 0.0f, ""), iMaxAmount(0), bDisplay(TRUE) {};

    // Write and read
    void Write(CTStream *strm);
    void Read(CTStream *strm);

    // Set max ammo
    void SetAmmo(INDEX iSet);
};

// Ammo structures and icons
extern DSList<CWeaponAmmo *> _apWeaponAmmo;
extern CWeaponIcons _aAmmoIcons;
