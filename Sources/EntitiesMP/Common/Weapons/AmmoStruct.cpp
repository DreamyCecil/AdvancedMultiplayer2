#include "StdH.h"

#include "AmmoStruct.h"

// Ammo structures and icons
extern CDynamicContainer<CAmmoStruct> _apAmmoStructs = CDynamicContainer<CAmmoStruct>();
extern CWeaponIcons _aAmmoIcons = CWeaponIcons();

// Write and read
void CAmmoStruct::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << iMaxAmount;
  *strm << bDisplay;
};

void CAmmoStruct::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> iMaxAmount;
  *strm >> bDisplay;
};

// Set max ammo
void CAmmoStruct::SetAmmo(INDEX iSet) {
  // ammo multiplier
  FLOAT fModifier = ClampDn(GetSP()->sp_fAmmoQuantity, 1.0f) * AmmoMul();
  INDEX iTopAmmo = floor(1000.0f * AmmoMul());

  // set max ammo
  iMaxAmount = ClampUp(INDEX(ceil(iSet * fModifier)), iTopAmmo);
};
