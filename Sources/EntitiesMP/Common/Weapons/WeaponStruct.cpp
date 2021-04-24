#include "StdH.h"

#include "WeaponStruct.h"

// Weapon structures and icons
extern CDList<SWeaponStruct> _awsPlayerWeapons = CDList<SWeaponStruct>();
extern CWeaponIcons _aWeaponIcons = CWeaponIcons();

// Constructors
SWeaponStruct::SWeaponStruct(void) :
  SWeaponBase(0, "", 0.0f, ""), wpsPos(DEF_PLACE, DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
  pwaAmmo(NULL), pwaAlt(NULL), iGroup(0), bDualWeapon(TRUE), iMaxMag(0), iPickup(0), iPickupAlt(0),
  fDamage(0.0f), fDamageDM(0.0f), fDamageAlt(0.0f), fDamageAltDM(0.0f)
{
  aiDecAmmo[DWA_AMMO] = 1;
  aiDecAmmo[DWA_ALT]  = 1;
  aiDecAmmo[DWA_MAG]  = 1;
};

SWeaponStruct::SWeaponStruct(SWeaponAmmo *pSetAmmo, SWeaponAmmo *pSetAlt, CTString strSetIcon, CTString strSetPickup) :
  SWeaponBase(0, strSetIcon, 0.0f, strSetPickup), wpsPos(DEF_PLACE, DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
  pwaAmmo(pSetAmmo), pwaAlt(pSetAlt), iGroup(0), bDualWeapon(TRUE), iMaxMag(0), iPickup(0), iPickupAlt(0),
  fDamage(0.0f), fDamageDM(0.0f), fDamageAlt(0.0f), fDamageAltDM(0.0f)
{
  aiDecAmmo[DWA_AMMO] = 1;
  aiDecAmmo[DWA_ALT]  = 1;
  aiDecAmmo[DWA_MAG]  = 1;
};

// Get main weapon bit
INDEX SWeaponStruct::GetBit(void) {
  if (aiBits.Count() <= 0) {
    return -1;
  }

  return aiBits[0];
};

// Check if the bit matches available ones
BOOL SWeaponStruct::BitMatches(const INDEX &iBit) {
  if (aiBits.Count() <= 0) {
    return FALSE;
  }

  for (int i = 0; i < aiBits.Count(); i++) {
    // found matching bit
    if (aiBits[i] == iBit) {
      return TRUE;
    }
  }

  return FALSE;
};

// Write weapon properties
void SWeaponStruct::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << wpsPos.plPos;
  *strm << wpsPos.plPos2;
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

// Read weapon properties
void SWeaponStruct::Read(CTStream *strm) {
  *strm >> strIcon;
  *strm >> wpsPos.plPos;
  *strm >> wpsPos.plPos2;
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
