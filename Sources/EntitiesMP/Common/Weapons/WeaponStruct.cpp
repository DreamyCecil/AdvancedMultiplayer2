#include "StdH.h"

#include "WeaponStruct.h"

// Weapon structures and icons
extern CDList<SWeaponStruct> _awsPlayerWeapons = CDList<SWeaponStruct>();
extern CWeaponIcons _aWeaponIcons = CWeaponIcons();

// Constructors
SWeaponStruct::SWeaponStruct(void) :
  SWeaponBase(0, "", 0.0f, ""), wpsPos(DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
  pwaAmmo(NULL), pwaAlt(NULL), iMaxMag(0), iPickup(0), iPickupAlt(0),
  fDamage(0.0f), fDamageDM(0.0f), fDamageAlt(0.0f), fDamageAltDM(0.0f) {};

SWeaponStruct::SWeaponStruct(SWeaponAmmo *pSetAmmo, SWeaponAmmo *pSetAlt, CTString strSetIcon, CTString strSetPickup) :
  SWeaponBase(0, strSetIcon, 0.0f, strSetPickup), wpsPos(DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
  pwaAmmo(NULL), pwaAlt(NULL), iMaxMag(0), iPickup(0), iPickupAlt(0),
  fDamage(0.0f), fDamageDM(0.0f), fDamageAlt(0.0f), fDamageAltDM(0.0f) {};

// Write and read weapon properties
void SWeaponStruct::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << wpsPos.plPos;
  *strm << wpsPos.plThird;
  *strm << wpsPos.vFire;
  *strm << strPickup;

  // ammo position in the list
  if (pwaAmmo != NULL) {
    *strm << _awaWeaponAmmo.FindIndex(*pwaAmmo);
  } else {
    *strm << INDEX(-1);
  }

  if (pwaAlt != NULL) {
    *strm << _awaWeaponAmmo.FindIndex(*pwaAlt);
  } else {
    *strm << INDEX(-1);
  }
};

void SWeaponStruct::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> wpsPos.plPos;
  *strm >> wpsPos.plThird;
  *strm >> wpsPos.vFire;
  *strm >> strPickup;

  INDEX iAmmo, iAlt;
  *strm >> iAmmo;
  *strm >> iAlt;

  // set ammo
  if (iAmmo != -1) {
    pwaAmmo = &_awaWeaponAmmo[iAmmo];
  }
  if (iAlt != -1) {
    pwaAlt = &_awaWeaponAmmo[iAlt];
  }
};
