#include "StdH.h"
#include "PlayerArsenal.h"

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
  if (pAmmo == NULL && pAlt == NULL) {
    return TRUE;
  }

  INDEX iAmmo = 0;

  if (pAmmo != NULL) {
    iAmmo += pAmmo->iAmount;
  }
  if (bCheckAlt && pAlt != NULL) {
    iAmmo += pAlt->iAmount;
  }

  return (iAmmo > 0);
};
