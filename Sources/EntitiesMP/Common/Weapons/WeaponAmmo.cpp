#include "StdH.h"

#include "WeaponAmmo.h"

// Ammo structures and icons
extern CDList<CWeaponAmmo *> _apWeaponAmmo = CDList<CWeaponAmmo *>();
extern CWeaponIcons _aAmmoIcons = CWeaponIcons();

// Write and read
void CWeaponAmmo::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << iMaxAmount;
  *strm << bDisplay;
};

void CWeaponAmmo::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> iMaxAmount;
  *strm >> bDisplay;
};

// Set max ammo
void CWeaponAmmo::SetAmmo(INDEX iSet) {
  // ammo multiplier
  FLOAT fModifier = ClampDn(GetSP()->sp_fAmmoQuantity, 1.0f) * AmmoMul();
  INDEX iTopAmmo = floor(1000.0f * AmmoMul());

  // set max ammo
  iMaxAmount = ClampUp(INDEX(ceil(iSet * fModifier)), iTopAmmo);
};
