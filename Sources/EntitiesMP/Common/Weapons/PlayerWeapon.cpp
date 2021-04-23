#include "StdH.h"

#include "PlayerWeapon.h"

// Constructors
SPlayerWeapon::SPlayerWeapon(void) :
  pwsWeapon(NULL), ppaAmmo(NULL), ppaAlt(NULL), iPicked(0)
{
  aiMag[0] = 0;
  aiMag[1] = 0;
};

SPlayerWeapon::SPlayerWeapon(SWeaponStruct *pSetWeapon, SPlayerAmmo *pSetAmmo, SPlayerAmmo *pSetAlt) :
  pwsWeapon(pSetWeapon), ppaAmmo(pSetAmmo), ppaAlt(pSetAlt), iPicked(0)
{
  aiMag[0] = 0;
  aiMag[1] = 0;
};

// Assignment
SPlayerWeapon &SPlayerWeapon::operator=(const SPlayerWeapon &pwOther) {
  this->pwsWeapon = pwOther.pwsWeapon;
  this->ppaAmmo = pwOther.ppaAmmo;
  this->ppaAlt = pwOther.ppaAlt;
  this->aiMag[0] = pwOther.aiMag[0];
  this->aiMag[1] = pwOther.aiMag[1];

  return *this;
};

// Write and read
void SPlayerWeapon::Write(CTStream *strm) {
  *strm << aiMag[0];
  *strm << aiMag[1];
};

void SPlayerWeapon::Read(CTStream *strm) {
  *strm >> aiMag[0];
  *strm >> aiMag[1];
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
void SPlayerWeapon::Reload(const INDEX &iExtra, BOOL bMax) {
  INDEX iAmmo = CurrentAmmo();

  if (bMax || iAmmo < 0) {
    aiMag[iExtra] = pwsWeapon->iMaxMag;
    return;
  }

  aiMag[iExtra] = Min(iAmmo, pwsWeapon->iMaxMag);
};
