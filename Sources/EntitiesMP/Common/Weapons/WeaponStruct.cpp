#include "StdH.h"

#include "WeaponStruct.h"

// Weapon structures and icons
extern DSList<CWeaponStruct *> _apPlayerWeapons = DSList<CWeaponStruct *>();
extern CWeaponIcons _aWeaponIcons = CWeaponIcons();

// Constructors
CWeaponStruct::CWeaponStruct(void) :
  CWeaponBase(0, "", 0.0f, ""), wpsPos(DEF_PLACE, DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
  pwaAmmo(NULL), pwaAlt(NULL), ubGroup(0), bDualWeapon(TRUE), iMaxMag(0), iPickup(0), iPickupAlt(0),
  fDamage(0.0f), fDamageDM(0.0f), fDamageAlt(0.0f), fDamageAltDM(0.0f)
{
  aiDecAmmo[DWA_AMMO] = 1;
  aiDecAmmo[DWA_ALT]  = 1;
  aiDecAmmo[DWA_MAG]  = 1;
};

CWeaponStruct::CWeaponStruct(CWeaponAmmo *pSetAmmo, CWeaponAmmo *pSetAlt, CTString strSetIcon, CTString strSetPickup) :
  CWeaponBase(0, strSetIcon, 0.0f, strSetPickup), wpsPos(DEF_PLACE, DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
  pwaAmmo(pSetAmmo), pwaAlt(pSetAlt), ubGroup(0), bDualWeapon(TRUE), iMaxMag(0), iPickup(0), iPickupAlt(0),
  fDamage(0.0f), fDamageDM(0.0f), fDamageAlt(0.0f), fDamageAltDM(0.0f)
{
  aiDecAmmo[DWA_AMMO] = 1;
  aiDecAmmo[DWA_ALT]  = 1;
  aiDecAmmo[DWA_MAG]  = 1;
};

// Get main weapon bit
INDEX CWeaponStruct::GetBit(void) {
  if (aiBits.Count() <= 0) {
    return -1;
  }

  return aiBits[0];
};

// Check if the bit matches available ones
BOOL CWeaponStruct::BitMatches(const INDEX &iBit) {
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
void CWeaponStruct::Write(CTStream *strm) {
  *strm << strIcon;
  *strm << wpsPos.plPos;
  *strm << wpsPos.plPos2;
  *strm << wpsPos.plThird;
  *strm << wpsPos.vFire;
  *strm << strPickup;

  // ammo position in the list
  if (pwaAmmo != NULL) {
    *strm << _apWeaponAmmo.FindIndex(pwaAmmo);
  } else {
    *strm << INDEX(-1);
  }

  if (pwaAlt != NULL) {
    *strm << _apWeaponAmmo.FindIndex(pwaAlt);
  } else {
    *strm << INDEX(-1);
  }

  // write weapon bits
  INDEX ctBits = aiBits.Count();
  *strm << ctBits;

  for (INDEX iBit = 0; iBit < ctBits; iBit++) {
    *strm << aiBits[iBit];
  }

  *strm << ubGroup;
  *strm << bDualWeapon;

  // write weapon priorities
  INDEX ctPriorities = aiWeaponPriority.Count();
  *strm << ctPriorities;

  for (INDEX iPriority = 0; iPriority < ctPriorities; iPriority++) {
    *strm << aiWeaponPriority[iPriority];
  }
};

// Read weapon properties
void CWeaponStruct::Read(CTStream *strm) {
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
    pwaAmmo = _apWeaponAmmo[iAmmo];
  }

  if (iAlt != -1) {
    pwaAlt = _apWeaponAmmo[iAlt];
  }

  // read weapon bits
  INDEX ctBits;
  *strm >> ctBits;

  aiBits.New(ctBits);

  for (INDEX iBit = 0; iBit < ctBits; iBit++) {
    *strm >> aiBits[iBit];
  }

  *strm >> ubGroup;
  *strm >> bDualWeapon;

  // read weapon priorities
  INDEX ctPriorities;
  *strm >> ctPriorities;

  aiWeaponPriority.New(ctPriorities);

  for (INDEX iPriority = 0; iPriority < ctPriorities; iPriority++) {
    *strm >> aiWeaponPriority[iPriority];
  }
};
