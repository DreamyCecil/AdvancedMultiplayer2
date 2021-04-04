#include "StdH.h"

#include "PlayerWeapon.h"

// Constructors
SPlayerWeapon::SPlayerWeapon(void) :
  pwsWeapon(NULL), ppaAmmo(NULL), ppaAlt(NULL), iMag(0) {};

SPlayerWeapon::SPlayerWeapon(SWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt) :
  pwsWeapon(pSetWeapon), ppaAmmo(pSetAmmo), ppaAlt(pSetAlt), iMag(0) {};

// Assignment
SPlayerWeapon &SPlayerWeapon::operator=(const SPlayerWeapon &pwOther) {
  this->pwsWeapon = pwOther.pwsWeapon;
  this->ppaAmmo = pwOther.ppaAmmo;
  this->ppaAlt = pwOther.ppaAlt;
  this->iMag = pwOther.iMag;

  return *this;
};

// Write and read
void SPlayerWeapon::Write(CTStream *strm) {
  *strm << iMag;
};

void SPlayerWeapon::Read(CTStream *strm) {
  *strm >> iMag;
};

// Get ammo ID
ULONG *SPlayerWeapon::GetAmmoID(void) {
  if (GetAmmo() != NULL) {
    return &GetAmmo()->ulID;
  }
  return NULL;
};

ULONG *SPlayerWeapon::GetAltID(void) {
  if (GetAlt() != NULL) {
    return &GetAlt()->ulID;
  }
  return NULL;
};

// Check for ammo
BOOL SPlayerWeapon::HasAmmo(BOOL bCheckAlt) {
  // infinite ammo
  if (ppaAmmo == NULL && ppaAlt == NULL) {
    return TRUE;
  }

  INDEX iAmmo = 0;

  if (ppaAmmo != NULL) {
    iAmmo += ppaAmmo->iAmount;
  }
  
  if (bCheckAlt && ppaAlt != NULL) {
    iAmmo += ppaAlt->iAmount;
  }

  return (iAmmo > 0);
};

// Reload magazine
void SPlayerWeapon::Reload(BOOL bMax) {
  INDEX iAmmo = CurrentAmmo();

  if (bMax || iAmmo < 0) {
    iMag = pwsWeapon->iMaxMag;
    return;
  }

  iMag = Min(iAmmo, pwsWeapon->iMaxMag);
};
