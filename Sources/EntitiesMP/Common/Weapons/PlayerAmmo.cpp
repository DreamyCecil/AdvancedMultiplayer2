#include "StdH.h"

#include "PlayerAmmo.h"

// Constructors
SPlayerAmmo::SPlayerAmmo(void) :
  pasAmmoStruct(NULL), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};

SPlayerAmmo::SPlayerAmmo(CAmmoStruct *pSetAmmo) :
  pasAmmoStruct(pSetAmmo), iAmount(0), bWeapon(FALSE), iLastAmount(0), tmChanged(0.0f) {};

// Assignment
SPlayerAmmo &SPlayerAmmo::operator=(const SPlayerAmmo &paOther) {
  this->pasAmmoStruct = paOther.pasAmmoStruct;
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
