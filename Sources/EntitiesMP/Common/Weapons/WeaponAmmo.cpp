#include "StdH.h"

#include "WeaponAmmo.h"

// Ammo structures and icons
extern CDList<SWeaponAmmo> _awaWeaponAmmo = CDList<SWeaponAmmo>();
extern CWeaponIcons _aAmmoIcons = CWeaponIcons();

// Write and read
void SWeaponAmmo::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << iMaxAmount;
  *strm << bDisplay;
};

void SWeaponAmmo::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> iMaxAmount;
  *strm >> bDisplay;
};

// Set max ammo
void SWeaponAmmo::SetAmmo(INDEX iSet) {
  // ammo multiplier
  FLOAT fModifier = ClampDn(GetSP()->sp_fAmmoQuantity, 1.0f) * AmmoMul();
  INDEX iTopAmmo = Floor(1000.0f * AmmoMul());

  // set max ammo
  iMaxAmount = ClampUp(INDEX(ceil(iSet * fModifier)), iTopAmmo);
};
