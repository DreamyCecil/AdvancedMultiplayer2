#pragma once

#include "WeaponBase.h"
#include "WeaponPos.h"
#include "WeaponModel.h"

// Weapon properties
struct SWeaponStruct : public SWeaponBase {
  SWeaponPos wpsPos; // weapon position

  SWeaponModel wmModel1; // first person model
  SWeaponModel wmModel2; // first person model (other hand)
  SWeaponModel wmModel3; // third person model

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

  // Write and read weapon properties
  void Write(CTStream *strm);
  void Read(CTStream *strm);
};

// Weapon structures and icons
extern CDList<SWeaponStruct> _awsPlayerWeapons;
extern CWeaponIcons _aWeaponIcons;
