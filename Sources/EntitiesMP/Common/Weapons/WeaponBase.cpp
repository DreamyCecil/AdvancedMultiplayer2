#include "StdH.h"

#include "WeaponBase.h"
#include "WeaponStruct.h"
#include "WeaponAmmo.h"

// Set icon
void CWeaponBase::AddIcon(CTString strSetIcon, CWeaponIcons &aIcons) {
  // Empty icon
  if (strSetIcon == "") {
    ptoIcon = NULL;
    aIcons.Add(NULL);
    return;
  }

  // Already added
  if (ptoIcon != NULL) {
    return;
  }

  // Add new icon
  try {
    ptoIcon = new CTextureObject;

    ptoIcon->SetData_t(CTFileName(strSetIcon));
    ((CTextureData*)ptoIcon->GetData())->Force(TEX_CONSTANT);

    aIcons.Add(ptoIcon);

  } catch (char *strError) {
    FatalError(strError);
  }
};

// World functions

// Check if weapons have been loaded
static BOOL _bWeaponsLoaded = FALSE;
extern CTString _strCurrentWeaponSet = "";

// Load weapons and ammo for this world
void LoadWorldWeapons(CWorld *pwo) {
  // Already loaded
  if (_bWeaponsLoaded) {
    return;
  }

  // Select weapon set
  _strCurrentWeaponSet = "Default";

  // Load weapons and ammo
  extern void LoadAmmoSet(void);
  extern void LoadWeaponSet(void);
  LoadAmmoSet();
  LoadWeaponSet();
  
  // Weapons have been loaded
  _bWeaponsLoaded = TRUE;
};

// Weapons and ammo cleanup
void ClearWorldWeapons(void) {
  // Delete structures
  {FOREACHINDYNAMICCONTAINER(_apWeaponAmmo, CWeaponAmmo, itwa) {
    delete &*itwa;
  }}
  _apWeaponAmmo.Clear();
  
  {FOREACHINDYNAMICCONTAINER(_apPlayerWeapons, CWeaponStruct, itws) {
    delete &*itws;
  }}
  _apPlayerWeapons.Clear();

  // Delete icons
  {FOREACHINDYNAMICCONTAINER(_aAmmoIcons, CTextureObject, itto) {
    CTextureObject *pto = itto;

    if (pto != NULL) {
      delete pto;
    }
  }}
  _aAmmoIcons.Clear();
  
  {FOREACHINDYNAMICCONTAINER(_aWeaponIcons, CTextureObject, itto) {
    CTextureObject *pto = itto;

    if (pto != NULL) {
      delete pto;
    }
  }}
  _aWeaponIcons.Clear();

  // Mark as unloaded
  _bWeaponsLoaded = FALSE;
};
