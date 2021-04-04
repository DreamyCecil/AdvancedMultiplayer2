#include "StdH.h"

#include "PlayerAmmo.h"

// Constructors
SPlayerAmmo::SPlayerAmmo(void) :
  pwaAmmoStruct(NULL), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};

SPlayerAmmo::SPlayerAmmo(SWeaponAmmo *pSetAmmo) :
  pwaAmmoStruct(pSetAmmo), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};

// Assignment
SPlayerAmmo &SPlayerAmmo::operator=(const SPlayerAmmo &paOther) {
  this->pwaAmmoStruct = paOther.pwaAmmoStruct;
  this->iAmount = paOther.iAmount;

  this->bWeapon = paOther.bWeapon;
  this->iLastAmount = paOther.iLastAmount;
  this->tmChanged = paOther.tmChanged;

  return *this;
};

// Write and read
void SPlayerAmmo::Write(CTStream *strm) {
  *strm << iAmount;
};

void SPlayerAmmo::Read(CTStream *strm) {
  *strm >> iAmount;
};
