#pragma once

#include "WeaponBase.h"
#include "WeaponPos.h"
#include "WeaponModel.h"

// Special weapon bits
typedef CDArray<INDEX> CWeaponBits;

// Weapon properties
struct SWeaponStruct : public SWeaponBase {
  SWeaponPos wpsPos; // weapon position

  SWeaponModel wmModel1; // first person model
  SWeaponModel wmModel2; // first person model (other hand)
  SWeaponModel wmModel3; // third person model

  SWeaponAmmo *pwaAmmo; // ammo
  SWeaponAmmo *pwaAlt; // alt ammo
  INDEX iMaxMag; // magazine size

  CWeaponBits aiBits; // special bits of the weapon (for compatibility with PlayerMarker)
  INDEX iGroup;       // weapon group (0 - 31)
  BOOL bDualWeapon;   // can be selected as an extra weapon

  enum EDecWeaponAmmo {
    DWA_AMMO = 0, // main ammo
    DWA_ALT  = 1, // alt ammo
    DWA_MAG  = 2, // magazine ammo
  };

  INDEX aiDecAmmo[3]; // amount of ammo to decrease in some category

  INDEX iPickup; // ammo in a weapon pickup
  INDEX iPickupAlt; // alt ammo in a weapon pickup

  FLOAT fDamage;   // weapon damage
  FLOAT fDamageDM; // weapon damage in deathmatch
  FLOAT fDamageAlt;   // weapon alt damage
  FLOAT fDamageAltDM; // weapon alt damage in deathmatch

  // Constructors
  SWeaponStruct(void);
  SWeaponStruct(SWeaponAmmo *pSetAmmo, SWeaponAmmo *pSetAlt, CTString strSetIcon, CTString strSetPickup);

  // Get main weapon bit
  INDEX GetBit(void);

  // Check if the bit matches available ones
  BOOL BitMatches(const INDEX &iBit);

  // Write and read weapon properties
  void Write(CTStream *strm);
  void Read(CTStream *strm);
};

// Weapon structures and icons
extern CDList<SWeaponStruct> _awsPlayerWeapons;
extern CWeaponIcons _aWeaponIcons;
