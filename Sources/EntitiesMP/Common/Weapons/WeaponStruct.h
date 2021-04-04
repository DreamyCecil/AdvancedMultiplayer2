#pragma once

#include "WeaponBase.h"
#include "WeaponPos.h"

// Weapon properties
struct SWeaponStruct : public SWeaponBase {
  SWeaponPos wpsPos; // weapon position

  SWeaponAmmo *pwaAmmo; // ammo
  SWeaponAmmo *pwaAlt; // alt ammo
  INDEX iMaxMag; // magazine size

  INDEX iPickup; // ammo in a weapon pickup
  INDEX iPickupAlt; // alt ammo in a weapon pickup

  FLOAT fDamage;   // weapon damage
  FLOAT fDamageDM; // weapon damage in deathmatch
  FLOAT fDamageAlt;   // weapon alt damage
  FLOAT fDamageAltDM; // weapon alt damage in deathmatch

  // Constructors
  SWeaponStruct(void);
  SWeaponStruct(SWeaponAmmo *pSetAmmo, SWeaponAmmo *pSetAlt, CTString strSetIcon, CTString strSetPickup);

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);
};

// Weapon structures and icons
extern CDList<SWeaponStruct> _awsPlayerWeapons;
extern CWeaponIcons _aWeaponIcons;
